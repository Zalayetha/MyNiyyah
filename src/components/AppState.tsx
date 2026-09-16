import type { LucideIcon } from "lucide-react";
import {
	AlertTriangle,
	CheckCircle2,
	ChevronLeft,
	Info,
	LoaderCircle,
	RefreshCw,
	Trash2,
} from "lucide-react";
import type * as React from "react";
import { cn } from "#/lib/utils";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";

type AppAction = {
	label: string;
	onClick: () => void;
	disabled?: boolean;
	icon?: LucideIcon;
};

interface AppTopBarProps {
	title: string;
	subtitle?: string;
	backLabel?: string;
	onBack?: () => void;
	trailing?: React.ReactNode;
	className?: string;
}

export function AppTopBar({
	title,
	subtitle,
	backLabel = "Kembali",
	onBack,
	trailing,
	className,
}: AppTopBarProps) {
	return (
		<header
			className={cn(
				"flex min-h-20 items-center justify-between gap-3 px-4 py-5",
				className,
			)}
		>
			<div className="flex min-w-0 items-center gap-2">
				{onBack ? (
					<Button
						type="button"
						variant="ghost"
						size="icon-lg"
						onClick={onBack}
						aria-label={backLabel}
						className="min-h-11 min-w-11 rounded-full text-foreground"
					>
						<ChevronLeft aria-hidden="true" className="size-5" />
					</Button>
				) : null}
				<div className="min-w-0">
					<h1 className="truncate font-semibold text-foreground text-lg leading-6">
						{title}
					</h1>
					{subtitle ? (
						<p className="line-clamp-2 text-muted-foreground text-xs leading-5">
							{subtitle}
						</p>
					) : null}
				</div>
			</div>
			{trailing ? <div className="shrink-0">{trailing}</div> : null}
		</header>
	);
}

interface AppLoadingStateProps {
	title?: string;
	description?: string;
	className?: string;
}

export function AppLoadingState({
	title = "Memuat data...",
	description,
	className,
}: AppLoadingStateProps) {
	return (
		<output
			aria-live="polite"
			className={cn(
				"flex min-h-44 flex-col items-center justify-center gap-3 px-6 py-10 text-center",
				className,
			)}
		>
			<LoaderCircle
				aria-hidden="true"
				className="size-6 animate-spin text-primary motion-reduce:animate-none"
			/>
			<div className="space-y-1">
				<p className="font-semibold text-foreground text-sm">{title}</p>
				{description ? (
					<p className="mx-auto max-w-xs text-muted-foreground text-xs leading-5">
						{description}
					</p>
				) : null}
			</div>
		</output>
	);
}

interface AppEmptyStateProps {
	title: string;
	description?: string;
	icon?: LucideIcon;
	action?: AppAction;
	className?: string;
}

export function AppEmptyState({
	title,
	description,
	icon: Icon = Info,
	action,
	className,
}: AppEmptyStateProps) {
	const ActionIcon = action?.icon;
	return (
		<section
			className={cn(
				"flex min-h-48 flex-col items-center justify-center gap-4 px-6 py-10 text-center",
				className,
			)}
		>
			<div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
				<Icon aria-hidden="true" className="size-5" />
			</div>
			<div className="space-y-1.5">
				<h2 className="font-semibold text-base text-foreground">{title}</h2>
				{description ? (
					<p className="mx-auto max-w-xs text-muted-foreground text-sm leading-6">
						{description}
					</p>
				) : null}
			</div>
			{action ? (
				<Button
					type="button"
					variant="secondary"
					size="lg"
					onClick={action.onClick}
					disabled={action.disabled}
					className="min-h-11 rounded-full"
				>
					{ActionIcon ? (
						<ActionIcon aria-hidden="true" className="size-4" />
					) : null}
					{action.label}
				</Button>
			) : null}
		</section>
	);
}

interface AppInlineErrorProps {
	title?: string;
	description: string;
	retry?: AppAction;
	className?: string;
}

