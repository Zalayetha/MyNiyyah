import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getServerEnvironment } from "./env";
import { authPool } from "./prisma";
import { ensureUserCompanionRows } from "./user-bootstrap";

async function bootstrapUser(userId: string) {
	await ensureUserCompanionRows(userId);
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
