export type AppEnvironment = "development" | "test" | "production";

export interface ServerEnvironment {
	nodeEnv: AppEnvironment;
	databaseUrl: string;
	betterAuthUrl: string;
	betterAuthSecret: string;
	betterAuthTrustedOrigins: string[];
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const LOCAL_APP_ORIGIN = "http://localhost:3000";
const PLACEHOLDER_MARKERS = ["CHANGE_ME", "REPLACE_WITH", "YOUR_"];

export class EnvironmentValidationError extends Error {
	readonly variables: string[];

	constructor(variables: Iterable<string>) {
		const uniqueVariables = Array.from(new Set(variables)).sort();
		super(`Invalid environment configuration: ${uniqueVariables.join(", ")}.`);
		this.name = "EnvironmentValidationError";
		this.variables = uniqueVariables;
	}
}

function hasPlaceholder(value: string): boolean {
	const normalized = value.toUpperCase();
	return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

function parseNodeEnvironment(
	value: string | undefined,
	invalid: Set<string>,
): AppEnvironment {
	if (!value) return "development";
	if (value === "development" || value === "test" || value === "production") {
		return value;
	}
	invalid.add("NODE_ENV");
	return "development";
}

function isLoopbackHostname(hostname: string): boolean {
	return (
		hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
	);
}

function parseOrigin(
	variableName: string,
	value: string,
	nodeEnv: AppEnvironment,
	invalid: Set<string>,
): string | null {
	if (value.includes(",") || hasPlaceholder(value)) {
		invalid.add(variableName);
		return null;
	}

	try {
		const url = new URL(value);
		const hasUnsupportedParts =
			(url.protocol !== "http:" && url.protocol !== "https:") ||
			Boolean(url.username || url.password || url.search || url.hash) ||
			(url.pathname !== "/" && url.pathname !== "");
		const requiresHttps =
			nodeEnv === "production" && !isLoopbackHostname(url.hostname);

		if (hasUnsupportedParts || (requiresHttps && url.protocol !== "https:")) {
			invalid.add(variableName);
			return null;
		}

		return url.origin;
	} catch {
		invalid.add(variableName);
		return null;
	}
}

function parseDatabaseUrl(
	value: string | undefined,
	invalid: Set<string>,
): string {
	const normalized = value?.trim() ?? "";
	if (!normalized || hasPlaceholder(normalized)) {
		invalid.add("DATABASE_URL");
		return normalized;
	}

	try {
		const url = new URL(normalized);
		if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
			invalid.add("DATABASE_URL");
		}
	} catch {
		invalid.add("DATABASE_URL");
	}

	return normalized;
}

function parseAuthSecret(
	value: string | undefined,
	invalid: Set<string>,
): string {
	const normalized = value?.trim() ?? "";
	if (normalized.length < 32 || hasPlaceholder(normalized)) {
		invalid.add("BETTER_AUTH_SECRET");
	}
	return normalized;
}

export function parseServerEnvironment(
	source: EnvironmentSource,
): ServerEnvironment {
	const invalid = new Set<string>();
	const nodeEnv = parseNodeEnvironment(source.NODE_ENV, invalid);
	const databaseUrl = parseDatabaseUrl(source.DATABASE_URL, invalid);
	const betterAuthSecret = parseAuthSecret(source.BETTER_AUTH_SECRET, invalid);
	const configuredBaseUrl = source.BETTER_AUTH_URL?.trim();
	const baseUrlValue =
		configuredBaseUrl || (nodeEnv === "production" ? "" : LOCAL_APP_ORIGIN);
	const betterAuthUrl = baseUrlValue
		? parseOrigin("BETTER_AUTH_URL", baseUrlValue, nodeEnv, invalid)
		: null;

	if (!betterAuthUrl) invalid.add("BETTER_AUTH_URL");

	const trustedOrigins = new Set<string>();
	if (betterAuthUrl) trustedOrigins.add(betterAuthUrl);
	if (nodeEnv !== "production") trustedOrigins.add(LOCAL_APP_ORIGIN);

	for (const rawOrigin of (source.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(
		",",
	)) {
		const value = rawOrigin.trim();
		if (!value) continue;
		const origin = parseOrigin(
			"BETTER_AUTH_TRUSTED_ORIGINS",
			value,
			nodeEnv,
			invalid,
		);
		if (origin) trustedOrigins.add(origin);
	}

	if (invalid.size > 0) throw new EnvironmentValidationError(invalid);

	return {
		nodeEnv,
		databaseUrl,
		betterAuthUrl: betterAuthUrl as string,
		betterAuthSecret,
		betterAuthTrustedOrigins: Array.from(trustedOrigins),
	};
}

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment {
	cachedEnvironment ??= parseServerEnvironment(process.env);
	return cachedEnvironment;
}
