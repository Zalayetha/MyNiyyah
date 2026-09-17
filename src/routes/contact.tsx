import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AppTopBar } from "#/components/AppState";
import { buttonVariants } from "#/components/ui/button";

export const Route = createFileRoute("/contact")({
	component: ContactPage,
});

function ContactPage() {
	return (
		<main className="mx-auto min-h-screen max-w-md bg-background pb-12">
			<AppTopBar
				title="Kontak"
				subtitle="Bantuan akses, masukan, dan laporan masalah."
				onBack={() => history.back()}
			/>
			<section className="space-y-5 px-6 text-sm leading-6">
				<div className="rounded-2xl border bg-card p-4">
					<p className="text-muted-foreground">
						Untuk akses akun, masukan produk, atau laporan masalah, gunakan
						GitHub Issues proyek MyNiyyah. Hindari mengirim password, token,
						atau data jurnal yang sensitif.
					</p>
				</div>
				<a
					className={buttonVariants({ className: "h-12 w-full" })}
					href="https://github.com/Zalayetha/my-niyyah/issues"
					rel="noreferrer"
					target="_blank"
				>
					Buka GitHub Issues
					<ExternalLink aria-hidden="true" className="size-4" />
				</a>
				<Link
					to="/about"
					className="inline-flex items-center gap-2 font-medium text-primary"
				>
					<ArrowLeft aria-hidden="true" className="size-4" />
					Kembali ke tentang aplikasi
				</Link>
			</section>
		</main>
	);
}
