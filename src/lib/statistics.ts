import {
	formatLocalDate,
	type InstantInput,
	normalizeInstantDate,
} from "./timezone";

export interface RateResult {
	percentage: number;
	numerator: number;
	denominator: number;
	sampleSize: number;
}

export interface PrayerMetricRecord {
	scheduledAt?: InstantInput;
	onTimeWindowEndAt?: InstantInput;
	completedAt?: InstantInput;
}

export interface ScoredReflection {
	score?: number | null;
}

export interface FeelingReflection extends ScoredReflection {
	label?: string | null;
}

export interface PeriodBounds {
	startDate: string;
	endDate: string;
}

export interface PeriodDayColumn {
	date: string;
	dayLabel: string;
	dayNumber: string;
	isToday: boolean;
}

const INDONESIAN_DAY_ABBRS = [
	"Min",
	"Sen",
	"Sel",
	"Rab",
	"Kam",
	"Jum",
	"Sab",
] as const;

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function percentage(numerator: number, denominator: number): number {
	return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
}

export function isValidLocalDate(value: string): boolean {
	if (!LOCAL_DATE_PATTERN.test(value)) return false;
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day, 12));
	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}

export function addLocalDays(localDate: string, days: number): string {
	if (!isValidLocalDate(localDate)) throw new Error("Invalid local date");
	const [year, month, day] = localDate.split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day + days, 12));
	return date.toISOString().slice(0, 10);
}

export function calculateElapsedCompletionRate(
	records: PrayerMetricRecord[],
	referenceDate: Date = new Date(),
): RateResult {
	const referenceMs = referenceDate.getTime();
	const elapsed = records.filter((record) => {
		const scheduledAt = normalizeInstantDate(record.scheduledAt);
		return scheduledAt !== null && scheduledAt.getTime() <= referenceMs;
	});
	const completed = elapsed.filter(
		(record) => normalizeInstantDate(record.completedAt) !== null,
	).length;

	return {
		percentage: percentage(completed, elapsed.length),
		numerator: completed,
		denominator: elapsed.length,
		sampleSize: elapsed.length,
	};
}

export function calculateOnTimeRate(records: PrayerMetricRecord[]): RateResult {
	const validCompletions = records.flatMap((record) => {
		const scheduledAt = normalizeInstantDate(record.scheduledAt);
		const windowEndAt = normalizeInstantDate(record.onTimeWindowEndAt);
		const completedAt = normalizeInstantDate(record.completedAt);
		return scheduledAt && windowEndAt && completedAt
			? [{ scheduledAt, windowEndAt, completedAt }]
			: [];
	});
	const onTime = validCompletions.filter(
		({ scheduledAt, windowEndAt, completedAt }) =>
			completedAt.getTime() >= scheduledAt.getTime() &&
			completedAt.getTime() < windowEndAt.getTime(),
	).length;

	return {
		percentage: percentage(onTime, validCompletions.length),
		numerator: onTime,
		denominator: validCompletions.length,
		sampleSize: validCompletions.length,
	};
}

export function calculateKhusyuAverage(
	reflections: ScoredReflection[],
	maximumScore = 4,
): { average: number | null; percentage: number; sampleSize: number } {
	const scores = reflections
		.map((reflection) => reflection.score)
		.filter(
			(score): score is number =>
				typeof score === "number" &&
				Number.isFinite(score) &&
				score > 0 &&
				score <= maximumScore,
		);
	const total = scores.reduce((sum, score) => sum + score, 0);
	const average = scores.length === 0 ? null : total / scores.length;

	return {
		average,
		percentage:
			average === null || maximumScore <= 0
				? 0
				: Math.round((average / maximumScore) * 100),
		sampleSize: scores.length,
	};
}

export function calculateFeelingDistribution<T extends string>(
	reflections: FeelingReflection[],
	labels: readonly T[],
): { counts: Record<T, number>; sampleSize: number } {
	const counts = Object.fromEntries(
		labels.map((label) => [label, 0]),
	) as Record<T, number>;
	let sampleSize = 0;

	for (const reflection of reflections) {
		const label = reflection.label as T | null | undefined;
		if (!label || !Object.hasOwn(counts, label)) continue;
		counts[label] += 1;
		sampleSize += 1;
	}

	return { counts, sampleSize };
}

function calculateDateStreak(
	completedDates: Iterable<string>,
	todayDate: string,
): number {
	if (!isValidLocalDate(todayDate)) throw new Error("Invalid local date");
	const dates = new Set(
		Array.from(completedDates).filter((date) => isValidLocalDate(date)),
	);
	let cursor = dates.has(todayDate) ? todayDate : addLocalDays(todayDate, -1);
	let streak = 0;
	while (dates.has(cursor)) {
		streak += 1;
		cursor = addLocalDays(cursor, -1);
	}
	return streak;
}

export function calculatePrayerStreak(
	loggedPrayerCounts: ReadonlyMap<string, number> | Record<string, number>,
	todayDate: string,
): number {
	const entries =
		loggedPrayerCounts instanceof Map
			? loggedPrayerCounts.entries()
			: Object.entries(loggedPrayerCounts);
	const completedDates = Array.from(entries)
		.filter(([, count]) => count >= 5)
		.map(([date]) => date);
	return calculateDateStreak(completedDates, todayDate);
}

export function calculateJournalStreak(
	journalDates: Iterable<string>,
	todayDate: string,
): number {
	return calculateDateStreak(journalDates, todayDate);
}

export function getPeriodBounds(
	localDate: string,
	period: "week" | "month",
): PeriodBounds {
	if (!isValidLocalDate(localDate)) throw new Error("Invalid local date");
	const [year, month, day] = localDate.split("-").map(Number);
	if (period === "month") {
		const end = new Date(Date.UTC(year, month, 0, 12));
		return {
			startDate: `${year}-${String(month).padStart(2, "0")}-01`,
			endDate: end.toISOString().slice(0, 10),
		};
	}

	const date = new Date(Date.UTC(year, month - 1, day, 12));
	const daysSinceMonday = (date.getUTCDay() + 6) % 7;
	const startDate = addLocalDays(localDate, -daysSinceMonday);
	return { startDate, endDate: addLocalDays(startDate, 6) };
}

export function getWeekDayColumns(
	localDate: string,
	count = 7,
	timeZone = "Asia/Jakarta",
	referenceDate: Date = new Date(),
): PeriodDayColumn[] {
	const { startDate } = getPeriodBounds(localDate, "week");
	const todayDate = formatLocalDate(referenceDate, timeZone);

	return Array.from({ length: count }, (_, index) => {
		const date = addLocalDays(startDate, index);
		const [year, month, day] = date.split("-").map(Number);
		const utcDate = new Date(Date.UTC(year, month - 1, day, 12));
		return {
			date,
			dayLabel: INDONESIAN_DAY_ABBRS[utcDate.getUTCDay()],
			dayNumber: `${day}/${month}`,
			isToday: date === todayDate,
		};
	});
}
