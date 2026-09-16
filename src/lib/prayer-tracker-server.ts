import { randomUUID } from "node:crypto";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { setPrivateCacheControl } from "./cache";
import {
	calculateDailyPrayerSchedule,
	type DailyPrayerSchedule,
	getPrayerWindowDetails,
	type PrayerName,
} from "./prayer-calculation";
import { getCalculationMethodValues } from "./prayer-method-server";
import { db } from "./prisma";
import { unauthorizedError, validationError } from "./server-errors";
import {
	parseIsoDate,
	parseLocationSource,
	parsePrayerName,
	parseTimezone,
} from "./server-validation";
import { getCurrentSession } from "./session";
import {
	formatLocalDate,
	getTimezoneAbbreviation,
	getTimezoneOffsetHours,
	serializeInstant,
	toTemporalInstant,
} from "./timezone";

export interface PrayerLogStatus {
	completed: boolean;
	completedAt: string | null;
	status: string;
}

export interface PrayerTrackerData {
	prayerDate: string;
	timezone: string;
	timezoneOffset: number;
	timezoneAbbreviation: string;
	cityName: string;
	schedule: DailyPrayerSchedule;
	logs: Record<PrayerName, PrayerLogStatus>;
	completedCount: number;
	totalPrayers: number;
	hapticsEnabled: boolean;
	userPreference: {
		cityId: string | null;
		cityName: string;
		province: string | null;
		timezone: string;
		timezoneOffset: number;
		calculationMethodId: string;
		source: string;
		latitude: number;
		longitude: number;
	};
}

