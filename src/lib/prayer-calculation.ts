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

	let currentPrayer: PrayerTimeItem;
	let nextPrayer: PrayerTimeItem;

	// Represent the previous Isya and next Subuh with their actual calendar day.
	if (currentPrayerIndex === -1) {
		currentPrayerIndex = items.length - 1;
		nextPrayerIndex = 0;
		currentPrayer = {
			...items[currentPrayerIndex],
			scheduledAt: new Date(
				items[currentPrayerIndex].scheduledAt.getTime() - 24 * 60 * 60 * 1000,
			),
		};
		nextPrayer = items[nextPrayerIndex];
	} else if (nextPrayerIndex === -1) {
		nextPrayerIndex = 0;
		currentPrayer = items[currentPrayerIndex];
		nextPrayer = {
			...items[nextPrayerIndex],
			scheduledAt: getNextSubuhAt(schedule),
		};
	} else {
		currentPrayer = items[currentPrayerIndex];
		nextPrayer = items[nextPrayerIndex];
	}

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

export type PrayerWindowStatus =
	| "completed-on-time"
	| "completed-late"
	| "active"
	| "upcoming"
	| "not-logged";

export type PrayerCompletionLookup =
	| ReadonlySet<PrayerName>
	| ReadonlyMap<PrayerName, Date | string | null>;

export interface EvaluatePrayerStatusParams {
	scheduledAt: Date;
	onTimeWindowEndAt: Date;
	trackingCutoffAt: Date;
	completedAt?: Date | string | null;
	isCompleted?: boolean;
	referenceDate?: Date;
}

export function getNextSubuhAt(schedule: DailyPrayerSchedule): Date {
	const subuh = schedule.items.find((item) => item.id === "subuh");
	if (!subuh) throw new Error("Prayer schedule is missing Subuh");
	return new Date(subuh.scheduledAt.getTime() + 24 * 60 * 60 * 1000);
}

function normalizeCompletionDate(value: Date | string | null | undefined) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function evaluatePrayerStatus({
	scheduledAt,
	onTimeWindowEndAt,
	trackingCutoffAt,
	completedAt,
	isCompleted = false,
	referenceDate = new Date(),
}: EvaluatePrayerStatusParams): PrayerWindowStatus {
	const completion = normalizeCompletionDate(completedAt);
	if (completion || isCompleted) {
		return !completion || completion.getTime() < onTimeWindowEndAt.getTime()
			? "completed-on-time"
			: "completed-late";
	}

	const referenceMs = referenceDate.getTime();
	if (referenceMs < scheduledAt.getTime()) return "upcoming";
	if (referenceMs < onTimeWindowEndAt.getTime()) return "active";
	if (referenceMs < trackingCutoffAt.getTime()) return "not-logged";
	return "not-logged";
}

export interface PrayerStatusDetail {
	id: PrayerName;
	name: string;
	time: string;
	scheduledAt: Date;
	windowEndAt: Date;
	trackingCutoffAt: Date;
	status: PrayerWindowStatus;
	statusLabel: string;
	canTrack: boolean;
	message: string;
}

/**
 * Calculates current tracking window status for each prayer.
 * Rules:
 * A started prayer remains loggable until the next local Subuh. The next
 * prayer start only changes a later completion from on-time to late.
 */
export function getPrayerWindowDetails(
	schedule: DailyPrayerSchedule,
	completions: PrayerCompletionLookup,
	referenceDate: Date = new Date(),
): PrayerStatusDetail[] {
	const items = schedule.items;
	const refTimeMs = referenceDate.getTime();
	const trackingCutoffAt = getNextSubuhAt(schedule);

	return items.map((item, index) => {
		const isCompletionMap = completions instanceof Map;
		const completedAt = isCompletionMap ? completions.get(item.id) : null;
		const isCompleted = completions.has(item.id);
		const scheduledMs = item.scheduledAt.getTime();

		let windowEndAt: Date;
		if (index < items.length - 1) {
			windowEndAt = items[index + 1].scheduledAt;
		} else {
			windowEndAt = trackingCutoffAt;
		}

		const status = evaluatePrayerStatus({
			scheduledAt: item.scheduledAt,
			onTimeWindowEndAt: windowEndAt,
			trackingCutoffAt,
			completedAt,
			isCompleted,
			referenceDate,
		});
		let statusLabel: string;
		let canTrack =
			!isCompleted &&
			refTimeMs >= scheduledMs &&
			refTimeMs < trackingCutoffAt.getTime();
		let message: string;

		if (status === "completed-on-time") {
			statusLabel = "Dicatat Tepat Waktu";
			canTrack = false;
			message = `Alhamdulillah, solat ${item.name} telah ditunaikan.`;
		} else if (status === "completed-late") {
			statusLabel = "Dicatat Terlambat";
			canTrack = false;
			message = `Solat ${item.name} telah dicatat setelah waktu solat berikutnya dimulai.`;
		} else if (status === "upcoming") {
			statusLabel = "Belum Masuk Waktu";
			message = `Waktu solat ${item.name} belum tiba (mulai pukul ${item.time}).`;
		} else if (status === "active") {
			statusLabel = "Telah Tiba";
			message = `Waktu solat ${item.name} telah tiba.`;
		} else {
			statusLabel = "Belum Dicatat";
			message = canTrack
				? `Solat ${item.name} belum dicatat dan masih dapat ditambahkan hingga Subuh berikutnya.`
				: `Tidak ada catatan solat ${item.name}.`;
		}

		return {
			id: item.id,
			name: item.name,
			time: item.time,
			scheduledAt: item.scheduledAt,
			windowEndAt,
			trackingCutoffAt,
			status,
			statusLabel,
			canTrack,
			message,
		};
	});
}
