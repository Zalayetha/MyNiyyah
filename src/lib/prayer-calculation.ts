import { getLocalDateParts } from "./timezone";

export type PrayerName = "subuh" | "zhuhur" | "ashar" | "maghrib" | "isya";

export const PRAYER_NAMES: PrayerName[] = [
	"subuh",
	"zhuhur",
	"ashar",
	"maghrib",
	"isya",
];

export const PRAYER_LABELS: Record<PrayerName, string> = {
	subuh: "Subuh",
	zhuhur: "Zhuhur",
	ashar: "Ashar",
	maghrib: "Maghrib",
	isya: "Isya",
};

export interface PrayerTimeItem {
	id: PrayerName;
	name: string;
	time: string; // Formatted "HH.MM"
	rawTime: string; // Formatted "HH:mm"
	scheduledAt: Date;
}

export interface DailyPrayerSchedule {
	prayerDate: string; // "YYYY-MM-DD"
	timezone: string;
	timezoneOffset: number;
	calculationMethodId: string;
	items: PrayerTimeItem[];
	syuruq: {
		time: string;
		rawTime: string;
		scheduledAt: Date;
	};
}

export interface CalculationParams {
	latitude: number;
	longitude: number;
	timezoneOffset: number;
	timezone?: string;
	calculationMethodId?: string;
	fajrAngle?: number;
	ishaAngle?: number;
	ishaIntervalMinutes?: number | null;
}

const METHOD_PRESETS: Record<
	string,
	{
		fajrAngle: number;
		ishaAngle: number | null;
		ishaIntervalMinutes: number | null;
	}
> = {
	kemenag: { fajrAngle: 20, ishaAngle: 18, ishaIntervalMinutes: null },
	mwl: { fajrAngle: 18, ishaAngle: 17, ishaIntervalMinutes: null },
	makkah: { fajrAngle: 18.5, ishaAngle: null, ishaIntervalMinutes: 90 },
};

function d2r(d: number): number {
	return (d * Math.PI) / 180;
}

function r2d(r: number): number {
	return (r * 180) / Math.PI;
}

function sinD(d: number): number {
	return Math.sin(d2r(d));
}

function cosD(d: number): number {
	return Math.cos(d2r(d));
}

function asinD(x: number): number {
	return r2d(Math.asin(Math.max(-1, Math.min(1, x))));
}

function acosD(x: number): number {
	return r2d(Math.acos(Math.max(-1, Math.min(1, x))));
}

function atan2D(y: number, x: number): number {
	return r2d(Math.atan2(y, x));
}

function fixAngle(a: number): number {
	const res = a % 360;
	return res < 0 ? res + 360 : res;
}

function fixHour(h: number): number {
	const res = h % 24;
	return res < 0 ? res + 24 : res;
}

/**
 * Calculates solar prayer times using standard astronomical solar equations.
 */
