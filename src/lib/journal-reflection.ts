import type {
	DailyPrayerSchedule,
	PrayerName,
	PrayerTimeItem,
} from "./prayer-calculation";
import { PRAYER_NAMES } from "./prayer-calculation";
import {
	calculateKhusyuAverage,
	calculateOnTimeRate,
	isValidLocalDate,
} from "./statistics";
import { formatLocalDate, formatLocalTime } from "./timezone";

export const JOURNAL_DRAFT_STORAGE_KEY = "myniyyah_journal_draft";

export type FeelingLabel = "Ngantuk" | "Berat" | "Tenang" | "Khusyu'";
export type PunctualityLabel =
	| "Awal Waktu"
	| "Tepat Waktu"
	| "Terlambat"
	| "Belum Dicatat";

export const FEELING_OPTIONS: {
	label: FeelingLabel;
	score: number;
	khusyuScore: number;
	khusyuPercentage: number;
}[] = [
	{ label: "Ngantuk", score: 1, khusyuScore: 1, khusyuPercentage: 25 },
	{ label: "Berat", score: 2, khusyuScore: 2, khusyuPercentage: 50 },
	{ label: "Tenang", score: 3, khusyuScore: 3, khusyuPercentage: 75 },
	{ label: "Khusyu'", score: 4, khusyuScore: 4, khusyuPercentage: 100 },
];

export interface JournalPrayerLog {
	id?: string | null;
	prayerName: PrayerName;
	scheduledAt?: string | Date | null;
	completedAt?: string | Date | null;
	status?: string | null;
	feeling?: string | null;
	feelingScore?: number | null;
	khusyuScore?: number | null;
}

export interface PrayerMetric {
	prayerName: PrayerName;
	adzanAt: string;
	completedAt: string;
	difference: string;
	differenceMinutes: number | null;
	punctuality: PunctualityLabel;
	scheduledAt: string | null;
	completedAtIso: string | null;
	onTimeWindowEndAt: string | null;
	prayerLogId: string | null;
	feelingIndex: number | null;
	feelingLabel: FeelingLabel | null;
	feelingScore: number | null;
	khusyuScore: number | null;
}

export interface JournalDraftFeeling {
	feelingIndex: number;
	feelingLabel: FeelingLabel;
	score: number;
	khusyuScore: number;
}

export interface JournalDraftAttachedVerse {
	verseId: string;
	segmentId?: string | null;
	segmentIndex?: number;
	surahRef: string;
	quoteText: string;
}

export interface JournalDraft {
	journalDate: string;
	themeId: string | null;
	title: string;
	content: string;
	feelings: Partial<Record<PrayerName, JournalDraftFeeling>>;
	attachedVerses: JournalDraftAttachedVerse[];
}

export interface JournalSummary {
	khusyuPercentage: number;
	punctualityPercentage: number;
	khusyuSampleSize: number;
	punctualitySampleSize: number;
}

export type JournalEligibilityReason =
	| "eligible"
	| "invalid-date"
	| "future-date"
	| "day-in-progress";

export interface JournalEligibility {
	canCreate: boolean;
	canEdit: boolean;
	reason: JournalEligibilityReason;
}

