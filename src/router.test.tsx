import { describe, expect, it } from "vitest";
import {
	AppRouteError,
	AppRouteNotFound,
	AppRoutePending,
} from "./components/RouteRecovery";
import { getRouter } from "./router";

describe("router recovery defaults", () => {
	it("registers shared pending, error, and not-found components", () => {
		const router = getRouter();

		expect(router.options.defaultPendingComponent).toBe(AppRoutePending);
		expect(router.options.defaultErrorComponent).toBe(AppRouteError);
		expect(router.options.defaultNotFoundComponent).toBe(AppRouteNotFound);
	});
});
