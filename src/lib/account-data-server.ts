import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth";
import { setPrivateCacheControl } from "./cache";
import { db } from "./prisma";
import { unauthorizedError, validationError } from "./server-errors";
import { parseText } from "./server-validation";
import { getCurrentSession } from "./session";
import { serializeInstant } from "./timezone";

export const ACCOUNT_EXPORT_VERSION = 1;

type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

type AccountExportPayload = {
	version: typeof ACCOUNT_EXPORT_VERSION;
	exportedAt: string;
	user: {
		id: string;
		name: string;
		email: string;
		emailVerified: boolean;
		image: string | null;
		createdAt: string | null;
		updatedAt: string | null;
	};
	profile: JsonValue;
	preferences: JsonValue;
	location: JsonValue;
	prayerLogs: JsonValue[];
	journals: JsonValue[];
};

function toExportJson(value: unknown): JsonValue {
	if (value === null || value === undefined) return null;
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return value;
	}
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(toExportJson);
	if (typeof value === "object") {
		const maybeJson = value as { toJSON?: () => unknown };
		if (typeof maybeJson.toJSON === "function") {
			return toExportJson(maybeJson.toJSON());
		}
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, toExportJson(item)]),
		);
	}
	return String(value);
}

export const exportAccountDataAction = createServerFn({
	method: "GET",
}).handler(async (): Promise<AccountExportPayload> => {
	const session = await getCurrentSession();
	if (!session?.user) throw unauthorizedError();
	setPrivateCacheControl();

	const userId = session.user.id;
	const [user, profile, preferences, location, prayerLogs, journalEntries] =
		await Promise.all([
			db.orm.public.User.where({ id: userId }).first(),
			db.orm.public.UserProfile.where({ userId }).first(),
			db.orm.public.UserPreference.where({ userId }).first(),
			db.orm.public.UserLocationPreference.where({ userId }).first(),
			db.orm.public.PrayerLog.where({ userId }).all(),
			db.orm.public.JournalEntry.where({ userId }).all(),
		]);

	if (!user) throw unauthorizedError();

	const journalIds = journalEntries.map((entry) => entry.id);
	const [reflections, attachedVerses] = journalIds.length
		? await Promise.all([
				db.orm.public.JournalPrayerReflection.where((reflection) =>
					reflection.journalEntryId.in(journalIds),
				).all(),
				db.orm.public.JournalAttachedVerse.where((verse) =>
					verse.journalEntryId.in(journalIds),
				).all(),
			])
		: [[], []];

	return {
		version: ACCOUNT_EXPORT_VERSION,
		exportedAt: new Date().toISOString(),
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			emailVerified: user.emailVerified,
			image: user.image,
			createdAt: serializeInstant(user.createdAt),
			updatedAt: serializeInstant(user.updatedAt),
		},
		profile: toExportJson(profile),
		preferences: toExportJson(preferences),
		location: toExportJson(location),
		prayerLogs: prayerLogs.map(toExportJson),
		journals: journalEntries.map((entry) =>
			toExportJson({
				...entry,
				reflections: reflections.filter(
					(reflection) => reflection.journalEntryId === entry.id,
				),
				attachedVerses: attachedVerses.filter(
					(verse) => verse.journalEntryId === entry.id,
				),
			}),
		),
	};
});

export const deleteAccountAction = createServerFn({ method: "POST" })
	.validator((input: Record<string, unknown>) => ({
		password: parseText(input.password, "password", 128, { required: true }),
	}))
	.handler(async ({ data }) => {
		const session = await getCurrentSession();
		if (!session?.user) throw unauthorizedError();
		setPrivateCacheControl();

		try {
			await auth.api.verifyPassword({
				headers: getRequestHeaders(),
				body: { password: data.password },
			});
		} catch {
			throw validationError("Password confirmation failed.");
		}

		const userId = session.user.id;
		await db.transaction(async (tx) => {
			const entries = await tx.orm.public.JournalEntry.where({ userId })
				.select("id")
				.all();
			const journalEntryIds = entries.map((entry) => entry.id);

			if (journalEntryIds.length) {
				await tx.orm.public.JournalPrayerReflection.where((reflection) =>
					reflection.journalEntryId.in(journalEntryIds),
				).delete();
				await tx.orm.public.JournalAttachedVerse.where((verse) =>
					verse.journalEntryId.in(journalEntryIds),
				).delete();
			}

			await tx.orm.public.JournalEntry.where({ userId }).delete();
			await tx.orm.public.PrayerLog.where({ userId }).delete();
			await tx.orm.public.UserLocationPreference.where({ userId }).delete();
			await tx.orm.public.UserPreference.where({ userId }).delete();
			await tx.orm.public.UserProfile.where({ userId }).delete();
			await tx.orm.public.Session.where({ userId }).delete();
			await tx.orm.public.Account.where({ userId }).delete();
			await tx.orm.public.User.where({ id: userId }).delete();
		});

		return { success: true };
	});
