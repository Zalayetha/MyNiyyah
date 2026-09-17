import { describe, expect, it } from "vitest";
import { KEMENAG_PRAYER_SCHEDULE_FIXTURES } from "./__fixtures__/kemenag-prayer-schedules";
import {
	calculateDailyPrayerSchedule,
	evaluatePrayerStatus,
	getNextPrayerStatus,
	getNextSubuhAt,
	getPrayerWindowDetails,
	type PrayerName,
} from "./prayer-calculation";

const jakartaParams = {
	latitude: -6.2088,
	longitude: 106.8456,
	timezoneOffset: 7,
	timezone: "Asia/Jakarta",
	calculationMethodId: "kemenag",
};

function minutes(value: string) {
	const [hour, minute] = value.split(":").map(Number);
	return hour * 60 + minute;
}

describe("prayer calculation engine", () => {
	it.each(
		KEMENAG_PRAYER_SCHEDULE_FIXTURES,
	)("keeps $city $date within the documented Kemenag fixture tolerance", ({
		date,
		params,
		expected,
		toleranceMinutes,
	}) => {
		const actual = calculateDailyPrayerSchedule(date, params);
		for (const item of actual.items) {
			expect(
				Math.abs(minutes(item.rawTime) - minutes(expected[item.id])),
			).toBeLessThanOrEqual(toleranceMinutes);
		}
	});

	it("supports Makkah calculation method with a 90-minute Isya interval", () => {
		const schedule = calculateDailyPrayerSchedule("2026-09-14", {
			latitude: 21.4225,
			longitude: 39.8262,
			timezoneOffset: 3,
			timezone: "Asia/Riyadh",
			calculationMethodId: "makkah",
		});
		const maghrib = schedule.items.find((item) => item.id === "maghrib");
		const isya = schedule.items.find((item) => item.id === "isya");
		expect(maghrib).toBeDefined();
		expect(isya).toBeDefined();
		expect(
			((isya?.scheduledAt.getTime() ?? 0) -
				(maghrib?.scheduledAt.getTime() ?? 0)) /
				60000,
		).toBe(90);
	});

	it("uses persisted calculation-method values when they differ from the fallback preset", () => {
		const fallback = calculateDailyPrayerSchedule("2026-09-14", jakartaParams);
		const persisted = calculateDailyPrayerSchedule("2026-09-14", {
			...jakartaParams,
			methodValues: { fajrAngle: 16, ishaAngle: 16, ishaIntervalMinutes: null },
		});
		expect(
			persisted.items.find((item) => item.id === "subuh")?.rawTime,
		).not.toBe(fallback.items.find((item) => item.id === "subuh")?.rawTime);
	});

	it("rolls the next prayer to tomorrow's Subuh after Isya", () => {
		const schedule = calculateDailyPrayerSchedule("2026-09-14", jakartaParams);
		const status = getNextPrayerStatus(
			schedule,
			new Date("2026-09-14T17:30:00.000Z"),
		);
		expect(status.currentPrayer.id).toBe("isya");
		expect(status.nextPrayer.id).toBe("subuh");
		expect(status.nextPrayer.scheduledAt).toEqual(getNextSubuhAt(schedule));
		expect(status.timeRemainingMinutes).toBeGreaterThan(0);
	});

	it("uses the previous day's Isya before local Subuh", () => {
		const schedule = calculateDailyPrayerSchedule("2026-09-14", jakartaParams);
		const status = getNextPrayerStatus(
			schedule,
			new Date("2026-09-13T20:00:00.000Z"),
		);
		expect(status.currentPrayer.id).toBe("isya");
		expect(status.currentPrayer.scheduledAt.getTime()).toBeLessThan(
			status.nextPrayer.scheduledAt.getTime(),
		);
		expect(status.nextPrayer.id).toBe("subuh");
	});

	it("classifies starts and completions against the next prayer boundary", () => {
		const scheduledAt = new Date("2026-09-14T04:50:00.000Z");
		const nextPrayerAt = new Date("2026-09-14T08:05:00.000Z");
		const cutoff = new Date("2026-09-14T21:31:00.000Z");
		const base = {
			scheduledAt,
			onTimeWindowEndAt: nextPrayerAt,
			trackingCutoffAt: cutoff,
		};

		expect(
			evaluatePrayerStatus({
				...base,
				referenceDate: new Date(scheduledAt.getTime() - 1),
			}),
		).toBe("upcoming");
		expect(evaluatePrayerStatus({ ...base, referenceDate: scheduledAt })).toBe(
			"active",
		);
		expect(
			evaluatePrayerStatus({
				...base,
				completedAt: new Date(nextPrayerAt.getTime() - 1),
			}),
		).toBe("completed-on-time");
		expect(evaluatePrayerStatus({ ...base, completedAt: nextPrayerAt })).toBe(
			"completed-late",
		);
	});

	it.each([
		["WIB", "Asia/Jakarta", 7, -6.2088, 106.8456],
		["WITA", "Asia/Makassar", 8, -5.1477, 119.4327],
		["WIT", "Asia/Jayapura", 9, -2.5337, 140.7181],
	] as const)("keeps started prayers loggable until next Subuh in %s", (_label, timezone, timezoneOffset, latitude, longitude) => {
		const schedule = calculateDailyPrayerSchedule("2026-09-14", {
			latitude,
			longitude,
			timezoneOffset,
			timezone,
			calculationMethodId: "kemenag",
		});
		const cutoff = getNextSubuhAt(schedule);
		const before = getPrayerWindowDetails(
			schedule,
			new Set<PrayerName>(),
			new Date(cutoff.getTime() - 1),
		);
		expect(before.every((detail) => detail.canTrack)).toBe(true);

		const atCutoff = getPrayerWindowDetails(
			schedule,
			new Set<PrayerName>(),
			cutoff,
		);
		expect(atCutoff.every((detail) => !detail.canTrack)).toBe(true);
		expect(atCutoff.every((detail) => detail.status === "not-logged")).toBe(
			true,
		);
	});

	it("allows earlier started prayers to be logged late", () => {
		const schedule = calculateDailyPrayerSchedule("2026-09-14", jakartaParams);
		const details = getPrayerWindowDetails(
			schedule,
			new Set<PrayerName>(),
			new Date("2026-09-14T08:30:00.000Z"),
		);
		const byName = Object.fromEntries(
			details.map((detail) => [detail.id, detail]),
		);
		expect(byName.subuh.status).toBe("not-logged");
		expect(byName.subuh.canTrack).toBe(true);
		expect(byName.zhuhur.status).toBe("not-logged");
		expect(byName.zhuhur.canTrack).toBe(true);
		expect(byName.ashar.status).toBe("active");
		expect(byName.maghrib.status).toBe("upcoming");
	});
});
