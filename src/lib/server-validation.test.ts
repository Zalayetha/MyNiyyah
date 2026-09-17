import { describe, expect, it } from "vitest";
import { PRIVATE_NO_STORE, setPrivateCacheControl } from "./cache";
import {
	conflictError,
	notFoundError,
	ServerError,
	temporaryError,
	toSafeServerError,
	unauthorizedError,
	validationError,
} from "./server-errors";
import {
	parseAttachmentIds,
	parseCoordinate,
	parseId,
	parseIsoDate,
	parseIsoTimestamp,
	parseLocationSource,
	parsePercentage,
	parsePrayerName,
	parsePrayerStatus,
	parseScore,
	parseText,
	parseTimezone,
} from "./server-validation";

describe("server validation and error contracts", () => {
	it("accepts strict valid domain values", () => {
		expect(parseId("usr_12345")).toBe("usr_12345");
		expect(parseText("  Catatan harian  ", "notes", 100)).toBe(
			"Catatan harian",
		);
		expect(parseText(null, "notes", 100, { required: false })).toBe("");
		expect(parseIsoDate("2026-09-16")).toBe("2026-09-16");
		expect(parseIsoTimestamp("2026-09-16T12:00:00.000Z").toISOString()).toBe(
			"2026-09-16T12:00:00.000Z",
		);
		expect(parsePrayerName(" ZHUHUR ")).toBe("zhuhur");
		expect(parsePrayerStatus("completed")).toBe("completed");
		expect(parsePrayerStatus("pending")).toBe("pending");
		expect(parseLocationSource("manual")).toBe("manual");
		expect(parseLocationSource("auto")).toBe("auto");
		expect(parseTimezone("Asia/Jakarta")).toBe("Asia/Jakarta");
		expect(parseCoordinate(-6.2, "latitude")).toBe(-6.2);
		expect(parseCoordinate(106.8, "longitude")).toBe(106.8);
		expect(parseScore(4)).toBe(4);
		expect(parseScore(null)).toBe(null);
		expect(parsePercentage(100)).toBe(100);
		expect(parsePercentage(null)).toBe(null);
		expect(parseAttachmentIds(["v1", "v2"])).toEqual(["v1", "v2"]);
	});

	it("rejects malformed, out-of-range, and unknown values with safe validation errors", () => {
		expect(() => parseId("")).toThrowError(ServerError);
		expect(() => parseText("", "title", 10, { required: true })).toThrowError(
			ServerError,
		);
		expect(() => parseText("too long string", "title", 5)).toThrowError(
			ServerError,
		);
		expect(() => parseIsoDate("2026-02-30")).toThrowError(ServerError);
		expect(() => parseIsoDate("invalid-date")).toThrowError(ServerError);
		expect(() => parseIsoTimestamp("not-a-timestamp")).toThrowError(
			ServerError,
		);
		expect(() => parsePrayerName("fajr")).toThrowError(ServerError);
		expect(() => parsePrayerStatus("skipped")).toThrowError(ServerError);
		expect(() => parseLocationSource("gps")).toThrowError(ServerError);
		expect(() => parseTimezone("Not/AZone")).toThrowError(ServerError);
		expect(() => parseCoordinate(91, "latitude")).toThrowError(ServerError);
		expect(() => parseCoordinate(-181, "longitude")).toThrowError(ServerError);
		expect(() => parseScore(5)).toThrowError(ServerError);
		expect(() => parseScore(0)).toThrowError(ServerError);
		expect(() => parsePercentage(101)).toThrowError(ServerError);
		expect(() => parsePercentage(-1)).toThrowError(ServerError);
		expect(() => parseAttachmentIds("not-array")).toThrowError(ServerError);
	});

	it("standardizes user-safe error types and statuses", () => {
		const valErr = validationError("Custom invalid");
		expect(valErr.code).toBe("VALIDATION_ERROR");
		expect(valErr.status).toBe(400);

		const unauthErr = unauthorizedError();
		expect(unauthErr.code).toBe("UNAUTHORIZED");
		expect(unauthErr.status).toBe(401);

		const notFound = notFoundError();
		expect(notFound.code).toBe("NOT_FOUND");
		expect(notFound.status).toBe(404);

		const conflict = conflictError();
		expect(conflict.code).toBe("CONFLICT");
		expect(conflict.status).toBe(409);

		const tempErr = temporaryError();
		expect(tempErr.code).toBe("TEMPORARY_ERROR");
		expect(tempErr.status).toBe(503);

		// Conceals arbitrary internal/database errors into temporary error
		const safeErr = toSafeServerError(
			new Error("FATAL: connection terminated"),
		);
		expect(safeErr.code).toBe("TEMPORARY_ERROR");
		expect(safeErr.message).toBe("Please try again later");
	});

	it("specifies private no-store caching headers for authenticated responses", () => {
		expect(PRIVATE_NO_STORE).toContain("private");
		expect(PRIVATE_NO_STORE).toContain("no-cache");
		expect(PRIVATE_NO_STORE).toContain("no-store");
		expect(PRIVATE_NO_STORE).not.toContain("public");

		// Non-HTTP context execution does not throw
		expect(() => setPrivateCacheControl()).not.toThrow();
	});
});
