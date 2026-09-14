import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { Pool } from "pg";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

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

export const auth = betterAuth({
	database: pool,
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: [
		"http://localhost:3000",
		...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
	],
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
