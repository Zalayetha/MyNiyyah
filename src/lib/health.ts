import { authPool } from "./prisma";

const HEALTH_TIMEOUT_MS = 2_000;

export function healthResponse(
	status: "ok" | "unavailable",
	init?: ResponseInit,
) {
	return Response.json(
		{ status },
		{
			...init,
			headers: {
				"Cache-Control": "no-store",
				...init?.headers,
			},
		},
	);
}

export async function checkDatabaseReady(): Promise<boolean> {
	const timeout = new Promise<false>((resolve) => {
		setTimeout(() => resolve(false), HEALTH_TIMEOUT_MS);
	});
	const probe = authPool
		.query("select 1")
		.then(() => true)
		.catch((error) => {
			console.error("readiness_probe_error", {
				name: error instanceof Error ? error.name : "Error",
			});
			return false;
		});
	return Promise.race([probe, timeout]);
}
