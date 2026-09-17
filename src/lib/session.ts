import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth";
import { safeRedirect } from "./auth-validation";
import { setPrivateCacheControl } from "./cache";

const GUEST_ONLY_ROUTES: Record<string, true> = {
	"/login": true,
	"/register": true,
};

const PUBLIC_EXACT_ROUTES: Record<string, true> = {
	"/about": true,
	"/contact": true,
	"/privacy": true,
	"/terms": true,
};

export function isPublicRoute(pathname: string): boolean {
	const normalized = pathname.replace(/\/+$/, "") || "/";
	if (PUBLIC_EXACT_ROUTES[normalized]) return true;
	if (normalized.startsWith("/api/auth")) return true;
	if (normalized === "/khazanah" || normalized.startsWith("/khazanah/")) {
		return true;
	}
	return false;
}

export function isGuestOnlyRoute(pathname: string): boolean {
	const normalized = pathname.replace(/\/+$/, "") || "/";
	return Boolean(GUEST_ONLY_ROUTES[normalized]);
}

export const getCurrentSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await auth.api.getSession({ headers: getRequestHeaders() });
		if (session?.user) {
			setPrivateCacheControl();
		}
		return session;
	},
);

export interface RequireAuthInput {
	pathname: string;
	href: string;
	search?: Record<string, unknown>;
}

export async function requireAuth(
	inputOrPathname: string | RequireAuthInput,
	maybeHref?: string,
) {
	const { pathname, href, search } =
		typeof inputOrPathname === "string"
			? {
					pathname: inputOrPathname,
					href: maybeHref ?? inputOrPathname,
					search: undefined,
				}
			: inputOrPathname;

	if (isPublicRoute(pathname)) {
		return { session: null };
	}

	const session = await getCurrentSession();

	if (isGuestOnlyRoute(pathname)) {
		if (session?.user) {
			const redirectTarget =
				typeof search?.redirect === "string" ? search.redirect : undefined;
			throw redirect({
				to: safeRedirect(redirectTarget, "/"),
			});
		}
		return { session: null };
	}

	if (!session?.user) {
		throw redirect({
			to: "/login",
			search: {
				redirect: href,
			},
		});
	}

	return { session };
}
