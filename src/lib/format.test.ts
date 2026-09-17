import { describe, expect, it } from "vitest";
import {
	formatDateId,
	formatDateTimeId,
	formatNumberId,
	formatPercentId,
	formatTimeId,
} from "./format";

describe("Indonesian formatting helpers", () => {
	it("formats numbers and percentages with id-ID conventions", () => {
		expect(formatNumberId(1234567)).toBe("1.234.567");
		expect(formatPercentId(75)).toBe("75%");
	});

	it("formats dates and times in Indonesian", () => {
		const value = "2026-09-16T05:30:00.000Z";

		expect(formatDateId(value)).toContain("September");
		expect(formatDateId(value)).toContain("2026");
		expect(formatDateTimeId(value)).toContain("2026");
		expect(formatTimeId(value)).toMatch(/\d{2}\.\d{2}/);
	});

	it("throws for invalid date input", () => {
		expect(() => formatDateId("not-a-date")).toThrow("Invalid date");
	});
});