export function calculateDailyPrayerSchedule(
	dateInput: Date | string = new Date(),
	params: CalculationParams,
): DailyPrayerSchedule {
	const timezone = params.timezone ?? "Asia/Jakarta";
	const tzOffset = params.timezoneOffset;

	let targetDate: Date;
	let year: number;
	let month: number;
	let day: number;

	if (typeof dateInput === "string") {
		const [y, m, d] = dateInput.split("-").map((v) => parseInt(v, 10));
		year = y;
		month = m;
		day = d;
		// Midday representation in UTC
		targetDate = new Date(Date.UTC(year, month - 1, day, 12 - tzOffset, 0, 0));
	} else {
		targetDate = dateInput;
		const parts = getLocalDateParts(targetDate, timezone);
		year = parts.year;
		month = parts.month;
		day = parts.day;
	}

	const prayerDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

	const methodKey = params.calculationMethodId ?? "kemenag";
	const preset = METHOD_PRESETS[methodKey] ?? METHOD_PRESETS.kemenag;
	const fajrAngle = params.fajrAngle ?? preset.fajrAngle;
	const ishaAngle = params.ishaAngle ?? preset.ishaAngle;
	const ishaIntervalMinutes =
		params.ishaIntervalMinutes ?? preset.ishaIntervalMinutes;

	// Julian Date calculation
	let Y = year;
	let M = month;
	if (M <= 2) {
		Y -= 1;
		M += 12;
	}
	const A = Math.floor(Y / 100);
	const B = 2 - A + Math.floor(A / 4);
	const JD =
		Math.floor(365.25 * (Y + 4716)) +
		Math.floor(30.6001 * (M + 1)) +
		day +
		B -
		1524.5;

	// Solar coordinates
	const d = JD - 2451545.0;
	const g = fixAngle(357.529 + 0.98560028 * d);
	const q = fixAngle(280.459 + 0.98564736 * d);
	const L = fixAngle(q + 1.915 * sinD(g) + 0.02 * sinD(2 * g));
	const e = 23.439 - 0.00000036 * d;
	const RA = fixAngle(atan2D(cosD(e) * sinD(L), cosD(L))) / 15;
	const delta = asinD(sinD(e) * sinD(L));
	const EoT = q / 15 - RA;

	// Solar noon in local hours
	const noon = fixHour(12 + tzOffset - params.longitude / 15 - EoT);

	function hourAngle(altitude: number): number {
		const val =
			(sinD(altitude) - sinD(params.latitude) * sinD(delta)) /
			(cosD(params.latitude) * cosD(delta));
		if (val > 1 || val < -1) return 0;
		return acosD(val) / 15;
	}

	// Calculate Hour Angles
	const fajrHA = hourAngle(-fajrAngle);
	const sunriseHA = hourAngle(-0.833);
	const sunsetHA = hourAngle(-0.833);

	// Asr: shadow factor = 1 (Shafi`i standard in Indonesia)
	const asrAlt = r2d(
		Math.atan(1 / (1 + Math.tan(d2r(Math.abs(params.latitude - delta))))),
	);
	const asrHA = hourAngle(asrAlt);

	// Safety buffer (ihtiyat): Kemenag standard adds +2 minutes to prayer times
	const ihtiyatHours = methodKey === "kemenag" ? 2 / 60 : 1 / 60;

	const subuhHours = fixHour(noon - fajrHA + ihtiyatHours);
	const syuruqHours = fixHour(noon - sunriseHA);
	const zhuhurHours = fixHour(noon + ihtiyatHours);
	const asharHours = fixHour(noon + asrHA + ihtiyatHours);
	const maghribHours = fixHour(noon + sunsetHA + ihtiyatHours);

	let isyaHours: number;
	if (ishaIntervalMinutes) {
		isyaHours = fixHour(maghribHours + ishaIntervalMinutes / 60);
	} else {
		const ishaHA = hourAngle(-(ishaAngle ?? 18));
		isyaHours = fixHour(noon + ishaHA + ihtiyatHours);
	}

	function createDateAndFormats(decimalHours: number): {
		time: string;
		rawTime: string;
		scheduledAt: Date;
	} {
		const hours = Math.floor(decimalHours);
		const minutes = Math.round((decimalHours % 1) * 60);
		// Normalize 60 minutes
		const normHours = minutes === 60 ? (hours + 1) % 24 : hours;
		const normMins = minutes === 60 ? 0 : minutes;

		const hh = String(normHours).padStart(2, "0");
		const mm = String(normMins).padStart(2, "0");

		// Construct exact UTC timestamp for this local time on targetDate
		// Local Time = UTC + tzOffset => UTC = Local Time - tzOffset
		const utcHours = normHours - tzOffset;
		const scheduledAt = new Date(
			Date.UTC(year, month - 1, day, utcHours, normMins, 0, 0),
		);

		return {
			time: `${hh}.${mm}`,
			rawTime: `${hh}:${mm}`,
			scheduledAt,
		};
	}

	const subuhData = createDateAndFormats(subuhHours);
	const syuruqData = createDateAndFormats(syuruqHours);
	const zhuhurData = createDateAndFormats(zhuhurHours);
	const asharData = createDateAndFormats(asharHours);
	const maghribData = createDateAndFormats(maghribHours);
	const isyaData = createDateAndFormats(isyaHours);

	const items: PrayerTimeItem[] = [
		{ id: "subuh", name: "Subuh", ...subuhData },
		{ id: "zhuhur", name: "Zhuhur", ...zhuhurData },
		{ id: "ashar", name: "Ashar", ...asharData },
		{ id: "maghrib", name: "Maghrib", ...maghribData },
		{ id: "isya", name: "Isya", ...isyaData },
	];

	return {
		prayerDate,
		timezone,
		timezoneOffset: tzOffset,
		calculationMethodId: methodKey,
		items,
		syuruq: syuruqData,
	};
}

