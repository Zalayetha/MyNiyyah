import { randomUUID } from "node:crypto";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { setPrivateCacheControl } from "./cache";
import { db } from "./prisma";
import { validationError } from "./server-errors";
import {
	type LocationSource,
	parseCoordinate,
	parseId,
	parseLocationSource,
	parseTimezone,
} from "./server-validation";
import { getCurrentSession } from "./session";
import { getTimezoneAbbreviation, getTimezoneOffsetHours } from "./timezone";

const DEFAULT_LOCATION_PREF = {
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
};

export interface CityOption {
	id: string;
	name: string;
	province: string;
	country: string;
	latitude: number;
	longitude: number;
	timezone: string;
	timezoneOffset: number;
	timezoneLabel: string;
}

export interface CalculationMethodOption {
	id: string;
	name: string;
	description: string;
}

export interface LocationPreference {
	cityId: string | null;
	cityName: string;
	province: string | null;
	country: string;
	latitude: number | null;
	longitude: number | null;
	timezone: string;
	timezoneOffset: number;
	timezoneLabel: string;
	calculationMethodId: string;
	source: LocationSource;
}

export interface LocationSettingsData {
	cities: CityOption[];
	methods: CalculationMethodOption[];
	preference: LocationPreference;
	hapticsEnabled: boolean;
}

export interface SaveLocationPreferenceInput {
	source: string;
	calculationMethodId: string;
	cityId?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	timezone?: string | null;
	timezoneOffset?: number | null;
}

type CityRecord = {
	id: string;
	name: string;
	province: string;
	country: string;
	latitude: number | null;
	longitude: number | null;
	timezone: string;
	timezoneOffset: number;
};

type PreferenceRecord = {
	cityId: string | null;
	cityName: string;
	province: string | null;
	country: string;
	latitude: number | null;
	longitude: number | null;
	timezone: string;
	timezoneOffset: number;
	calculationMethodId: string;
	source: string;
};

export function formatTimezoneLabel(
	timezone: string,
	timezoneOffset: number,
): string {
	const abbreviation = getTimezoneAbbreviation(timezone, timezoneOffset);
	return `${abbreviation} (UTC${timezoneOffset >= 0 ? "+" : ""}${timezoneOffset})`;
}

function parseTimezoneOffset(value: unknown, timezone: string): number {
	if (value === null || value === undefined) {
		return getTimezoneOffsetHours(new Date(), timezone);
	}
	if (
		!Number.isInteger(value) ||
		(value as number) < -14 ||
		(value as number) > 14
	) {
		throw validationError("timezoneOffset is invalid.");
	}
	return value as number;
}

function normalizeMethodId(value: unknown): string {
	return parseId(value, "calculationMethodId");
}

export function parseSaveLocationPreferenceInput(
	input: SaveLocationPreferenceInput,
) {
	if (!input || typeof input !== "object") {
		throw validationError("Location preference is required.");
	}

	const source = parseLocationSource(input.source);
	const calculationMethodId = normalizeMethodId(input.calculationMethodId);

	if (source === "manual") {
		return {
			source,
			calculationMethodId,
			cityId: parseId(input.cityId, "cityId"),
		};
	}

	const latitude = parseCoordinate(input.latitude, "latitude");
	const longitude = parseCoordinate(input.longitude, "longitude");
	const timezone = parseTimezone(input.timezone, "timezone");
	const timezoneOffset = parseTimezoneOffset(input.timezoneOffset, timezone);

	return {
		source,
		calculationMethodId,
		latitude,
		longitude,
		timezone,
		timezoneOffset,
	};
}

export function cityToOption(city: CityRecord): CityOption {
	if (city.latitude === null || city.longitude === null) {
		throw validationError("City coordinates are unavailable.");
	}

	return {
		id: city.id,
		name: city.name,
		province: city.province,
		country: city.country,
		latitude: city.latitude,
		longitude: city.longitude,
		timezone: city.timezone,
		timezoneOffset: city.timezoneOffset,
		timezoneLabel: formatTimezoneLabel(city.timezone, city.timezoneOffset),
	};
}

