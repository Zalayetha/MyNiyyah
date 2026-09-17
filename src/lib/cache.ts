import { setResponseHeader } from "@tanstack/react-start/server";

export const PRIVATE_NO_STORE =
	"private, no-cache, no-store, max-age=0, must-revalidate";

/**
 * Sets private no-store cache headers on the response.
 * Guarantees authenticated and user-private payloads are never stored
 * in shared/public caches or browser history caches.
 */
export function setPrivateCacheControl(): void {
	try {
		setResponseHeader("Cache-Control", PRIVATE_NO_STORE);
		setResponseHeader("Pragma", "no-cache");
		setResponseHeader("Expires", "0");
	} catch {
		// Non-HTTP context fallback (e.g. tests or build-time execution)
	}
}
