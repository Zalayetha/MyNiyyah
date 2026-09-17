import { randomUUID } from "node:crypto";
import { db } from "./prisma";

const bootstrapLocks = new Map<string, Promise<void>>();

export async function ensureUserCompanionRows(userId: string) {
	const activeBootstrap = bootstrapLocks.get(userId);
	if (activeBootstrap) return activeBootstrap;
	const bootstrap = repairCompanionRows(userId);
	bootstrapLocks.set(userId, bootstrap);
	try {
		await bootstrap;
	} finally {
		if (bootstrapLocks.get(userId) === bootstrap) bootstrapLocks.delete(userId);
	}
}

async function repairCompanionRows(userId: string) {
	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			await db.transaction(async (tx) => {
				const profile = await tx.orm.public.UserProfile.where({
					userId,
				}).first();
				if (!profile) {
					await tx.orm.public.UserProfile.create({
						id: randomUUID(),
						userId,
						country: "Indonesia",
					});
				}
				const preference = await tx.orm.public.UserPreference.where({
					userId,
				}).first();
				if (!preference) {
					await tx.orm.public.UserPreference.create({
						id: randomUUID(),
						userId,
						notifyPrayer: true,
						notifyJournal: true,
						vibrateOnPray: true,
						journalReminderTime: "20:00",
					});
				}
				const location = await tx.orm.public.UserLocationPreference.where({
					userId,
				}).first();
				if (!location) {
					await tx.orm.public.UserLocationPreference.create({
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
					});
				}
			});
			return;
		} catch (error) {
			const code =
				typeof error === "object" && error !== null && "code" in error
					? error.code
					: undefined;
			const message = error instanceof Error ? error.message : String(error);
			if (
				attempt === 0 &&
				(code === "23505" || message.includes("duplicate key value"))
			) {
				continue;
			}
			throw error;
		}
	}
}
