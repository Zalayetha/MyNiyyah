import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Shield, Trash2 } from "lucide-react";
import { AppTopBar } from "#/components/AppState";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
});

function PrivacyPage() {
	return (
		<main className="mx-auto min-h-screen max-w-md bg-background pb-12">
			<AppTopBar
				title="Kebijakan Privasi"
				subtitle="Cara MyNiyyah menyimpan dan mengelola data pribadi."
				onBack={() => history.back()}
			/>
			<section className="space-y-5 px-6 text-sm leading-6">
				<div className="rounded-2xl border bg-card p-4">
					<div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
						<Shield aria-hidden="true" className="size-4 text-primary" />
						Data yang disimpan
					</div>
					<p className="text-muted-foreground">
						MyNiyyah menyimpan akun email, nama, profil, preferensi, lokasi
						solat, catatan solat, jurnal muhasabah, refleksi solat, dan ayat
						khazanah yang dilampirkan ke jurnal.
					</p>
				</div>

				<div className="rounded-2xl border bg-card p-4">
					<div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
						<Download aria-hidden="true" className="size-4 text-primary" />
						Export dan draft lokal
					</div>
					<p className="text-muted-foreground">
						Pengguna yang login dapat mengunduh export JSON dari halaman akun.
						Draft jurnal yang belum dikirim dapat tersimpan sementara di
						sessionStorage browser dan dibersihkan saat logout atau hapus akun.
					</p>
				</div>

				<div className="rounded-2xl border bg-card p-4">
					<div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
						<Trash2 aria-hidden="true" className="size-4 text-primary" />
						Penghapusan akun
					</div>
					<p className="text-muted-foreground">
						Pengguna dapat menghapus akun setelah memasukkan password. Data
						pribadi, jurnal, catatan solat, profil, preferensi, dan sesi login
						dihapus. Data referensi seperti metode perhitungan, katalog kota,
						tema jurnal, dan konten khazanah tidak ikut dihapus.
					</p>
				</div>

				<p className="text-muted-foreground">
					MyNiyyah tidak menjual data pengguna. Hubungi kami melalui{" "}
					<Link className="font-medium text-primary" to="/contact">
						halaman kontak
					</Link>{" "}
					untuk pertanyaan privasi.
				</p>

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
