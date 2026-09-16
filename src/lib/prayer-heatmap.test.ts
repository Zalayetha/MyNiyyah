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
		it("generates the Monday-start week containing the target date", () => {
			// Monday, September 14, 2026
			const columns = getHeatmapDayColumns("2026-09-14", 7, "Asia/Jakarta");

			expect(columns).toHaveLength(7);
			expect(columns.map((column) => column.dayLabel)).toEqual([
				"Sen",
				"Sel",
				"Rab",
				"Kam",
				"Jum",
				"Sab",
				"Min",
			]);
			expect(columns.map((column) => column.date)).toEqual([
				"2026-09-14",
				"2026-09-15",
				"2026-09-16",
				"2026-09-17",
				"2026-09-18",
				"2026-09-19",
				"2026-09-20",
			]);
			expect(columns[0].dayNumber).toBe("14/9");
		});

		it("handles month boundary correctly", () => {
			const columns = getHeatmapDayColumns("2026-03-02", 5, "Asia/Jakarta");
			expect(columns).toHaveLength(5);
			expect(columns[0].date).toBe("2026-03-02");
			expect(columns[4].date).toBe("2026-03-06");
		});
	});

	describe("evaluateHeatmapCellStatus", () => {
		const scheduledAt = new Date("2026-09-14T04:30:00Z"); // 11:30 WIB
		const windowEndAt = new Date("2026-09-14T08:00:00Z"); // 15:00 WIB
		const trackingCutoffAt = new Date("2026-09-14T21:30:00Z");

		it("returns status 0 (Ditunaikan) for on-time completed prayer", () => {
			const log: PrayerHeatmapLog = {
				prayerDate: "2026-09-14",
				prayerName: "zhuhur",
				status: "completed",
				scheduledAt,
				completedAt: new Date("2026-09-14T04:45:00Z"), // 15 mins after adzan
			};

			const result = evaluateHeatmapCellStatus({
				prayerName: "zhuhur",
				prayerDate: "2026-09-14",
				todayDate: "2026-09-14",
				log,
				scheduledAt,
				windowEndAt,
				trackingCutoffAt,
			});

			expect(result.status).toBe(0);
			expect(result.statusLabel).toBe("Ditunaikan");
		});

		it("returns status 1 (Terlambat) when completed at the next prayer start", () => {
			const log: PrayerHeatmapLog = {
				prayerDate: "2026-09-14",
				prayerName: "zhuhur",
				status: "completed",
				scheduledAt,
				completedAt: windowEndAt,
			};

			const result = evaluateHeatmapCellStatus({
				prayerName: "zhuhur",
				prayerDate: "2026-09-14",
				todayDate: "2026-09-14",
				log,
				scheduledAt,
				windowEndAt,
				trackingCutoffAt,
			});

			expect(result.status).toBe(1);
			expect(result.statusLabel).toBe("Terlambat");
		});

		it("returns status 2 (Aktif) during the current prayer window", () => {
			const result = evaluateHeatmapCellStatus({
				prayerName: "zhuhur",
				prayerDate: "2026-09-14",
				todayDate: "2026-09-14",
				log: null,
				scheduledAt,
				windowEndAt,
				trackingCutoffAt,
				referenceDate: new Date("2026-09-14T05:00:00Z"),
			});
			expect(result.status).toBe(2);
			expect(result.statusLabel).toBe("Aktif");
		});

		it("returns status 3 (Belum Dicatat) for past dates without completion", () => {
			const result = evaluateHeatmapCellStatus({
				prayerName: "subuh",
				prayerDate: "2026-09-13",
				todayDate: "2026-09-14",
				log: null,
			});

			expect(result.status).toBe(3);
			expect(result.statusLabel).toBe("Belum Dicatat");
		});

		it("returns status 3 (Belum Dicatat) after the next prayer starts", () => {
			// At 16:00 WIB (09:00 UTC), zhuhur window (ended 08:00 UTC) has expired
			const referenceDate = new Date("2026-09-14T09:00:00Z");

			const result = evaluateHeatmapCellStatus({
				prayerName: "zhuhur",
				prayerDate: "2026-09-14",
				todayDate: "2026-09-14",
				log: null,
				scheduledAt,
				windowEndAt,
				trackingCutoffAt,
				referenceDate,
			});

			expect(result.status).toBe(3);
			expect(result.statusLabel).toBe("Belum Dicatat");
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
				trackingCutoffAt,
				referenceDate: new Date("2026-09-14T03:00:00Z"), // 10:00 WIB
			});
			expect(beforeAdzanResult.status).toBeNull();

			// C. Today during active prayer window is explicitly active
			const duringWindowResult = evaluateHeatmapCellStatus({
				prayerName: "zhuhur",
				prayerDate: "2026-09-14",
				todayDate: "2026-09-14",
				log: null,
				scheduledAt,
				windowEndAt,
				trackingCutoffAt,
				referenceDate: new Date("2026-09-14T05:00:00Z"), // 12:00 WIB
			});
			expect(duringWindowResult.status).toBe(2);
		});
	});

	describe("buildHeatmapMatrix", () => {
		it("constructs full 5x7 matrix with correct prayer row ordering", () => {
			const days = getHeatmapDayColumns("2026-09-20", 7, "Asia/Jakarta");
			const schedule = calculateDailyPrayerSchedule("2026-09-14", {
				latitude: -6.2088,
				longitude: 106.8456,
				timezoneOffset: 7,
				calculationMethodId: "kemenag",
			});

			const logs: PrayerHeatmapLog[] = [
				{
					prayerDate: "2026-09-14",
					prayerName: "subuh",
					status: "completed",
					completedAt: "2026-09-13T04:45:00+07:00",
				},
				{
					prayerDate: "2026-09-14",
					prayerName: "zhuhur",
					status: "completed",
					completedAt: "2026-09-13T12:30:00+07:00",
				},
			];

			const response = buildHeatmapMatrix({
				days,
				logs,
				schedulesByDate: { "2026-09-14": schedule },
				todayDate: "2026-09-16",
				referenceDate: new Date("2026-09-16T10:00:00Z"),
			});

			expect(response.matrix).toHaveLength(5); // 5 prayers
			for (const row of response.matrix) {
				expect(row).toHaveLength(7); // 7 days
			}

			// Subuh on Monday should be completed on time.
			expect(response.matrix[0][0]).toBe(0);

			// Zhuhur remains an objective completion status.
			expect(response.matrix[1][0]).toBe(0);

			// Missing prayer logs are represented as no record.
			expect(response.matrix[2][0]).toBe(3);
		});
	});
});
