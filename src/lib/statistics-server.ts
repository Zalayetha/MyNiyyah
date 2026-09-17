import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { setPrivateCacheControl } from "./cache";
import {
	buildJournalFeelingDistribution,
	buildJournalFeelingMatrix,
	type JournalFeelingSegment,
	type JournalFeelingStatus,
	type JournalReflectionRecord,
} from "./journal-statistics";
import {
	calculateDailyPrayerSchedule,
	type DailyPrayerSchedule,
	getNextSubuhAt,
	PRAYER_NAMES,
	type PrayerName,
} from "./prayer-calculation";
import { buildHeatmapMatrix, type HeatmapCell } from "./prayer-heatmap";
import { getCalculationMethodValues } from "./prayer-method-server";
import { db } from "./prisma";
import { parseIsoDate, parseTimezone } from "./server-validation";
import { getCurrentSession } from "./session";
import {
	addLocalDays,
	calculateElapsedCompletionRate,
	calculateJournalStreak,
	calculateKhusyuAverage,
	calculateOnTimeRate,
	calculatePrayerStreak,
	getPeriodBounds,
	type PeriodBounds,
	type PeriodDayColumn,
} from "./statistics";
import {
	formatLocalDate,
	getTimezoneOffsetHours,
	type InstantInput,
} from "./timezone";

export type StatisticsPeriod = "week" | "month";

export interface StatisticsMetric {
	percentage: number | null;
	numerator: number;
	denominator: number;
	sampleSize: number;
}

export interface StatisticsData {
	period: {
		type: StatisticsPeriod;
		label: string;
		startDate: string;
		endDate: string;
		localDate: string;
		timezone: string;
		todayDate: string;
		isCurrentPeriod: boolean;
	};
	days: PeriodDayColumn[];
	prayer: {
		matrix: HeatmapCell[][];
		completion: StatisticsMetric;
		onTime: StatisticsMetric;
		streakDays: number;
		elapsedPrayers: number;
		completedPrayers: number;
	};
	journal: {
		matrix: JournalFeelingStatus[][];
		entries: number;
		attachments: number;
		streakDays: number;
		khusyu: {
			percentage: number | null;
			average: number | null;
			sampleSize: number;
		};
		feelingDistribution: JournalFeelingSegment[];
		feelingSampleSize: number;
	};
}

interface PrayerLogStatsRow {
	prayerDate: string;
	prayerName: string;
	scheduledAt?: InstantInput;
	completedAt?: InstantInput;
	status: string;
}

interface JournalEntryStatsRow {
	id: string;
	journalDate: string;
}

interface ReflectionStatsRow {
	journalEntryId: string;
	prayerName: string;
	feeling?: string | null;
	feelingScore?: number | null;
	khusyuScore?: number | null;
}

const DEFAULT_PREF = {
	latitude: -6.2088,
	longitude: 106.8456,
	timezone: "Asia/Jakarta",
	timezoneOffset: 7,
	calculationMethodId: "kemenag",
};

export function getStatisticsDayColumns({
	localDate,
	period,
	timezone,
	referenceDate = new Date(),
}: {
	localDate: string;
	period: StatisticsPeriod;
	timezone: string;
	referenceDate?: Date;
}): PeriodDayColumn[] {
	const bounds = getPeriodBounds(localDate, period);
	const todayDate = formatLocalDate(referenceDate, timezone);
	const count = getDateSpanDays(bounds);
	return Array.from({ length: count }, (_, index) => {
		const date = addLocalDays(bounds.startDate, index);
		const [, month, day] = date.split("-").map(Number);
		const utcDate = new Date(
			Date.UTC(Number(date.slice(0, 4)), month - 1, day, 12),
		);
		const labels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
		return {
			date,
			dayLabel: labels[utcDate.getUTCDay()],
			dayNumber: `${day}/${month}`,
			isToday: date === todayDate,
		};
	});
}

export function getStatisticsPeriodLabel(
	bounds: PeriodBounds,
	period: StatisticsPeriod,
) {
	if (period === "week") return `${bounds.startDate} - ${bounds.endDate}`;
	const [year, month] = bounds.startDate.split("-");
	return `${month}/${year}`;
}

