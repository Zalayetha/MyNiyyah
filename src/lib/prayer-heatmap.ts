import {
	type DailyPrayerSchedule,
	evaluatePrayerStatus,
	getNextSubuhAt,
	PRAYER_NAMES,
	type PrayerName,
} from "./prayer-calculation";
import { getWeekDayColumns, type PeriodDayColumn } from "./statistics";
import { type InstantInput, serializeInstant } from "./timezone";

export type HeatmapStatus = 0 | 1 | 2 | 3 | null;

export const HEATMAP_STATUS_LABELS: Record<
	0 | 1 | 2 | 3,
	{ label: string; className: string }
> = {
	0: { label: "Ditunaikan", className: "bg-primary" },
	1: { label: "Terlambat", className: "bg-lime-200" },
	2: { label: "Aktif", className: "bg-orange-300" },
	3: { label: "Belum Dicatat", className: "bg-cyan-900" },
};

export type HeatmapDayColumn = PeriodDayColumn;

export interface PrayerHeatmapLog {
	prayerDate: string;
	prayerName: string;
	scheduledAt?: InstantInput;
	completedAt?: InstantInput;
	status: string;
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

/**
 * Generates columns from the Monday of the week containing endDateStr.
 */
export function getHeatmapDayColumns(
	endDateStr: string,
	count = 7,
	timeZone = "Asia/Jakarta",
): HeatmapDayColumn[] {
	return getWeekDayColumns(endDateStr, count, timeZone);
}

export interface EvaluateCellParams {
	prayerName: PrayerName;
	prayerDate: string;
	todayDate: string;
	log?: PrayerHeatmapLog | null;
	scheduledAt?: Date | null;
	windowEndAt?: Date | null;
	trackingCutoffAt?: Date | null;
	referenceDate?: Date;
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
	trackingCutoffAt,
	referenceDate = new Date(),
}: EvaluateCellParams): { status: HeatmapStatus; statusLabel: string } {
	if (prayerDate > todayDate) {
		return { status: null, statusLabel: "Belum Tiba" };
	}
	if (!scheduledAt || !windowEndAt || !trackingCutoffAt) {
		return log?.status === "completed"
			? { status: 0, statusLabel: "Ditunaikan" }
			: { status: 3, statusLabel: "Belum Dicatat" };
	}

	const domainStatus = evaluatePrayerStatus({
		scheduledAt,
		onTimeWindowEndAt: windowEndAt,
		trackingCutoffAt,
		completedAt: log?.status === "completed" ? log.completedAt : null,
		isCompleted: log?.status === "completed",
		referenceDate,
	});

	if (domainStatus === "completed-on-time") {
		return { status: 0, statusLabel: "Ditunaikan" };
	}
	if (domainStatus === "completed-late") {
		return { status: 1, statusLabel: "Terlambat" };
	}
	if (domainStatus === "active") {
		return { status: 2, statusLabel: "Aktif" };
	}
	if (domainStatus === "upcoming") {
		return { status: null, statusLabel: "Belum Tiba" };
	}
	return { status: 3, statusLabel: "Belum Dicatat" };
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
			let trackingCutoffAt: Date | null = null;

			if (schedule?.items) {
				const itemIndex = schedule.items.findIndex((i) => i.id === prayerName);
				if (itemIndex >= 0) {
					const item = schedule.items[itemIndex];
					scheduledAt = item.scheduledAt;
					trackingCutoffAt = getNextSubuhAt(schedule);

					if (itemIndex < schedule.items.length - 1) {
						windowEndAt = schedule.items[itemIndex + 1].scheduledAt;
					} else {
						// Isya window ends at next day's Subuh (+24 hours from today's Subuh)
						windowEndAt = trackingCutoffAt;
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
				trackingCutoffAt,
				referenceDate,
			});

			cellRow.push({
				prayerName,
				prayerDate: day.date,
				status,
				statusLabel,
				completedAt: serializeInstant(log?.completedAt),
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
