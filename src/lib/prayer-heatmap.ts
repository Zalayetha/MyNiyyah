import {
	type DailyPrayerSchedule,
	PRAYER_NAMES,
	type PrayerName,
} from "./prayer-calculation";
import { formatLocalDate } from "./timezone";

export type HeatmapStatus = 0 | 1 | 2 | 3 | null;

export const HEATMAP_STATUS_LABELS: Record<
	0 | 1 | 2 | 3,
	{ label: string; className: string }
> = {
	0: { label: "Ditunaikan", className: "bg-primary" },
	1: { label: "Terlambat", className: "bg-lime-200" },
	2: { label: "Berat", className: "bg-orange-300" },
	3: { label: "Tertinggal", className: "bg-cyan-900" },
};

export interface HeatmapDayColumn {
	date: string; // "YYYY-MM-DD"
	dayLabel: string; // "Jum", "Sab", "Min", "Sen", "Sel", "Rab", "Kam"
	dayNumber: string; // "14/9"
	isToday: boolean;
}

export interface PrayerHeatmapLog {
	prayerDate: string;
	prayerName: string;
	scheduledAt?: Date | string | null;
	completedAt?: Date | string | null;
	status: string;
	feeling?: string | null;
	feelingScore?: number | null;
	khusyuScore?: number | null;
}

export interface HeatmapCell {
	prayerName: PrayerName;
	prayerDate: string;
	status: HeatmapStatus;
	statusLabel: string;
	completedAt?: string | null;
}

export type HeatmapMatrix = HeatmapCell[][];

export interface HeatmapDataResponse {
	days: HeatmapDayColumn[];
	matrix: HeatmapStatus[][]; // 5 rows x 7 cols
	cells: HeatmapMatrix;
}

export interface DonutFeelingSegment {
	label: "Khusyu'" | "Tenang" | "Berat" | "Ngantuk";
	value: number;
	color: string;
}

const FEELING_SEGMENTS: DonutFeelingSegment[] = [
	{ label: "Khusyu'", value: 0, color: "#47E1CF" },
	{ label: "Tenang", value: 0, color: "#0B8F8C" },
	{ label: "Berat", value: 0, color: "#C33C54" },
	{ label: "Ngantuk", value: 0, color: "#3C1642" },
];

const INDONESIAN_DAY_ABBRS = [
	"Min",
	"Sen",
	"Sel",
	"Rab",
	"Kam",
	"Jum",
	"Sab",
] as const;

