import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { pool } from "./db";
import {
	calculateDailyPrayerSchedule,
	type DailyPrayerSchedule,
	getPrayerWindowDetails,
	PRAYER_NAMES,
	type PrayerName,
} from "./prayer-calculation";

import { getCurrentSession } from "./session";
import {
	formatLocalDate,
	getTimezoneAbbreviation,
	getTimezoneOffsetHours,
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
	.validator(
		(input: { clientLocalDate?: string; clientTimezone?: string }) => input,
	)
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

		const userId = session.user.id;
		const clientTz = data?.clientTimezone?.trim() || "Asia/Jakarta";

		// 1. Fetch user location preference
		const prefResult = await pool.query(
			`SELECT * FROM "userLocationPreference" WHERE "userId" = $1`,
			[userId],
		);

		let pref = prefResult.rows[0];

		if (!pref) {
			// Bootstrap default preference if missing
			const insertRes = await pool.query(
				`INSERT INTO "userLocationPreference" (
					id, "userId", "cityId", "cityName", province, country,
					latitude, longitude, timezone, "timezoneOffset",
					"calculationMethodId", source, "createdAt", "updatedAt"
				) VALUES (
					gen_random_uuid()::text, $1, $2, $3, $4, $5,
					$6, $7, $8, $9, $10, $11, now(), now()
				)
				ON CONFLICT ("userId") DO UPDATE SET "updatedAt" = now()
				RETURNING *`,
				[
					userId,
					DEFAULT_JAKARTA_PREF.cityId,
					DEFAULT_JAKARTA_PREF.cityName,
					DEFAULT_JAKARTA_PREF.province,
					DEFAULT_JAKARTA_PREF.country,
					DEFAULT_JAKARTA_PREF.latitude,
					DEFAULT_JAKARTA_PREF.longitude,
					DEFAULT_JAKARTA_PREF.timezone,
					DEFAULT_JAKARTA_PREF.timezoneOffset,
					DEFAULT_JAKARTA_PREF.calculationMethodId,
					DEFAULT_JAKARTA_PREF.source,
				],
			);
			pref = insertRes.rows[0] ?? DEFAULT_JAKARTA_PREF;
		}

		// 2. Real-time timezone auto-sync:
		// If user source is 'auto' and detected timezone differs, update preference.
		if (pref.source === "auto" && clientTz && pref.timezone !== clientTz) {
			const newOffset = getTimezoneOffsetHours(new Date(), clientTz);
			await pool.query(
				`UPDATE "userLocationPreference"
				 SET timezone = $1, "timezoneOffset" = $2, "updatedAt" = now()
				 WHERE "userId" = $3`,
				[clientTz, newOffset, userId],
			);
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
		});

		// 4. Optionally cache schedules into prayerSchedule
		const locationKey = pref.cityId || `${pref.latitude},${pref.longitude}`;
		try {
			for (const item of schedule.items) {
				await pool.query(
					`INSERT INTO "prayerSchedule" (
						id, "locationKey", "prayerDate", "prayerName",
						"scheduledAt", timezone, "calculationMethodId",
						"createdAt", "updatedAt"
					) VALUES (
						gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, now(), now()
					)
					ON CONFLICT ("locationKey", "prayerDate", "prayerName", "calculationMethodId")
					DO NOTHING`,
					[
						locationKey,
						prayerDate,
						item.id,
						item.scheduledAt,
						activeTimezone,
						pref.calculationMethodId ?? "kemenag",
					],
				);
			}
		} catch (err) {
			// Non-blocking cache write
			console.error("Failed to cache prayerSchedule:", err);
		}

		// 5. Fetch prayer logs for this user on this date
		const logsResult = await pool.query(
			`SELECT "prayerName", "completedAt", status
			 FROM "prayerLog"
			 WHERE "userId" = $1 AND "prayerDate" = $2`,
			[userId, prayerDate],
		);

		const logs: Record<PrayerName, PrayerLogStatus> = {
			subuh: { completed: false, completedAt: null, status: "pending" },
			zhuhur: { completed: false, completedAt: null, status: "pending" },
			ashar: { completed: false, completedAt: null, status: "pending" },
			maghrib: { completed: false, completedAt: null, status: "pending" },
			isya: { completed: false, completedAt: null, status: "pending" },
		};

		let completedCount = 0;
		for (const row of logsResult.rows) {
			const name = row.prayerName as PrayerName;
			if (logs[name]) {
				const isCompleted = row.status === "completed";
				logs[name] = {
					completed: isCompleted,
					completedAt: row.completedAt
						? new Date(row.completedAt).toISOString()
						: null,
					status: row.status,
				};
				if (isCompleted) completedCount++;
			}
		}

		const totalCountRes = await pool.query(
			`SELECT COUNT(*) as count
			 FROM "prayerLog"
			 WHERE "userId" = $1 AND status = 'completed'`,
			[userId],
		);
		const totalPrayers = parseInt(totalCountRes.rows[0]?.count ?? "0", 10);

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
	.validator(
		(input: { prayerName: string; prayerDate: string; completedAt?: string }) =>
			input,
	)
	.handler(async ({ data }) => {
		const session = await getCurrentSession();
		if (!session?.user) {
			throw new Error("Unauthorized");
		}

		const userId = session.user.id;
		const normalizedPrayerName = data.prayerName.toLowerCase().trim();

		if (!PRAYER_NAMES.includes(normalizedPrayerName as PrayerName)) {
			throw new Error(`Invalid prayer name: ${data.prayerName}`);
		}

		const completedTimestamp = data.completedAt
			? new Date(data.completedAt)
			: new Date();

		// Validate prayer window against user location preference and schedule
		const prefResult = await pool.query(
			`SELECT * FROM "userLocationPreference" WHERE "userId" = $1`,
			[userId],
		);
		const pref = prefResult.rows[0] ?? DEFAULT_JAKARTA_PREF;

		const schedule = calculateDailyPrayerSchedule(data.prayerDate, {
			latitude: pref.latitude ?? -6.2088,
			longitude: pref.longitude ?? 106.8456,
			timezoneOffset: pref.timezoneOffset ?? 7,
			timezone: pref.timezone ?? "Asia/Jakarta",
			calculationMethodId: pref.calculationMethodId ?? "kemenag",
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
			throw new Error(
				currentDetail?.message ??
					`Waktu solat ${data.prayerName} tidak dapat dicatat saat ini.`,
			);
		}

		// Idempotent UPSERT into prayerLog
		await pool.query(
			`INSERT INTO "prayerLog" (
				id, "userId", "prayerDate", "prayerName", "completedAt", status, "createdAt", "updatedAt"
			) VALUES (
				gen_random_uuid()::text, $1, $2, $3, $4, 'completed', now(), now()
			)
			ON CONFLICT ("userId", "prayerDate", "prayerName")
			DO UPDATE SET
				status = 'completed',
				"completedAt" = EXCLUDED."completedAt",
				"updatedAt" = now()`,
			[userId, data.prayerDate, normalizedPrayerName, completedTimestamp],
		);

		// Calculate updated completed count
		const countResult = await pool.query(
			`SELECT COUNT(*) as count
			 FROM "prayerLog"
			 WHERE "userId" = $1 AND "prayerDate" = $2 AND status = 'completed'`,
			[userId, data.prayerDate],
		);

		const completedCount = parseInt(countResult.rows[0]?.count ?? "0", 10);

		return {
			success: true,
			prayerName: normalizedPrayerName,
			completedCount,
		};
	});

/**
 * Server function to sync user timezone preference.
 */
export const syncTimezonePreference = createServerFn({ method: "POST" })
	.validator(
		(input: { timezone: string; timezoneOffset?: number; source?: string }) =>
			input,
	)
	.handler(async ({ data }) => {
		const session = await getCurrentSession();
		if (!session?.user) {
			throw new Error("Unauthorized");
		}

		const userId = session.user.id;
		const offset =
			data.timezoneOffset ?? getTimezoneOffsetHours(new Date(), data.timezone);

		await pool.query(
			`UPDATE "userLocationPreference"
			 SET timezone = $1, "timezoneOffset" = $2, source = COALESCE($3, source), "updatedAt" = now()
			 WHERE "userId" = $4`,
			[data.timezone, offset, data.source ?? null, userId],
		);

		return {
			success: true,
			timezone: data.timezone,
			timezoneOffset: offset,
		};
	});
