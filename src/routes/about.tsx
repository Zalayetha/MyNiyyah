import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	BookOpen,
	ChevronRight,
	Clock,
	Heart,
	PieChart,
	Shield,
	Sparkles,
} from "lucide-react";
import { buttonVariants } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";

export const Route = createFileRoute("/about")({
	component: AboutPage,
});
function AboutPage() {
	const features = [
		{
			icon: Clock,
			title: "Jadwal & Pelacak Solat",
			description:
				"Waktu solat presisi berdasarkan lokasi dan pencatatan ketepatan waktu solat harian.",
		},
		{
			icon: BookOpen,
			title: "Jurnal Muhasabah",
			description:
				"Refleksi spiritual dan evaluasi diri berbasis kategori untuk meningkatkan keistiqomahan.",
		},
		{
			icon: PieChart,
			title: "Statistik Ibadah",
			description:
				"Visualisasi kemajuan ibadah mingguan, rekor streak, dan kualitas kekhusyuan.",
		},
		{
			icon: Sparkles,
			title: "Khazanah & Pengingat",
			description:
				"Kumpulan mutiara ayat Al-Qur'an dan hadits harian sebagai inspirasi harian.",
		},
	];

	return (
		<div className="mx-auto min-h-screen max-w-md bg-background pb-12">
			{/* Top Bar */}
			<div className="flex flex-row items-center justify-between px-4 py-8">
				<Link to="/" search={{ section: "account" }}>
					<ArrowLeft className="text-foreground size-6" />
				</Link>
				<div className="font-semibold text-lg text-foreground">
					Tentang Aplikasi
				</div>
				<div className="w-6" />
			</div>

			<div className="px-6 flex flex-col gap-6">
				{/* Hero Card */}
				<Card className="border-0 gradient-primary text-primary-foreground text-center p-6">
					<div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-background shadow-lg ring-1 ring-background/20">
						<img
							src="/logo.svg"
							alt="MyNiyyah logo"
							className="h-full w-full"
						/>
					</div>
					<div className="text-3xl font-bold tracking-tight text-primary-foreground">
						MyNiyyah
					</div>
					<div className="text-sm text-primary-foreground/80 mt-1 font-medium">
						Teman Ibadah & Muhasabah Harian
					</div>
					<div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-background/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
						<Sparkles className="size-3.5" />
						Versi 0.0.1 (Beta)
					</div>
				</Card>

				{/* Mission Section */}
				<Card className="bg-card border-0">
					<CardHeader className="pb-2">
						<CardTitle className="text-base text-foreground">
							Tujuan Kami
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground leading-relaxed">
							MyNiyyah dirancang untuk mendampingi umat Muslim dalam menjaga
							kedisiplinan ibadah solat lima waktu serta menumbuhkan kebiasaan
							bermuhasabah melalui jurnal refleksi diri yang tenang, personal,
							dan bermakna.
						</p>
					</CardContent>
				</Card>

				{/* Features Section */}
				<Card className="bg-card border-0">
					<CardHeader className="pb-2">
						<CardTitle className="text-base text-foreground">
							Fitur Utama
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{features.map((feature) => (
							<div
								key={feature.title}
								className="flex flex-row items-start gap-3.5 p-3 rounded-2xl bg-muted/40"
							>
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<feature.icon className="size-5" />
								</div>
								<div className="flex flex-col gap-0.5">
									<div className="text-sm font-semibold text-foreground">
										{feature.title}
									</div>
									<div className="text-xs text-muted-foreground leading-relaxed">
										{feature.description}
									</div>
								</div>
							</div>
						))}
					</CardContent>
				</Card>

				{/* Information & Links */}
				<Card className="bg-card border-0">
					<CardHeader className="pb-2">
						<CardTitle className="text-base text-foreground">
							Informasi & Bantuan
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						<button
							type="button"
							className="flex flex-row items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
						>
							<div className="flex items-center gap-3">
								<Shield className="size-4 text-primary" />
								<span className="text-sm text-foreground">
									Kebijakan Privasi
								</span>
							</div>
							<ChevronRight className="size-4 text-muted-foreground" />
						</button>
						<button
							type="button"
							className="flex flex-row items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
						>
							<div className="flex items-center gap-3">
								<BookOpen className="size-4 text-primary" />
								<span className="text-sm text-foreground">
									Syarat & Ketentuan
								</span>
							</div>
							<ChevronRight className="size-4 text-muted-foreground" />
						</button>
						<button
							type="button"
							className="flex flex-row items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
						>
							<div className="flex items-center gap-3">
								<Heart className="size-4 text-primary" />
								<span className="text-sm text-foreground">
									Dukung & Beri Masukan
								</span>
							</div>
							<ChevronRight className="size-4 text-muted-foreground" />
						</button>
					</CardContent>
				</Card>

				{/* Back to Account CTA */}
				<Link
					to="/"
					search={{ section: "account" }}
					className={buttonVariants({
						variant: "secondary",
						className: "w-full font-semibold rounded-full py-3",
					})}
				>
					Kembali ke Akun
				</Link>

				{/* Footer */}
				<div className="text-center text-xs text-muted-foreground pt-2">
					© 2026 MyNiyyah. Dibuat untuk kemaslahatan bersama.
				</div>
			</div>
		</div>
	);
}
