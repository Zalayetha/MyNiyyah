import { randomUUID } from "node:crypto";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { setPrivateCacheControl } from "./cache";
import { db } from "./prisma";
import { validationError } from "./server-errors";
import { parseText } from "./server-validation";
import { getCurrentSession } from "./session";
import { ensureUserCompanionRows } from "./user-bootstrap";

export interface ProfileData {
	name: string;
	email: string;
	phone: string;
	bio: string;
	vibrateOnPray: boolean;
}

export const getProfileData = createServerFn({ method: "GET" }).handler(
	async (): Promise<ProfileData> => {
		const session = await getCurrentSession();
		if (!session?.user) {
			throw redirect({ to: "/login", search: { redirect: "/edit-profile" } });
		}
		setPrivateCacheControl();
		await ensureUserCompanionRows(session.user.id);
		const [user, profile, preference] = await Promise.all([
			db.orm.public.User.where({ id: session.user.id }).first(),
			db.orm.public.UserProfile.where({ userId: session.user.id }).first(),
			db.orm.public.UserPreference.where({ userId: session.user.id }).first(),
		]);
		if (!user) throw validationError("User profile is unavailable.");
		return {
			name: user.name,
			email: user.email,
			phone: profile?.phone ?? "",
			bio: profile?.bio ?? "",
			vibrateOnPray: preference?.vibrateOnPray ?? true,
		};
	},
);

export const saveProfileAction = createServerFn({ method: "POST" })
	.validator((input: Record<string, unknown>) => {
		if (typeof input.vibrateOnPray !== "boolean") {
			throw validationError("vibrateOnPray is invalid.");
		}
		return {
			name: parseText(input.name, "name", 100, { required: true }),
			phone: parseText(input.phone, "phone", 32),
			bio: parseText(input.bio, "bio", 500),
			vibrateOnPray: input.vibrateOnPray,
		};
	})
	.handler(async ({ data }) => {
		const session = await getCurrentSession();
		if (!session?.user) throw validationError("You must be signed in.");
		setPrivateCacheControl();
		await db.transaction(async (tx) => {
			await tx.orm.public.User.where({ id: session.user.id }).update({
				name: data.name,
			});
			await tx.orm.public.UserProfile.where({ userId: session.user.id }).upsert(
				{
					create: {
						id: randomUUID(),
						userId: session.user.id,
						phone: data.phone || null,
						bio: data.bio || null,
						country: "Indonesia",
					},
					update: { phone: data.phone || null, bio: data.bio || null },
				},
			);
			await tx.orm.public.UserPreference.where({
				userId: session.user.id,
			}).upsert({
				create: {
					id: randomUUID(),
					userId: session.user.id,
					vibrateOnPray: data.vibrateOnPray,
				},
				update: { vibrateOnPray: data.vibrateOnPray },
			});
		});
		return { success: true };
	});
