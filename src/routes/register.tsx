import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";
import {
	hasFormErrors,
	type RegisterFormErrors,
	safeRedirect,
	toSafeAuthError,
	validateRegisterForm,
} from "#/lib/auth-validation";

type RegisterSearch = {
	redirect?: string;
};

export const Route = createFileRoute("/register")({
	component: RegisterRoute,
	validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
	}),
});

function RegisterRoute() {
	const { redirect } = Route.useSearch();
	const redirectTo = safeRedirect(redirect);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [errors, setErrors] = useState<RegisterFormErrors>({});
	const [formError, setFormError] = useState<string>();
	const [isPending, setIsPending] = useState(false);

	return (
		<main className="mx-auto flex min-h-screen max-w-md items-center bg-background px-8 py-10">
			<section className="w-full rounded-3xl border bg-card p-6 shadow-sm">
				<div className="mb-8">
					<p className="font-semibold text-primary text-sm">MyNiyyah</p>
					<h1 className="mt-3 font-semibold text-3xl text-foreground">
						Create account
					</h1>
					<p className="mt-2 text-muted-foreground text-sm">
						Start tracking prayers, journal entries, and daily muhasabah.
					</p>
				</div>

				<form
					className="space-y-5"
					onSubmit={async (event) => {
						event.preventDefault();
						setFormError(undefined);

						const nextErrors = validateRegisterForm({
							name,
							email,
							password,
							confirmPassword,
						});
						setErrors(nextErrors);
						if (hasFormErrors(nextErrors)) return;

						setIsPending(true);
						const result = await authClient.signUp.email({
							name: name.trim(),
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
					<label className="block" htmlFor="register-name">
						<span className="font-medium text-foreground text-sm">Name</span>
						<Input
							id="register-name"
							name="name"
							type="text"
							autoComplete="name"
							placeholder="Your full name"
							className="mt-2 h-12 rounded-2xl border bg-background px-4 text-foreground focus-visible:border-primary"
							value={name}
							onChange={(event) => setName(event.target.value)}
							aria-invalid={Boolean(errors.name)}
							required
						/>
						{errors.name ? (
							<p className="mt-1 text-destructive text-xs">{errors.name}</p>
						) : null}
					</label>

					<label className="block" htmlFor="register-email">
						<span className="font-medium text-foreground text-sm">Email</span>
						<Input
							id="register-email"
							name="email"
							type="email"
							autoComplete="username"
							placeholder="name@example.com"
							className="mt-2 h-12 rounded-2xl border bg-background px-4 text-foreground focus-visible:border-primary"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							aria-invalid={Boolean(errors.email)}
							required
						/>
						{errors.email ? (
							<p className="mt-1 text-destructive text-xs">{errors.email}</p>
						) : null}
					</label>

					<label className="block" htmlFor="register-password">
						<span className="font-medium text-foreground text-sm">
							Password
						</span>
						<Input
							id="register-password"
							name="password"
							type="password"
							autoComplete="new-password"
							placeholder="At least 8 characters"
							className="mt-2 h-12 rounded-2xl border bg-background px-4 text-foreground focus-visible:border-primary"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							aria-invalid={Boolean(errors.password)}
							required
						/>
						{errors.password ? (
							<p className="mt-1 text-destructive text-xs">{errors.password}</p>
						) : null}
					</label>

					<label className="block" htmlFor="register-confirm-password">
						<span className="font-medium text-foreground text-sm">
							Confirm password
						</span>
						<Input
							id="register-confirm-password"
							name="confirmPassword"
							type="password"
							autoComplete="new-password"
							placeholder="Confirm your password"
							className="mt-2 h-12 rounded-2xl border bg-background px-4 text-foreground focus-visible:border-primary"
							value={confirmPassword}
							onChange={(event) => setConfirmPassword(event.target.value)}
							aria-invalid={Boolean(errors.confirmPassword)}
							required
						/>
						{errors.confirmPassword ? (
							<p className="mt-1 text-destructive text-xs">
								{errors.confirmPassword}
							</p>
						) : null}
					</label>

					{formError ? (
						<p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive text-sm">
							{formError}
						</p>
					) : null}

					<Button className="h-12 w-full" disabled={isPending} type="submit">
						{isPending ? "Creating account..." : "Create account"}
					</Button>
				</form>

				<p className="mt-6 text-center text-muted-foreground text-sm">
					Already have an account?{" "}
					<Link
						className="font-medium text-primary"
						search={{ redirect: redirectTo }}
						to="/login"
					>
						Sign in
					</Link>
				</p>
			</section>
		</main>
	);
}
