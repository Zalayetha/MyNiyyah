import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { pool } from "./db";
import {
	calculateDailyPrayerMetrics,
	calculateJournalSummary,
	type JournalDraft,
	type JournalPrayerLog,
	type PrayerMetric,
} from "./journal-reflection";
import {
	calculateDailyPrayerSchedule,
	type DailyPrayerSchedule,
	PRAYER_NAMES,
	type PrayerName,
} from "./prayer-calculation";
import { getCurrentSession } from "./session";
import {
	formatLocalDate,
	getTimezoneAbbreviation,
	getTimezoneOffsetHours,
} from "./timezone";

const DEFAULT_JAKARTA_PREF = {
	cityId: "jkt",
	cityName: "Jakarta Pusat",
	latitude: -6.2088,
	longitude: 106.8456,
	timezone: "Asia/Jakarta",
	timezoneOffset: 7,
	calculationMethodId: "kemenag",
};

export interface JournalThemeOption {
	id: string;
	slug: string;
	title: string;
	count: number;
}

export interface JournalInitialData {
	journalDate: string;
	timezone: string;
	timezoneAbbreviation: string;
	schedule: DailyPrayerSchedule;
	logs: JournalPrayerLog[];
	prayerMetrics: Record<PrayerName, PrayerMetric>;
	themes: JournalThemeOption[];
	canSaveJournal: boolean;
	isyaScheduledAt: string | null;
}

export interface JournalThemeEntry {
	id: string;
	title: string;
	content: string;
	journalDate: string;
	khusyuPercentage: number | null;
	punctualityPercentage: number | null;
	attachedVerseCount: number;
}

export interface JournalThemeEntriesData {
	theme: JournalThemeOption | null;
	entries: JournalThemeEntry[];
}

function normalizeJournalDate(value?: string | null): string | null {
	if (!value) return null;
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function normalizePrayerName(value: string): PrayerName {
	const normalized = value.toLowerCase().trim();
	if (!PRAYER_NAMES.includes(normalized as PrayerName)) {
		throw new Error(`Invalid prayer name: ${value}`);
	}
	return normalized as PrayerName;
}

function toDbFeeling(feeling: string): string {
	return feeling.toLowerCase().replace("'", "");
}

function getIsyaScheduledAt(schedule: DailyPrayerSchedule): Date | null {
	return schedule.items.find((item) => item.id === "isya")?.scheduledAt ?? null;
}

function hasIsyaTimeArrived(schedule: DailyPrayerSchedule, now = new Date()) {
	const isyaScheduledAt = getIsyaScheduledAt(schedule);
	return Boolean(isyaScheduledAt && now.getTime() >= isyaScheduledAt.getTime());
}

async function getUserLocationPreference(userId: string) {
	const prefResult = await pool.query(
		`SELECT * FROM "userLocationPreference" WHERE "userId" = $1`,
		[userId],
	);
	return prefResult.rows[0] ?? DEFAULT_JAKARTA_PREF;
}

async function getThemesWithCounts(
	userId: string,
): Promise<JournalThemeOption[]> {
	const result = await pool.query(
		`SELECT
			t.id,
			t.slug,
			t.title,
			COUNT(e.id)::int AS count
		 FROM "journalTheme" t
		 LEFT JOIN "journalEntry" e
			ON e."themeId" = t.id AND e."userId" = $1
		 GROUP BY t.id, t.slug, t.title, t."sortOrder"
		 ORDER BY t."sortOrder" ASC, t.title ASC`,
		[userId],
	);

	return result.rows.map((row) => ({
		id: row.id,
		slug: row.slug,
		title: row.title,
		count: Number(row.count ?? 0),
	}));
}

export const getJournalInitialData = createServerFn({ method: "GET" })
	.validator(
		(input: { journalDate?: string; timezone?: string } | undefined) => input,
	)
	.handler(async ({ data }): Promise<JournalInitialData> => {
		const session = await getCurrentSession();
		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: { redirect: "/journal/daily-journal/create" },
			});
		}

		const userId = session.user.id;
		const pref = await getUserLocationPreference(userId);
		const timezone = data?.timezone?.trim() || pref.timezone || "Asia/Jakarta";
		const timezoneOffset =
			typeof pref.timezoneOffset === "number"
				? pref.timezoneOffset
				: getTimezoneOffsetHours(new Date(), timezone);
		const journalDate =
			normalizeJournalDate(data?.journalDate) ??
			formatLocalDate(new Date(), timezone);

		const schedule = calculateDailyPrayerSchedule(journalDate, {
			latitude: pref.latitude ?? DEFAULT_JAKARTA_PREF.latitude,
			longitude: pref.longitude ?? DEFAULT_JAKARTA_PREF.longitude,
			timezoneOffset,
			timezone,
			calculationMethodId: pref.calculationMethodId ?? "kemenag",
		});

		const logsResult = await pool.query(
			`SELECT id, "prayerName", "scheduledAt", "completedAt", status, feeling, "feelingScore", "khusyuScore"
			 FROM "prayerLog"
			 WHERE "userId" = $1 AND "prayerDate" = $2`,
			[userId, journalDate],
		);
		const logs = logsResult.rows.map((row) => ({
			id: row.id,
			prayerName: normalizePrayerName(row.prayerName),
			scheduledAt: row.scheduledAt,
			completedAt: row.completedAt,
			status: row.status,
			feeling: row.feeling,
			feelingScore: row.feelingScore,
			khusyuScore: row.khusyuScore,
		}));
		const timezoneAbbreviation = getTimezoneAbbreviation(
			timezone,
			timezoneOffset,
		);

		return {
			journalDate,
			timezone,
			timezoneAbbreviation,
			schedule,
			logs,
			prayerMetrics: calculateDailyPrayerMetrics(
				schedule,
				logs,
				timezone,
				timezoneAbbreviation,
			),
			themes: await getThemesWithCounts(userId),
			canSaveJournal: hasIsyaTimeArrived(schedule),
			isyaScheduledAt: getIsyaScheduledAt(schedule)?.toISOString() ?? null,
		};
	});

