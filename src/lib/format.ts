const ID_LOCALE = "id-ID";
const DEFAULT_TIMEZONE = "Asia/Jakarta";

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new Error("Invalid date");
	}
	return date;
}

export function formatNumberId(value: number): string {
	return new Intl.NumberFormat(ID_LOCALE).format(value);
}

export function formatPercentId(value: number): string {
	return new Intl.NumberFormat(ID_LOCALE, {
		style: "percent",
		maximumFractionDigits: 0,
	}).format(value / 100);
}

export function formatDateId(
	value: DateInput,
	options: Intl.DateTimeFormatOptions = {},
): string {
	return new Intl.DateTimeFormat(ID_LOCALE, {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: DEFAULT_TIMEZONE,
		...options,
	}).format(toDate(value));
}

export function formatDateTimeId(
	value: DateInput,
	options: Intl.DateTimeFormatOptions = {},
): string {
	return new Intl.DateTimeFormat(ID_LOCALE, {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: DEFAULT_TIMEZONE,
		...options,
	}).format(toDate(value));
}

export function formatTimeId(
	value: DateInput,
	options: Intl.DateTimeFormatOptions = {},
): string {
	return new Intl.DateTimeFormat(ID_LOCALE, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZone: DEFAULT_TIMEZONE,
		...options,
	}).format(toDate(value));
}
