import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getServerEnvironment } from "./env";
import { authPool, db } from "./prisma";

async function bootstrapUser(userId: string) {
	await db.transaction(async (tx) => {
		await tx.orm.public.UserProfile.where({ userId }).upsert({
			create: { id: randomUUID(), userId, country: "Indonesia" },
			update: {},
		});
		await tx.orm.public.UserPreference.where({ userId }).upsert({
			create: {
				id: randomUUID(),
				userId,
				notifyPrayer: true,
				notifyJournal: true,
				vibrateOnPray: true,
				journalReminderTime: "20:00",
			},
			update: {},
		});
		await tx.orm.public.UserLocationPreference.where({ userId }).upsert({
			create: {
				id: randomUUID(),
				userId,
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
			},
			update: {},
		});
	});
}

const serverEnvironment = getServerEnvironment();

export const auth = betterAuth({
	baseURL: serverEnvironment.betterAuthUrl,
	secret: serverEnvironment.betterAuthSecret,
	database: authPool,
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: serverEnvironment.betterAuthTrustedOrigins,
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
