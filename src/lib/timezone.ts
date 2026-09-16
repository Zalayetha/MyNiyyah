import { Temporal } from "@js-temporal/polyfill";

export type InstantInput =
	| Date
	| string
	| { epochMilliseconds?: number; toString(): string }
	| null
	| undefined;

export function normalizeInstantDate(value: InstantInput): Date | null {
	if (!value) return null;
	const date =
		value instanceof Date
			? value
			: typeof value === "object" && typeof value.epochMilliseconds === "number"
				? new Date(value.epochMilliseconds)
				: new Date(String(value));
	return Number.isNaN(date.getTime()) ? null : date;
}

export function serializeInstant(value: InstantInput): string | null {
	if (!value) return null;
	if (value instanceof Date) return value.toISOString();
	return String(value);
}

export function toTemporalInstant(
	value: InstantInput,
): Temporal.Instant | null {
	if (!value) return null;
	const iso = serializeInstant(value);
	if (!iso) return null;
	return Temporal.Instant.from(iso);
}

export interface DetectedTimezone {
	timeZone: string;
	offsetMinutes: number;
	offsetHours: number;
	abbreviation: string;
	localDate: string;
	currentTime: string;
}

const DEFAULT_TIMEZONE = "Asia/Jakarta";

/**
 * Returns the client browser's IANA timezone, falling back to Asia/Jakarta.
 */
export function getBrowserTimezone(): string {
	try {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (tz && typeof tz === "string") return tz;
	} catch {}
	return DEFAULT_TIMEZONE;
}

/**
 * Derives Indonesian standard abbreviations (WIB, WITA, WIT) or GMT offsets.
 */
export function getTimezoneAbbreviation(
	timeZone: string,
	offsetHours: number,
): string {
	const normalized = timeZone.toLowerCase();

	if (
		normalized.includes("jakarta") ||
		normalized.includes("pontianak") ||
		normalized === "wib"
	) {
		return "WIB";
	}
	if (
		normalized.includes("makassar") ||
		normalized.includes("ujung_pandang") ||
		normalized.includes("bali") ||
		normalized === "wita"
	) {
		return "WITA";
	}
	if (normalized.includes("jayapura") || normalized === "wit") {
		return "WIT";
	}

	// Fallbacks based on standard Indonesian UTC offsets
	if (offsetHours === 7 && normalized.startsWith("asia/")) {
		return "WIB";
	}
	if (offsetHours === 8 && normalized.startsWith("asia/")) {
		return "WITA";
	}
	if (offsetHours === 9 && normalized.startsWith("asia/")) {
		return "WIT";
	}

	if (offsetHours === 0) return "GMT";
	const sign = offsetHours > 0 ? "+" : "-";
	const formattedHours = Math.abs(offsetHours);
	return `GMT${sign}${formattedHours}`;
}

/**
 * Returns detailed date and time parts for a given Date in a specific timezone.
 */
export function getLocalDateParts(
	date: Date = new Date(),
	timeZone: string = DEFAULT_TIMEZONE,
) {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});

	const parts = formatter.formatToParts(date);
	const map: Record<string, string> = {};
	for (const part of parts) {
		if (part.type !== "literal") {
			map[part.type] = part.value;
		}
	}

	// In en-US, hour "24" may occasionally be produced at midnight depending on ICU version
	const rawHour = parseInt(map.hour ?? "0", 10);
	const hour = rawHour === 24 ? 0 : rawHour;

	return {
		year: parseInt(map.year ?? "1970", 10),
		month: parseInt(map.month ?? "01", 10),
		day: parseInt(map.day ?? "01", 10),
		hour,
		minute: parseInt(map.minute ?? "00", 10),
		second: parseInt(map.second ?? "00", 10),
	};
}

/**
 * Returns formatted date string "YYYY-MM-DD" for the target timezone.
 */
export function formatLocalDate(
	date: Date = new Date(),
	timeZone: string = DEFAULT_TIMEZONE,
): string {
	const { year, month, day } = getLocalDateParts(date, timeZone);
	const mm = String(month).padStart(2, "0");
	const dd = String(day).padStart(2, "0");
	return `${year}-${mm}-${dd}`;
}

/**
 * Returns formatted time string "HH.MM" (or with custom separator) for target timezone.
 */
export function formatLocalTime(
	date: Date = new Date(),
	timeZone: string = DEFAULT_TIMEZONE,
	separator: "." | ":" = ".",
): string {
	const { hour, minute } = getLocalDateParts(date, timeZone);
	const hh = String(hour).padStart(2, "0");
	const mm = String(minute).padStart(2, "0");
	return `${hh}${separator}${mm}`;
}

/**
 * Calculates current UTC offset hours for target timezone.
 */
export function getTimezoneOffsetHours(
	date: Date = new Date(),
	timeZone: string = DEFAULT_TIMEZONE,
): number {
	try {
		// Calculate offset by comparing UTC representation with timezone-resolved parts
		const { year, month, day, hour, minute } = getLocalDateParts(
			date,
			timeZone,
		);
		const asUtc = Date.UTC(year, month - 1, day, hour, minute);
		const diffMs = asUtc - date.getTime();
		return Math.round(diffMs / (60 * 60 * 1000));
	} catch {
		return 7; // Default to WIB (UTC+7)
	}
}

/**
 * Aggregates complete detected timezone snapshot.
 */
export function getDetectedTimezone(
	timeZone: string = getBrowserTimezone(),
	date: Date = new Date(),
): DetectedTimezone {
	const offsetHours = getTimezoneOffsetHours(date, timeZone);
	const offsetMinutes = offsetHours * 60;
	const abbreviation = getTimezoneAbbreviation(timeZone, offsetHours);
	const localDate = formatLocalDate(date, timeZone);
	const currentTime = formatLocalTime(date, timeZone, ".");

	return {
		timeZone,
		offsetMinutes,
		offsetHours,
		abbreviation,
		localDate,
		currentTime,
	};
}