const DEFAULT_JAKARTA_PREF = {
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

/**
 * Server function to fetch initial prayer tracker data including schedules,
 * user location preferences, detected timezone sync, and today's prayer logs.
 */
export const getPrayerTrackerData = createServerFn({ method: "GET" })
	.validator((input: { clientLocalDate?: string; clientTimezone?: string }) => {
		if (input.clientLocalDate)
			parseIsoDate(input.clientLocalDate, "clientLocalDate");
		if (input.clientTimezone)
			parseTimezone(input.clientTimezone, "clientTimezone");
		return input;
	})
	.handler(async ({ data }): Promise<PrayerTrackerData> => {
		const session = await getCurrentSession();
		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: {
					redirect: "/prayer-tracker",
				},
			});
		}
		setPrivateCacheControl();

		const userId = session.user.id;
		const clientTz = data?.clientTimezone?.trim() || "Asia/Jakarta";

		// 1. Fetch user location preference
		let pref = await db.orm.public.UserLocationPreference.where({
			userId,
		}).first();

		if (!pref) {
			// Bootstrap default preference if missing
			pref = await db.orm.public.UserLocationPreference.where({
				userId,
			}).upsert({
				create: { id: randomUUID(), userId, ...DEFAULT_JAKARTA_PREF },
				update: {},
			});
		}

		// 2. Real-time timezone auto-sync:
		// If user source is 'auto' and detected timezone differs, update preference.
		if (pref.source === "auto" && clientTz && pref.timezone !== clientTz) {
			const newOffset = getTimezoneOffsetHours(new Date(), clientTz);
			await db.orm.public.UserLocationPreference.where({ userId }).update({
				timezone: clientTz,
				timezoneOffset: newOffset,
			});
			pref.timezone = clientTz;
			pref.timezoneOffset = newOffset;
		}

		const activeTimezone = pref.timezone || clientTz || "Asia/Jakarta";
		const activeOffset =
			typeof pref.timezoneOffset === "number"
				? pref.timezoneOffset
				: getTimezoneOffsetHours(new Date(), activeTimezone);

		const prayerDate =
			data?.clientLocalDate || formatLocalDate(new Date(), activeTimezone);

		// 3. Compute daily prayer schedule
		const schedule = calculateDailyPrayerSchedule(prayerDate, {
			latitude: pref.latitude ?? -6.2088,
			longitude: pref.longitude ?? 106.8456,
			timezoneOffset: activeOffset,
			timezone: activeTimezone,
			calculationMethodId: pref.calculationMethodId ?? "kemenag",
			methodValues: await getCalculationMethodValues(
				pref.calculationMethodId ?? "kemenag",
			),
		});

		// Fetch prayer logs for this user on this date.
		const logRows = await db.orm.public.PrayerLog.where({ userId, prayerDate })
			.select("prayerName", "completedAt", "status")
			.all();

		const logs: Record<PrayerName, PrayerLogStatus> = {
			subuh: { completed: false, completedAt: null, status: "pending" },
			zhuhur: { completed: false, completedAt: null, status: "pending" },
			ashar: { completed: false, completedAt: null, status: "pending" },
			maghrib: { completed: false, completedAt: null, status: "pending" },
			isya: { completed: false, completedAt: null, status: "pending" },
		};

		let completedCount = 0;
		for (const row of logRows) {
			const name = row.prayerName as PrayerName;
			if (logs[name]) {
				const isCompleted = row.status === "completed";
				logs[name] = {
					completed: isCompleted,
					completedAt: serializeInstant(row.completedAt),
					status: row.status,
				};
				if (isCompleted) completedCount++;
			}
		}

		const totalPrayersResult = await db.orm.public.PrayerLog.where({
			userId,
			status: "completed",
		}).aggregate((aggregate) => ({ total: aggregate.count() }));
		const totalPrayers = totalPrayersResult.total;
		const userPreference = await db.orm.public.UserPreference.where({ userId })
			.select("vibrateOnPray")
			.first();

		return {
			prayerDate,
			timezone: activeTimezone,
			timezoneOffset: activeOffset,
			timezoneAbbreviation: getTimezoneAbbreviation(
				activeTimezone,
				activeOffset,
			),
			cityName: pref.cityName || "Jakarta Pusat",
			schedule,
			logs,
			completedCount,
			totalPrayers,
			hapticsEnabled: userPreference?.vibrateOnPray ?? true,
			userPreference: {
				cityId: pref.cityId,
				cityName: pref.cityName,
				province: pref.province,
				timezone: activeTimezone,
				timezoneOffset: activeOffset,
				calculationMethodId: pref.calculationMethodId ?? "kemenag",
				source: pref.source ?? "manual",
				latitude: pref.latitude ?? -6.2088,
				longitude: pref.longitude ?? 106.8456,
			},
		};
	});

/**
 * Server function to complete a prayer log via Swipe to Pray.
 */
