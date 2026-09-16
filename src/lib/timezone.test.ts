import { describe, expect, it } from "vitest";
import {
	formatLocalDate,
	formatLocalTime,
	getDetectedTimezone,
	getLocalDateParts,
	getTimezoneAbbreviation,
	getTimezoneOffsetHours,
	normalizeInstantDate,
	serializeInstant,
	toTemporalInstant,
} from "./timezone";

describe("timezone utilities", () => {
	it("derives correct Indonesian abbreviations", () => {
		expect(getTimezoneAbbreviation("Asia/Jakarta", 7)).toBe("WIB");
		expect(getTimezoneAbbreviation("Asia/Pontianak", 7)).toBe("WIB");
		expect(getTimezoneAbbreviation("Asia/Makassar", 8)).toBe("WITA");
		expect(getTimezoneAbbreviation("Asia/Jayapura", 9)).toBe("WIT");
		expect(getTimezoneAbbreviation("UTC", 0)).toBe("GMT");
		expect(getTimezoneAbbreviation("America/New_York", -5)).toBe("GMT-5");
	});

	it("computes accurate UTC offset hours", () => {
		const fixedDate = new Date("2026-09-14T05:00:00Z");
		expect(getTimezoneOffsetHours(fixedDate, "Asia/Jakarta")).toBe(7);
		expect(getTimezoneOffsetHours(fixedDate, "Asia/Makassar")).toBe(8);
		expect(getTimezoneOffsetHours(fixedDate, "Asia/Jayapura")).toBe(9);
	});

	it("formats local date YYYY-MM-DD correctly across midnight boundaries", () => {
		// 2026-09-14 at 20:00 UTC is:
		// 2026-09-15 03:00 in Asia/Jakarta (+7)
		// 2026-09-14 16:00 in America/New_York (-4 daylight)
		const lateUtc = new Date("2026-09-14T21:00:00Z");

		expect(formatLocalDate(lateUtc, "Asia/Jakarta")).toBe("2026-09-15");
		expect(formatLocalDate(lateUtc, "America/New_York")).toBe("2026-09-14");
	});

	it("formats local time with custom separator", () => {
		const testDate = new Date("2026-09-14T04:35:00Z"); // 11:35 in Jakarta (+7)
		expect(formatLocalTime(testDate, "Asia/Jakarta", ".")).toBe("11.35");
		expect(formatLocalTime(testDate, "Asia/Jakarta", ":")).toBe("11:35");
	});

	it("generates complete detected timezone object", () => {
		const testDate = new Date("2026-09-14T04:52:00Z"); // 11:52 in Jakarta
		const detected = getDetectedTimezone("Asia/Jakarta", testDate);

		expect(detected.timeZone).toBe("Asia/Jakarta");
		expect(detected.offsetHours).toBe(7);
		expect(detected.offsetMinutes).toBe(420);
		expect(detected.abbreviation).toBe("WIB");
		expect(detected.localDate).toBe("2026-09-14");
		expect(detected.currentTime).toBe("11.52");
	});

	it("handles getLocalDateParts cleanly", () => {
		const testDate = new Date("2026-09-14T00:05:00Z"); // 07:05:00 in Jakarta
		const parts = getLocalDateParts(testDate, "Asia/Jakarta");

		expect(parts.year).toBe(2026);
		expect(parts.month).toBe(9);
		expect(parts.day).toBe(14);
		expect(parts.hour).toBe(7);
		expect(parts.minute).toBe(5);
	});

	it("normalizes Temporal-like instants without implicit arithmetic coercion", () => {
		const temporalLike = {
			epochMilliseconds: Date.parse("2026-09-16T12:00:00Z"),
			toString: () => "2026-09-16T12:00:00Z",
			valueOf: () => {
				throw new TypeError("Do not use built-in arithmetic operators");
			},
		};

		expect(serializeInstant(temporalLike)).toBe("2026-09-16T12:00:00Z");
		expect(normalizeInstantDate(temporalLike)?.toISOString()).toBe(
			"2026-09-16T12:00:00.000Z",
		);
		expect(toTemporalInstant(temporalLike)?.toString()).toBe(
			"2026-09-16T12:00:00Z",
		);
	});
});
