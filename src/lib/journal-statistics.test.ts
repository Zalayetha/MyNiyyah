import { describe, expect, it } from "vitest";
import {
	buildJournalFeelingDistribution,
	buildJournalFeelingMatrix,
	getJournalFeelingStatus,
} from "./journal-statistics";
import { getWeekDayColumns } from "./statistics";

describe("journal statistics", () => {
	it("normalizes journal feelings from scores and text", () => {
		expect(getJournalFeelingStatus({ feelingScore: 1 })).toBe(1);
		expect(getJournalFeelingStatus({ khusyuScore: 4 })).toBe(4);
		expect(getJournalFeelingStatus({ feeling: "Khusyu'" })).toBe(4);
		expect(getJournalFeelingStatus({ feeling: "unknown" })).toBeNull();
	});

	it("builds a five-prayer journal matrix without prayer timing statuses", () => {
		const days = getWeekDayColumns(
			"2026-09-14",
			7,
			"Asia/Jakarta",
			new Date("2026-09-14T12:00:00Z"),
		);
		const matrix = buildJournalFeelingMatrix(days, [
			{
				journalDate: "2026-09-14",
				prayerName: "subuh",
				feelingScore: 1,
			},
			{
				journalDate: "2026-09-14",
				prayerName: "zhuhur",
				feelingScore: 4,
			},
		]);

		expect(matrix).toHaveLength(5);
		expect(matrix[0][0]).toBe(1);
		expect(matrix[1][0]).toBe(4);
		expect(matrix[2][0]).toBeNull();
	});

	it("aggregates only answered journal reflections", () => {
		const distribution = buildJournalFeelingDistribution([
			{ journalDate: "2026-09-14", prayerName: "subuh", feelingScore: 4 },
			{ journalDate: "2026-09-14", prayerName: "zhuhur", feelingScore: 4 },
			{ journalDate: "2026-09-14", prayerName: "ashar", feeling: "berat" },
			{ journalDate: "2026-09-14", prayerName: "isya", feeling: null },
		]);
		expect(distribution.map((segment) => segment.label)).toEqual([
			"Khusyu'",
			"Tenang",
			"Berat",
			"Ngantuk",
		]);
		expect(distribution.map((segment) => segment.value)).toEqual([2, 0, 1, 0]);
	});
});
