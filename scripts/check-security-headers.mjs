const target = process.argv.find((arg) => /^https?:\/\//.test(arg)) ?? process.env.RELEASE_BASE_URL;

if (!target) {
	console.error("Usage: pnpm release:headers -- https://example.com");
	process.exit(1);
}

const requiredHeaders = [
	"content-security-policy",
	"x-frame-options",
	"x-content-type-options",
	"referrer-policy",
	"permissions-policy",
	"strict-transport-security",
];

const response = await fetch(target, { redirect: "manual" });
const missing = requiredHeaders.filter((header) => !response.headers.has(header));

if (missing.length > 0) {
	console.error(`Missing security headers: ${missing.join(", ")}`);
	process.exit(1);
}

const csp = response.headers.get("content-security-policy") ?? "";
for (const directive of ["default-src 'self'", "frame-ancestors 'none'"]) {
	if (!csp.includes(directive)) {
		console.error(`CSP is missing directive: ${directive}`);
		process.exit(1);
	}
}

console.log(`Security headers ok for ${target}`);