function getDateSpanDays(bounds: PeriodBounds) {
	let count = 1;
	let cursor = bounds.startDate;
	while (cursor < bounds.endDate) {
		count += 1;
		cursor = addLocalDays(cursor, 1);
	}
	return count;
}

function toMetric(result: {
	percentage: number;
	numerator: number;
	denominator: number;
	sampleSize: number;
}): StatisticsMetric {
	return {
		percentage: result.sampleSize > 0 ? result.percentage : null,
		numerator: result.numerator,
		denominator: result.denominator,
		sampleSize: result.sampleSize,
	};
}

function getWindowEndAt(schedule: DailyPrayerSchedule, prayerName: PrayerName) {
	const index = schedule.items.findIndex((item) => item.id === prayerName);
	if (index < 0) return null;
	return schedule.items[index + 1]?.scheduledAt ?? getNextSubuhAt(schedule);
}

export function buildStatisticsData({
	period,
	localDate,
	timezone,
	days,
	logs,
	entries,
	reflections,
	attachmentCount,
	schedulesByDate,
	referenceDate = new Date(),
}: {
	period: StatisticsPeriod;
	localDate: string;
	timezone: string;
	days: PeriodDayColumn[];
	logs: PrayerLogStatsRow[];
	entries: JournalEntryStatsRow[];
	reflections: ReflectionStatsRow[];
	attachmentCount: number;
	schedulesByDate: Record<string, DailyPrayerSchedule>;
	referenceDate?: Date;
}): StatisticsData {
	const bounds = getPeriodBounds(localDate, period);
	const todayDate = formatLocalDate(referenceDate, timezone);
	const logByDatePrayer = new Map(
		logs.map((log) => [
			`${log.prayerDate}:${log.prayerName.toLowerCase()}`,
			log,
		]),
	);
	const prayerRecords = days.flatMap((day) => {
		const schedule = schedulesByDate[day.date];
		if (!schedule) return [];
		return PRAYER_NAMES.map((prayerName) => {
			const log = logByDatePrayer.get(`${day.date}:${prayerName}`);
			const item = schedule.items.find(
				(scheduleItem) => scheduleItem.id === prayerName,
			);
			return {
				scheduledAt: item?.scheduledAt ?? null,
				onTimeWindowEndAt: getWindowEndAt(schedule, prayerName),
				completedAt: log?.status === "completed" ? log.completedAt : null,
			};
		});
	});
	const completedCounts = new Map<string, number>();
	for (const log of logs) {
		if (log.status !== "completed") continue;
		completedCounts.set(
			log.prayerDate,
			(completedCounts.get(log.prayerDate) ?? 0) + 1,
		);
	}
	const journalDateByEntry = new Map(
		entries.map((entry) => [entry.id, entry.journalDate]),
	);
	const journalReflections: JournalReflectionRecord[] = reflections.map(
		(row) => ({
			journalDate: journalDateByEntry.get(row.journalEntryId) ?? "",
			prayerName: row.prayerName,
			feeling: row.feeling,
			feelingScore: row.feelingScore,
			khusyuScore: row.khusyuScore,
		}),
	);
	const completion = calculateElapsedCompletionRate(
		prayerRecords,
		referenceDate,
	);
	const onTime = calculateOnTimeRate(prayerRecords);
	const khusyu = calculateKhusyuAverage(
		journalReflections.map((reflection) => ({ score: reflection.khusyuScore })),
	);
	const feelingDistribution =
		buildJournalFeelingDistribution(journalReflections);
	const feelingSampleSize = feelingDistribution.reduce(
		(total, segment) => total + segment.value,
		0,
	);

	return {
		period: {
			type: period,
			label: getStatisticsPeriodLabel(bounds, period),
			startDate: bounds.startDate,
			endDate: bounds.endDate,
			localDate,
			timezone,
			todayDate,
			isCurrentPeriod:
				todayDate >= bounds.startDate && todayDate <= bounds.endDate,
		},
		days,
		prayer: {
			matrix: buildHeatmapMatrix({
				days,
				logs: logs.map((log) => ({
					prayerDate: log.prayerDate,
					prayerName: log.prayerName,
					scheduledAt: log.scheduledAt,
					completedAt: log.completedAt,
					status: log.status,
				})),
				schedulesByDate,
				todayDate,
				referenceDate,
			}).cells,
			completion: toMetric(completion),
			onTime: toMetric(onTime),
			streakDays: calculatePrayerStreak(completedCounts, todayDate),
			elapsedPrayers: completion.denominator,
			completedPrayers: completion.numerator,
		},
		journal: {
			matrix: buildJournalFeelingMatrix(days, journalReflections),
			entries: entries.length,
			attachments: attachmentCount,
			streakDays: calculateJournalStreak(
				entries.map((entry) => entry.journalDate),
				todayDate,
			),
			khusyu: {
				percentage: khusyu.sampleSize > 0 ? khusyu.percentage : null,
				average: khusyu.average,
				sampleSize: khusyu.sampleSize,
			},
			feelingDistribution,
			feelingSampleSize,
		},
	};
}