/**
 * Determines current and next prayers relative to the current time.
 */
export function getNextPrayerStatus(
	schedule: DailyPrayerSchedule,
	referenceDate: Date = new Date(),
) {
	const currentTimeMs = referenceDate.getTime();
	const items = schedule.items;

	let currentPrayerIndex = -1;
	let nextPrayerIndex = -1;

	for (let i = 0; i < items.length; i++) {
		const prayerTimeMs = items[i].scheduledAt.getTime();
		if (currentTimeMs >= prayerTimeMs) {
			currentPrayerIndex = i;
		} else {
			if (nextPrayerIndex === -1) {
				nextPrayerIndex = i;
			}
		}
	}

	const isAllCompleteToday =
		currentPrayerIndex === items.length - 1 && nextPrayerIndex === -1;

	// If before Subuh, current is previous day Isya (or Subuh pending), next is Subuh
	if (currentPrayerIndex === -1) {
		currentPrayerIndex = 0;
		nextPrayerIndex = 0;
	} else if (nextPrayerIndex === -1) {
		// After Isya: next prayer is tomorrow Subuh
		nextPrayerIndex = 0;
	}

	const currentPrayer = items[currentPrayerIndex];
	const nextPrayer = items[nextPrayerIndex];

	const timeDiffMs = nextPrayer.scheduledAt.getTime() - currentTimeMs;
	const timeRemainingMinutes = Math.max(
		0,
		Math.round(timeDiffMs / (60 * 1000)),
	);

	return {
		currentPrayer,
		nextPrayer,
		currentPrayerIndex,
		isAllCompleteToday,
		timeRemainingMinutes,
	};
}

export type PrayerWindowStatus = "completed" | "active" | "upcoming" | "missed";

export interface PrayerStatusDetail {
	id: PrayerName;
	name: string;
	time: string;
	scheduledAt: Date;
	windowEndAt: Date;
	status: PrayerWindowStatus;
	statusLabel: string;
	canTrack: boolean;
	message: string;
}

/**
 * Calculates current tracking window status for each prayer.
 * Rules:
 * - Completed prayers cannot be tracked again.
 * - Future prayers (before scheduledAt) cannot be tracked yet ('upcoming').
 * - Expired prayers (after windowEndAt / next prayer arrival) cannot be tracked ('missed').
 * - Only the current active prayer (scheduledAt <= now < windowEndAt) can be tracked.
 */
export function getPrayerWindowDetails(
	schedule: DailyPrayerSchedule,
	completedPrayerNames: Set<PrayerName>,
	referenceDate: Date = new Date(),
): PrayerStatusDetail[] {
	const items = schedule.items;
	const refTimeMs = referenceDate.getTime();

	return items.map((item, index) => {
		const isCompleted = completedPrayerNames.has(item.id);
		const scheduledMs = item.scheduledAt.getTime();

		let windowEndAt: Date;
		if (index < items.length - 1) {
			windowEndAt = items[index + 1].scheduledAt;
		} else {
			windowEndAt = new Date(
				items[0].scheduledAt.getTime() + 24 * 60 * 60 * 1000,
			);
		}
		const windowEndMs = windowEndAt.getTime();

		let status: PrayerWindowStatus;
		let statusLabel: string;
		let canTrack = false;
		let message: string;

		if (isCompleted) {
			status = "completed";
			statusLabel = "Selesai";
			canTrack = false;
			message = `Alhamdulillah, solat ${item.name} telah ditunaikan.`;
		} else if (refTimeMs < scheduledMs) {
			status = "upcoming";
			statusLabel = "Belum Masuk Waktu";
			canTrack = false;
			message = `Waktu solat ${item.name} belum tiba (mulai pukul ${item.time}).`;
		} else if (refTimeMs >= windowEndMs) {
			status = "missed";
			statusLabel = "Waktu Telah Lewat";
			canTrack = false;
			message = `Waktu solat ${item.name} telah berakhir dan terlewat.`;
		} else {
			status = "active";
			statusLabel = "Telah Tiba";
			canTrack = true;
			message = `Waktu solat ${item.name} telah tiba.`;
		}

		return {
			id: item.id,
			name: item.name,
			time: item.time,
			scheduledAt: item.scheduledAt,
			windowEndAt,
			status,
			statusLabel,
			canTrack,
			message,
		};
	});
}
