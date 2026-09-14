import { describe, expect, it } from "vitest";
import {
	calculateDailyPrayerSchedule,
	getNextPrayerStatus,
	getPrayerWindowDetails,
} from "./prayer-calculation";

describe("prayer calculation engine", () => {
	it("calculates accurate prayer times for Jakarta (Kemenag standard)", () => {
		const schedule = calculateDailyPrayerSchedule("2026-09-14", {
			latitude: -6.2088,
			longitude: 106.8456,
			timezoneOffset: 7,
			timezone: "Asia/Jakarta",
			calculationMethodId: "kemenag",
		});

		expect(schedule.prayerDate).toBe("2026-09-14");
		expect(schedule.items).toHaveLength(5);

		const map = Object.fromEntries(
			schedule.items.map((item) => [item.id, item.time]),
		);

		// Verified astronomical times for Jakarta mid-September (within ±2 minutes of Kemenag schedule)
		expect(map.subuh).toBe("04.31");
		expect(map.zhuhur).toBe("11.50");
		expect(map.ashar).toBe("15.05");
		expect(map.maghrib).toBe("17.52");
		expect(map.isya).toBe("19.01");
	});

	it("calculates accurate prayer times for Makassar (WITA UTC+8)", () => {
		const schedule = calculateDailyPrayerSchedule("2026-09-14", {
			latitude: -5.1477,
			longitude: 119.4327,
			timezoneOffset: 8,
			timezone: "Asia/Makassar",
			calculationMethodId: "kemenag",
		});

		expect(schedule.timezoneOffset).toBe(8);
		const map = Object.fromEntries(
			schedule.items.map((item) => [item.id, item.time]),
		);

		// Makassar is ~119.4° E, solar noon is earlier in the 12th hour
		expect(map.subuh).toMatch(/^04\.[3-4]\d$/);
		expect(map.zhuhur).toMatch(/^12\.[0-1]\d$/);
	});

	it("supports Makkah calculation method with 90m Isha interval", () => {
		const schedule = calculateDailyPrayerSchedule("2026-09-14", {
			latitude: 21.4225,
			longitude: 39.8262,
			timezoneOffset: 3,
			timezone: "Asia/Riyadh",
			calculationMethodId: "makkah",
		});

		const maghrib = schedule.items.find((i) => i.id === "maghrib");
		const isya = schedule.items.find((i) => i.id === "isya");

		expect(maghrib).toBeDefined();
		expect(isya).toBeDefined();
		if (!maghrib || !isya) throw new Error("Missing prayer items");

		const diffMinutes =
			(isya.scheduledAt.getTime() - maghrib.scheduledAt.getTime()) /
			(60 * 1000);
		expect(diffMinutes).toBe(90);
	});

	it("determines next prayer status correctly relative to time of day", () => {
		const schedule = calculateDailyPrayerSchedule("2026-09-14", {
			latitude: -6.2088,
			longitude: 106.8456,
			timezoneOffset: 7,
			timezone: "Asia/Jakarta",
			calculationMethodId: "kemenag",
		});

		// Midday test: 13:00 WIB (after Zhuhur 11:50, before Ashar 15:05)
		// 13:00 WIB = 06:00 UTC
		const noonDate = new Date("2026-09-14T06:00:00Z");
		const status = getNextPrayerStatus(schedule, noonDate);

		expect(status.currentPrayer.id).toBe("zhuhur");
		expect(status.nextPrayer.id).toBe("ashar");
		expect(status.isAllCompleteToday).toBe(false);
	});

	it("enforces prayer tracking window validation correctly", () => {
		const schedule = calculateDailyPrayerSchedule("2026-09-14", {
			latitude: -6.2088,
			longitude: 106.8456,
			timezoneOffset: 7,
			timezone: "Asia/Jakarta",
			calculationMethodId: "kemenag",
		});

		// 15:30 WIB (08:30 UTC): Ashar time has arrived (Zhuhur was 11:50 - 15:05, Ashar is 15:05 - 17:52)
		const asharTime = new Date("2026-09-14T08:30:00Z");
		const completedPrayers = new Set<
			"subuh" | "zhuhur" | "ashar" | "maghrib" | "isya"
		>();

		const details = getPrayerWindowDetails(
			schedule,
			completedPrayers,
			asharTime,
		);
		const detailMap = Object.fromEntries(details.map((d) => [d.id, d]));

		// Skipped Subuh and Zhuhur: cannot track because window has passed
		expect(detailMap.subuh.status).toBe("missed");
		expect(detailMap.subuh.canTrack).toBe(false);

		expect(detailMap.zhuhur.status).toBe("missed");
		expect(detailMap.zhuhur.canTrack).toBe(false);

		// Current prayer Ashar: can track
		expect(detailMap.ashar.status).toBe("active");
		expect(detailMap.ashar.canTrack).toBe(true);

		// Future prayers Maghrib and Isya: cannot track before entering their time
		expect(detailMap.maghrib.status).toBe("upcoming");
		expect(detailMap.maghrib.canTrack).toBe(false);

		expect(detailMap.isya.status).toBe("upcoming");
		expect(detailMap.isya.canTrack).toBe(false);
	});
});
