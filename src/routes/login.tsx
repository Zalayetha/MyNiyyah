import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";
import {
	hasFormErrors,
	type LoginFormErrors,
	safeRedirect,
	toSafeAuthError,
	validateLoginForm,
} from "#/lib/auth-validation";

type LoginSearch = {
	redirect?: string;
};

export const Route = createFileRoute("/login")({
	component: LoginRoute,
	validateSearch: (search: Record<string, unknown>): LoginSearch => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
	}),
});

function LoginRoute() {
	const { redirect } = Route.useSearch();
	const redirectTo = safeRedirect(redirect);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errors, setErrors] = useState<LoginFormErrors>({});
	const [formError, setFormError] = useState<string>();
	const [isPending, setIsPending] = useState(false);

	return (
		<main className="mx-auto flex min-h-screen max-w-md items-center bg-background px-8 py-10">
			<section className="w-full rounded-3xl border bg-card p-6 shadow-sm">
				<div className="mb-8">
					<p className="font-semibold text-primary text-sm">MyNiyyah</p>
					<h1 className="mt-3 font-semibold text-3xl text-foreground">
						Welcome back
					</h1>
					<p className="mt-2 text-muted-foreground text-sm">
						Sign in to continue your prayer tracker and journal.
					</p>
				</div>

				<form
					className="space-y-5"
					onSubmit={async (event) => {
						event.preventDefault();
						setFormError(undefined);

						const nextErrors = validateLoginForm({ email, password });
						setErrors(nextErrors);
						if (hasFormErrors(nextErrors)) return;

						setIsPending(true);
						const result = await authClient.signIn.email({
							email: email.trim(),
							password,
							callbackURL: redirectTo,
						});
						setIsPending(false);

						if (result.error) {
							setFormError(toSafeAuthError(result.error.message));
							return;
						}

						window.location.assign(redirectTo);
					}}
				>
					<label className="block" htmlFor="login-email">
						<span className="font-medium text-foreground text-sm">Email</span>
						<Input
							id="login-email"
							type="email"
							autoComplete="email"
							placeholder="name@example.com"
							className="mt-2 h-12 rounded-2xl border bg-background px-4 text-foreground focus-visible:border-primary"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							aria-invalid={Boolean(errors.email)}
						/>
						{errors.email ? (
							<p className="mt-1 text-destructive text-xs">{errors.email}</p>
						) : null}
					</label>

					<label className="block" htmlFor="login-password">
						<span className="font-medium text-foreground text-sm">
							Password
						</span>
						<Input
							id="login-password"
							type="password"
							autoComplete="current-password"
							placeholder="Enter your password"
							className="mt-2 h-12 rounded-2xl border bg-background px-4 text-foreground focus-visible:border-primary"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							aria-invalid={Boolean(errors.password)}
						/>
						{errors.password ? (
							<p className="mt-1 text-destructive text-xs">{errors.password}</p>
						) : null}
					</label>

					{formError ? (
						<p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive text-sm">
							{formError}
						</p>
					) : null}

					<Button className="h-12 w-full" disabled={isPending} type="submit">
						{isPending ? "Signing in..." : "Sign in"}
					</Button>
				</form>

				<p className="mt-6 text-center text-muted-foreground text-sm">
					No account yet?{" "}
					<Link
						className="font-medium text-primary"
						search={{ redirect: redirectTo }}
						to="/register"
					>
						Create one
					</Link>
				</p>
			</section>
		</main>
	);
}
