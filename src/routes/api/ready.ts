import { createFileRoute } from "@tanstack/react-router";
import { checkDatabaseReady, healthResponse } from "#/lib/health";

export const Route = createFileRoute("/api/ready")({
	server: {
		handlers: {
			GET: async () => {
				const ready = await checkDatabaseReady();
				return healthResponse(ready ? "ok" : "unavailable", {
					status: ready ? 200 : 503,
				});
			},
		},
	},
});