export const getJournalCategoryCounts = createServerFn({
	method: "GET",
}).handler(async (): Promise<JournalThemeOption[]> => {
	const session = await getCurrentSession();
	if (!session?.user) {
		throw redirect({
			to: "/login",
			search: { redirect: "/journal/daily-journal" },
		});
	}
	return await getThemesWithCounts(session.user.id);
});

export const getJournalThemeEntries = createServerFn({ method: "GET" })
	.validator((input: { themeId: string }) => input)
	.handler(async ({ data }): Promise<JournalThemeEntriesData> => {
		const session = await getCurrentSession();
		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: { redirect: `/journal/daily-journal/theme/${data.themeId}` },
			});
		}

		const userId = session.user.id;
		const themeResult = await pool.query(
			`SELECT
				t.id,
				t.slug,
				t.title,
				COUNT(e.id)::int AS count
			 FROM "journalTheme" t
			 LEFT JOIN "journalEntry" e
				ON e."themeId" = t.id AND e."userId" = $2
			 WHERE t.id = $1 OR t.slug = $1
			 GROUP BY t.id, t.slug, t.title, t."sortOrder"
			 LIMIT 1`,
			[data.themeId, userId],
		);
		const theme = themeResult.rows[0]
			? {
					id: themeResult.rows[0].id,
					slug: themeResult.rows[0].slug,
					title: themeResult.rows[0].title,
					count: Number(themeResult.rows[0].count ?? 0),
				}
			: null;

		const entriesResult = await pool.query(
			`SELECT
				e.id,
				e.title,
				e.content,
				e."journalDate",
				e."khusyuPercentage",
				e."punctualityPercentage",
				COUNT(a.id)::int AS "attachedVerseCount"
			 FROM "journalEntry" e
			 LEFT JOIN "journalAttachedVerse" a ON a."journalEntryId" = e.id
			 WHERE e."userId" = $1
				AND ($2::text IS NULL OR e."themeId" = $2)
			 GROUP BY e.id
			 ORDER BY e."journalDate" DESC, e."updatedAt" DESC`,
			[userId, theme?.id ?? null],
		);

		return {
			theme,
			entries: entriesResult.rows.map((row) => ({
				id: row.id,
				title: row.title,
				content: row.content,
				journalDate: row.journalDate,
				khusyuPercentage: row.khusyuPercentage,
				punctualityPercentage: row.punctualityPercentage,
				attachedVerseCount: Number(row.attachedVerseCount ?? 0),
			})),
		};
	});

