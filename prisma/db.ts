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
	});

if (process.env.NODE_ENV !== "production") {
	globalThis.__authPool = authPool;
}
