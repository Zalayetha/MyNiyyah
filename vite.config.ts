import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const securityHeaders = {
	"Content-Security-Policy": [
		"default-src 'self'",
		"base-uri 'self'",
		"object-src 'none'",
		"frame-ancestors 'none'",
		"form-action 'self'",
		"img-src 'self' data: blob:",
		"font-src 'self'",
		"style-src 'self' 'unsafe-inline'",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
		"connect-src 'self' https://api.iconify.design https://api.simplesvg.com https://api.unisvg.com",
	].join("; "),
	"X-Frame-Options": "DENY",
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy":
		"camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
	...(process.env.NODE_ENV === "production"
		? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" }
		: {}),
};

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		nitro({
			rollupConfig: { external: [/^@sentry\//] },
			routeRules: {
				"/**": {
					headers: securityHeaders,
				},
				"/_build/**": {
					headers: {
						...securityHeaders,
						"Cache-Control": "public, max-age=31536000, immutable",
					},
				},
				"/assets/**": {
					headers: {
						...securityHeaders,
						"Cache-Control": "public, max-age=31536000, immutable",
					},
				},
			},
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
