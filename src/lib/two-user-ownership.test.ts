import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PRIVATE_NO_STORE, setPrivateCacheControl } from "./cache";
import { db } from "./prisma";
import { notFoundError } from "./server-errors";
import { toTemporalInstant } from "./timezone";

describe("T4: Two-user ownership isolation and private caching contracts", () => {
	const userAId = `test_user_a_${randomUUID()}`;
	const userBId = `test_user_b_${randomUUID()}`;
	const testDate = "2026-09-16";
	const journalEntryAId = randomUUID();
	const reflectionAId = randomUUID();
	const prayerLogAId = randomUUID();

	beforeAll(async () => {
		// Bootstrap test users in DB
		await db.orm.public.User.where({ id: userAId }).upsert({
			create: {
				id: userAId,
				name: "User Alpha",
				email: `${userAId}@example.com`,
				emailVerified: true,
			},
			update: {},
		});

		await db.orm.public.User.where({ id: userBId }).upsert({
			create: {
				id: userBId,
				name: "User Beta",
				email: `${userBId}@example.com`,
				emailVerified: true,
			},
			update: {},
		});

		// User A has prayer completion log
		await db.orm.public.PrayerLog.create({
			id: prayerLogAId,
			userId: userAId,
			prayerDate: testDate,
			prayerName: "subuh",
			status: "completed",
			completedAt: toTemporalInstant("2026-09-16T05:00:00Z"),
		});

		// User A has journal entry with reflection
		await db.orm.public.JournalEntry.create({
			id: journalEntryAId,
			userId: userAId,
			journalDate: testDate,
			title: "Alpha Secret Reflection",
			content: "Private thoughts of user alpha",
			khusyuPercentage: 90,
			punctualityPercentage: 100,
		});

		await db.orm.public.JournalPrayerReflection.create({
			id: reflectionAId,
			journalEntryId: journalEntryAId,
			prayerLogId: prayerLogAId,
			prayerName: "subuh",
			feeling: "damai",
			feelingScore: 4,
			khusyuScore: 4,
		});

		// User A sets location preference
		await db.orm.public.UserLocationPreference.where({
			userId: userAId,
		}).upsert({
			create: {
				id: randomUUID(),
				userId: userAId,
				cityName: "Jakarta Pusat",
				cityId: "jkt",
				timezone: "Asia/Jakarta",
				timezoneOffset: 7,
				calculationMethodId: "kemenag",
				source: "manual",
			},
			update: {},
		});
	});

	afterAll(async () => {
		// Clean up test data
		await db.orm.public.JournalPrayerReflection.where({
			id: reflectionAId,
		}).delete();
		await db.orm.public.JournalEntry.where({ id: journalEntryAId }).delete();
		await db.orm.public.PrayerLog.where({ id: prayerLogAId }).delete();
		await db.orm.public.UserLocationPreference.where({
			userId: userAId,
		}).delete();
		await db.orm.public.UserLocationPreference.where({
			userId: userBId,
		}).delete();
		await db.orm.public.User.where({ id: userAId }).delete();
		await db.orm.public.User.where({ id: userBId }).delete();
	});

	it("isolates private journal entries and reflections between users", async () => {
		// User A reads their own entries
		const entriesA = await db.orm.public.JournalEntry.where({
			userId: userAId,
			journalDate: testDate,
		}).all();
		expect(entriesA.length).toBe(1);
		expect(entriesA[0].id).toBe(journalEntryAId);

		// User B reading the same date receives empty results
		const entriesB = await db.orm.public.JournalEntry.where({
			userId: userBId,
			journalDate: testDate,
		}).all();
		expect(entriesB.length).toBe(0);

		// User B cannot read User A's reflection
		const reflectionsB = await db.orm.public.JournalPrayerReflection.where(
			(r) => r.journalEntryId.in(entriesB.map((e) => e.id)),
		).all();
		expect(reflectionsB.length).toBe(0);
	});

	it("isolates prayer logs and completion status between users", async () => {
		// User A has 1 completed prayer
		const logsA = await db.orm.public.PrayerLog.where({
			userId: userAId,
			prayerDate: testDate,
		}).all();
		expect(logsA.length).toBe(1);
		expect(logsA[0].status).toBe("completed");

		// User B on the same date has 0 logs
		const logsB = await db.orm.public.PrayerLog.where({
			userId: userBId,
			prayerDate: testDate,
		}).all();
		expect(logsB.length).toBe(0);
	});

	it("returns not-found when User B requests User A's resource by ID", async () => {
		// Simulating server operation getJournalEntryById with User B session
		const entryLookup = await db.orm.public.JournalEntry.where({
			id: journalEntryAId,
			userId: userBId,
		}).first();

		expect(entryLookup).toBeNull();

		// Throws standard safe not-found error
		expect(() => {
			if (!entryLookup) throw notFoundError("Journal entry not found");
		}).toThrowError("Journal entry not found");
	});

	it("prevents User B from deleting User A's resource", async () => {
		// Simulating deleteJournalEntryAction with User B session
		const entryLookup = await db.orm.public.JournalEntry.where({
			id: journalEntryAId,
			userId: userBId,
		}).first();

		expect(entryLookup).toBeNull();
		// If User B tries to delete with user scope, null is returned (0 rows deleted)
		const deletedRecordB = await db.orm.public.JournalEntry.where({
			id: journalEntryAId,
			userId: userBId,
		}).delete();
		expect(deletedRecordB).toBeNull();

		// User A's entry is completely unaffected
		const originalEntry = await db.orm.public.JournalEntry.where({
			id: journalEntryAId,
		}).first();
		expect(originalEntry).not.toBeNull();
		expect(originalEntry?.id).toBe(journalEntryAId);
	});

	it("deleting journal entry preserves canonical prayer logs (onDelete SET NULL)", async () => {
		// User A deletes their own journal entry
		const deletedRecordA = await db.orm.public.JournalEntry.where({
			id: journalEntryAId,
			userId: userAId,
		}).delete();
		expect(deletedRecordA).not.toBeNull();
		expect(deletedRecordA?.id).toBe(journalEntryAId);

		// Reflection is cascade-deleted with journal
		const remainingReflections =
			await db.orm.public.JournalPrayerReflection.where({
				journalEntryId: journalEntryAId,
			}).all();
		expect(remainingReflections.length).toBe(0);

		// Crucial domain rule: prayerLog completion is NEVER deleted by journal deletion
		const preservedPrayerLog = await db.orm.public.PrayerLog.where({
			id: prayerLogAId,
			userId: userAId,
		}).first();
		expect(preservedPrayerLog).not.toBeNull();
		expect(preservedPrayerLog?.status).toBe("completed");
		expect(preservedPrayerLog?.prayerName).toBe("subuh");
	});

	it("enforces private no-store caching headers for all authenticated responses", () => {
		expect(PRIVATE_NO_STORE).toBe(
			"private, no-cache, no-store, max-age=0, must-revalidate",
		);
		expect(PRIVATE_NO_STORE.includes("public")).toBe(false);
		expect(PRIVATE_NO_STORE.includes("private")).toBe(true);
		expect(PRIVATE_NO_STORE.includes("no-store")).toBe(true);

		expect(() => setPrivateCacheControl()).not.toThrow();
	});
});
