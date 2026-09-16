import type {
	ErrorComponentProps,
	NotFoundRouteProps,
} from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Home, RefreshCw, SearchX } from "lucide-react";
import { AppEmptyState, AppInlineError, AppLoadingState } from "./AppState";
import { buttonVariants } from "./ui/button";

function getErrorMessage(error: unknown) {
	if (error instanceof Error && error.message) return error.message;
	return "Halaman belum bisa dimuat. Silakan coba lagi.";
}

export function AppRoutePending() {
	return (
		<main className="mx-auto min-h-screen max-w-md bg-background">
			<AppLoadingState
				title="Memuat halaman..."
				description="Mohon tunggu sebentar."
				className="min-h-screen"
			/>
		</main>
	);
}

export function AppRouteError({ error, reset }: ErrorComponentProps) {
	return (
		<main className="mx-auto flex min-h-screen max-w-md items-center bg-background px-6">
			<AppInlineError
				title="Halaman bermasalah"
				description={getErrorMessage(error)}
				retry={{
					label: "Coba lagi",
					onClick: reset,
					icon: RefreshCw,
				}}
				className="w-full"
			/>
		</main>
	);
}

export function AppRouteNotFound(_props: NotFoundRouteProps) {
	return (
		<main className="mx-auto flex min-h-screen max-w-md items-center bg-background px-6">
			<AppEmptyState
				title="Halaman tidak ditemukan"
				description="Alamat yang Anda buka tidak tersedia atau sudah dipindahkan."
				icon={SearchX}
				action={{
					label: "Muat ulang",
					onClick: () => window.location.reload(),
					icon: AlertTriangle,
				}}
				className="w-full"
			/>
			<Link
				to="/"
				search={{ section: "home" }}
				className={buttonVariants({
					variant: "default",
					size: "lg",
					className:
						"fixed bottom-8 left-1/2 min-h-11 -translate-x-1/2 rounded-full",
				})}
			>
				<Home aria-hidden="true" className="size-4" />
				Kembali ke Beranda
			</Link>
		</main>
	);
}
