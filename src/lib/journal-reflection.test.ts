import { describe, expect, it } from "vitest";
import {
	calculateJournalSummary,
	calculatePrayerMetrics,
	createInitialJournalDraft,
	getJournalDraftFeeling,
	getJournalEligibility,
	parseJournalDraft,
	serializeJournalDraft,
} from "./journal-reflection";
import type { PrayerTimeItem } from "./prayer-calculation";

const scheduleItem: PrayerTimeItem = {
	id: "subuh",
	name: "Subuh",
	time: "04.30",
	rawTime: "04:30",
	scheduledAt: new Date("2026-09-13T21:30:00.000Z"),
};

describe("journal reflection utilities", () => {
	it("classifies <= 30 minutes after adzan as Awal Waktu", () => {
		const metric = calculatePrayerMetrics(
			scheduleItem,
			{
				prayerName: "subuh",
				status: "completed",
				completedAt: new Date("2026-09-13T22:00:00.000Z"),
			},
			"Asia/Jakarta",
			"WIB",
		);

		expect(metric.differenceMinutes).toBe(30);
		expect(metric.punctuality).toBe("Awal Waktu");
	});

	it("classifies 31-60 minutes after adzan as Tepat Waktu", () => {
		const metric = calculatePrayerMetrics(scheduleItem, {
			prayerName: "subuh",
			status: "completed",
			completedAt: new Date("2026-09-13T22:30:00.000Z"),
		});

		expect(metric.differenceMinutes).toBe(60);
		expect(metric.punctuality).toBe("Tepat Waktu");
	});

	it("classifies > 60 minutes after adzan as Terlambat", () => {
		const metric = calculatePrayerMetrics(scheduleItem, {
			prayerName: "subuh",
			status: "completed",
			completedAt: new Date("2026-09-13T22:31:00.000Z"),
		});

		expect(metric.differenceMinutes).toBe(61);
		expect(metric.punctuality).toBe("Terlambat");
	});

	it("marks missing or pending logs as Belum Dicatat", () => {
		const missing = calculatePrayerMetrics(scheduleItem, null);
		const pending = calculatePrayerMetrics(scheduleItem, {
			prayerName: "subuh",
			status: "pending",
			completedAt: new Date("2026-09-13T22:00:00.000Z"),
		});

		expect(missing.punctuality).toBe("Belum Dicatat");
		expect(missing.completedAt).toBe("Belum dicatat");
		expect(pending.punctuality).toBe("Belum Dicatat");
		expect(pending.differenceMinutes).toBeNull();
	});

	it("calculates summary percentages from feelings and punctuality", () => {
		const summary = calculateJournalSummary(
			{
				subuh: getJournalDraftFeeling(3),
				zhuhur: getJournalDraftFeeling(2),
				ashar: getJournalDraftFeeling(1),
				maghrib: getJournalDraftFeeling(0),
				isya: getJournalDraftFeeling(3),
			},
			{
				subuh: {
					scheduledAt: "2026-09-14T00:00:00Z",
					completedAtIso: "2026-09-14T00:30:00Z",
					onTimeWindowEndAt: "2026-09-14T04:00:00Z",
				},
				zhuhur: {
					scheduledAt: "2026-09-14T04:00:00Z",
					completedAtIso: "2026-09-14T05:00:00Z",
					onTimeWindowEndAt: "2026-09-14T08:00:00Z",
				},
				ashar: {
					scheduledAt: "2026-09-14T08:00:00Z",
					completedAtIso: "2026-09-14T11:01:00Z",
					onTimeWindowEndAt: "2026-09-14T11:00:00Z",
				},
				maghrib: {
					scheduledAt: "2026-09-14T11:00:00Z",
					completedAtIso: null,
					onTimeWindowEndAt: "2026-09-14T12:00:00Z",
				},
				isya: {
					scheduledAt: "2026-09-14T12:00:00Z",
					completedAtIso: "2026-09-14T12:05:00Z",
					onTimeWindowEndAt: "2026-09-14T21:00:00Z",
				},
			},
		);

		expect(summary.khusyuPercentage).toBe(70);
		expect(summary.punctualityPercentage).toBe(75);
		expect(summary.khusyuSampleSize).toBe(5);
		expect(summary.punctualitySampleSize).toBe(4);
	});

	it("excludes unanswered feelings from the khusyu average", () => {
		const summary = calculateJournalSummary(
			{ subuh: getJournalDraftFeeling(3), ashar: getJournalDraftFeeling(1) },
			{},
		);
		expect(summary.khusyuPercentage).toBe(75);
		expect(summary.khusyuSampleSize).toBe(2);
		expect(summary.punctualitySampleSize).toBe(0);
	});

	it("enforces journal create and edit eligibility by local date and Isya", () => {
		const base = {
			todayDate: "2026-09-14",
			isyaAt: "2026-09-14T12:00:00Z",
		};
		expect(
			getJournalEligibility({
				...base,
				journalDate: "2026-09-15",
				referenceDate: new Date("2026-09-14T13:00:00Z"),
			}),
		).toMatchObject({
			canCreate: false,
			canEdit: false,
			reason: "future-date",
		});
		expect(
			getJournalEligibility({
				...base,
				journalDate: "2026-09-14",
				referenceDate: new Date("2026-09-14T11:59:59Z"),
			}),
		).toMatchObject({ canCreate: false, reason: "day-in-progress" });
		expect(
			getJournalEligibility({
				...base,
				journalDate: "2026-09-14",
				referenceDate: new Date("2026-09-14T12:00:00Z"),
			}),
		).toMatchObject({ canCreate: true, reason: "eligible" });
		expect(
			getJournalEligibility({
				...base,
				journalDate: "2026-09-13",
				referenceDate: new Date("2026-09-14T10:00:00Z"),
			}),
		).toMatchObject({ canCreate: true, canEdit: false });
		expect(
			getJournalEligibility({
				...base,
				journalDate: "2026-09-14",
				referenceDate: new Date("2026-09-14T10:00:00Z"),
				isExisting: true,
			}),
		).toMatchObject({ canCreate: false, canEdit: true });
	});

	it("round-trips journal draft serialization", () => {
		const draft = createInitialJournalDraft("2026-09-14");
		draft.themeId = "pekerjaan";
		draft.feelings.subuh = getJournalDraftFeeling(2);

		expect(parseJournalDraft(serializeJournalDraft(draft))).toEqual(draft);
		expect(parseJournalDraft("not-json", "2026-09-15").journalDate).toBe(
			"2026-09-15",
		);
	});
});