export const completePrayerAction = createServerFn({ method: "POST" })
	.validator((input: { prayerName: string; prayerDate: string }) => input)
	.handler(async ({ data }) => {
		const session = await getCurrentSession();
		if (!session?.user) throw unauthorizedError();
		setPrivateCacheControl();

		const userId = session.user.id;
		const normalizedPrayerName = parsePrayerName(data.prayerName);
		const prayerDate = parseIsoDate(data.prayerDate, "prayerDate");

		const completedTimestamp = new Date();

		// Validate prayer window against user location preference and schedule
		const pref =
			(await db.orm.public.UserLocationPreference.where({ userId }).first()) ??
			DEFAULT_JAKARTA_PREF;

		const schedule = calculateDailyPrayerSchedule(prayerDate, {
			latitude: pref.latitude ?? -6.2088,
			longitude: pref.longitude ?? 106.8456,
			timezoneOffset: pref.timezoneOffset ?? 7,
			timezone: pref.timezone ?? "Asia/Jakarta",
			calculationMethodId: pref.calculationMethodId ?? "kemenag",
			methodValues: await getCalculationMethodValues(
				pref.calculationMethodId ?? "kemenag",
			),
		});

		const windowDetails = getPrayerWindowDetails(
			schedule,
			new Set(),
			completedTimestamp,
		);
		const currentDetail = windowDetails.find(
			(item) => item.id === normalizedPrayerName,
		);

		if (!currentDetail?.canTrack) {
			throw validationError(
				currentDetail?.message ??
					`Waktu solat ${data.prayerName} tidak dapat dicatat saat ini.`,
			);
		}

		// Idempotent UPSERT into prayerLog
		const completedInstant = toTemporalInstant(completedTimestamp);
		const existingLog = await db.orm.public.PrayerLog.where({
			userId,
			prayerDate,
			prayerName: normalizedPrayerName,
		}).first();
		if (!existingLog?.status || existingLog.status !== "completed") {
			await db.orm.public.PrayerLog.where({
				userId,
				prayerDate,
				prayerName: normalizedPrayerName,
			}).upsert({
				create: {
					id: randomUUID(),
					userId,
					prayerDate,
					prayerName: normalizedPrayerName,
					scheduledAt: toTemporalInstant(
						schedule.items.find((item) => item.id === normalizedPrayerName)
							?.scheduledAt,
					),
					completedAt: completedInstant,
					status: "completed",
				},
				update: {
					status: "completed",
					completedAt: completedInstant,
					scheduledAt: toTemporalInstant(
						schedule.items.find((item) => item.id === normalizedPrayerName)
							?.scheduledAt,
					),
				},
			});
		}

		// Calculate updated completed count
		const completedCountResult = await db.orm.public.PrayerLog.where({
			userId,
			prayerDate,
			status: "completed",
		}).aggregate((aggregate) => ({ total: aggregate.count() }));
		const completedCount = completedCountResult.total;

		return {
			success: true,
			prayerName: normalizedPrayerName,
			completedCount,
		};
	});

export const correctPrayerAction = createServerFn({ method: "POST" })
	.validator(
		(input: { prayerName: string; prayerDate: string; completed: boolean }) => {
			if (typeof input.completed !== "boolean") {
				throw validationError("completed is invalid.");
			}
			return input;
		},
	)
	.handler(async ({ data }) => {
		const session = await getCurrentSession();
		if (!session?.user) throw unauthorizedError();
		setPrivateCacheControl();
		const userId = session.user.id;
		const prayerName = parsePrayerName(data.prayerName);
		const prayerDate = parseIsoDate(data.prayerDate, "prayerDate");
		const scope = { userId, prayerDate, prayerName };
		if (!data.completed) {
			await db.orm.public.PrayerLog.where(scope).delete();
			return { success: true, prayerName, completed: false };
		}
		await db.orm.public.PrayerLog.where(scope).upsert({
			create: {
				id: randomUUID(),
				...scope,
				completedAt: toTemporalInstant(new Date()),
				status: "completed",
			},
			update: {
				status: "completed",
				completedAt: toTemporalInstant(new Date()),
			},
		});
		return { success: true, prayerName, completed: true };
	});

/**
 * Server function to sync user timezone preference.
 */
export const syncTimezonePreference = createServerFn({ method: "POST" })
	.validator(
		(input: { timezone: string; timezoneOffset?: number; source?: string }) => {
			parseTimezone(input.timezone);
			if (
				input.timezoneOffset !== undefined &&
				(!Number.isInteger(input.timezoneOffset) ||
					input.timezoneOffset < -14 ||
					input.timezoneOffset > 14)
			) {
				throw validationError("timezoneOffset is invalid.");
			}
			return input;
		},
	)
	.handler(async ({ data }) => {
		const session = await getCurrentSession();
		if (!session?.user) throw unauthorizedError();
		setPrivateCacheControl();

		const userId = session.user.id;
		const timezone = parseTimezone(data.timezone);
		const source = data.source ? parseLocationSource(data.source) : undefined;
		const offset =
			data.timezoneOffset ?? getTimezoneOffsetHours(new Date(), timezone);

		await db.orm.public.UserLocationPreference.where({ userId }).update({
			timezone,
			timezoneOffset: offset,
			...(source ? { source } : {}),
		});

		return {
			success: true,
			timezone,
			timezoneOffset: offset,
		};
	});
