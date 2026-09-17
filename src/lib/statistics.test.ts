import { describe, expect, it } from "vitest";
import {
	addLocalDays,
	calculateElapsedCompletionRate,
	calculateFeelingDistribution,
	calculateJournalStreak,
	calculateKhusyuAverage,
	calculateOnTimeRate,
	calculatePrayerStreak,
	getPeriodBounds,
	isValidLocalDate,
} from "./statistics";

describe("statistics domain rules", () => {
	it("returns zero rates for empty data", () => {
		expect(calculateElapsedCompletionRate([])).toEqual({
			percentage: 0,
			numerator: 0,
			denominator: 0,
			sampleSize: 0,
		});
		expect(calculateOnTimeRate([]).percentage).toBe(0);
	});

	it("uses only elapsed prayer starts for completion rate", () => {
		const rate = calculateElapsedCompletionRate(
			[
				{
					scheduledAt: "2026-09-14T00:00:00Z",
					completedAt: "2026-09-14T00:10:00Z",
				},
				{ scheduledAt: "2026-09-14T04:00:00Z" },
				{ scheduledAt: "2026-09-14T08:00:00Z" },
			],
			new Date("2026-09-14T06:00:00Z"),
		);
		expect(rate).toMatchObject({
			percentage: 50,
			numerator: 1,
			denominator: 2,
		});
	});

	it("counts a full past day and ignores records without valid schedules", () => {
		const records = Array.from({ length: 5 }, (_, index) => ({
			scheduledAt: `2026-09-13T0${index}:00:00Z`,
			completedAt: `2026-09-13T0${index}:10:00Z`,
		}));
		records.push({
			scheduledAt: "invalid",
			completedAt: "2026-09-13T05:00:00Z",
		});
		expect(
			calculateElapsedCompletionRate(records, new Date("2026-09-14T00:00:00Z")),
		).toMatchObject({ percentage: 100, numerator: 5, denominator: 5 });
	});

	it("uses completed prayers with valid schedule windows for on-time rate", () => {
		const rate = calculateOnTimeRate([
			{
				scheduledAt: "2026-09-14T04:00:00Z",
				onTimeWindowEndAt: "2026-09-14T08:00:00Z",
				completedAt: "2026-09-14T07:59:00Z",
			},
			{
				scheduledAt: "2026-09-14T08:00:00Z",
				onTimeWindowEndAt: "2026-09-14T11:00:00Z",
				completedAt: "2026-09-14T11:00:00Z",
			},
			{ scheduledAt: null, completedAt: "2026-09-14T12:00:00Z" },
		]);
		expect(rate).toEqual({
			percentage: 50,
			numerator: 1,
			denominator: 2,
			sampleSize: 2,
		});
	});

	it("excludes unanswered khusyu reflections and reports sample size", () => {
		expect(
			calculateKhusyuAverage([
				{ score: 4 },
				{ score: null },
				{},
				{ score: 0 },
				{ score: 2 },
			]),
		).toEqual({ average: 3, percentage: 75, sampleSize: 2 });
	});

	it("builds a stable feeling distribution and excludes unknown answers", () => {
		const result = calculateFeelingDistribution(
			[
				{ label: "Tenang" },
				{ label: null },
				{ label: "Tenang" },
				{ label: "X" },
			],
			["Tenang", "Berat"] as const,
		);
		expect(result).toEqual({
			counts: { Tenang: 2, Berat: 0 },
			sampleSize: 2,
		});
	});

	it("calculates prayer and journal streaks without penalizing an unfinished today", () => {
		expect(
			calculatePrayerStreak(
				{ "2026-09-11": 5, "2026-09-12": 5, "2026-09-13": 5, "2026-09-14": 2 },
				"2026-09-14",
			),
		).toBe(3);
		expect(
			calculateJournalStreak(
				["2026-09-12", "2026-09-13", "2026-09-14"],
				"2026-09-14",
			),
		).toBe(3);
		expect(calculateJournalStreak([], "2026-09-14")).toBe(0);
	});

	it("uses Monday-Sunday week boundaries and calendar month boundaries", () => {
		expect(getPeriodBounds("2026-09-16", "week")).toEqual({
			startDate: "2026-09-14",
			endDate: "2026-09-20",
		});
		expect(getPeriodBounds("2028-02-10", "month")).toEqual({
			startDate: "2028-02-01",
			endDate: "2028-02-29",
		});
	});

	it("keeps date arithmetic stable across WIB, WITA, and WIT calendar boundaries", () => {
		expect(addLocalDays("2026-12-31", 1)).toBe("2027-01-01");
		expect(addLocalDays("2026-03-01", -1)).toBe("2026-02-28");
		expect(isValidLocalDate("2026-02-29")).toBe(false);
		expect(isValidLocalDate("2028-02-29")).toBe(true);
	});
});
