import { randomUUID } from "node:crypto";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { setPrivateCacheControl } from "./cache";
import {
	calculateDailyPrayerMetrics,
	calculateJournalSummary,
	FEELING_OPTIONS,
	type JournalDraft,
	type JournalDraftAttachedVerse,
	type JournalDraftFeeling,
	type JournalPrayerLog,
	type PrayerMetric,
} from "./journal-reflection";
import {
	calculateDailyPrayerSchedule,
	type DailyPrayerSchedule,
	PRAYER_NAMES,
	type PrayerName,
} from "./prayer-calculation";
import { db } from "./prisma";
import {
	notFoundError,
	unauthorizedError,
	validationError,
} from "./server-errors";
import {
	parseId,
	parseIsoDate,
	parsePrayerName,
	parseScore,
	parseText,
	parseTimezone,
} from "./server-validation";
import { getCurrentSession } from "./session";
import {
	formatLocalDate,
	getTimezoneAbbreviation,
	getTimezoneOffsetHours,
	normalizeInstantDate,
	serializeInstant,
	toTemporalInstant,
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
	try {
		return parseIsoDate(value, "journalDate");
	} catch {
		return null;
	}
}

function normalizePrayerName(value: string): PrayerName {
	return parsePrayerName(value);
}

function toDbFeeling(feeling: string): string {
	return feeling.toLowerCase().replace("'", "");
}

const FEELING_LABELS = new Set(FEELING_OPTIONS.map((option) => option.label));

function parseJournalDraftFeelings(
	value: unknown,
): Partial<Record<PrayerName, JournalDraftFeeling>> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw validationError("feelings is invalid.");
	}

	const feelings = value as Record<string, unknown>;
	const parsed: Partial<Record<PrayerName, JournalDraftFeeling>> = {};
	for (const prayerName of PRAYER_NAMES) {
		const raw = feelings[prayerName];
		if (raw === null || raw === undefined) continue;
		if (typeof raw !== "object" || Array.isArray(raw)) {
			throw validationError(`feelings.${prayerName} is invalid.`);
		}
		const feeling = raw as Record<string, unknown>;
		const score = parseScore(feeling.score, `feelings.${prayerName}.score`);
		const khusyuScore = parseScore(
			feeling.khusyuScore,
			`feelings.${prayerName}.khusyuScore`,
		);
		if (score === null || khusyuScore === null) {
			throw validationError(`feelings.${prayerName} is incomplete.`);
		}
		const feelingIndex = feeling.feelingIndex;
		if (
			typeof feelingIndex !== "number" ||
			!Number.isInteger(feelingIndex) ||
			feelingIndex < 0 ||
			feelingIndex > 3
		) {
			throw validationError(`feelings.${prayerName}.feelingIndex is invalid.`);
		}
		const feelingLabel = parseText(
			feeling.feelingLabel,
			`feelings.${prayerName}.feelingLabel`,
			32,
			{ required: true },
		) as JournalDraftFeeling["feelingLabel"];
		if (!FEELING_LABELS.has(feelingLabel)) {
			throw validationError(`feelings.${prayerName}.feelingLabel is invalid.`);
		}
		parsed[prayerName] = {
			feelingIndex,
			feelingLabel,
			score,
			khusyuScore,
		};
	}
	return parsed;
}

function parseAttachedVerses(value: unknown): JournalDraftAttachedVerse[] {
	if (!Array.isArray(value) || value.length > 20) {
		throw validationError("attachedVerses is invalid.");
	}
	return value.map((raw, index) => {
		if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
			throw validationError(`attachedVerses[${index}] is invalid.`);
		}
		const verse = raw as Record<string, unknown>;
		return {
			verseId: parseId(verse.verseId, `attachedVerses[${index}].verseId`),
			segmentId:
				verse.segmentId === null || verse.segmentId === undefined
					? null
					: parseId(verse.segmentId, `attachedVerses[${index}].segmentId`),
			surahRef: parseText(
				verse.surahRef,
				`attachedVerses[${index}].surahRef`,
				160,
				{ required: true },
			),
			quoteText: parseText(
				verse.quoteText,
				`attachedVerses[${index}].quoteText`,
				5_000,
				{ required: true },
			),
		};
	});
}

function getIsyaScheduledAt(schedule: DailyPrayerSchedule): Date | null {
	return schedule.items.find((item) => item.id === "isya")?.scheduledAt ?? null;
}

function hasIsyaTimeArrived(schedule: DailyPrayerSchedule, now = new Date()) {
	const isyaScheduledAt = getIsyaScheduledAt(schedule);
	return Boolean(isyaScheduledAt && now.getTime() >= isyaScheduledAt.getTime());
}

async function getUserLocationPreference(userId: string) {
	return (
		(await db.orm.public.UserLocationPreference.where({ userId }).first()) ??
		DEFAULT_JAKARTA_PREF
	);
}

