import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	Bell,
	Camera,
	Check,
	FileText,
	Mail,
	MapPin,
	Phone,
	User,
} from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";

export const Route = createFileRoute("/edit-profile")({
	component: EditProfilePage,
});

function EditProfilePage() {
	const [name, setName] = useState("Fulan");
	const [email, setEmail] = useState("fulan@jobs.com");
	const [phone, setPhone] = useState("+62 812-3456-7890");
	const [city, setCity] = useState("Jakarta, Indonesia");
	const [bio, setBio] = useState(
		"Semoga senantiasa istiqomah dalam solat 5 waktu dan bertumbuh dalam kebaikan.",
	);
	const [notifyPrayer, setNotifyPrayer] = useState(true);
	const [notifyJournal, setNotifyJournal] = useState(true);
	const [vibrateOnPray, setVibrateOnPray] = useState(true);
	const [isSaved, setIsSaved] = useState(false);

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaved(true);
		if ("vibrate" in navigator) navigator.vibrate(15);
		setTimeout(() => setIsSaved(false), 2500);
	};

	return (
		<div className="mx-auto min-h-screen max-w-md bg-background pb-12">
			{/* Top Bar */}
			<div className="flex flex-row items-center justify-between px-4 py-8">
				<Link to="/" search={{ section: "account" }}>
					<ArrowLeft className="text-foreground size-6" />
				</Link>
				<div className="font-semibold text-lg text-foreground">Edit Profil</div>
				<div className="w-6" />
			</div>

			<form onSubmit={handleSave} className="px-6 flex flex-col gap-6">
				{/* Avatar Upload Section */}
				<div className="flex flex-col items-center justify-center gap-3">
					<div className="relative group cursor-pointer">
						<img
							src="https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
							alt="Profile Avatar"
							className="size-24 rounded-full ring-4 ring-primary/40 object-cover shadow-lg"
						/>
						<button
							type="button"
							aria-label="Ubah foto profil"
							className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-transform active:scale-95"
						>
							<Camera className="size-4" />
						</button>
					</div>
					<div className="text-center">
						<button
							type="button"
							className="text-xs font-semibold text-primary hover:underline"
						>
							Ganti Foto Profil
						</button>
					</div>
				</div>

				{/* Personal Details Form */}
				<Card className="bg-card border-0">
					<CardHeader className="pb-2">
						<CardTitle className="text-base text-foreground">
							Informasi Pribadi
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{/* Name */}
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="user-name"
								className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
							>
								<User className="size-3.5 text-primary" /> Nama Lengkap
							</label>
							<input
								id="user-name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
								placeholder="Masukkan nama..."
								required
							/>
						</div>

						{/* Email */}
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="user-email"
								className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
							>
								<Mail className="size-3.5 text-primary" /> Email
							</label>
							<input
								id="user-email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
								placeholder="contoh@email.com"
								required
							/>
						</div>

						{/* Phone */}
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="user-phone"
								className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
							>
								<Phone className="size-3.5 text-primary" /> Nomor WhatsApp / HP
							</label>
							<input
								id="user-phone"
								type="tel"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
								placeholder="+62 812-xxxx-xxxx"
							/>
						</div>

						{/* City */}
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="user-city"
								className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
							>
								<MapPin className="size-3.5 text-primary" /> Kota Domisili
							</label>
							<input
								id="user-city"
								type="text"
								value={city}
								onChange={(e) => setCity(e.target.value)}
								className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
								placeholder="Kota, Negara"
							/>
						</div>

						{/* Bio */}
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="user-bio"
								className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
							>
								<FileText className="size-3.5 text-primary" /> Motto / Catatan
								Niat
							</label>
							<textarea
								id="user-bio"
								rows={3}
								value={bio}
								onChange={(e) => setBio(e.target.value)}
								className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
								placeholder="Tuliskan niat atau motivasi ibadahmu..."
							/>
						</div>
					</CardContent>
				</Card>

				{/* Preferences Card */}
				<Card className="bg-card border-0">
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2">
							<Bell className="size-4 text-primary" />
							<CardTitle className="text-base text-foreground">
								Preferensi & Notifikasi
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						{/* Toggle 1 */}
						<div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
							<div className="flex flex-col gap-0.5">
								<div className="text-sm font-semibold text-foreground">
									Pengingat Adzan 5 Waktu
								</div>
								<div className="text-xs text-muted-foreground">
									Notifikasi otomatis saat waktu solat tiba
								</div>
							</div>
							<button
								type="button"
								onClick={() => setNotifyPrayer(!notifyPrayer)}
								className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
									notifyPrayer ? "bg-primary" : "bg-muted"
								}`}
							>
								<span
									className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
										notifyPrayer ? "translate-x-5" : "translate-x-0"
									}`}
								/>
							</button>
						</div>

						{/* Toggle 2 */}
						<div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
							<div className="flex flex-col gap-0.5">
								<div className="text-sm font-semibold text-foreground">
									Pengingat Jurnal Harian
								</div>
								<div className="text-xs text-muted-foreground">
									Evaluasi ibadah setiap malam pukul 20.00
								</div>
							</div>
							<button
								type="button"
								onClick={() => setNotifyJournal(!notifyJournal)}
								className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
									notifyJournal ? "bg-primary" : "bg-muted"
								}`}
							>
								<span
									className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
										notifyJournal ? "translate-x-5" : "translate-x-0"
									}`}
								/>
							</button>
						</div>

						{/* Toggle 3 */}
						<div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
							<div className="flex flex-col gap-0.5">
								<div className="text-sm font-semibold text-foreground">
									Getar Haptik
								</div>
								<div className="text-xs text-muted-foreground">
									Efek getar saat menyelesaikan solat & tombol
								</div>
							</div>
							<button
								type="button"
								onClick={() => setVibrateOnPray(!vibrateOnPray)}
								className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
									vibrateOnPray ? "bg-primary" : "bg-muted"
								}`}
							>
								<span
									className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
										vibrateOnPray ? "translate-x-5" : "translate-x-0"
									}`}
								/>
							</button>
						</div>
					</CardContent>
				</Card>

				{/* Action Buttons */}
				<div className="flex flex-col gap-2 pt-2">
					<Button
						type="submit"
						className="w-full bg-primary text-primary-foreground font-semibold rounded-full py-3 hover:bg-primary/90 transition-all active:scale-98"
					>
						{isSaved ? (
							<span className="flex items-center gap-2">
								<Check className="size-4" />
								Perubahan Berhasil Disimpan
							</span>
						) : (
							"Simpan Perubahan"
						)}
					</Button>

					<Link
						to="/"
						search={{ section: "account" }}
						className={buttonVariants({
							variant: "ghost",
							className:
								"w-full text-muted-foreground font-medium rounded-full",
						})}
					>
						Batal
					</Link>
				</div>
			</form>
		</div>
	);
}
