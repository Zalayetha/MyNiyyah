import { describe, expect, it } from "vitest";
import {
	calculateJournalSummary,
	calculatePrayerMetrics,
	createInitialJournalDraft,
	getJournalDraftFeeling,
	parseJournalDraft,
	serializeJournalDraft,
} from "./journal-reflection";
import type { PrayerTimeItem } from "./prayer-calculation";

const scheduleItem: PrayerTimeItem = {
	id: "subuh",
	name: "Subuh",
	time: "04.30",
	rawTime: "04:30",
	scheduledAt: new Date("2026-09-13T21:30:00.000Z"),
};

describe("journal reflection utilities", () => {
	it("classifies <= 30 minutes after adzan as Awal Waktu", () => {
		const metric = calculatePrayerMetrics(
			scheduleItem,
			{
				prayerName: "subuh",
				status: "completed",
				completedAt: new Date("2026-09-13T22:00:00.000Z"),
			},
			"Asia/Jakarta",
			"WIB",
		);

		expect(metric.differenceMinutes).toBe(30);
		expect(metric.punctuality).toBe("Awal Waktu");
	});

	it("classifies 31-60 minutes after adzan as Tepat Waktu", () => {
		const metric = calculatePrayerMetrics(scheduleItem, {
			prayerName: "subuh",
			status: "completed",
			completedAt: new Date("2026-09-13T22:30:00.000Z"),
		});

		expect(metric.differenceMinutes).toBe(60);
		expect(metric.punctuality).toBe("Tepat Waktu");
	});

	it("classifies > 60 minutes after adzan as Terlambat", () => {
		const metric = calculatePrayerMetrics(scheduleItem, {
			prayerName: "subuh",
			status: "completed",
			completedAt: new Date("2026-09-13T22:31:00.000Z"),
		});

		expect(metric.differenceMinutes).toBe(61);
		expect(metric.punctuality).toBe("Terlambat");
	});

	it("marks missing or pending logs as Tidak Ditunaikan", () => {
		const missing = calculatePrayerMetrics(scheduleItem, null);
		const pending = calculatePrayerMetrics(scheduleItem, {
			prayerName: "subuh",
			status: "pending",
			completedAt: new Date("2026-09-13T22:00:00.000Z"),
		});

		expect(missing.punctuality).toBe("Tidak Ditunaikan");
		expect(missing.completedAt).toBe("Belum ditunaikan");
		expect(pending.punctuality).toBe("Tidak Ditunaikan");
		expect(pending.differenceMinutes).toBeNull();
	});

	it("calculates summary percentages from feelings and punctuality", () => {
		const summary = calculateJournalSummary(
			{
				subuh: getJournalDraftFeeling(3),
				zhuhur: getJournalDraftFeeling(2),
				ashar: getJournalDraftFeeling(1),
				maghrib: getJournalDraftFeeling(0),
				isya: getJournalDraftFeeling(3),
			},
			{
				subuh: { differenceMinutes: 30 },
				zhuhur: { differenceMinutes: 60 },
				ashar: { differenceMinutes: 61 },
				maghrib: { differenceMinutes: null },
				isya: { differenceMinutes: 0 },
			},
		);

		expect(summary.khusyuPercentage).toBe(70);
		expect(summary.punctualityPercentage).toBe(60);
	});

	it("round-trips journal draft serialization", () => {
		const draft = createInitialJournalDraft("2026-09-14");
		draft.themeId = "pekerjaan";
		draft.feelings.subuh = getJournalDraftFeeling(2);

		expect(parseJournalDraft(serializeJournalDraft(draft))).toEqual(draft);
		expect(parseJournalDraft("not-json", "2026-09-15").journalDate).toBe(
			"2026-09-15",
		);
	});
});
