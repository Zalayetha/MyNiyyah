import { Icon } from "@iconify/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Activity,
	ArrowLeft,
	BookOpen,
	Calendar,
	Check,
	ChevronDown,
	CloudSun,
	Moon,
	Pencil,
	Plus,
	Sun,
	Sunrise,
	Sunset,
	Watch,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { StepId } from "#/components/journal/daily-journal/create/steps";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Slider } from "#/components/ui/slider";
import {
	calculateJournalSummary,
	createInitialJournalDraft,
	FEELING_OPTIONS,
	getJournalDraftFeeling,
	JOURNAL_DRAFT_STORAGE_KEY,
	type JournalDraft,
	type JournalDraftAttachedVerse,
	parseJournalDraft,
	serializeJournalDraft,
} from "#/lib/journal-reflection";
import {
	getJournalInitialData,
	type JournalInitialData,
	type JournalThemeOption,
	saveJournalEntryAction,
} from "#/lib/journal-server";
import { KHAZANAH_VERSES } from "#/lib/khazanah-data";
import type { PrayerName } from "#/lib/prayer-calculation";

interface JournalSearchParams {
	verseId?: string;
	segmentIndex?: number;
	journalDate?: string;
}

export const Route = createFileRoute("/journal/daily-journal/create/$step")({
	validateSearch: (search: Record<string, unknown>): JournalSearchParams => ({
		verseId: typeof search.verseId === "string" ? search.verseId : undefined,
		segmentIndex:
			typeof search.segmentIndex === "number"
				? search.segmentIndex
				: typeof search.segmentIndex === "string"
					? parseInt(search.segmentIndex, 10)
					: undefined,
		journalDate:
			typeof search.journalDate === "string" ? search.journalDate : undefined,
	}),
	loaderDeps: ({ search }) => ({ journalDate: search.journalDate }),
	loader: async ({ deps }) => {
		return await getJournalInitialData({
			data: { journalDate: deps.journalDate },
		});
	},
	component: RouteComponent,
});

interface PrayerStep {
	id: StepId;
	prayerName: PrayerName;
	name: string;
	Icon: typeof CloudSun;
	iconClassName: string;
	nextStep: StepId;
}

const PRAYER_STEPS: PrayerStep[] = [
	{
		id: "journal-1-subuh",
		prayerName: "subuh",
		name: "Shubuh",
		Icon: CloudSun,
		iconClassName: "text-primary",
		nextStep: "journal-2-zhuhur",
	},
	{
		id: "journal-2-zhuhur",
		prayerName: "zhuhur",
		name: "Zhuhur",
		Icon: Sun,
		iconClassName: "text-lime-300",
		nextStep: "journal-3-ashar",
	},
	{
		id: "journal-3-ashar",
		prayerName: "ashar",
		name: "Ashar",
		Icon: Sunrise,
		iconClassName: "text-orange-300",
		nextStep: "journal-4-maghrib",
	},
	{
		id: "journal-4-maghrib",
		prayerName: "maghrib",
		name: "Maghrib",
		Icon: Sunset,
		iconClassName: "text-teal-400",
		nextStep: "journal-5-isya",
	},
	{
		id: "journal-5-isya",
		prayerName: "isya",
		name: "Isya",
		Icon: Moon,
		iconClassName: "text-cyan-600",
		nextStep: "onboarding-2",
	},
];

const PRAYER_SUMMARIES = [
	{
		id: "journal-1-subuh" as StepId,
		prayerName: "subuh" as PrayerName,
		icon: CloudSun,
		colorClassName: "text-[#32d7c4]",
	},
	{
		id: "journal-2-zhuhur" as StepId,
		prayerName: "zhuhur" as PrayerName,
		icon: Sun,
		colorClassName: "text-[#d9f99d]",
	},
	{
		id: "journal-3-ashar" as StepId,
		prayerName: "ashar" as PrayerName,
		icon: Sunrise,
		colorClassName: "text-[#fdba74]",
	},
	{
		id: "journal-4-maghrib" as StepId,
		prayerName: "maghrib" as PrayerName,
		icon: Sunset,
		colorClassName: "text-[#2dd4bf]",
	},
	{
		id: "journal-5-isya" as StepId,
		prayerName: "isya" as PrayerName,
		icon: Moon,
		colorClassName: "text-[#86efac]",
	},
];

