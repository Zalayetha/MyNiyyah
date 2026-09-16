import { describe, expect, it } from "vitest";
import { EnvironmentValidationError, parseServerEnvironment } from "./env";

const VALID_SECRET = "test-secret-with-more-than-thirty-two-characters";

describe("server environment validation", () => {
	it("parses and normalizes valid production configuration", () => {
		const env = parseServerEnvironment({
			NODE_ENV: "production",
			DATABASE_URL: "postgresql://user:password@localhost:5432/myniyyah",
			BETTER_AUTH_URL: "https://myniyyah.example/",
			BETTER_AUTH_TRUSTED_ORIGINS:
				"https://admin.myniyyah.example, https://myniyyah.example/",
			BETTER_AUTH_SECRET: VALID_SECRET,
		});

		expect(env).toEqual({
			nodeEnv: "production",
			databaseUrl: "postgresql://user:password@localhost:5432/myniyyah",
			betterAuthUrl: "https://myniyyah.example",
			betterAuthSecret: VALID_SECRET,
			betterAuthTrustedOrigins: [
				"https://myniyyah.example",
				"https://admin.myniyyah.example",
			],
		});
	});

	it("uses localhost as the development base URL only", () => {
		const env = parseServerEnvironment({
			NODE_ENV: "development",
			DATABASE_URL: "postgresql://user:password@localhost:55432/myniyyah",
			BETTER_AUTH_SECRET: VALID_SECRET,
		});

		expect(env.betterAuthUrl).toBe("http://localhost:3000");
		expect(env.betterAuthTrustedOrigins).toEqual(["http://localhost:3000"]);
	});

	it("rejects comma-separated base URLs and unsafe origin shapes", () => {
		expect(() =>
			parseServerEnvironment({
				NODE_ENV: "production",
				DATABASE_URL: "postgresql://user:password@localhost:5432/myniyyah",
				BETTER_AUTH_URL:
					"https://myniyyah.example,https://admin.myniyyah.example",
				BETTER_AUTH_TRUSTED_ORIGINS: "https://example.com/path",
				BETTER_AUTH_SECRET: VALID_SECRET,
			}),
		).toThrowError(EnvironmentValidationError);
	});

	it("requires HTTPS for non-loopback production origins", () => {
		expect(() =>
			parseServerEnvironment({
				NODE_ENV: "production",
				DATABASE_URL: "postgresql://user:password@localhost:5432/myniyyah",
				BETTER_AUTH_URL: "http://myniyyah.example",
				BETTER_AUTH_SECRET: VALID_SECRET,
			}),
		).toThrowError(/BETTER_AUTH_URL/);
	});

	it("reports variable names without leaking invalid values", () => {
		const leakedDatabaseValue = "not-a-database-url-sensitive-value";
		const leakedSecretValue = "short-sensitive-value";

		try {
			parseServerEnvironment({
				NODE_ENV: "production",
				DATABASE_URL: leakedDatabaseValue,
				BETTER_AUTH_URL: "https://myniyyah.example",
				BETTER_AUTH_SECRET: leakedSecretValue,
			});
			throw new Error("Expected environment validation to fail");
		} catch (error) {
			expect(error).toBeInstanceOf(EnvironmentValidationError);
			const message = error instanceof Error ? error.message : String(error);
			expect(message).toContain("DATABASE_URL");
			expect(message).toContain("BETTER_AUTH_SECRET");
			expect(message).not.toContain(leakedDatabaseValue);
			expect(message).not.toContain(leakedSecretValue);
		}
	});

	it("rejects documented placeholders", () => {
		expect(() =>
			parseServerEnvironment({
				DATABASE_URL:
					"postgresql://user:CHANGE_ME_PASSWORD@localhost:5432/myniyyah",
				BETTER_AUTH_SECRET:
					"CHANGE_ME_GENERATED_AUTH_SECRET_AT_LEAST_32_CHARACTERS",
			}),
		).toThrowError(/BETTER_AUTH_SECRET, DATABASE_URL/);
	});
});