function normalizeFeelingText(feeling: string) {
	return feeling.toLowerCase().trim().replace(/[’']/g, "").replace(/\s+/g, " ");
}

function getFeelingLabelFromLog(
	log: PrayerHeatmapLog,
): DonutFeelingSegment["label"] | null {
	const score =
		typeof log.feelingScore === "number"
			? log.feelingScore
			: typeof log.khusyuScore === "number"
				? log.khusyuScore
				: null;

	if (score === 4) return "Khusyu'";
	if (score === 3) return "Tenang";
	if (score === 2) return "Berat";
	if (score === 1) return "Ngantuk";

	const normalizedFeeling = normalizeFeelingText(log.feeling ?? "");
	if (normalizedFeeling === "khusyu") return "Khusyu'";
	if (normalizedFeeling === "tenang") return "Tenang";
	if (normalizedFeeling === "berat") return "Berat";
	if (normalizedFeeling === "ngantuk") return "Ngantuk";

	return null;
}

export function buildFeelingDistribution(
	logs: PrayerHeatmapLog[],
): DonutFeelingSegment[] {
	const counts = new Map<DonutFeelingSegment["label"], number>(
		FEELING_SEGMENTS.map((segment) => [segment.label, 0]),
	);

	for (const log of logs) {
		const label = getFeelingLabelFromLog(log);
		if (!label) continue;
		counts.set(label, (counts.get(label) ?? 0) + 1);
	}

	return FEELING_SEGMENTS.map((segment) => ({
		...segment,
		value: counts.get(segment.label) ?? 0,
	}));
}

/**
 * Generates HeatmapDayColumns for the Friday-start week containing endDateStr.
 */
export function getHeatmapDayColumns(
	endDateStr: string,
	count = 7,
	timeZone = "Asia/Jakarta",
): HeatmapDayColumn[] {
	const todayDate = formatLocalDate(new Date(), timeZone);
	const [endY, endM, endD] = endDateStr.split("-").map(Number);

	// Use UTC midday to avoid local DST/midnight shifting.
	const endUtc = new Date(Date.UTC(endY, endM - 1, endD, 12, 0, 0));
	const daysSinceFriday = (endUtc.getUTCDay() - 5 + 7) % 7;
	const startUtc = new Date(endUtc);
	startUtc.setUTCDate(endUtc.getUTCDate() - daysSinceFriday);

	const columns: HeatmapDayColumn[] = [];
	for (let i = 0; i < count; i++) {
		const targetUtc = new Date(startUtc);
		targetUtc.setUTCDate(startUtc.getUTCDate() + i);
		const dateStr = targetUtc.toISOString().split("T")[0];

		const dayOfWeek = targetUtc.getUTCDay();
		const dayLabel = INDONESIAN_DAY_ABBRS[dayOfWeek];
		const dayNumber = `${targetUtc.getUTCDate()}/${targetUtc.getUTCMonth() + 1}`;

		columns.push({
			date: dateStr,
			dayLabel,
			dayNumber,
			isToday: dateStr === todayDate,
		});
	}

	return columns;
}

export interface EvaluateCellParams {
	prayerName: PrayerName;
	prayerDate: string;
	todayDate: string;
	log?: PrayerHeatmapLog | null;
	scheduledAt?: Date | null;
	windowEndAt?: Date | null;
	referenceDate?: Date;
	lateThresholdMinutes?: number;
}

/**
 * Evaluates the status of a prayer cell based on completion logs and prayer window bounds.
 */
export function evaluateHeatmapCellStatus({
	prayerDate,
	todayDate,
	log,
	scheduledAt,
	windowEndAt,
	referenceDate = new Date(),
	lateThresholdMinutes = 60,
}: EvaluateCellParams): { status: HeatmapStatus; statusLabel: string } {
	const refTimeMs = referenceDate.getTime();

	// 1. If prayer was completed
	if (log && log.status === "completed") {
		// Check for struggle / heavy feeling
		const feelingLower = (log.feeling ?? "").toLowerCase().trim();
		const isBerat =
			feelingLower === "berat" ||
			(typeof log.khusyuScore === "number" && log.khusyuScore <= 2) ||
			(typeof log.feelingScore === "number" && log.feelingScore <= 2);

		if (isBerat) {
			return { status: 2, statusLabel: "Berat" };
		}

		// Check for punctuality (late)
		if (log.completedAt && scheduledAt) {
			const completedMs = new Date(log.completedAt).getTime();
			const scheduledMs = new Date(scheduledAt).getTime();
			const diffMinutes = (completedMs - scheduledMs) / (60 * 1000);

			if (diffMinutes > lateThresholdMinutes) {
				return { status: 1, statusLabel: "Terlambat" };
			}
		}

		return { status: 0, statusLabel: "Ditunaikan" };
	}

	// 2. If prayer was not completed:
	// A. Future calendar date
	if (prayerDate > todayDate) {
		return { status: null, statusLabel: "Belum Tiba" };
	}

	// B. Today's date
	if (prayerDate === todayDate) {
		// Before scheduled adzan
		if (scheduledAt && refTimeMs < scheduledAt.getTime()) {
			return { status: null, statusLabel: "Belum Tiba" };
		}

		// Currently active window
		if (windowEndAt && refTimeMs < windowEndAt.getTime()) {
			return { status: null, statusLabel: "Belum Tiba" };
		}

		// After window expired
		if (windowEndAt && refTimeMs >= windowEndAt.getTime()) {
			return { status: 3, statusLabel: "Tertinggal" };
		}

		// If no windowEndAt was provided, fallback to pending
		return { status: null, statusLabel: "Belum Tiba" };
	}

	// C. Past calendar date without completion
	return { status: 3, statusLabel: "Tertinggal" };
}

export interface BuildHeatmapParams {
	days: HeatmapDayColumn[];
	logs: PrayerHeatmapLog[];
	schedulesByDate?: Record<string, DailyPrayerSchedule>;
	todayDate: string;
	referenceDate?: Date;
}

/**
 * Builds the 5x7 matrix for the complete statistic heatmap.
 * Rows are ordered as: Subuh, Zhuhur, Ashar, Maghrib, Isya.
 */
export function buildHeatmapMatrix({
	days,
	logs,
	schedulesByDate = {},
	todayDate,
	referenceDate = new Date(),
}: BuildHeatmapParams): HeatmapDataResponse {
	// Index logs by `prayerDate:prayerName`
	const logMap = new Map<string, PrayerHeatmapLog>();
	for (const log of logs) {
		const key = `${log.prayerDate}:${log.prayerName.toLowerCase()}`;
		logMap.set(key, log);
	}

	const cells: HeatmapMatrix = [];
	const matrix: HeatmapStatus[][] = [];

	for (const prayerName of PRAYER_NAMES) {
		const cellRow: HeatmapCell[] = [];
		const statusRow: HeatmapStatus[] = [];

		for (const day of days) {
			const key = `${day.date}:${prayerName}`;
			const log = logMap.get(key);

			const schedule = schedulesByDate[day.date];
			let scheduledAt: Date | null = null;
			let windowEndAt: Date | null = null;

			if (schedule?.items) {
				const itemIndex = schedule.items.findIndex((i) => i.id === prayerName);
				if (itemIndex >= 0) {
					const item = schedule.items[itemIndex];
					scheduledAt = item.scheduledAt;

					if (itemIndex < schedule.items.length - 1) {
						windowEndAt = schedule.items[itemIndex + 1].scheduledAt;
					} else {
						// Isya window ends at next day's Subuh (+24 hours from today's Subuh)
						windowEndAt = new Date(
							schedule.items[0].scheduledAt.getTime() + 24 * 60 * 60 * 1000,
						);
					}
				}
			}

			const { status, statusLabel } = evaluateHeatmapCellStatus({
				prayerName,
				prayerDate: day.date,
				todayDate,
				log,
				scheduledAt,
				windowEndAt,
				referenceDate,
			});

			cellRow.push({
				prayerName,
				prayerDate: day.date,
				status,
				statusLabel,
				completedAt:
					log?.completedAt instanceof Date
						? log.completedAt.toISOString()
						: (log?.completedAt ?? null),
			});
			statusRow.push(status);
		}

		cells.push(cellRow);
		matrix.push(statusRow);
	}

	return {
		days,
		matrix,
		cells,
	};
}