const DEFAULT_FEELING = 2;

const FEELING_LABELS = FEELING_OPTIONS.map((option) => option.label);

function readDraft(fallbackDate: string): JournalDraft {
	if (typeof window === "undefined")
		return createInitialJournalDraft(fallbackDate);
	return parseJournalDraft(
		sessionStorage.getItem(JOURNAL_DRAFT_STORAGE_KEY),
		fallbackDate,
	);
}

function displayJournalDate(date: string) {
	const [year, month, day] = date.split("-");
	if (!year || !month || !day) return date;
	return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;
}

function getReflectionPrompt(draft: JournalDraft) {
	const selectedFeelings = Object.values(draft.feelings);
	const hardestFeeling =
		selectedFeelings.find((feeling) => feeling.feelingLabel === "Berat") ??
		selectedFeelings.find((feeling) => feeling.feelingLabel === "Ngantuk");

	if (!hardestFeeling) return "Apa yang paling ingin kau syukuri hari ini?";
	return `Kenapa kau merasa ${hardestFeeling.feelingLabel.toLowerCase()} hari ini?`;
}

function RouteComponent() {
	const navigate = useNavigate();
	const initialData = Route.useLoaderData() as JournalInitialData;
	const [journalData, setJournalData] = useState(initialData);

	const { step } = Route.useParams();
	const search = Route.useSearch();
	const currentPrayerStep = PRAYER_STEPS.find(
		(prayerStep) => prayerStep.id === step,
	);
	const currentStep = currentPrayerStep ?? PRAYER_STEPS[0];
	const [draft, setDraft] = useState<JournalDraft>(() =>
		createInitialJournalDraft(initialData.journalDate),
	);
	const [hasLoadedStoredDraft, setHasLoadedStoredDraft] = useState(false);
	const currentMetric = journalData.prayerMetrics[currentStep.prayerName];
	const currentFeeling =
		draft.feelings[currentStep.prayerName]?.feelingIndex ??
		currentMetric.feelingIndex ??
		DEFAULT_FEELING;
	const [isDateModalOpen, setIsDateModalOpen] = useState(false);
	const [dateInput, setDateInput] = useState(draft.journalDate);
	const selectedCategory = journalData.themes.find(
		(theme) => theme.id === draft.themeId,
	);
	const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const canSaveJournal = journalData.canSaveJournal;

	useEffect(() => {
		setJournalData(initialData);
	}, [initialData]);

	useEffect(() => {
		const storedDraft = readDraft(initialData.journalDate);
		setDraft(storedDraft);
		setDateInput(storedDraft.journalDate);
		setHasLoadedStoredDraft(true);
	}, [initialData.journalDate]);

	useEffect(() => {
		if (draft.journalDate === journalData.journalDate) return;
		void getJournalInitialData({
			data: {
				journalDate: draft.journalDate,
				timezone: journalData.timezone,
			},
		}).then((nextData) => setJournalData(nextData));
	}, [draft.journalDate, journalData.journalDate, journalData.timezone]);

	useEffect(() => {
		if (typeof window === "undefined" || !hasLoadedStoredDraft) return;
		sessionStorage.setItem(
			JOURNAL_DRAFT_STORAGE_KEY,
			serializeJournalDraft(draft),
		);
	}, [draft, hasLoadedStoredDraft]);

	useEffect(() => {
		if (search?.verseId) {
			const verse = KHAZANAH_VERSES.find((v) => v.id === search.verseId);
			if (verse) {
				const segmentIdx = search.segmentIndex ?? 0;
				const quote = verse.segments?.[segmentIdx] ?? verse.translation ?? "";
				const newAttached: JournalDraftAttachedVerse = {
					verseId: verse.id,
					segmentId: `${verse.id}-${segmentIdx}`,
					segmentIndex: segmentIdx,
					surahRef: `${verse.surahName}: ${verse.verseNumber}`,
					quoteText: quote.endsWith("....") ? quote : `${quote}....`,
				};
				setDraft((currentDraft) => {
					if (
						currentDraft.attachedVerses.some(
							(a) =>
								a.verseId === newAttached.verseId &&
								a.segmentId === newAttached.segmentId,
						)
					) {
						return currentDraft;
					}
					return {
						...currentDraft,
						attachedVerses: [...currentDraft.attachedVerses, newAttached],
					};
				});
			}
		}
	}, [search?.verseId, search?.segmentIndex]);

	const journalSummary = calculateJournalSummary(
		draft.feelings,
		journalData.prayerMetrics,
	);

	if (step === "journal-2-write") {
		return (
			<div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-4 pb-6 text-foreground">
				<header className="pt-8 sm:pt-12">
					<Link
						to="/journal/daily-journal/create/$step"
						params={{ step: "onboarding-2" }}
						className="inline-flex h-10 w-10 items-center justify-start rounded-full transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
						aria-label="Kembali ke pembuka isi jurnal"
					>
						<ArrowLeft className="size-7" strokeWidth={2.75} />
					</Link>
				</header>

				<main className="flex flex-1 flex-col">
					<input
						type="text"
						value={draft.title}
						onChange={(e) =>
							setDraft((currentDraft) => ({
								...currentDraft,
								title: e.target.value,
							}))
						}
						placeholder="Isi Judul Jurnalmu"
						aria-label="Judul Jurnal"
						className="mt-6 w-full bg-transparent font-bold text-[28px] text-foreground leading-tight tracking-normal placeholder:text-muted-foreground/40 focus:outline-none"
					/>

					<section
						className="mt-7 grid grid-cols-5 gap-2"
						aria-label="Ringkasan sholat hari ini"
					>
						{PRAYER_SUMMARIES.map(
							({ prayerName, icon: PrayerIcon, colorClassName }) => {
								const feelingIndex = draft.feelings[prayerName]?.feelingIndex;
								const feelingLabel =
									feelingIndex !== undefined
										? FEELING_LABELS[feelingIndex]
										: (journalData.prayerMetrics[prayerName].feelingLabel ??
											"-");

								return (
									<div
										key={prayerName}
										className="flex min-w-0 flex-col items-center gap-1.5"
									>
										<PrayerIcon
											className={`size-7 sm:size-8 ${colorClassName}`}
											fill="currentColor"
											strokeWidth={1.75}
										/>
										<span
											className={`max-w-full truncate text-[11px] font-medium leading-none sm:text-xs ${colorClassName}`}
										>
											{feelingLabel}
										</span>
									</div>
								);
							},
						)}
					</section>

					<section
						className="mt-7 grid grid-cols-2 gap-3"
						aria-label="Informasi jurnal"
					>
						<Button
							type="button"
							variant="default"
							className="h-11 min-w-0 rounded-full px-4 font-semibold shadow-none"
							onClick={() => {
								setDateInput(draft.journalDate);
								setIsDateModalOpen(true);
							}}
						>
							<Calendar className="size-4" />
							<span>{displayJournalDate(draft.journalDate)}</span>
						</Button>

						<Button
							type="button"
							variant="outline"
							className="h-11 min-w-0 rounded-full border-border/40 bg-[#0f2137] px-4 font-medium text-foreground hover:bg-[#152a45]"
							onClick={() => setIsCategoryModalOpen(true)}
						>
							<span className="truncate">
								{selectedCategory ? selectedCategory.title : "Kategori"}
							</span>
							<ChevronDown className="size-4 opacity-70" />
						</Button>

						<Button
							type="button"
							variant="outline"
							className="col-span-2 h-11 rounded-full border-border/40 bg-[#0f2137] px-4 font-medium text-foreground hover:bg-[#152a45]"
							onClick={() => {
								navigate({
									to: "/khazanah",
								});
							}}
						>
							<BookOpen className="size-4" />
							<span>{draft.attachedVerses.length} Ayat</span>
							<Plus className="size-4" />
						</Button>
					</section>

					<section className="mt-8 flex flex-1 flex-col">
						<p className="text-sm text-[#4ea8de] italic">
							{getReflectionPrompt(draft)}
						</p>

						{draft.attachedVerses.map((ayat) => (
							<div
								key={`${ayat.verseId}-${ayat.segmentId ?? "full"}`}
								className="relative my-3 rounded-2xl border border-border/40 bg-[#062642] p-4 text-foreground shadow-sm"
							>
								<div className="flex items-center justify-between">
									<div className="flex min-w-0 items-center gap-2 font-medium text-foreground text-sm">
										<BookOpen className="size-4 text-foreground" />
										<span className="truncate">{ayat.surahRef}</span>
									</div>
									<button
										type="button"
										onClick={() => {
											setDraft((currentDraft) => ({
												...currentDraft,
												attachedVerses: currentDraft.attachedVerses.filter(
													(attached) =>
														!(
															attached.verseId === ayat.verseId &&
															attached.segmentId === ayat.segmentId
														),
												),
											}));
										}}
										className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
										aria-label="Hapus kutipan ayat"
									>
										<X className="size-5" />
									</button>
								</div>
								<p className="mt-2 font-light text-foreground/90 text-sm leading-relaxed">
									“{ayat.quoteText}”
								</p>
							</div>
						))}

						<textarea
							value={draft.content}
							onChange={(e) =>
								setDraft((currentDraft) => ({
									...currentDraft,
									content: e.target.value,
								}))
							}
							placeholder="Tuliskan renunganmu di sini..."
							aria-label="Isi Renungan Jurnal"
							rows={8}
							className="mt-3 min-h-[260px] w-full flex-1 resize-none rounded-3xl border border-border/30 bg-[#071f36] px-4 py-4 text-[15px] text-foreground leading-relaxed placeholder:text-muted-foreground/30 focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/15"
						/>
					</section>
					<Button
						type="button"
						className="gradient-secondary sticky bottom-4 mt-5 h-13 w-full font-semibold text-background tracking-wide shadow-xl shadow-background/40 hover:brightness-105"
						onClick={() => {
							navigate({
								to: "/journal/daily-journal/create/$step",
								params: { step: "journal-2-summary" },
							});
						}}
					>
						Lihat Hasil
					</Button>
				</main>

				<Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Pilih Tanggal Jurnal</DialogTitle>
							<DialogDescription>
								Pilih tanggal pelaksanaan ibadah dan renungan jurnalmu.
							</DialogDescription>
						</DialogHeader>
						<div className="py-3">
							<label
								htmlFor="journal-date-input"
								className="mb-2 block text-xs text-muted-foreground"
							>
								Tanggal (YYYY-MM-DD)
							</label>
							<input
								id="journal-date-input"
								type="date"
								value={dateInput}
								onChange={(e) => setDateInput(e.target.value)}
								className="w-full rounded-2xl border border-border/50 bg-[#0a1527] px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								className="gradient-secondary w-full font-semibold text-background hover:brightness-105"
								onClick={() => {
									setDraft((currentDraft) => ({
										...currentDraft,
										journalDate: dateInput,
									}));
									void getJournalInitialData({
										data: {
											journalDate: dateInput,
											timezone: journalData.timezone,
										},
									}).then((nextData) => setJournalData(nextData));
									setIsDateModalOpen(false);
								}}
							>
								Simpan Tanggal
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<Dialog
					open={isCategoryModalOpen}
					onOpenChange={setIsCategoryModalOpen}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Pilih Kategori</DialogTitle>
							<DialogDescription>
								Pilih kategori yang sesuai untuk renungan jurnalmu.
							</DialogDescription>
						</DialogHeader>
						<div className="flex flex-col gap-2 py-2">
							{journalData.themes.map((category: JournalThemeOption) => {
								const isSelected = selectedCategory?.id === category.id;
								return (
									<button
										key={category.id}
										type="button"
										onClick={() => {
											setDraft((currentDraft) => ({
												...currentDraft,
												themeId: category.id,
											}));
											setIsCategoryModalOpen(false);
										}}
										className={`flex w-full items-center justify-between rounded-2xl p-4 transition-all ${
											isSelected
												? "border border-primary bg-primary/20 text-primary"
												: "border border-border/40 bg-[#0a1527] text-foreground hover:border-primary/40 hover:bg-[#0e1d33]"
										}`}
									>
										<div className="flex flex-col text-left">
											<span className="font-semibold text-base">
												{category.title}
											</span>
											<span className="text-muted-foreground text-xs">
												{category.count} Jurnal terkait
											</span>
										</div>
										{isSelected && <Check className="size-5 text-primary" />}
									</button>
								);
							})}
						</div>
					</DialogContent>
				</Dialog>
			</div>
		);
	}

	if (step === "journal-2-complete") {
		return (
			<div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-4 pb-6 text-foreground">
				<header className="pt-8 sm:pt-12">
					<Link
						to="/journal/daily-journal/create/$step"
						params={{ step: "journal-2-summary" }}
						aria-label="Kembali ke isi jurnal"
						className="inline-flex h-10 w-10 items-center justify-start rounded-full transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
					>
						<ArrowLeft className="size-7" strokeWidth={2.75} />
					</Link>
				</header>

				<main className="flex flex-1 flex-col items-center text-center">
					<section className="flex flex-1 flex-col items-center justify-center pb-8">
						<h1 className="mb-12 font-bold text-[36px] leading-tight tracking-normal">
							Muhasabah
							<br />
							Selesai
						</h1>

						<MuhasabahSealIcon className="size-44 text-primary sm:size-52" />

						<p className="mt-10 max-w-[340px] text-[16px] text-foreground/90 leading-relaxed">
							Kamu telah melakukan muhasabah hari ini, silahkan lihat statistik
							hasil refleksimu.
						</p>
					</section>

					<Button
						type="button"
						className="gradient-secondary h-13 w-full font-semibold text-background tracking-wide hover:brightness-105"
						onClick={() => {
							navigate({
								to: "/journal/complete-statistic",
							});
						}}
					>
						Lihat Statistik
					</Button>
				</main>
			</div>
		);
	}

	if (step === "journal-2-summary") {
		return (
			<div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-4 pb-6 text-foreground">
				<header className="pt-8 sm:pt-12">
					<Link
						to="/journal/daily-journal/create/$step"
						params={{ step: "journal-2-write" }}
						aria-label="Kembali ke muhasabah selesai"
						className="inline-flex h-10 w-10 items-center justify-start rounded-full transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
					>
						<ArrowLeft className="size-7" strokeWidth={2.75} />
					</Link>
				</header>

				<main className="flex flex-1 flex-col pb-6">
					<h1 className="mt-5 font-semibold text-[30px] text-foreground leading-tight tracking-normal sm:text-[32px]">
						Rangkuman
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Rekap jurnalmu hari ini
					</p>
					<section
						className="mt-6 flex flex-col gap-4 rounded-3xl bg-[#062642] p-5 text-foreground sm:p-6"
						aria-label="Jejak Ibadah"
					>
						<div className="flex items-center gap-3">
							<Icon
								icon="hugeicons:prayer-rug-01"
								className="size-7 text-foreground"
								fontSize={28}
							/>
							<h2 className="font-bold text-xl tracking-wide">Jejak Ibadah</h2>
						</div>

						<div className="flex items-center justify-between rounded-2xl bg-background/25 px-4 py-3">
							<div className="flex items-center gap-2.5 text-foreground/90">
								<Activity className="size-5 text-foreground" />
								<span className="font-medium text-[15px]">Kekhusyu’an</span>
							</div>
							<span className="font-bold text-lg text-primary">
								{journalSummary.khusyuPercentage}%
							</span>
						</div>

						<div className="flex items-center justify-between rounded-2xl bg-background/25 px-4 py-3">
							<div className="flex items-center gap-2.5 text-foreground/90">
								<Watch className="size-5 text-foreground" />
								<span className="font-medium text-[15px]">Tepat Waktu</span>
							</div>
							<span className="font-bold text-lg text-primary">
								{journalSummary.punctualityPercentage}%
							</span>
						</div>
					</section>

					<section
						className="mt-4 flex flex-col gap-3 rounded-3xl bg-[#062642] p-5 text-foreground sm:p-6"
						aria-label="Isi Jurnal"
					>
						<div className="flex items-center gap-3">
							<div className="flex size-9 items-center justify-center rounded-full border-2 border-foreground/90">
								<Pencil className="size-4.5 -rotate-45 text-foreground/90" />
							</div>
							<h2 className="font-bold text-xl tracking-wide">Isi Jurnal</h2>
						</div>

						<h3 className="mt-1 font-bold text-base text-foreground leading-snug">
							{draft.title.trim() ? draft.title : "Muhasabah Harian"}
						</h3>

						<p className="line-clamp-4 text-foreground/80 text-sm leading-relaxed">
							{draft.content.trim() ? draft.content : "Belum ada isi jurnal."}
						</p>

						<div className="mt-2 flex flex-wrap items-center gap-2">
							<span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 font-semibold text-primary-foreground text-xs">
								<Calendar className="size-3.5" />
								<span>{displayJournalDate(draft.journalDate)}</span>
							</span>
							<span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 font-semibold text-primary-foreground text-xs">
								<BookOpen className="size-3.5" />
								<span>{draft.attachedVerses.length}</span>
							</span>

							<span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 font-semibold text-primary-foreground text-xs">
								<ChevronDown className="size-3.5" />
								<span>
									{selectedCategory ? selectedCategory.title : "Tanpa kategori"}
								</span>
							</span>
						</div>
					</section>

					<div className="mt-auto pt-8">
						{!canSaveJournal && (
							<p className="mb-3 rounded-2xl border border-primary/20 bg-[#062642] px-4 py-3 text-center text-primary text-sm leading-relaxed">
								Jurnal bisa disimpan setelah waktu Isya tiba.
							</p>
						)}
						<Button
							type="button"
							disabled={isSaving || !canSaveJournal}
							className="gradient-secondary sticky bottom-4 h-13 w-full font-semibold text-background tracking-wide shadow-xl shadow-background/40 hover:brightness-105"
							onClick={async () => {
								if (!canSaveJournal) return;
								setIsSaving(true);
								try {
									await saveJournalEntryAction({ data: draft });
									if (typeof window !== "undefined") {
										sessionStorage.removeItem(JOURNAL_DRAFT_STORAGE_KEY);
									}
									await navigate({
										to: "/journal/daily-journal/create/$step",
										params: { step: "journal-2-complete" },
									});
								} finally {
									setIsSaving(false);
								}
							}}
						>
							{isSaving
								? "Menyimpan..."
								: canSaveJournal
									? "Simpan Jurnal"
									: "Menunggu Isya"}
						</Button>
					</div>
				</main>
			</div>
		);
	}
	if (step === "onboarding-2") {
		return (
			<div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-4 pb-6 text-foreground">
				<header className="pt-8 sm:pt-12">
					<Link
						to="/journal/daily-journal/create/$step"
						params={{ step: "journal-5-isya" }}
						className="inline-flex h-10 w-10 items-center justify-start rounded-full transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
						aria-label="Kembali ke jejak Isya"
					>
						<ArrowLeft className="size-7" strokeWidth={2.75} />
					</Link>
				</header>

				<main className="flex flex-1 flex-col items-center text-center">
					<section className="flex flex-1 flex-col items-center justify-center pb-8">
						<h1 className="mb-12 font-bold text-[36px] tracking-normal">
							Isi Jurnal
						</h1>

						<div
							className="flex size-[190px] items-center justify-center rounded-full border-[10px] border-primary sm:size-[220px]"
							aria-hidden="true"
						>
							<Pencil
								className="size-[125px] text-primary sm:size-[150px]"
								strokeWidth={2.75}
							/>
						</div>

						<p className="mt-10 max-w-[350px] text-[17px] text-foreground/90 leading-relaxed">
							Tulis bagaimana kau ingin merenungi diri hari ini.
						</p>
					</section>

					<Button
						type="button"
						className="gradient-secondary h-13 w-full font-semibold text-background tracking-wide hover:brightness-105"
						onClick={() => {
							navigate({
								to: "/journal/daily-journal/create/$step",
								params: { step: "journal-2-write" },
							});
						}}
					>
						Mulai Isi Jurnal
					</Button>
				</main>
			</div>
		);
	}
	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-4 pb-6 text-foreground">
			<header className="pt-8 sm:pt-12">
				<Link
					to="/journal/daily-journal/create"
					className="inline-flex h-10 w-10 items-center justify-start rounded-full transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
					aria-label="Kembali ke pembuka jejak ibadah"
				>
					<ArrowLeft className="size-7" strokeWidth={2.75} />
				</Link>
			</header>

			<main className="flex flex-1 flex-col">
				<h1 className="mt-4 text-center font-bold text-[36px] text-primary leading-tight tracking-normal">
					{currentStep.name}
				</h1>

				<section className="mt-8 grid grid-cols-2 gap-3">
					<MetricCard label="Adzan pada" value={currentMetric.adzanAt} />
					<MetricCard label="Selesai pada" value={currentMetric.completedAt} />
					<MetricCard label="Selisih" value={currentMetric.difference} />
					<MetricCard label="Ketepatan" value={currentMetric.punctuality} />
				</section>

				<section className="mt-5 rounded-3xl bg-[#062642] px-4 py-6">
					<h2 className="mx-auto max-w-[320px] text-center text-[16px] leading-relaxed">
						Bagaimana perasaanmu saat Sholat {currentStep.name}?
					</h2>
					<div className="mt-6">
						<div className="mb-3 grid grid-cols-4 gap-1 text-[13px]">
							{FEELING_LABELS.map((label, index) => (
								<Button
									key={label}
									type="button"
									variant="ghost"
									size="xs"
									className={`min-h-9 min-w-0 rounded-full px-1.5 transition-colors hover:bg-transparent hover:text-primary ${
										currentFeeling === index
											? "font-semibold text-primary"
											: "text-foreground/80"
									}`}
									aria-pressed={currentFeeling === index}
									onClick={() => {
										setDraft((currentDraft) => ({
											...currentDraft,
											feelings: {
												...currentDraft.feelings,
												[currentStep.prayerName]: getJournalDraftFeeling(index),
											},
										}));
									}}
								>
									<span className="truncate">{label}</span>
								</Button>
							))}
						</div>
						<div className="px-3">
							<Slider
								min={0}
								max={3}
								step={1}
								value={[currentFeeling]}
								aria-label={`Perasaan saat Sholat ${currentStep.name}`}
								aria-valuetext={FEELING_LABELS[currentFeeling]}
								className="w-full"
								onValueChange={(value) => {
									const nextFeeling = Array.isArray(value)
										? (value[0] ?? 0)
										: value;
									setDraft((currentDraft) => ({
										...currentDraft,
										feelings: {
											...currentDraft.feelings,
											[currentStep.prayerName]:
												getJournalDraftFeeling(nextFeeling),
										},
									}));
								}}
							/>
						</div>
					</div>
				</section>

				<PrayerProgress currentStepId={currentStep.id} />

				<Button
					type="button"
					className="gradient-secondary sticky bottom-4 mt-5 h-13 w-full font-semibold text-background tracking-wide shadow-xl shadow-background/40 hover:brightness-105"
					onClick={() => {
						navigate({
							to: "/journal/daily-journal/create/$step",
							params: { step: currentStep.nextStep },
						});
					}}
				>
					Lanjut
				</Button>
			</main>
		</div>
	);
}