export function preferenceToView(pref: PreferenceRecord): LocationPreference {
	const source = parseLocationSource(pref.source || "manual");
	return {
		cityId: pref.cityId,
		cityName: pref.cityName,
		province: pref.province,
		country: pref.country,
		latitude: pref.latitude,
		longitude: pref.longitude,
		timezone: pref.timezone,
		timezoneOffset: pref.timezoneOffset,
		timezoneLabel: formatTimezoneLabel(pref.timezone, pref.timezoneOffset),
		calculationMethodId: pref.calculationMethodId,
		source,
	};
}

export function buildManualPreferenceInput(
	userId: string,
	city: CityRecord,
	calculationMethodId: string,
) {
	const cityOption = cityToOption(city);
	return {
		userId,
		cityId: cityOption.id,
		cityName: cityOption.name,
		province: cityOption.province,
		country: cityOption.country,
		latitude: cityOption.latitude,
		longitude: cityOption.longitude,
		timezone: cityOption.timezone,
		timezoneOffset: cityOption.timezoneOffset,
		calculationMethodId,
		source: "manual",
	};
}

export function buildGpsPreferenceInput(
	userId: string,
	input: Extract<
		ReturnType<typeof parseSaveLocationPreferenceInput>,
		{ source: "auto" }
	>,
) {
	return {
		userId,
		cityId: null,
		cityName: "Koordinat GPS",
		province: null,
		country: "Indonesia",
		latitude: input.latitude,
		longitude: input.longitude,
		timezone: input.timezone,
		timezoneOffset: input.timezoneOffset,
		calculationMethodId: input.calculationMethodId,
		source: "auto",
	};
}

async function ensureDefaultPreference(userId: string) {
	return db.orm.public.UserLocationPreference.where({ userId }).upsert({
		create: { id: randomUUID(), userId, ...DEFAULT_LOCATION_PREF },
		update: {},
	});
}

export const getLocationSettingsData = createServerFn({
	method: "GET",
}).handler(async (): Promise<LocationSettingsData> => {
	const session = await getCurrentSession();
	if (!session?.user) {
		throw redirect({
			to: "/login",
			search: { redirect: "/location" },
		});
	}
	setPrivateCacheControl();

	const userId = session.user.id;
	const [cityRows, methodRows, preferenceRow, userPreference] =
		await Promise.all([
			db.orm.public.CityCatalog.all(),
			db.orm.public.PrayerCalculationMethod.all(),
			db.orm.public.UserLocationPreference.where({ userId }).first(),
			db.orm.public.UserPreference.where({ userId }).first(),
		]);

	const preference = preferenceRow ?? (await ensureDefaultPreference(userId));
	const cities = cityRows
		.map(cityToOption)
		.sort((a, b) => a.name.localeCompare(b.name, "id"));
	const methods = methodRows
		.map((method) => ({
			id: method.id,
			name: method.name,
			description: method.description,
		}))
		.sort((a, b) => a.name.localeCompare(b.name, "id"));

	return {
		cities,
		methods,
		preference: preferenceToView(preference),
		hapticsEnabled: userPreference?.vibrateOnPray ?? true,
	};
});

export const saveLocationPreferenceAction = createServerFn({ method: "POST" })
	.validator(parseSaveLocationPreferenceInput)
	.handler(async ({ data }): Promise<{ preference: LocationPreference }> => {
		const session = await getCurrentSession();
		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: { redirect: "/location" },
			});
		}
		setPrivateCacheControl();

		const userId = session.user.id;
		const method = await db.orm.public.PrayerCalculationMethod.where({
			id: data.calculationMethodId,
		}).first();
		if (!method) throw validationError("Metode perhitungan tidak ditemukan.");

		const preferenceInput =
			data.source === "manual"
				? buildManualPreferenceInput(
						userId,
						await resolveCityForManualPreference(data.cityId),
						data.calculationMethodId,
					)
				: buildGpsPreferenceInput(userId, data);

		const preference = await db.orm.public.UserLocationPreference.where({
			userId,
		}).upsert({
			create: {
				id: randomUUID(),
				...preferenceInput,
			},
			update: preferenceInput,
		});

		return { preference: preferenceToView(preference) };
	});

async function resolveCityForManualPreference(cityId: string) {
	const city = await db.orm.public.CityCatalog.where({ id: cityId }).first();
	if (!city) throw validationError("Kota tidak ditemukan.");
	return city;
}
