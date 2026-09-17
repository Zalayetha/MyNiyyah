import { Icon } from "@iconify/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import {
	deleteAccountAction,
	exportAccountDataAction,
} from "#/lib/account-data-server";
import { authClient } from "#/lib/auth-client";
import { clearJournalDraftStorage } from "#/lib/journal-reflection";

interface SettingItemProps {
	icon: string;
	label: string;
	value?: string;
	onClick?: () => void;
	className?: string;
	link?: string;
}

function SettingItem({
	icon,
	label,
	value,
	onClick,
	className,
	link,
}: SettingItemProps) {
	const content = (
		<div
			className={twMerge(
				"flex min-h-14 w-full flex-row items-center justify-between rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted",
				className,
			)}
		>
			<div className="flex flex-row items-center gap-3">
				<div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
					<Icon
						aria-hidden="true"
						icon={icon}
						className="text-muted-foreground"
						fontSize={20}
					/>
				</div>
				<span className="text-foreground">{label}</span>
			</div>
			<div className="flex flex-row items-center gap-2">
				{value && (
					<span className="text-muted-foreground text-sm">{value}</span>
				)}
				<Icon
					aria-hidden="true"
					icon="ph:caret-right"
					className="text-muted-foreground"
					fontSize={16}
				/>
			</div>
		</div>
	);

	if (link) {
		return (
			<Link
				to={link}
				className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			>
				{content}
			</Link>
		);
	}

	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
		>
			{content}
		</button>
	);
}

interface AccountSectionProps {
	user: {
		name: string;
		email: string;
		avatar: string | null;
	};
	stats: {
		totalPrayers: number;
		prayerStreak?: number;
		streak?: number;
		journalStreak?: number;
		journalEntries: number;
		attachedVerses?: number;
	};
	location?: string;
}