export const getStatisticsInsightsData = createServerFn({ method: "GET" })
	.validator(
		(input: {
			period?: StatisticsPeriod;
			localDate?: string;
			clientTimezone?: string;
		}): {
			period: StatisticsPeriod;
			localDate?: string;
			clientTimezone?: string;
		} => {
			if (input?.localDate) parseIsoDate(input.localDate, "localDate");
			if (input?.clientTimezone)
				parseTimezone(input.clientTimezone, "clientTimezone");
			return {
				period: input?.period === "month" ? "month" : "week",
				localDate: input?.localDate,
				clientTimezone: input?.clientTimezone,
			};
		},
	)
	.handler(async ({ data }): Promise<StatisticsData> => {
		const session = await getCurrentSession();
		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: { redirect: "/journal/complete-statistic" },
			});
		}
		setPrivateCacheControl();
		const userId = session.user.id;
		const pref =
			(await db.orm.public.UserLocationPreference.where({ userId }).first()) ??
			DEFAULT_PREF;
		const timezone =
			pref.timezone || data.clientTimezone?.trim() || DEFAULT_PREF.timezone;
		const localDate = data.localDate ?? formatLocalDate(new Date(), timezone);
		const days = getStatisticsDayColumns({
			localDate,
			period: data.period,
			timezone,
		});
		const bounds = getPeriodBounds(localDate, data.period);
		const offset =
			typeof pref.timezoneOffset === "number"
				? pref.timezoneOffset
				: getTimezoneOffsetHours(new Date(), timezone);
		const methodId = pref.calculationMethodId ?? "kemenag";
		const methodValues = await getCalculationMethodValues(methodId);
		const schedulesByDate: Record<string, DailyPrayerSchedule> = {};
		for (const day of days) {
			schedulesByDate[day.date] = calculateDailyPrayerSchedule(day.date, {
				latitude: pref.latitude ?? DEFAULT_PREF.latitude,
				longitude: pref.longitude ?? DEFAULT_PREF.longitude,
				timezoneOffset: offset,
				timezone,
				calculationMethodId: methodId,
				methodValues,
			});
		}
		const [logs, entries] = await Promise.all([
			db.orm.public.PrayerLog.where({ userId })
				.where((log) => log.prayerDate.gte(bounds.startDate))
				.where((log) => log.prayerDate.lte(bounds.endDate))
				.select(
					"prayerDate",
					"prayerName",
					"scheduledAt",
					"completedAt",
					"status",
				)
				.all(),
			db.orm.public.JournalEntry.where({ userId })
				.where((entry) => entry.journalDate.gte(bounds.startDate))
				.where((entry) => entry.journalDate.lte(bounds.endDate))
				.select("id", "journalDate")
				.all(),
		]);
		const entryIds = entries.map((entry) => entry.id);
		const [reflections, attached] = entryIds.length
			? await Promise.all([
					db.orm.public.JournalPrayerReflection.where((reflection) =>
						reflection.journalEntryId.in(entryIds),
					)
						.select(
							"journalEntryId",
							"prayerName",
							"feeling",
							"feelingScore",
							"khusyuScore",
						)
						.all(),
					db.orm.public.JournalAttachedVerse.where((verse) =>
						verse.journalEntryId.in(entryIds),
					)
						.select("id")
						.all(),
				])
			: [[], []];

		return buildStatisticsData({
			period: data.period,
			localDate,
			timezone,
			days,
			logs,
			entries,
			reflections,
			attachmentCount: attached.length,
			schedulesByDate,
			referenceDate: new Date(),
		});
	});