async function getThemesWithCounts(
	userId: string,
): Promise<JournalThemeOption[]> {
	const [themes, entries] = await Promise.all([
		db.orm.public.JournalTheme.select("id", "slug", "title", "sortOrder").all(),
		db.orm.public.JournalEntry.where({ userId }).select("themeId").all(),
	]);
	const counts = new Map<string, number>();
	for (const entry of entries) {
		if (entry.themeId)
			counts.set(entry.themeId, (counts.get(entry.themeId) ?? 0) + 1);
	}
	return themes
		.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
		.map((row) => ({
			id: row.id,
			slug: row.slug,
			title: row.title,
			count: counts.get(row.id) ?? 0,
		}));
}

export const getJournalInitialData = createServerFn({ method: "GET" })
	.validator(
		(input: { journalDate?: string; timezone?: string } | undefined) => {
			if (!input) return undefined;
			if (input.journalDate) parseIsoDate(input.journalDate, "journalDate");
			if (input.timezone) parseTimezone(input.timezone, "timezone");
			return input;
		},
	)
	.handler(async ({ data }): Promise<JournalInitialData> => {
		const session = await getCurrentSession();
		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: { redirect: "/journal/daily-journal/create" },
			});
		}
		setPrivateCacheControl();

		const userId = session.user.id;
		const pref = await getUserLocationPreference(userId);
		const timezone = data?.timezone
			? parseTimezone(data.timezone)
			: pref.timezone || "Asia/Jakarta";
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

		const logRows = await db.orm.public.PrayerLog.where({
			userId,
			prayerDate: journalDate,
		})
			.select("id", "prayerName", "scheduledAt", "completedAt", "status")
			.all();
		const journalEntry = await db.orm.public.JournalEntry.where({
			userId,
			journalDate,
		}).first();
		const reflectionRows = journalEntry
			? await db.orm.public.JournalPrayerReflection.where({
					journalEntryId: journalEntry.id,
				})
					.select("prayerName", "feeling", "feelingScore", "khusyuScore")
					.all()
			: [];
		const reflectionsByPrayer = new Map(
			reflectionRows.map((row) => [row.prayerName, row]),
		);
		const logs = logRows.map((row) => ({
			id: row.id,
			prayerName: normalizePrayerName(row.prayerName),
			scheduledAt: serializeInstant(row.scheduledAt),
			completedAt: serializeInstant(row.completedAt),
			status: row.status,
			feeling: reflectionsByPrayer.get(row.prayerName)?.feeling ?? null,
			feelingScore:
				reflectionsByPrayer.get(row.prayerName)?.feelingScore ?? null,
			khusyuScore: reflectionsByPrayer.get(row.prayerName)?.khusyuScore ?? null,
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
	setPrivateCacheControl();
	return await getThemesWithCounts(session.user.id);
});

export const getJournalThemeEntries = createServerFn({ method: "GET" })
	.validator((input: { themeId: string }) => ({
		themeId: parseId(input?.themeId, "themeId"),
	}))
	.handler(async ({ data }): Promise<JournalThemeEntriesData> => {
		const session = await getCurrentSession();
		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: { redirect: `/journal/daily-journal/theme/${data.themeId}` },
			});
		}
		setPrivateCacheControl();

		const userId = session.user.id;
		const themeRow =
			(await db.orm.public.JournalTheme.where({ id: data.themeId }).first()) ??
			(await db.orm.public.JournalTheme.where({ slug: data.themeId }).first());
		const themeEntries = themeRow
			? await db.orm.public.JournalEntry.where({ userId, themeId: themeRow.id })
					.select(
						"id",
						"title",
						"content",
						"journalDate",
						"khusyuPercentage",
						"punctualityPercentage",
						"updatedAt",
					)
					.all()
			: [];
		const attachedCounts = new Map<string, number>();
		if (themeEntries.length) {
			const attached = await db.orm.public.JournalAttachedVerse.where((verse) =>
				verse.journalEntryId.in(themeEntries.map((entry) => entry.id)),
			)
				.select("journalEntryId")
				.all();
			for (const verse of attached)
				attachedCounts.set(
					verse.journalEntryId,
					(attachedCounts.get(verse.journalEntryId) ?? 0) + 1,
				);
		}
		const theme = themeRow
			? {
					id: themeRow.id,
					slug: themeRow.slug,
					title: themeRow.title,
					count: themeEntries.length,
				}
			: null;

		return {
			theme,
			entries: themeEntries
				.sort(
					(a, b) =>
						b.journalDate.localeCompare(a.journalDate) ||
						(normalizeInstantDate(b.updatedAt)?.getTime() ?? 0) -
							(normalizeInstantDate(a.updatedAt)?.getTime() ?? 0),
				)
				.map((row) => ({
					id: row.id,
					title: row.title,
					content: row.content,
					journalDate: row.journalDate,
					khusyuPercentage: row.khusyuPercentage,
					punctualityPercentage: row.punctualityPercentage,
					attachedVerseCount: attachedCounts.get(row.id) ?? 0,
				})),
		};
	});