export const saveJournalEntryAction = createServerFn({ method: "POST" })
	.validator((input: JournalDraft) => input)
	.handler(async ({ data }) => {
		const session = await getCurrentSession();
		if (!session?.user) throw new Error("Unauthorized");

		const userId = session.user.id;
		const journalDate = normalizeJournalDate(data.journalDate);
		if (!journalDate) throw new Error("Invalid journal date");

		const initialData = await getJournalInitialData({
			data: { journalDate },
		});
		if (!hasIsyaTimeArrived(initialData.schedule)) {
			throw new Error(
				"Jurnal harian baru bisa disimpan setelah waktu Isya tiba.",
			);
		}

		const summary = calculateJournalSummary(
			data.feelings,
			initialData.prayerMetrics,
		);
		const title = data.title.trim() || "Muhasabah Harian";
		const content = data.content.trim();

		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			const entryResult = await client.query(
				`INSERT INTO "journalEntry" (
					id, "userId", "journalDate", "themeId", title, content,
					"khusyuPercentage", "punctualityPercentage", "createdAt", "updatedAt"
				) VALUES (
					gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, now(), now()
				)
				ON CONFLICT ("userId", "journalDate") DO UPDATE SET
					"themeId" = EXCLUDED."themeId",
					title = EXCLUDED.title,
					content = EXCLUDED.content,
					"khusyuPercentage" = EXCLUDED."khusyuPercentage",
					"punctualityPercentage" = EXCLUDED."punctualityPercentage",
					"updatedAt" = now()
				RETURNING id`,
				[
					userId,
					journalDate,
					data.themeId,
					title,
					content,
					summary.khusyuPercentage,
					summary.punctualityPercentage,
				],
			);
			const journalEntryId = entryResult.rows[0].id as string;

			await client.query(
				`DELETE FROM "journalPrayerReflection" WHERE "journalEntryId" = $1`,
				[journalEntryId],
			);

			for (const prayerName of PRAYER_NAMES) {
				const metric = initialData.prayerMetrics[prayerName];
				const feeling = data.feelings[prayerName];
				const scheduleItem = initialData.schedule.items.find(
					(item) => item.id === prayerName,
				);
				const prayerLogResult = await client.query(
					`INSERT INTO "prayerLog" (
						id, "userId", "prayerDate", "prayerName", "scheduledAt",
						feeling, "feelingScore", "khusyuScore", "createdAt", "updatedAt"
					) VALUES (
						gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, now(), now()
					)
					ON CONFLICT ("userId", "prayerDate", "prayerName") DO UPDATE SET
						"scheduledAt" = COALESCE("prayerLog"."scheduledAt", EXCLUDED."scheduledAt"),
						feeling = EXCLUDED.feeling,
						"feelingScore" = EXCLUDED."feelingScore",
						"khusyuScore" = EXCLUDED."khusyuScore",
						"updatedAt" = now()
					RETURNING id`,
					[
						userId,
						journalDate,
						prayerName,
						scheduleItem?.scheduledAt ?? null,
						feeling ? toDbFeeling(feeling.feelingLabel) : null,
						feeling?.score ?? null,
						feeling?.khusyuScore ?? null,
					],
				);
				const prayerLogId = prayerLogResult.rows[0]?.id ?? metric.prayerLogId;

				await client.query(
					`INSERT INTO "journalPrayerReflection" (
						id, "journalEntryId", "prayerLogId", "prayerName", "adzanAt",
						"completedAt", "differenceMinutes", punctuality, feeling,
						"feelingScore", "khusyuScore", "createdAt", "updatedAt"
					) VALUES (
						gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now()
					)`,
					[
						journalEntryId,
						prayerLogId,
						prayerName,
						metric.scheduledAt,
						metric.completedAtIso,
						metric.differenceMinutes,
						metric.punctuality,
						feeling ? toDbFeeling(feeling.feelingLabel) : null,
						feeling?.score ?? null,
						feeling?.khusyuScore ?? null,
					],
				);
			}

			await client.query(
				`DELETE FROM "journalAttachedVerse" WHERE "journalEntryId" = $1`,
				[journalEntryId],
			);

			for (const verse of data.attachedVerses) {
				await client.query(
					`INSERT INTO "journalAttachedVerse" (
						id, "journalEntryId", "verseId", "segmentId", "quoteText", "surahRef", "createdAt"
					) VALUES (
						gen_random_uuid()::text, $1, $2, $3, $4, $5, now()
					)
					ON CONFLICT ("journalEntryId", "verseId", "segmentId") DO UPDATE SET
						"quoteText" = EXCLUDED."quoteText",
						"surahRef" = EXCLUDED."surahRef"`,
					[
						journalEntryId,
						verse.verseId,
						verse.segmentId ?? null,
						verse.quoteText,
						verse.surahRef,
					],
				);
			}

			await client.query("COMMIT");
			return {
				success: true,
				journalId: journalEntryId,
				...summary,
			};
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	});
