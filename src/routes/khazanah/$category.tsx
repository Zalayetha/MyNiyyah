import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { getKhazanahCategory } from "#/lib/khazanah-data";

interface KhazanahCategorySearch {
	returnTo?: string;
}

export const Route = createFileRoute("/khazanah/$category")({
	validateSearch: (
		search: Record<string, unknown>,
	): KhazanahCategorySearch => ({
		returnTo:
			typeof search.returnTo === "string" && search.returnTo.startsWith("/")
				? search.returnTo
				: undefined,
	}),
	component: KhazanahCategoryPage,
});

function KhazanahCategoryPage() {
	const { category: categorySlug } = Route.useParams();
	const { returnTo } = Route.useSearch();
	const category = getKhazanahCategory(categorySlug);

	if (!category) {
		return (
			<div className="mx-auto min-h-screen max-w-md bg-background px-4 pb-12 text-foreground">
				<header className="pt-14">
					<Link
						to="/khazanah"
						search={{ returnTo }}
						className="inline-flex h-10 w-10 items-center justify-start"
						aria-label="Kembali ke khazanah"
					>
						<ArrowLeft className="size-7" strokeWidth={2.75} />
					</Link>
				</header>
				<main className="mt-8 rounded-3xl bg-[#062642] p-6">
					<h1 className="font-bold text-2xl">Kategori tidak ditemukan</h1>
					<p className="mt-2 text-muted-foreground text-sm">
						Pilih kategori Khazanah yang tersedia.
					</p>
					<Link
						to="/khazanah"
						search={{ returnTo }}
						className="mt-5 inline-flex rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground text-sm"
					>
						Lihat Khazanah
					</Link>
				</main>
			</div>
		);
	}

	return (
		<div className="mx-auto min-h-screen max-w-md bg-background px-4 pb-12 text-foreground">
			{/* Top Bar */}
			<header className="pt-14">
				<Link
					to="/khazanah"
					search={{ returnTo }}
					className="inline-flex h-10 w-10 items-center justify-start"
					aria-label="Kembali ke khazanah"
				>
					<ArrowLeft className="size-7" strokeWidth={2.75} />
				</Link>
			</header>

			{/* Title */}
			<main className="mt-4 flex flex-col">
				<h1 className="font-bold text-3xl tracking-tight">{category.title}</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					{category.subtitle}
				</p>

				{/* Verses List */}
				<div className="mt-6 flex flex-col gap-5">
					{category.verses.map((verse) => (
						<Link
							key={verse.id}
							to="/khazanah/verse/$id"
							params={{ id: verse.id }}
							search={{ returnTo }}
							className="flex flex-col items-center gap-4 rounded-3xl bg-[#062642] p-6 text-center transition-all hover:bg-[#082f52] active:scale-[0.99]"
						>
							{/* Arabic Text */}
							<p
								dir="rtl"
								className="w-full text-center font-serif text-xl text-[#32d7c4] leading-loose"
							>
								{verse.arabic}
							</p>

							{/* Translation */}
							<p className="text-foreground/85 text-sm leading-relaxed">
								{verse.translation}
							</p>

							{/* Reference */}
							<span className="text-muted-foreground text-xs">
								(QS. {verse.reference})
							</span>
						</Link>
					))}
				</div>
			</main>
		</div>
	);
}
