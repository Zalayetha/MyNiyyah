import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import {
	AppRouteError,
	AppRouteNotFound,
	AppRoutePending,
} from "./components/RouteRecovery";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultPendingComponent: AppRoutePending,
		defaultErrorComponent: AppRouteError,
		defaultNotFoundComponent: AppRouteNotFound,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