function MetricCard({ label, value }: { label: string; value: string }) {
	const isLongValue = value.length > 13;

	return (
		<div className="flex min-h-[96px] flex-col items-center justify-center rounded-2xl bg-[#062642] px-2.5 py-3 text-center">
			<div className="text-[12px] text-foreground/85">{label}</div>
			<div
				className={`mt-2 max-w-full break-words font-bold leading-tight text-primary ${
					isLongValue ? "text-[16px]" : "text-[22px]"
				}`}
			>
				{value}
			</div>
		</div>
	);
}

function PrayerProgress({ currentStepId }: { currentStepId: StepId }) {
	return (
		<nav
			className="mt-auto grid grid-cols-5 gap-1 pt-10"
			aria-label="Tahapan sholat harian"
		>
			{PRAYER_STEPS.map(({ id, name, Icon, iconClassName }) => {
				const isActive = id === currentStepId;

				return (
					<div key={id} className="flex min-w-0 flex-col items-center gap-1.5">
						<Icon
							className={`size-7 ${iconClassName} ${isActive ? "" : "opacity-65"}`}
							fill="currentColor"
							strokeWidth={1.75}
						/>
						<span
							className={`max-w-full truncate text-[11px] leading-none ${isActive ? "text-primary" : iconClassName}`}
						>
							{name}
						</span>
						<span
							className={`h-2 w-2 rounded-full ${isActive ? "bg-primary" : "bg-transparent"}`}
						/>
					</div>
				);
			})}
		</nav>
	);
}
function MuhasabahSealIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden="true"
		>
			<path d="M18.99 19H19m-.01 0c-.622.617-1.75.464-2.542.464c-.972 0-1.44.19-2.133.883C13.725 20.937 12.934 22 12 22s-1.725-1.063-2.315-1.653c-.694-.693-1.162-.883-2.133-.883c-.791 0-1.92.154-2.543-.464c-.627-.622-.473-1.756-.473-2.552c0-1.007-.22-1.47-.937-2.186C2.533 13.196 2 12.662 2 12s.533-1.196 1.6-2.262c.64-.64.936-1.274.936-2.186c0-.791-.154-1.92.464-2.543c.622-.627 1.756-.473 2.552-.473c.912 0 1.546-.297 2.186-.937C10.804 2.533 11.338 2 12 2s1.196.533 2.262 1.6c.64.64 1.274.936 2.186.936c.791 0 1.92-.154 2.543.464c.627.622.473 1.756.473 2.552c0 1.007.22 1.47.937 2.186C21.467 10.804 22 11.338 22 12s-.533 1.196-1.6 2.262c-.716.717-.936 1.18-.936 2.186c0 .796.154 1.93-.473 2.552Z" />
			<path
				d="M9 12.893s1.2.652 1.8 1.607c0 0 1.8-3.75 4.2-5"
				strokeWidth="2.25"
			/>
		</svg>
	);
}
