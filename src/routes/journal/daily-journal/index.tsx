import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { CategoryCard } from "#/components/journal/daily-journal/CategoryCard";
import { JournalCard } from "#/components/journal/daily-journal/JournalCard";
import {
	getJournalCategoryCounts,
	getJournalLibraryData,
} from "#/lib/journal-server";

export const Route = createFileRoute("/journal/daily-journal/")({
	validateSearch: (search: Record<string, unknown>) => ({
		page:
			typeof search.page === "string"
				? Math.max(1, Number(search.page) || 1)
				: 1,
	}),
	loaderDeps: ({ search }) => ({ page: search.page }),
	loader: async ({ deps }) =>
		Promise.all([
			getJournalCategoryCounts(),
			getJournalLibraryData({ data: { page: deps.page } }),
		]),
	component: RouteComponent,
});

function RouteComponent() {
	const [categories, library] = Route.useLoaderData();
	const navigate = Route.useNavigate();

	return (
		<div className="relative mx-auto min-h-screen max-w-md bg-background pb-24">
			<div className="flex flex-row justify-between px-4 py-8">
				<Link to="/" search={{ section: undefined }}>
					<ArrowLeft className="text-foreground size-6" />
				</Link>
			</div>
			<div className="font-semibold text-2xl text-foreground mx-4 mt-2">
				Jurnal Harian
			</div>
			<div className="text-sm text-muted-foreground mt-2 mx-4">
				Kumpulan jurnal milikmu
			</div>
			<div className="grid grid-cols-2 mx-4 mt-8 gap-4">
				{categories.map((category) => (
					<CategoryCard
						key={category.id}
						title={category.title}
						count={category.count}
						link={`/journal/daily-journal/theme/${category.id}`}
					/>
				))}
			</div>
			<div className="mt-8">
				{library.entries.map((journal) => (
					<JournalCard
						key={journal.id}
						title={journal.title}
						content={journal.content}
						journalDate={journal.journalDate}
						khusyuPercentage={`${journal.khusyuPercentage ?? "-"}%`}
						onTimePercentage={`${journal.punctualityPercentage ?? "-"}%`}
						totalJournal={journal.attachedVerseCount}
						link={`/journal/daily-journal/entry/${journal.id}`}
					/>
				))}
				{(library.page > 1 || library.hasNextPage) && (
					<div className="mt-4 flex justify-between px-4">
						<button
							type="button"
							disabled={library.page <= 1}
							onClick={() =>
								void navigate({
									search: (previous) => ({
										...previous,
										page: library.page - 1,
									}),
								})
							}
							className="rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-40"
						>
							Sebelumnya
						</button>
						<button
							type="button"
							disabled={!library.hasNextPage}
							onClick={() =>
								void navigate({
									search: (previous) => ({
										...previous,
										page: library.page + 1,
									}),
								})
							}
							className="rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-40"
						>
							Berikutnya
						</button>
					</div>
				)}
			</div>

			<Link
				to="/journal/daily-journal/create"
				className="absolute bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-150 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-ring active:scale-95 active:brightness-90"
				aria-label="Tambah jurnal"
			>
				<Plus size={28} strokeWidth={2.5} />
			</Link>
		</div>
	);
}
