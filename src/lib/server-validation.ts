import { PRAYER_NAMES, type PrayerName } from "./prayer-calculation";
import { validationError } from "./server-errors";

export const PRAYER_LOG_STATUSES = ["pending", "completed"] as const;
export type PrayerLogStatus = (typeof PRAYER_LOG_STATUSES)[number];
export const LOCATION_SOURCES = ["manual", "auto"] as const;
export type LocationSource = (typeof LOCATION_SOURCES)[number];

function requiredString(
	value: unknown,
	field: string,
	maxLength = 128,
): string {
	if (typeof value !== "string") throw validationError(`${field} is required.`);
	const normalized = value.trim();
	if (!normalized || normalized.length > maxLength) {
		throw validationError(`${field} is invalid.`);
	}
	return normalized;
}

export function parseId(value: unknown, field = "id"): string {
	return requiredString(value, field, 128);
}

export function parseText(
	value: unknown,
	field: string,
	maxLength: number,
	options: { required?: boolean } = {},
): string {
	if (typeof value !== "string") {
		if (!options.required && (value === null || value === undefined)) return "";
		throw validationError(`${field} is required.`);
	}
	const normalized = value.trim();
	if (options.required && !normalized)
		throw validationError(`${field} is required.`);
	if (normalized.length > maxLength)
		throw validationError(`${field} is too long.`);
	return normalized;
}

export function parseIsoDate(value: unknown, field = "date"): string {
	const date = requiredString(value, field, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		throw validationError(`${field} must use YYYY-MM-DD.`);
	}
	const parsed = new Date(`${date}T00:00:00.000Z`);
	if (
		Number.isNaN(parsed.getTime()) ||
		parsed.toISOString().slice(0, 10) !== date
	) {
		throw validationError(`${field} is invalid.`);
	}
	return date;
}

export function parseIsoTimestamp(value: unknown, field = "timestamp"): Date {
	if (typeof value !== "string" || !value.trim()) {
		throw validationError(`${field} must be an ISO timestamp.`);
	}
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		throw validationError(`${field} must be an ISO timestamp.`);
	}
	return parsed;
}

export function parseTimezone(value: unknown, field = "timezone"): string {
	const timezone = requiredString(value, field, 64);
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
	} catch {
		throw validationError(`${field} is invalid.`);
	}
	return timezone;
}

export function parseCoordinate(
	value: unknown,
	field: "latitude" | "longitude",
): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw validationError(`${field} is invalid.`);
	}
	const max = field === "latitude" ? 90 : 180;
	if (value < -max || value > max)
		throw validationError(`${field} is invalid.`);
	return value;
}

export function parsePrayerName(value: unknown): PrayerName {
	const prayerName = requiredString(value, "prayerName", 16).toLowerCase();
	if (!PRAYER_NAMES.includes(prayerName as PrayerName)) {
		throw validationError("prayerName is invalid.");
	}
	return prayerName as PrayerName;
}

export function parsePrayerStatus(value: unknown): PrayerLogStatus {
	const status = requiredString(value, "status", 16) as PrayerLogStatus;
	if (!PRAYER_LOG_STATUSES.includes(status))
		throw validationError("status is invalid.");
	return status;
}

export function parseLocationSource(value: unknown): LocationSource {
	const source = requiredString(value, "source", 16) as LocationSource;
	if (!LOCATION_SOURCES.includes(source))
		throw validationError("source is invalid.");
	return source;
}

export function parseScore(value: unknown, field = "score"): number | null {
	if (value === null || value === undefined) return null;
	if (
		!Number.isInteger(value) ||
		(value as number) < 1 ||
		(value as number) > 4
	) {
		throw validationError(`${field} must be between 1 and 4.`);
	}
	return value as number;
}

export function parsePercentage(
	value: unknown,
	field = "percentage",
): number | null {
	if (value === null || value === undefined) return null;
	if (
		!Number.isInteger(value) ||
		(value as number) < 0 ||
		(value as number) > 100
	) {
		throw validationError(`${field} must be between 0 and 100.`);
	}
	return value as number;
}

export function parseAttachmentIds(value: unknown): string[] {
	if (!Array.isArray(value) || value.length > 20) {
		throw validationError("attachedVerses is invalid.");
	}
	return value.map((item, index) => parseId(item, `attachedVerses[${index}]`));
}
