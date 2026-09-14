import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { CategoryCard } from "#/components/journal/daily-journal/CategoryCard";
import { getJournalCategoryCounts } from "#/lib/journal-server";

export const Route = createFileRoute("/journal/daily-journal/")({
	loader: async () => await getJournalCategoryCounts(),
	component: RouteComponent,
});

function RouteComponent() {
	const categories = Route.useLoaderData();

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
