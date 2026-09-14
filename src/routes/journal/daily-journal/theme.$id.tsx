import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { JournalCard } from "#/components/journal/daily-journal/JournalCard";
import { getJournalThemeEntries } from "#/lib/journal-server";
export const Route = createFileRoute("/journal/daily-journal/theme/$id")({
	loader: async ({ params }) =>
		await getJournalThemeEntries({ data: { themeId: params.id } }),
	component: RouteComponent,
});

function displayJournalDate(date: string) {
	const [year, month, day] = date.split("-");
	if (!year || !month || !day) return date;
	return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;
}

function RouteComponent() {
	const { theme, entries } = Route.useLoaderData();

	return (
		<div className="mx-auto min-h-screen max-w-md bg-background pb-24">
			<div className="flex flex-row justify-between px-4 py-8">
				<Link to="/journal/daily-journal">
					<ArrowLeft className="text-foreground size-6" />
				</Link>
			</div>
			<div className="p-6 mx-4 mt-2 gradient-primary text-primary-foreground rounded-xl font-medium text-xl">
				{theme?.title ?? "Jurnal"}
			</div>

			<div className="flex flex-col gap-2">
				{entries.map((journal) => (
					<JournalCard
						key={journal.id}
						title={journal.title}
						content={journal.content}
						journalDate={displayJournalDate(journal.journalDate)}
						khusyuPercentage={`${journal.khusyuPercentage ?? 0}%`}
						onTimePercentage={`${journal.punctualityPercentage ?? 0}%`}
						totalJournal={journal.attachedVerseCount}
					/>
				))}
				{entries.length === 0 && (
					<p className="mx-4 mt-6 text-muted-foreground text-sm">
						Belum ada jurnal di kategori ini.
					</p>
				)}
			</div>
		</div>
	);
}