export function AccountSection({
	user,
	stats,
	location = "Belum diatur",
}: AccountSectionProps) {
	const navigate = useNavigate();
	const [isExporting, setIsExporting] = useState(false);
	const [exportError, setExportError] = useState<string>();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deletePassword, setDeletePassword] = useState("");
	const [deleteError, setDeleteError] = useState<string>();
	const [isDeleting, setIsDeleting] = useState(false);

	const handleExport = async () => {
		setExportError(undefined);
		setIsExporting(true);
		try {
			const data = await exportAccountDataAction();
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			const date = new Date().toISOString().slice(0, 10);
			anchor.href = url;
			anchor.download = `myniyyah-account-export-${date}.json`;
			anchor.click();
			URL.revokeObjectURL(url);
		} catch {
			setExportError("Gagal menyiapkan export. Coba lagi sebentar.");
		} finally {
			setIsExporting(false);
		}
	};

	const handleDeleteAccount = async () => {
		setDeleteError(undefined);
		setIsDeleting(true);
		try {
			await deleteAccountAction({ data: { password: deletePassword } });
			if (typeof window !== "undefined") {
				clearJournalDraftStorage(sessionStorage);
			}
			await authClient.signOut();
			await navigate({ to: "/login" });
		} catch {
			setDeleteError("Password tidak cocok atau akun gagal dihapus.");
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<div className="w-full pb-32">
			{/*Header*/}
			<div className="px-8 pt-8">
				<div className="font-semibold text-2xl text-foreground">Akun</div>
				<div className="text-sm text-muted-foreground mt-1">
					Kelola akun dan pengaturanmu.
				</div>
			</div>

			{/*Profile Card*/}
			<Link
				to="/edit-profile"
				aria-label={`Edit profil ${user.name}`}
				className="mx-8 mt-6 flex min-h-24 flex-row items-center gap-4 rounded-xl bg-card p-4 transition-colors hover:bg-card/80 outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			>
				<div className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground ring-2 ring-ring">
					{user.name.charAt(0).toUpperCase() || "U"}
				</div>
				<div className="flex flex-col">
					<div className="text-foreground font-semibold text-lg">
						{user.name}
					</div>
					<div className="text-muted-foreground text-sm">{user.email}</div>
				</div>
				<span
					className="ml-auto flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground"
					aria-hidden="true"
				>
					<Icon icon="ph:pencil-simple" fontSize={20} />
				</span>
			</Link>

			{/*Stats Summary*/}
			<div className="mx-8 mt-6 p-4 bg-muted/50 rounded-xl">
				<div className="flex flex-row justify-around">
					<div className="flex flex-col items-center">
						<div className="text-foreground font-semibold text-2xl">
							{stats.totalPrayers}
						</div>
						<div className="text-muted-foreground text-xs mt-1">
							Total Solat
						</div>
					</div>
					<div className="w-px bg-border" />
					<div className="flex flex-col items-center">
						<div className="text-foreground font-semibold text-2xl">
							{stats.prayerStreak ?? stats.streak ?? 0}
						</div>
						<div className="text-muted-foreground text-xs mt-1">
							Hari Streak
						</div>
					</div>
					<div className="w-px bg-border" />
					<div className="flex flex-col items-center">
						<div className="text-foreground font-semibold text-2xl">
							{stats.journalEntries}
						</div>
						<div className="text-muted-foreground text-xs mt-1">Jurnal</div>
					</div>
				</div>
			</div>

			{/*Settings*/}
			<div className="mx-8 mt-6">
				<div className="text-muted-foreground text-xs uppercase tracking-wider mb-3 px-1">
					Preferensi
				</div>
				<div className="flex flex-col gap-3">
					<SettingItem
						icon="ph:map-pin"
						label="Lokasi"
						value={location}
						link="/location"
					/>
				</div>
			</div>

			{/*About*/}
			<div className="mx-8 mt-6">
				<div className="text-muted-foreground text-xs uppercase tracking-wider mb-3 px-1">
					Lainnya
				</div>
				<div className="flex flex-col gap-3">
					<SettingItem icon="ph:info" label="Tentang Aplikasi" link="/about" />
					<SettingItem
						icon="ph:download-simple"
						label={isExporting ? "Menyiapkan Export..." : "Export Data"}
						onClick={handleExport}
					/>
				</div>
				{exportError ? (
					<p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs">
						{exportError}
					</p>
				) : null}
			</div>

			{/*Logout Button*/}
			<div className="mx-8 mt-8">
				<button
					type="button"
					className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-destructive/50 bg-destructive/10 p-4 transition-colors hover:bg-destructive/20 outline-none focus-visible:ring-2 focus-visible:ring-destructive/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
					onClick={async () => {
						if (typeof window !== "undefined") {
							clearJournalDraftStorage(sessionStorage);
						}
						if ("vibrate" in navigator) navigator.vibrate(10);
						await authClient.signOut();
						await navigate({ to: "/login" });
					}}
				>
					<Icon
						aria-hidden="true"
						icon="ph:sign-out"
						className="text-destructive"
						fontSize={20}
					/>
					<span className="text-destructive font-medium">Keluar</span>
				</button>
			</div>

			<div className="mx-8 mt-4">
				<button
					type="button"
					className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-destructive/60 bg-background p-4 text-destructive transition-colors hover:bg-destructive/10 outline-none focus-visible:ring-2 focus-visible:ring-destructive/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
					onClick={() => {
						setDeletePassword("");
						setDeleteError(undefined);
						setDeleteDialogOpen(true);
					}}
				>
					<Icon aria-hidden="true" icon="ph:trash" fontSize={20} />
					<span className="font-medium">Hapus Akun</span>
				</button>
			</div>

			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent showClose={!isDeleting} className="rounded-3xl">
					<DialogHeader>
						<div className="mb-2 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
							<Trash2 aria-hidden="true" className="size-5" />
						</div>
						<DialogTitle>Hapus akun?</DialogTitle>
						<DialogDescription className="leading-6">
							Data pribadi, jurnal, catatan solat, profil, preferensi, dan semua
							sesi login akan dihapus. Data referensi aplikasi tetap ada.
						</DialogDescription>
					</DialogHeader>
					<label className="block" htmlFor="delete-account-password">
						<span className="font-medium text-foreground text-sm">
							Password
						</span>
						<Input
							id="delete-account-password"
							type="password"
							autoComplete="current-password"
							className="mt-2 h-12 rounded-2xl"
							value={deletePassword}
							onChange={(event) => setDeletePassword(event.target.value)}
							disabled={isDeleting}
						/>
					</label>
					{deleteError ? (
						<p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive text-sm">
							{deleteError}
						</p>
					) : null}
					<DialogFooter className="gap-2 sm:flex-col-reverse">
						<Button
							type="button"
							variant="ghost"
							size="lg"
							onClick={() => setDeleteDialogOpen(false)}
							disabled={isDeleting}
							className="min-h-11 rounded-full"
						>
							Batal
						</Button>
						<Button
							type="button"
							variant="destructive"
							size="lg"
							onClick={handleDeleteAccount}
							disabled={isDeleting || !deletePassword}
							className="min-h-11 rounded-full"
						>
							{isDeleting ? (
								<LoaderCircle
									aria-hidden="true"
									className="size-4 animate-spin motion-reduce:animate-none"
								/>
							) : (
								<Trash2 aria-hidden="true" className="size-4" />
							)}
							{isDeleting ? "Menghapus..." : "Hapus akun"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/*Version*/}
			<div className="text-center text-muted-foreground text-xs mt-6">
				MyNiyyah v0.0.1
			</div>
		</div>
	);
}
