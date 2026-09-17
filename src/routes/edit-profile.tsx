import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, FileText, Mail, Phone, User } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "#/components/ui/button";
import { getProfileData, saveProfileAction } from "#/lib/profile-server";

export const Route = createFileRoute("/edit-profile")({
	loader: () => getProfileData(),
	component: EditProfilePage,
});

function EditProfilePage() {
	const initial = Route.useLoaderData();
	const [name, setName] = useState(initial.name);
	const [phone, setPhone] = useState(initial.phone);
	const [bio, setBio] = useState(initial.bio);
	const [vibrateOnPray, setVibrateOnPray] = useState(initial.vibrateOnPray);
	const [error, setError] = useState<string | null>(null);
	const [isSaved, setIsSaved] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async (event: React.FormEvent) => {
		event.preventDefault();
		setError(null);
		setIsSaving(true);
		try {
			await saveProfileAction({ data: { name, phone, bio, vibrateOnPray } });
			setIsSaved(true);
			setTimeout(() => setIsSaved(false), 2500);
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Gagal menyimpan profil.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="mx-auto min-h-screen max-w-md bg-background pb-12">
			<div className="flex items-center justify-between px-4 py-8">
				<Link
					to="/"
					search={{ section: "account" }}
					aria-label="Kembali ke akun"
				>
					<ArrowLeft className="size-6 text-foreground" />
				</Link>
				<div className="font-semibold text-lg text-foreground">Edit Profil</div>
				<div className="size-6" />
			</div>
			<form onSubmit={handleSave} className="flex flex-col gap-6 px-6">
				<div className="flex items-center gap-4 rounded-xl bg-card p-4">
					<div className="flex size-16 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
						{name.charAt(0).toUpperCase() || "U"}
					</div>
					<div>
						<div className="font-semibold text-foreground">
							{name || "Nama pengguna"}
						</div>
						<div className="text-sm text-muted-foreground">
							Foto profil belum tersedia
						</div>
					</div>
				</div>
				<div className="flex flex-col gap-4 rounded-xl bg-card p-5">
					<h2 className="font-semibold text-foreground">Informasi Pribadi</h2>
					<label
						className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground"
						htmlFor="user-name"
					>
						<span className="flex items-center gap-1.5">
							<User className="size-3.5 text-primary" /> Nama Lengkap
						</span>
						<input
							id="user-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={100}
							required
							className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground"
						/>
					</label>
					<label
						className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground"
						htmlFor="user-email"
					>
						<span className="flex items-center gap-1.5">
							<Mail className="size-3.5 text-primary" /> Email
						</span>
						<input
							id="user-email"
							value={initial.email}
							readOnly
							aria-readonly="true"
							className="cursor-not-allowed rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground"
						/>
					</label>
					<label
						className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground"
						htmlFor="user-phone"
					>
						<span className="flex items-center gap-1.5">
							<Phone className="size-3.5 text-primary" /> Nomor WhatsApp / HP
						</span>
						<input
							id="user-phone"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							maxLength={32}
							className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground"
						/>
					</label>
					<label
						className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground"
						htmlFor="user-bio"
					>
						<span className="flex items-center gap-1.5">
							<FileText className="size-3.5 text-primary" /> Motto / Catatan
							Niat
						</span>
						<textarea
							id="user-bio"
							rows={3}
							value={bio}
							onChange={(e) => setBio(e.target.value)}
							maxLength={500}
							className="resize-none rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground"
						/>
					</label>
				</div>
				<div className="flex items-center justify-between rounded-xl bg-card p-4">
					<div>
						<div className="font-semibold text-sm text-foreground">
							Getar Haptik
						</div>
						<div className="text-xs text-muted-foreground">
							Getaran saat menyelesaikan solat
						</div>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={vibrateOnPray}
						aria-label="Getar haptik"
						onClick={() => setVibrateOnPray((value) => !value)}
						className={`relative h-6 w-11 rounded-full ${vibrateOnPray ? "bg-primary" : "bg-muted"}`}
					>
						<span
							className={`absolute top-0.5 size-5 rounded-full bg-background transition-transform motion-reduce:transition-none ${vibrateOnPray ? "translate-x-5" : "translate-x-0"}`}
						/>
					</button>
				</div>
				{error && (
					<div
						role="alert"
						className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
					>
						{error}
					</div>
				)}
				<Button
					type="submit"
					disabled={isSaving}
					className="w-full rounded-full"
				>
					{isSaved ? (
						<span className="flex items-center gap-2">
							<Check className="size-4" /> Perubahan Berhasil Disimpan
						</span>
					) : isSaving ? (
						"Menyimpan..."
					) : (
						"Simpan Perubahan"
					)}
				</Button>
				<Link
					to="/"
					search={{ section: "account" }}
					className={buttonVariants({
						variant: "ghost",
						className: "w-full rounded-full text-muted-foreground",
					})}
				>
					Batal
				</Link>
			</form>
		</div>
	);
}
