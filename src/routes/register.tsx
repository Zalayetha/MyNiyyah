import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "#/components/ui/button";
import { safeRedirect } from "#/lib/auth-validation";

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

	return (
		<main className="mx-auto flex min-h-screen max-w-md items-center bg-background px-8 py-10">
			<section className="w-full rounded-3xl border bg-card p-6 shadow-sm">
				<div className="mb-8">
					<p className="font-semibold text-primary text-sm">MyNiyyah</p>
					<h1 className="mt-3 font-semibold text-3xl text-foreground">
						Registration is closed
					</h1>
					<p className="mt-2 text-muted-foreground text-sm">
						Public signup is disabled until email verification and account
						recovery are configured for production.
					</p>
				</div>

				<div className="space-y-3">
					<Link
						className={buttonVariants({ className: "h-12 w-full" })}
						search={{ redirect: redirectTo }}
						to="/login"
					>
						Sign in
					</Link>
					<Link
						className={buttonVariants({
							variant: "secondary",
							className: "h-12 w-full",
						})}
						to="/contact"
					>
						Contact support
					</Link>
				</div>

				<p className="mt-6 text-center text-muted-foreground text-sm">
					Existing accounts can continue using email and password login.
				</p>
			</section>
		</main>
	);
}
