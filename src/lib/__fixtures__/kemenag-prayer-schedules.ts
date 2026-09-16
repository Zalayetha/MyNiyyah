import type { CalculationParams, PrayerName } from "../prayer-calculation";

export const KEMENAG_FIXTURE_SOURCE = {
	name: "Direktorat Jenderal Bimas Islam, Kementerian Agama RI",
	url: "https://bimasislam.kemenag.go.id/jadwalshalat",
	retrievedAt: "2026-09-16",
	note: "Monthly city schedules transcribed from the official Jadwal Shalat service. Each fixture documents a tolerance for differences between Kemenag city reference points and this app's coordinate calculation.",
} as const;

export interface PrayerScheduleFixture {
	city: string;
	date: string;
	params: CalculationParams;
	expected: Record<PrayerName, string>;
	toleranceMinutes: number;
}

export const KEMENAG_PRAYER_SCHEDULE_FIXTURES: PrayerScheduleFixture[] = [
	{
		city: "Jakarta",
		date: "2026-08-25",
		params: {
			latitude: -6.2088,
			longitude: 106.8456,
			timezoneOffset: 7,
			timezone: "Asia/Jakarta",
			calculationMethodId: "kemenag",
		},
		expected: {
			subuh: "04:40",
			zhuhur: "11:58",
			ashar: "15:17",
			maghrib: "17:57",
			isya: "19:06",
		},
		toleranceMinutes: 5,
	},
	{
		city: "Makassar",
		date: "2026-03-20",
		params: {
			latitude: -5.1477,
			longitude: 119.4327,
			timezoneOffset: 8,
			timezone: "Asia/Makassar",
			calculationMethodId: "kemenag",
		},
		expected: {
			subuh: "04:52",
			zhuhur: "12:13",
			ashar: "15:21",
			maghrib: "18:16",
			isya: "19:25",
		},
		toleranceMinutes: 15,
	},
	{
		city: "Jayapura",
		date: "2026-12-20",
		params: {
			latitude: -2.5337,
			longitude: 140.7181,
			timezoneOffset: 9,
			timezone: "Asia/Jayapura",
			calculationMethodId: "kemenag",
		},
		expected: {
			subuh: "04:05",
			zhuhur: "11:38",
			ashar: "15:04",
			maghrib: "17:46",
			isya: "19:01",
		},
		toleranceMinutes: 15,
	},
];
