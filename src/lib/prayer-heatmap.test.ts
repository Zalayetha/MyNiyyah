import { describe, expect, it } from "vitest";
import { calculateDailyPrayerSchedule } from "./prayer-calculation";
import {
	buildHeatmapMatrix,
	evaluateHeatmapCellStatus,
	getHeatmapDayColumns,
	type PrayerHeatmapLog,
} from "./prayer-heatmap";

describe("prayer-heatmap utilities", () => {
	describe("getHeatmapDayColumns", () => {
		it("generates 7 rolling consecutive days ending on target date", () => {
			// Monday, September 14, 2026
			const columns = getHeatmapDayColumns("2026-09-14", 7, "Asia/Jakarta");

			expect(columns).toHaveLength(7);
			expect(columns[6].date).toBe("2026-09-14");
			expect(columns[6].dayLabel).toBe("Sen");
			expect(columns[6].dayNumber).toBe("14/9");

			expect(columns[5].date).toBe("2026-09-13");
			expect(columns[5].dayLabel).toBe("Min");

			expect(columns[0].date).toBe("2026-09-08");
			expect(columns[0].dayLabel).toBe("Sel");
		});

		it("handles month boundary correctly", () => {
			const columns = getHeatmapDayColumns("2026-03-02", 5, "Asia/Jakarta");
			expect(columns).toHaveLength(5);
			expect(columns[4].date).toBe("2026-03-02");
			expect(columns[3].date).toBe("2026-03-01");
			expect(columns[2].date).toBe("2026-02-28");
		});
	});

	describe("evaluateHeatmapCellStatus", () => {
		const scheduledAt = new Date("2026-09-14T04:30:00Z"); // 11:30 WIB
		const windowEndAt = new Date("2026-09-14T08:00:00Z"); // 15:00 WIB

		it("returns status 0 (Ditunaikan) for on-time completed prayer", () => {
			const log: PrayerHeatmapLog = {
				prayerDate: "2026-09-14",
				prayerName: "zhuhur",
				status: "completed",
				scheduledAt,
				completedAt: new Date("2026-09-14T04:45:00Z"), // 15 mins after adzan
				feeling: "khusyu",
				khusyuScore: 4,
			};

			const result = evaluateHeatmapCellStatus({
				prayerName: "zhuhur",
				prayerDate: "2026-09-14",
				todayDate: "2026-09-14",
				log,
				scheduledAt,
				windowEndAt,
			});

			expect(result.status).toBe(0);
			expect(result.statusLabel).toBe("Ditunaikan");
		});

		it("returns status 1 (Terlambat) when completed > 60 minutes after scheduled adzan", () => {
			const log: PrayerHeatmapLog = {
				prayerDate: "2026-09-14",
				prayerName: "zhuhur",
				status: "completed",
				scheduledAt,
				completedAt: new Date("2026-09-14T06:00:00Z"), // 90 mins after adzan
				feeling: "tenang",
				khusyuScore: 3,
			};

			const result = evaluateHeatmapCellStatus({
				prayerName: "zhuhur",
				prayerDate: "2026-09-14",
				todayDate: "2026-09-14",
				log,
				scheduledAt,
				windowEndAt,
				lateThresholdMinutes: 60,
			});

			expect(result.status).toBe(1);
			expect(result.statusLabel).toBe("Terlambat");
		});

		it("returns status 2 (Berat) when feeling is 'berat' or khusyuScore <= 2", () => {
			const logWithFeeling: PrayerHeatmapLog = {
				prayerDate: "2026-09-14",
				prayerName: "zhuhur",
				status: "completed",
				scheduledAt,
				completedAt: new Date("2026-09-14T04:40:00Z"),
				feeling: "berat",
			};

			const result1 = evaluateHeatmapCellStatus({
				prayerName: "zhuhur",
				prayerDate: "2026-09-14",
				todayDate: "2026-09-14",
				log: logWithFeeling,
				scheduledAt,
				windowEndAt,
			});

			expect(result1.status).toBe(2);
			expect(result1.statusLabel).toBe("Berat");

			const logWithLowKhusyu: PrayerHeatmapLog = {
				prayerDate: "2026-09-14",
				prayerName: "zhuhur",
				status: "completed",
				scheduledAt,
				completedAt: new Date("2026-09-14T04:40:00Z"),
				khusyuScore: 2,
			};

			const result2 = evaluateHeatmapCellStatus({
				prayerName: "zhuhur",
				prayerDate: "2026-09-14",
				todayDate: "2026-09-14",
				log: logWithLowKhusyu,
				scheduledAt,
				windowEndAt,
			});

			expect(result2.status).toBe(2);
		});

		it("returns status 3 (Tertinggal) for past dates without completion", () => {
			const result = evaluateHeatmapCellStatus({
				prayerName: "subuh",
				prayerDate: "2026-09-13",
				todayDate: "2026-09-14",
				log: null,
			});

			expect(result.status).toBe(3);
			expect(result.statusLabel).toBe("Tertinggal");
		});

		it("returns status 3 (Tertinggal) for today when prayer window has expired", () => {
			// At 16:00 WIB (09:00 UTC), zhuhur window (ended 08:00 UTC) has expired
			const referenceDate = new Date("2026-09-14T09:00:00Z");

			const result = evaluateHeatmapCellStatus({
				prayerName: "zhuhur",
				prayerDate: "2026-09-14",
				todayDate: "2026-09-14",
				log: null,
				scheduledAt,
				windowEndAt,
				referenceDate,
			});

			expect(result.status).toBe(3);
			expect(result.statusLabel).toBe("Tertinggal");
		});

		it("returns status null (Belum Tiba) for future dates or active prayer windows today", () => {
			// A. Future date
			const futureResult = evaluateHeatmapCellStatus({
				prayerName: "zhuhur",
				prayerDate: "2026-09-15",
				todayDate: "2026-09-14",
				log: null,
			});
			expect(futureResult.status).toBeNull();
			expect(futureResult.statusLabel).toBe("Belum Tiba");

			// B. Today before scheduled adzan
			const beforeAdzanResult = evaluateHeatmapCellStatus({
				prayerName: "zhuhur",
				prayerDate: "2026-09-14",
				todayDate: "2026-09-14",
				log: null,
				scheduledAt,
				windowEndAt,
				referenceDate: new Date("2026-09-14T03:00:00Z"), // 10:00 WIB
			});
			expect(beforeAdzanResult.status).toBeNull();

			// C. Today during active prayer window
			const duringWindowResult = evaluateHeatmapCellStatus({
				prayerName: "zhuhur",
				prayerDate: "2026-09-14",
				todayDate: "2026-09-14",
				log: null,
				scheduledAt,
				windowEndAt,
				referenceDate: new Date("2026-09-14T05:00:00Z"), // 12:00 WIB
			});
			expect(duringWindowResult.status).toBeNull();
		});
	});

	describe("buildHeatmapMatrix", () => {
		it("constructs full 5x7 matrix with correct prayer row ordering", () => {
			const days = getHeatmapDayColumns("2026-09-14", 7, "Asia/Jakarta");
			const schedule = calculateDailyPrayerSchedule("2026-09-14", {
				latitude: -6.2088,
				longitude: 106.8456,
				timezoneOffset: 7,
				calculationMethodId: "kemenag",
			});

			const logs: PrayerHeatmapLog[] = [
				{
					prayerDate: "2026-09-13",
					prayerName: "subuh",
					status: "completed",
					completedAt: "2026-09-13T04:45:00+07:00",
				},
				{
					prayerDate: "2026-09-13",
					prayerName: "zhuhur",
					status: "completed",
					feeling: "berat",
					completedAt: "2026-09-13T12:30:00+07:00",
				},
			];

			const response = buildHeatmapMatrix({
				days,
				logs,
				schedulesByDate: { "2026-09-14": schedule },
				todayDate: "2026-09-14",
				referenceDate: new Date("2026-09-14T10:00:00Z"), // 17:00 WIB
			});

			expect(response.matrix).toHaveLength(5); // 5 prayers
			for (const row of response.matrix) {
				expect(row).toHaveLength(7); // 7 days
			}

			// Subuh on 2026-09-13 (col index 5) should be 0 (Ditunaikan)
			expect(response.matrix[0][5]).toBe(0);

			// Zhuhur on 2026-09-13 (col index 5) should be 2 (Berat)
			expect(response.matrix[1][5]).toBe(2);

			// Ashar on 2026-09-13 (col index 5) was not completed -> 3 (Tertinggal)
			expect(response.matrix[2][5]).toBe(3);
		});
	});
});
