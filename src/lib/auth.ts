import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { pool } from "./db";

function normalizeOrigin(origin: string) {
	return origin.trim().replace(/\/+$/, "");
}

function parseOrigins(value: string | undefined) {
	return value?.split(",").map(normalizeOrigin).filter(Boolean) ?? [];
}

async function bootstrapUser(userId: string) {
	await pool.query(
		`INSERT INTO "userProfile" (id, "userId", country, "createdAt", "updatedAt")
		 VALUES (gen_random_uuid()::text, $1, 'Indonesia', now(), now())
		 ON CONFLICT ("userId") DO NOTHING`,
		[userId],
	);

	await pool.query(
		`INSERT INTO "userPreference" (id, "userId", "notifyPrayer", "notifyJournal", "vibrateOnPray", "journalReminderTime", "createdAt", "updatedAt")
		 VALUES (gen_random_uuid()::text, $1, true, true, true, '20:00', now(), now())
		 ON CONFLICT ("userId") DO NOTHING`,
		[userId],
	);

	await pool.query(
		`INSERT INTO "userLocationPreference" (id, "userId", "cityId", "cityName", province, country, latitude, longitude, timezone, "timezoneOffset", "calculationMethodId", source, "createdAt", "updatedAt")
		 VALUES (gen_random_uuid()::text, $1, 'jkt', 'Jakarta Pusat', 'DKI Jakarta', 'Indonesia', -6.2088, 106.8456, 'Asia/Jakarta', 7, 'kemenag', 'manual', now(), now())
		 ON CONFLICT ("userId") DO NOTHING`,
		[userId],
	);
}

function getTrustedOrigins() {
	const authUrlOrigins = parseOrigins(process.env.BETTER_AUTH_URL);
	const configuredOrigins = parseOrigins(
		process.env.BETTER_AUTH_TRUSTED_ORIGINS,
	);

	return Array.from(
		new Set(["http://localhost:3000", ...authUrlOrigins, ...configuredOrigins]),
	);
}

function getAuthBaseUrl() {
	return parseOrigins(process.env.BETTER_AUTH_URL)[0];
}

export const auth = betterAuth({
	baseURL: getAuthBaseUrl(),
	database: pool,
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: getTrustedOrigins(),
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					await bootstrapUser(user.id);
				},
			},
		},
	},
	plugins: [tanstackStartCookies()],
});