export function AppInlineError({
	title = "Terjadi kendala",
	description,
	retry,
	className,
}: AppInlineErrorProps) {
	const RetryIcon = retry?.icon ?? RefreshCw;
	return (
		<div
			role="alert"
			className={cn(
				"rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-left",
				className,
			)}
		>
			<div className="flex items-start gap-3">
				<AlertTriangle
					aria-hidden="true"
					className="mt-0.5 size-5 shrink-0 text-destructive"
				/>
				<div className="min-w-0 flex-1 space-y-1">
					<p className="font-semibold text-foreground text-sm">{title}</p>
					<p className="text-muted-foreground text-sm leading-6">
						{description}
					</p>
				</div>
			</div>
			{retry ? (
				<Button
					type="button"
					variant="destructive"
					size="lg"
					onClick={retry.onClick}
					disabled={retry.disabled}
					className="mt-4 min-h-11 rounded-full"
				>
					<RetryIcon aria-hidden="true" className="size-4" />
					{retry.label}
				</Button>
			) : null}
		</div>
	);
}

type PendingSaveState = "idle" | "saving" | "saved" | "error";

interface AppPendingSaveStatusProps {
	state: PendingSaveState;
	errorMessage?: string;
	className?: string;
}

const pendingSaveCopy: Record<
	PendingSaveState,
	{ label: string; description: string; icon: LucideIcon; className: string }
> = {
	idle: {
		label: "Belum ada perubahan",
		description: "Perubahan akan disimpan saat Anda menekan tombol simpan.",
		icon: Info,
		className: "border-border bg-card text-muted-foreground",
	},
	saving: {
		label: "Menyimpan...",
		description: "Mohon tunggu sebentar.",
		icon: LoaderCircle,
		className: "border-primary/30 bg-primary/10 text-primary",
	},
	saved: {
		label: "Tersimpan",
		description: "Perubahan terakhir sudah diamankan.",
		icon: CheckCircle2,
		className: "border-primary/30 bg-primary/10 text-primary",
	},
	error: {
		label: "Gagal menyimpan",
		description: "Periksa koneksi lalu coba lagi.",
		icon: AlertTriangle,
		className: "border-destructive/30 bg-destructive/10 text-destructive",
	},
};

export function AppPendingSaveStatus({
	state,
	errorMessage,
	className,
}: AppPendingSaveStatusProps) {
	const copy = pendingSaveCopy[state];
	const Icon = copy.icon;
	return (
		<div
			role={state === "error" ? "alert" : "status"}
			aria-live="polite"
			className={cn(
				"flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-2",
				copy.className,
				className,
			)}
		>
			<Icon
				aria-hidden="true"
				className={cn(
					"size-4 shrink-0",
					state === "saving" && "animate-spin motion-reduce:animate-none",
				)}
			/>
			<div className="min-w-0">
				<p className="font-semibold text-sm leading-5">{copy.label}</p>
				<p className="line-clamp-2 text-muted-foreground text-xs leading-5">
					{state === "error" && errorMessage ? errorMessage : copy.description}
				</p>
			</div>
		</div>
	);
}

interface AppDestructiveConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmLabel: string;
	onConfirm: () => void;
	cancelLabel?: string;
	isPending?: boolean;
}

export function AppDestructiveConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	onConfirm,
	cancelLabel = "Batal",
	isPending = false,
}: AppDestructiveConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showClose={!isPending} className="rounded-3xl">
				<DialogHeader>
					<div className="mb-2 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
						<Trash2 aria-hidden="true" className="size-5" />
					</div>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription className="leading-6">
						{description}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2 sm:flex-col-reverse">
					<Button
						type="button"
						variant="ghost"
						size="lg"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
						className="min-h-11 rounded-full"
					>
						{cancelLabel}
					</Button>
					<Button
						type="button"
						variant="destructive"
						size="lg"
						onClick={onConfirm}
						disabled={isPending}
						className="min-h-11 rounded-full"
					>
						{isPending ? (
							<LoaderCircle
								aria-hidden="true"
								className="size-4 animate-spin motion-reduce:animate-none"
							/>
						) : (
							<Trash2 aria-hidden="true" className="size-4" />
						)}
						{isPending ? "Menghapus..." : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
