import { describe, expect, it } from "vitest";
import { calculateDailyPrayerSchedule } from "./prayer-calculation";
import {
	buildStatisticsData,
	getStatisticsDayColumns,
	type StatisticsPeriod,
} from "./statistics-server";

const baseScheduleOptions = {
	latitude: -6.2088,
	longitude: 106.8456,
	timezoneOffset: 7,
	timezone: "Asia/Jakarta",
	calculationMethodId: "kemenag",
};

function makeSchedules(dates: string[]) {
	return Object.fromEntries(
		dates.map((date) => [
			date,
			calculateDailyPrayerSchedule(date, baseScheduleOptions),
		]),
	);
}

function buildFixture({
	period = "week",
	localDate = "2026-09-14",
	logs = [],
	entries = [],
	reflections = [],
	attachmentCount = 0,
	referenceDate = new Date("2026-09-14T06:00:00.000Z"),
}: {
	period?: StatisticsPeriod;
	localDate?: string;
	logs?: Parameters<typeof buildStatisticsData>[0]["logs"];
	entries?: Parameters<typeof buildStatisticsData>[0]["entries"];
	reflections?: Parameters<typeof buildStatisticsData>[0]["reflections"];
	attachmentCount?: number;
	referenceDate?: Date;
}) {
	const days = getStatisticsDayColumns({
		localDate,
		period,
		timezone: "Asia/Jakarta",
		referenceDate,
	});
	return buildStatisticsData({
		period,
		localDate,
		timezone: "Asia/Jakarta",
		days,
		logs,
		entries,
		reflections,
		attachmentCount,
		schedulesByDate: makeSchedules(days.map((day) => day.date)),
		referenceDate,
	});
}

describe("statistics insights service helpers", () => {
	it("returns empty states without inventing missing worship", () => {
		const data = buildFixture({});

		expect(data.prayer.completion).toMatchObject({
			percentage: 0,
			numerator: 0,
			denominator: 2,
		});
		expect(data.prayer.onTime.percentage).toBeNull();
		expect(data.journal.entries).toBe(0);
		expect(data.journal.khusyu.percentage).toBeNull();
		expect(data.journal.feelingSampleSize).toBe(0);
	});

	it("calculates partial current period from elapsed prayers only", () => {
		const schedule = calculateDailyPrayerSchedule(
			"2026-09-14",
			baseScheduleOptions,
		);
		const data = buildFixture({
			logs: [
				{
					prayerDate: "2026-09-14",
					prayerName: "subuh",
					scheduledAt: schedule.items[0].scheduledAt,
					completedAt: new Date(
						schedule.items[0].scheduledAt.getTime() + 600_000,
					),
					status: "completed",
				},
			],
			entries: [{ id: "entry-1", journalDate: "2026-09-14" }],
			reflections: [
				{
					journalEntryId: "entry-1",
					prayerName: "subuh",
					feeling: "khusyu",
					feelingScore: 4,
					khusyuScore: 4,
				},
			],
			attachmentCount: 2,
		});

		expect(data.prayer.completion).toMatchObject({
			percentage: 50,
			numerator: 1,
			denominator: 2,
		});
		expect(data.journal.attachments).toBe(2);
		expect(data.journal.khusyu).toMatchObject({
			percentage: 100,
			sampleSize: 1,
		});
		expect(data.journal.feelingSampleSize).toBe(1);
	});

	it("handles complete past periods with hand-calculated totals", () => {
		const date = "2026-09-14";
		const schedule = calculateDailyPrayerSchedule(date, baseScheduleOptions);
		const logs = schedule.items.map((item) => ({
			prayerDate: date,
			prayerName: item.id,
			scheduledAt: item.scheduledAt,
			completedAt: new Date(item.scheduledAt.getTime() + 600_000),
			status: "completed",
		}));
		const data = buildFixture({
			logs,
			localDate: date,
			referenceDate: new Date("2026-09-21T00:00:00.000Z"),
		});

		expect(data.prayer.completion).toMatchObject({
			percentage: 14,
			numerator: 5,
			denominator: 35,
		});
		expect(data.prayer.onTime).toMatchObject({
			percentage: 100,
			numerator: 5,
			denominator: 5,
		});
	});

	it("uses stable week and month boundaries across Indonesian timezones", () => {
		expect(
			getStatisticsDayColumns({
				localDate: "2026-09-16",
				period: "week",
				timezone: "Asia/Makassar",
			}).map((day) => day.date),
		).toEqual([
			"2026-09-14",
			"2026-09-15",
			"2026-09-16",
			"2026-09-17",
			"2026-09-18",
			"2026-09-19",
			"2026-09-20",
		]);
		expect(
			getStatisticsDayColumns({
				localDate: "2028-02-10",
				period: "month",
				timezone: "Asia/Jayapura",
			}),
		).toHaveLength(29);
	});
});
