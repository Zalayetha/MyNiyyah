import { Pool } from "pg";
import { getServerEnvironment } from "./env";

declare global {
	var __pgPool: Pool | undefined;
}

export const pool =
	globalThis.__pgPool ??
	new Pool({
		connectionString: getServerEnvironment().databaseUrl,
	});

if (process.env.NODE_ENV !== "production") {
	globalThis.__pgPool = pool;
}
