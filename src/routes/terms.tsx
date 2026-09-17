import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppTopBar } from "#/components/AppState";

export const Route = createFileRoute("/terms")({
	component: TermsPage,
});

function TermsPage() {
	return (
		<main className="mx-auto min-h-screen max-w-md bg-background pb-12">
			<AppTopBar
				title="Syarat & Ketentuan"
				subtitle="Ketentuan penggunaan MyNiyyah versi beta."
				onBack={() => history.back()}
			/>
			<section className="space-y-4 px-6 text-sm leading-6 text-muted-foreground">
				<p>
					MyNiyyah adalah alat pribadi untuk membantu mencatat solat, jurnal
					muhasabah, dan refleksi harian. Aplikasi ini bukan pengganti bimbingan
					ulama, nasihat medis, hukum, atau keputusan penting lain.
				</p>
				<p>
					Jadwal solat dihitung dari lokasi dan metode yang dipilih pengguna.
					Gunakan kebijaksanaan setempat jika ada perbedaan dengan jadwal masjid
					atau otoritas lokal.
				</p>
				<p>
					Konten khazanah saat ini berisi pilihan ayat Al-Qur'an dan terjemahan
					Indonesia untuk mendukung refleksi. MyNiyyah tidak mengklaim fitur
					Hadith, push notification, mode offline penuh, atau layanan pengingat
					otomatis kecuali fitur tersebut benar-benar tersedia di aplikasi.
				</p>
				<p>
					Pengguna bertanggung jawab menjaga keamanan akun dan dapat mengunduh
					atau menghapus data pribadi melalui halaman akun.
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
