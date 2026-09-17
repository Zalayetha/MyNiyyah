import "../src/lib/temporal-polyfill";
import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import { Pool } from "pg";
import type { Contract } from "./schema.d";
import schemaJson from "./schema.json" with { type: "json" };

export const db = postgres<Contract>({
	contractJson: schemaJson,
	url: process.env["DATABASE_URL"]!,
});

declare global {
	var __authPool: Pool | undefined;
}

export const authPool =
	globalThis.__authPool ??
	new Pool({
		connectionString: process.env["DATABASE_URL"]!,
		connectionTimeoutMillis: 5_000,
		idleTimeoutMillis: 30_000,
		max: Number(process.env["POSTGRES_POOL_MAX"] ?? 10),
		statement_timeout: 10_000,
	});

if (process.env.NODE_ENV !== "production") {
	globalThis.__authPool = authPool;
}

authPool.on("error", (error) => {
	console.error("postgres_pool_error", {
		name: error.name,
		message: "Unexpected idle PostgreSQL client error.",
	});
});

let shutdownStarted = false;

async function gracefulShutdown(signal: NodeJS.Signals) {
	if (shutdownStarted) return;
	shutdownStarted = true;
	console.info("process_shutdown", { signal });
	try {
		await authPool.end();
	} catch (error) {
		console.error("process_shutdown_error", {
			name: error instanceof Error ? error.name : "Error",
		});
	} finally {
		process.exit(0);
	}
}

process.once("SIGTERM", gracefulShutdown);
process.once("SIGINT", gracefulShutdown);
