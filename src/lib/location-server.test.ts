import { describe, expect, it } from "vitest";
import {
	buildGpsPreferenceInput,
	buildManualPreferenceInput,
	cityToOption,
	formatTimezoneLabel,
	parseSaveLocationPreferenceInput,
	preferenceToView,
} from "./location-server";

const jakartaCity = {
	id: "jkt",
	name: "Jakarta Pusat",
	province: "DKI Jakarta",
	country: "Indonesia",
	latitude: -6.2088,
	longitude: 106.8456,
	timezone: "Asia/Jakarta",
	timezoneOffset: 7,
};

describe("location preference server helpers", () => {
	it("builds manual preference input from the selected city catalog row", () => {
		const input = buildManualPreferenceInput("user-1", jakartaCity, "kemenag");

		expect(input).toMatchObject({
			userId: "user-1",
			cityId: "jkt",
			cityName: "Jakarta Pusat",
			province: "DKI Jakarta",
			country: "Indonesia",
			latitude: -6.2088,
			longitude: 106.8456,
			timezone: "Asia/Jakarta",
			timezoneOffset: 7,
			calculationMethodId: "kemenag",
			source: "manual",
		});
	});

	it("builds GPS preference input with a neutral location label", () => {
		const parsed = parseSaveLocationPreferenceInput({
			source: "auto",
			latitude: -7.2575,
			longitude: 112.7521,
			timezone: "Asia/Jakarta",
			timezoneOffset: 7,
			calculationMethodId: "mwl",
		});

		expect(parsed.source).toBe("auto");
		if (parsed.source !== "auto") throw new Error("Expected GPS input");

		const input = buildGpsPreferenceInput("user-1", parsed);

		expect(input).toMatchObject({
			userId: "user-1",
			cityId: null,
			cityName: "Koordinat GPS",
			province: null,
			country: "Indonesia",
			latitude: -7.2575,
			longitude: 112.7521,
			timezone: "Asia/Jakarta",
			timezoneOffset: 7,
			calculationMethodId: "mwl",
			source: "auto",
		});
	});

	it("rejects invalid GPS coordinates and timezones", () => {
		expect(() =>
			parseSaveLocationPreferenceInput({
				source: "auto",
				latitude: -91,
				longitude: 112.7521,
				timezone: "Asia/Jakarta",
				calculationMethodId: "kemenag",
			}),
		).toThrow("latitude is invalid");

		expect(() =>
			parseSaveLocationPreferenceInput({
				source: "auto",
				latitude: -7.2575,
				longitude: 181,
				timezone: "Asia/Jakarta",
				calculationMethodId: "kemenag",
			}),
		).toThrow("longitude is invalid");

		expect(() =>
			parseSaveLocationPreferenceInput({
				source: "auto",
				latitude: -7.2575,
				longitude: 112.7521,
				timezone: "Not/AZone",
				calculationMethodId: "kemenag",
			}),
		).toThrow("timezone is invalid");
	});

	it("rejects manual saves without a city id", () => {
		expect(() =>
			parseSaveLocationPreferenceInput({
				source: "manual",
				cityId: "",
				calculationMethodId: "kemenag",
			}),
		).toThrow("cityId is invalid");
	});

	it("formats location data for the client", () => {
		expect(formatTimezoneLabel("Asia/Jakarta", 7)).toBe("WIB (UTC+7)");
		expect(cityToOption(jakartaCity)).toMatchObject({
			id: "jkt",
			timezoneLabel: "WIB (UTC+7)",
		});
		expect(
			preferenceToView({
				...jakartaCity,
				cityId: "jkt",
				cityName: "Jakarta Pusat",
				calculationMethodId: "kemenag",
				source: "manual",
			}),
		).toMatchObject({
			cityId: "jkt",
			timezoneLabel: "WIB (UTC+7)",
			source: "manual",
		});
	});
});
