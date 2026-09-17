import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	getKhazanahSegmentId,
	getKhazanahVerse,
	getKhazanahVerseSegments,
	KHAZANAH_SOURCE_METADATA,
} from "#/lib/khazanah-data";

interface VerseSearch {
	returnTo?: string;
}

export const Route = createFileRoute("/khazanah/verse/$id")({
	validateSearch: (search: Record<string, unknown>): VerseSearch => ({
		returnTo:
			typeof search.returnTo === "string" && search.returnTo.startsWith("/")
				? search.returnTo
				: undefined,
	}),
	component: VerseDetailPage,
});

function VerseDetailPage() {
	const navigate = useNavigate();
	const { id } = Route.useParams();
	const { returnTo } = Route.useSearch();
	const verse = getKhazanahVerse(id);
	const [selectedSegment, setSelectedSegment] = useState<number>(0);

	if (!verse) {
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
					<h1 className="font-bold text-2xl">Ayat tidak ditemukan</h1>
					<p className="mt-2 text-muted-foreground text-sm">
						Pilih ayat Khazanah yang tersedia.
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

	const segments = getKhazanahVerseSegments(verse);

	return (
		<div className="mx-auto min-h-screen max-w-md bg-background px-4 pb-8 text-foreground">
			{/* Top Bar */}
			<header className="pt-14">
				<Link
					to="/khazanah/$category"
					params={{ category: verse.category }}
					search={{ returnTo }}
					className="inline-flex h-10 w-10 items-center justify-start"
					aria-label="Kembali"
				>
					<ArrowLeft className="size-7" strokeWidth={2.75} />
				</Link>
			</header>

			<main className="mt-2 flex flex-col items-center pb-6 text-center">
				{/* Surah Banner Pill */}
				<div className="gradient-primary flex w-48 flex-col items-center justify-center rounded-[36px] py-6 text-primary-foreground shadow-lg">
					<h1 className="font-bold text-3xl tracking-tight">
						{verse.surahName}
					</h1>
					<p className="mt-1 font-medium text-primary-foreground/80 text-sm">
						{verse.surahTranslation}
					</p>
				</div>

				{/* 3 Metric Cards */}
				<div className="mt-8 grid w-full grid-cols-3 gap-3">
					<div className="flex flex-col items-center justify-center rounded-3xl bg-[#062642] py-4">
						<span className="font-medium text-xs text-primary/80">Juz</span>
						<span className="mt-1 font-bold text-2xl text-primary">
							{verse.juz}
						</span>
					</div>

					<div className="flex flex-col items-center justify-center rounded-3xl bg-[#062642] py-4">
						<span className="font-medium text-xs text-primary/80">Surah</span>
						<span className="mt-1 font-bold text-2xl text-primary">
							{verse.surahNumber}
						</span>
					</div>

					<div className="flex flex-col items-center justify-center rounded-3xl bg-[#062642] py-4">
						<span className="font-medium text-xs text-primary/80">Ayat</span>
						<span className="mt-1 font-bold text-2xl text-primary">
							{verse.verseNumber}
						</span>
					</div>
				</div>

				{/* Arabic Text */}
				<p
					dir="rtl"
					className="mt-8 w-full text-center font-serif text-2xl text-[#32d7c4] leading-loose"
				>
					{verse.arabic}
				</p>
				<p className="mt-3 text-muted-foreground text-xs">
					Sumber: {KHAZANAH_SOURCE_METADATA.translationEdition}
				</p>

				{/* Translation Segments */}
				<div className="mt-6 flex w-full flex-col gap-2.5">
					{segments.map((segment, index) => {
						const isSelected = selectedSegment === index;

						return (
							<button
								key={segment}
								type="button"
								onClick={() => setSelectedSegment(index)}
								className={`w-full rounded-2xl p-4 text-left font-normal text-sm leading-relaxed transition-all ${
									isSelected
										? "border border-primary/40 bg-[#062642] text-primary"
										: "border border-transparent bg-[#062642] text-foreground/80 hover:border-border/30"
								}`}
							>
								{segment}
							</button>
						);
					})}
				</div>

				{/* Bottom CTA Button */}
				<div className="mt-8 w-full">
					<Button
						type="button"
						className="h-13 w-full rounded-full border border-border/40 bg-[#062642] font-semibold text-foreground tracking-wide hover:bg-[#0a355c] active:scale-[0.99]"
						onClick={() => {
							navigate({
								to: "/journal/daily-journal/create/$step",
								params: { step: "journal-2-write" },
								search: {
									verseId: verse.id,
									segmentId: getKhazanahSegmentId(verse.id, selectedSegment),
								},
							});
						}}
					>
						Cantumkan
					</Button>
				</div>
			</main>
		</div>
	);
}
