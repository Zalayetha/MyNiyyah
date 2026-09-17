import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { clearJournalDraftStorage } from "#/lib/journal-reflection";
import {
	deleteJournalEntryAction,
	getJournalEntryById,
} from "#/lib/journal-server";

export const Route = createFileRoute("/journal/daily-journal/entry/$entryId")({
	loader: ({ params }) =>
		getJournalEntryById({ data: { entryId: params.entryId } }),
	component: JournalEntryPage,
});

function JournalEntryPage() {
	const data = Route.useLoaderData();
	const navigate = useNavigate();
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const entry = data.entry;

	return (
		<div className="mx-auto min-h-screen max-w-md bg-background px-4 pb-24 text-foreground">
			<header className="flex items-center justify-between py-8">
				<Link
					to="/journal/daily-journal"
					search={{ page: 1 }}
					aria-label="Kembali ke jurnal"
				>
					<ArrowLeft className="size-6" />
				</Link>
				<div className="flex items-center gap-2">
					<Link
						to="/journal/daily-journal/create/$step"
						search={{ journalDate: entry.journalDate }}
						params={{ step: "journal-1-subuh" }}
						aria-label="Edit jurnal"
						className="rounded-full p-2 hover:bg-muted"
					>
						<Pencil className="size-5" />
					</Link>
					<Button
						variant="ghost"
						size="icon"
						disabled={isDeleting}
						aria-label="Hapus jurnal"
						onClick={async () => {
							if (!window.confirm("Hapus jurnal ini?")) return;
							setIsDeleting(true);
							setError(null);
							try {
								await deleteJournalEntryAction({ data: { entryId: entry.id } });
								clearJournalDraftStorage(sessionStorage);
								await navigate({
									to: "/journal/daily-journal",
									search: { page: 1 },
								});
							} catch (cause) {
								setError(
									cause instanceof Error
										? cause.message
										: "Gagal menghapus jurnal.",
								);
								setIsDeleting(false);
							}
						}}
					>
						<Trash2 className="size-5 text-destructive" />
					</Button>
				</div>
			</header>
			<article className="rounded-2xl bg-card p-5">
				<p className="text-sm text-muted-foreground">{entry.journalDate}</p>
				<h1 className="mt-2 font-semibold text-2xl">{entry.title}</h1>
				<p className="mt-5 whitespace-pre-wrap text-sm leading-7">
					{entry.content || "Belum ada isi jurnal."}
				</p>
				<div className="mt-6 flex gap-3 text-sm text-muted-foreground">
					<span>Khusyu: {entry.khusyuPercentage ?? "-"}%</span>
					<span>Tepat waktu: {entry.punctualityPercentage ?? "-"}%</span>
				</div>
			</article>
			{data.reflections.length > 0 && (
				<section className="mt-4 rounded-2xl bg-card p-5">
					<h2 className="font-semibold">Refleksi Solat</h2>
					<div className="mt-3 grid grid-cols-2 gap-3 text-sm">
						{data.reflections.map((reflection) => (
							<div
								key={reflection.prayerName}
								className="rounded-xl bg-muted/50 p-3"
							>
								<div className="font-medium">{reflection.prayerName}</div>
								<div className="mt-1 text-muted-foreground">
									{reflection.feeling ?? "Belum diisi"}
								</div>
							</div>
						))}
					</div>
				</section>
			)}
			{data.attachedVerses.length > 0 && (
				<section className="mt-4 rounded-2xl bg-card p-5">
					<h2 className="font-semibold">Ayat Terlampir</h2>
					{data.attachedVerses.map((verse) => (
						<blockquote
							key={`${verse.verseId}:${verse.segmentId ?? "full"}`}
							className="mt-3 border-l-2 border-primary pl-3 text-sm leading-6"
						>
							<p>{verse.quoteText}</p>
							<cite className="text-muted-foreground not-italic">
								{verse.surahRef}
							</cite>
						</blockquote>
					))}
				</section>
			)}
			{error && (
				<p
					role="alert"
					className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
				>
					{error}
				</p>
			)}
		</div>
	);
}
