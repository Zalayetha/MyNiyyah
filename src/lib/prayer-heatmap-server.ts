import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { pool } from "./db";
import {
	calculateDailyPrayerSchedule,
	type DailyPrayerSchedule,
} from "./prayer-calculation";
import {
	buildHeatmapMatrix,
	getHeatmapDayColumns,
	type HeatmapDataResponse,
	type PrayerHeatmapLog,
} from "./prayer-heatmap";
import { getCurrentSession } from "./session";
import {
	formatLocalDate,
	getTimezoneAbbreviation,
	getTimezoneOffsetHours,
} from "./timezone";

export interface PrayerHeatmapServerData extends HeatmapDataResponse {
	timezone: string;
	timezoneAbbreviation: string;
	totalPrayersPeriod: number;
	completedPrayersPeriod: number;
}

const DEFAULT_JAKARTA_PREF = {
	cityId: "jkt",
	cityName: "Jakarta Pusat",
	latitude: -6.2088,
	longitude: 106.8456,
	timezone: "Asia/Jakarta",
	timezoneOffset: 7,
	calculationMethodId: "kemenag",
};

/**
 * Server function to fetch prayer heatmap data across a rolling 7-day window.
 */
export const getPrayerHeatmapData = createServerFn({ method: "GET" })
	.validator(
		(input: { clientLocalDate?: string; clientTimezone?: string }) => input,
	)
	.handler(async ({ data }): Promise<PrayerHeatmapServerData> => {
		const session = await getCurrentSession();
		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: {
					redirect: "/journal/complete-statistic",
				},
			});
		}

		const userId = session.user.id;
		const clientTz = data?.clientTimezone?.trim() || "Asia/Jakarta";

		// 1. Fetch user location preference
		const prefResult = await pool.query(
			`SELECT * FROM "userLocationPreference" WHERE "userId" = $1`,
			[userId],
		);

		const pref = prefResult.rows[0] ?? DEFAULT_JAKARTA_PREF;
		const effectiveTimezone = pref.timezone || clientTz;
		const offsetHours = getTimezoneOffsetHours(new Date(), effectiveTimezone);
		const tzAbbr = getTimezoneAbbreviation(effectiveTimezone, offsetHours);

		// 2. Resolve target local date and rolling 7-day columns
		const effectiveToday =
			data?.clientLocalDate?.trim() ||
			formatLocalDate(new Date(), effectiveTimezone);

		const days = getHeatmapDayColumns(effectiveToday, 7, effectiveTimezone);
		const startDate = days[0].date;
		const endDate = days[days.length - 1].date;

		// 3. Query prayer logs for the 7-day window
		const logsResult = await pool.query(
			`SELECT "prayerDate", "prayerName", "scheduledAt", "completedAt", status, feeling, "feelingScore", "khusyuScore"
			 FROM "prayerLog"
			 WHERE "userId" = $1 AND "prayerDate" >= $2 AND "prayerDate" <= $3`,
			[userId, startDate, endDate],
		);

		const logs: PrayerHeatmapLog[] = logsResult.rows.map((row) => ({
			prayerDate: row.prayerDate,
			prayerName: row.prayerName,
			scheduledAt: row.scheduledAt,
			completedAt: row.completedAt,
			status: row.status,
			feeling: row.feeling,
			feelingScore: row.feelingScore,
			khusyuScore: row.khusyuScore,
		}));

		// 4. Calculate prayer schedules for each day in the window
		const schedulesByDate: Record<string, DailyPrayerSchedule> = {};
		for (const day of days) {
			try {
				schedulesByDate[day.date] = calculateDailyPrayerSchedule(day.date, {
					latitude: pref.latitude ?? DEFAULT_JAKARTA_PREF.latitude,
					longitude: pref.longitude ?? DEFAULT_JAKARTA_PREF.longitude,
					timezoneOffset: offsetHours,
					timezone: effectiveTimezone,
					calculationMethodId: pref.calculationMethodId ?? "kemenag",
				});
			} catch (error) {
				console.error(
					`Failed to calculate schedule for date ${day.date}:`,
					error,
				);
			}
		}

		// 5. Build the 5x7 matrix
		const heatmap = buildHeatmapMatrix({
			days,
			logs,
			schedulesByDate,
			todayDate: effectiveToday,
			referenceDate: new Date(),
		});

		const completedCount = logs.filter((l) => l.status === "completed").length;
		const totalPrayersPeriod = days.length * 5;

		return {
			...heatmap,
			timezone: effectiveTimezone,
			timezoneAbbreviation: tzAbbr,
			totalPrayersPeriod,
			completedPrayersPeriod: completedCount,
		};
	});