function normalizeDate(value: string | Date | null | undefined): Date | null {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function getFeelingByScore(score: number | null | undefined) {
	if (!score) return null;
	return FEELING_OPTIONS[score - 1] ?? null;
}

export function getJournalDraftFeeling(
	feelingIndex: number,
): JournalDraftFeeling {
	const boundedIndex = Math.min(3, Math.max(0, Math.round(feelingIndex)));
	const option = FEELING_OPTIONS[boundedIndex];
	return {
		feelingIndex: boundedIndex,
		feelingLabel: option.label,
		score: option.score,
		khusyuScore: option.khusyuScore,
	};
}

export function calculatePunctuality(
	completedAt: Date | null,
	scheduledAt: Date | null,
	onTimeWindowEndAt: Date | null = null,
): { differenceMinutes: number | null; punctuality: PunctualityLabel } {
	if (!completedAt || !scheduledAt) {
		return { differenceMinutes: null, punctuality: "Belum Dicatat" };
	}

	const differenceMinutes = Math.round(
		(completedAt.getTime() - scheduledAt.getTime()) / 60000,
	);

	if (differenceMinutes <= 30) {
		return { differenceMinutes, punctuality: "Awal Waktu" };
	}
	if (
		(onTimeWindowEndAt &&
			completedAt.getTime() < onTimeWindowEndAt.getTime()) ||
		(!onTimeWindowEndAt && differenceMinutes <= 60)
	) {
		return { differenceMinutes, punctuality: "Tepat Waktu" };
	}
	return { differenceMinutes, punctuality: "Terlambat" };
}

export function calculatePrayerMetrics(
	scheduleItem: PrayerTimeItem,
	log?: JournalPrayerLog | null,
	timezone = "Asia/Jakarta",
	timezoneAbbreviation = "WIB",
	onTimeWindowEndAt: Date | null = null,
): PrayerMetric {
	const scheduledAt =
		normalizeDate(log?.scheduledAt) ?? scheduleItem.scheduledAt;
	const completedAt =
		log?.status === "completed" ? normalizeDate(log.completedAt) : null;
	const { differenceMinutes, punctuality } = calculatePunctuality(
		completedAt,
		scheduledAt,
		onTimeWindowEndAt,
	);
	const feeling = getFeelingByScore(log?.feelingScore ?? log?.khusyuScore);

	return {
		prayerName: scheduleItem.id,
		adzanAt: `${formatLocalTime(scheduledAt, timezone, ".")} ${timezoneAbbreviation}`,
		completedAt: completedAt
			? `${formatLocalTime(completedAt, timezone, ".")} ${timezoneAbbreviation}`
			: "Belum dicatat",
		difference: differenceMinutes === null ? "-" : `${differenceMinutes} menit`,
		differenceMinutes,
		punctuality,
		scheduledAt: scheduledAt.toISOString(),
		completedAtIso: completedAt?.toISOString() ?? null,
		onTimeWindowEndAt: onTimeWindowEndAt?.toISOString() ?? null,
		prayerLogId: log?.id ?? null,
		feelingIndex: feeling ? feeling.score - 1 : null,
		feelingLabel: feeling?.label ?? null,
		feelingScore: log?.feelingScore ?? null,
		khusyuScore: log?.khusyuScore ?? null,
	};
}

export function calculateDailyPrayerMetrics(
	schedule: DailyPrayerSchedule,
	logs: JournalPrayerLog[],
	timezone = schedule.timezone,
	timezoneAbbreviation = "WIB",
): Record<PrayerName, PrayerMetric> {
	const logsByPrayer = new Map(logs.map((log) => [log.prayerName, log]));
	return Object.fromEntries(
		schedule.items.map((item, index) => [
			item.id,
			calculatePrayerMetrics(
				item,
				logsByPrayer.get(item.id),
				timezone,
				timezoneAbbreviation,
				index < schedule.items.length - 1
					? schedule.items[index + 1].scheduledAt
					: new Date(
							schedule.items[0].scheduledAt.getTime() + 24 * 60 * 60 * 1000,
						),
			),
		]),
	) as Record<PrayerName, PrayerMetric>;
}

export function calculateJournalSummary(
	feelings: Partial<Record<PrayerName, JournalDraftFeeling>>,
	prayerMetrics: Partial<
		Record<
			PrayerName,
			Pick<PrayerMetric, "scheduledAt" | "completedAtIso" | "onTimeWindowEndAt">
		>
	>,
): JournalSummary {
	const khusyu = calculateKhusyuAverage(
		PRAYER_NAMES.map((prayerName) => ({
			score: feelings[prayerName]?.score ?? null,
		})),
	);
	const punctuality = calculateOnTimeRate(
		PRAYER_NAMES.map((prayerName) => ({
			scheduledAt: prayerMetrics[prayerName]?.scheduledAt,
			completedAt: prayerMetrics[prayerName]?.completedAtIso,
			onTimeWindowEndAt: prayerMetrics[prayerName]?.onTimeWindowEndAt,
		})),
	);

	return {
		khusyuPercentage: khusyu.percentage,
		punctualityPercentage: punctuality.percentage,
		khusyuSampleSize: khusyu.sampleSize,
		punctualitySampleSize: punctuality.sampleSize,
	};
}

export function getJournalEligibility({
	journalDate,
	todayDate,
	isyaAt,
	referenceDate = new Date(),
	isExisting = false,
}: {
	journalDate: string;
	todayDate: string;
	isyaAt?: Date | string | null;
	referenceDate?: Date;
	isExisting?: boolean;
}): JournalEligibility {
	if (!isValidLocalDate(journalDate) || !isValidLocalDate(todayDate)) {
		return { canCreate: false, canEdit: false, reason: "invalid-date" };
	}
	if (journalDate > todayDate) {
		return { canCreate: false, canEdit: false, reason: "future-date" };
	}
	if (isExisting) {
		return { canCreate: false, canEdit: true, reason: "eligible" };
	}
	if (journalDate === todayDate) {
		const isya = normalizeDate(isyaAt);
		if (!isya || referenceDate.getTime() < isya.getTime()) {
			return { canCreate: false, canEdit: false, reason: "day-in-progress" };
		}
	}
	return { canCreate: true, canEdit: false, reason: "eligible" };
}

export function createInitialJournalDraft(
	date = formatLocalDate(new Date(), "Asia/Jakarta"),
): JournalDraft {
	return {
		journalDate: date,
		themeId: null,
		title: "",
		content: "",
		feelings: {},
		attachedVerses: [],
	};
}

export function serializeJournalDraft(draft: JournalDraft): string {
	return JSON.stringify(draft);
}

export function parseJournalDraft(
	raw: string | null | undefined,
	fallbackDate?: string,
): JournalDraft {
	if (!raw) return createInitialJournalDraft(fallbackDate);
	try {
		const parsed = JSON.parse(raw) as Partial<JournalDraft>;
		return {
			...createInitialJournalDraft(fallbackDate),
			...parsed,
			journalDate:
				typeof parsed.journalDate === "string" && parsed.journalDate
					? parsed.journalDate
					: (fallbackDate ?? createInitialJournalDraft().journalDate),
			themeId: parsed.themeId ?? null,
			title: parsed.title ?? "",
			content: parsed.content ?? "",
			feelings: parsed.feelings ?? {},
			attachedVerses: Array.isArray(parsed.attachedVerses)
				? parsed.attachedVerses
				: [],
		};
	} catch {
		return createInitialJournalDraft(fallbackDate);
	}
}