export const saveJournalEntryAction = createServerFn({ method: "POST" })
	.validator((input: JournalDraft) => input)
	.handler(async ({ data }) => {
		const session = await getCurrentSession();
		if (!session?.user) throw unauthorizedError();
		setPrivateCacheControl();

		const userId = session.user.id;
		const journalDate = normalizeJournalDate(data.journalDate);
		if (!journalDate) throw validationError("journalDate is invalid.");
		const themeId =
			data.themeId === null ? null : parseId(data.themeId, "themeId");
		const title = parseText(data.title, "title", 160) || "Muhasabah Harian";
		const content = parseText(data.content, "content", 20_000);
		const feelings = parseJournalDraftFeelings(data.feelings);
		const attachedVerses = parseAttachedVerses(data.attachedVerses);

		const initialData = await getJournalInitialData({
			data: { journalDate },
		});
		if (!hasIsyaTimeArrived(initialData.schedule)) {
			throw new Error(
				"Jurnal harian baru bisa disimpan setelah waktu Isya tiba.",
			);
		}

		const summary = calculateJournalSummary(
			feelings,
			initialData.prayerMetrics,
		);
		const journalEntryId = await db.transaction(async (tx) => {
			const entry = await tx.orm.public.JournalEntry.where({
				userId,
				journalDate,
			}).upsert({
				create: {
					id: randomUUID(),
					userId,
					journalDate,
					themeId,
					title,
					content,
					khusyuPercentage: summary.khusyuPercentage,
					punctualityPercentage: summary.punctualityPercentage,
				},
				update: {
					themeId,
					title,
					content,
					khusyuPercentage: summary.khusyuPercentage,
					punctualityPercentage: summary.punctualityPercentage,
				},
			});
			await tx.orm.public.JournalPrayerReflection.where({
				journalEntryId: entry.id,
			}).delete();

			for (const prayerName of PRAYER_NAMES) {
				const metric = initialData.prayerMetrics[prayerName];
				const feeling = feelings[prayerName];
				const scheduleItem = initialData.schedule.items.find(
					(item) => item.id === prayerName,
				);
				const prayerLog = await tx.orm.public.PrayerLog.where({
					userId,
					prayerDate: journalDate,
					prayerName,
				}).upsert({
					create: {
						id: randomUUID(),
						userId,
						prayerDate: journalDate,
						prayerName,
						scheduledAt: toTemporalInstant(scheduleItem?.scheduledAt),
					},
					update: { scheduledAt: toTemporalInstant(scheduleItem?.scheduledAt) },
				});

				await tx.orm.public.JournalPrayerReflection.create({
					id: randomUUID(),
					journalEntryId: entry.id,
					prayerLogId: prayerLog.id ?? metric.prayerLogId,
					prayerName,
					adzanAt: toTemporalInstant(metric.scheduledAt),
					completedAt: toTemporalInstant(metric.completedAtIso),
					differenceMinutes: metric.differenceMinutes,
					punctuality: metric.punctuality,
					feeling: feeling ? toDbFeeling(feeling.feelingLabel) : null,
					feelingScore: feeling?.score ?? null,
					khusyuScore: feeling?.khusyuScore ?? null,
				});
			}

			await tx.orm.public.JournalAttachedVerse.where({
				journalEntryId: entry.id,
			}).delete();

			for (const verse of attachedVerses) {
				await tx.orm.public.JournalAttachedVerse.create({
					id: randomUUID(),
					journalEntryId: entry.id,
					verseId: verse.verseId,
					segmentId: verse.segmentId ?? null,
					quoteText: verse.quoteText,
					surahRef: verse.surahRef,
				});
			}
			return entry.id;
		});

		return {
			success: true,
			journalId: journalEntryId,
			...summary,
		};
	});

export const getJournalEntryById = createServerFn({ method: "GET" })
	.validator((input: { entryId: string }) => ({
		entryId: parseId(input?.entryId, "entryId"),
	}))
	.handler(async ({ data }) => {
		const session = await getCurrentSession();
		if (!session?.user) throw unauthorizedError();
		setPrivateCacheControl();

		const entry = await db.orm.public.JournalEntry.where({
			id: data.entryId,
			userId: session.user.id,
		}).first();

		if (!entry) {
			throw notFoundError("Journal entry not found");
		}

		const [reflections, attachedVerses] = await Promise.all([
			db.orm.public.JournalPrayerReflection.where({
				journalEntryId: entry.id,
			}).all(),
			db.orm.public.JournalAttachedVerse.where({
				journalEntryId: entry.id,
			}).all(),
		]);

		return {
			entry,
			reflections,
			attachedVerses,
		};
	});

export const deleteJournalEntryAction = createServerFn({ method: "POST" })
	.validator((input: { entryId: string }) => ({
		entryId: parseId(input?.entryId, "entryId"),
	}))
	.handler(async ({ data }) => {
		const session = await getCurrentSession();
		if (!session?.user) throw unauthorizedError();
		setPrivateCacheControl();

		const entry = await db.orm.public.JournalEntry.where({
			id: data.entryId,
			userId: session.user.id,
		}).first();

		if (!entry) {
			throw notFoundError("Journal entry not found");
		}

		await db.orm.public.JournalEntry.where({
			id: entry.id,
			userId: session.user.id,
		}).delete();

		return { success: true };
	});
