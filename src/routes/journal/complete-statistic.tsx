import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	CloudSun,
	Moon,
	Sun,
	Sunrise,
	Sunset,
} from "lucide-react";
import { DonutChart } from "#/components/DonutChart";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
	JOURNAL_FEELING_STYLES,
	type JournalFeelingStatus,
} from "#/lib/journal-statistics";
import {
	HEATMAP_STATUS_LABELS,
	type HeatmapStatus,
} from "#/lib/prayer-heatmap";
import { addLocalDays } from "#/lib/statistics";
import {
	getStatisticsInsightsData,
	type StatisticsData,
	type StatisticsPeriod,
} from "#/lib/statistics-server";

interface StatisticsSearch {
	period?: StatisticsPeriod;
	date?: string;
}

export const Route = createFileRoute("/journal/complete-statistic")({
	validateSearch: (search: Record<string, unknown>): StatisticsSearch => ({
		period: search.period === "month" ? "month" : "week",
		date: typeof search.date === "string" ? search.date : undefined,
	}),
	loaderDeps: ({ search }) => ({
		period: search.period ?? "week",
		date: search.date,
	}),
	loader: async ({ deps }) => {
		return await getStatisticsInsightsData({
			data: {
				period: deps.period,
				localDate: deps.date,
			},
		});
	},
	component: RouteComponent,
});

const PRAYERS = [
	{ icon: CloudSun, label: "Subuh", key: "subuh" },
	{ icon: Sun, label: "Zhuhur", key: "zhuhur" },
	{ icon: Sunrise, label: "Ashar", key: "ashar" },
	{ icon: Sunset, label: "Maghrib", key: "maghrib" },
	{ icon: Moon, label: "Isya", key: "isya" },
] as const;

const FEELING_STATUSES = [1, 2, 3, 4] as const satisfies Exclude<
	JournalFeelingStatus,
	null
>[];

function RouteComponent() {
	const stats = Route.useLoaderData() as StatisticsData;
	const navigate = Route.useNavigate();
	const search = Route.useSearch();
	const hasFeelingData = stats.journal.feelingSampleSize > 0;

	const setPeriod = (period: StatisticsPeriod) => {
		void navigate({
			search: () => ({
				period,
				date: stats.period.localDate,
			}),
		});
	};
	const movePeriod = (direction: -1 | 1) => {
		void navigate({
			search: () => ({
				period: search.period ?? "week",
				date: shiftPeriodDate(
					stats.period.localDate,
					stats.period.type,
					direction,
				),
			}),
		});
	};

	return (
		<div className="mx-auto min-h-screen max-w-md bg-background pb-24 text-foreground">
			<header className="flex flex-row items-center justify-between px-4 py-8">
				<Link to="/" search={{ section: "journal" }} aria-label="Kembali">
					<ArrowLeft className="size-6" />
				</Link>
			</header>
			<main>
				<section className="px-4">
					<h1 className="font-semibold text-3xl">Statistik Lengkap</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						{stats.period.label} · {stats.period.timezone}
					</p>
					<div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
						<div className="grid grid-cols-2 rounded-2xl bg-muted/50 p-1">
							<Button
								type="button"
								variant={stats.period.type === "week" ? "default" : "ghost"}
								className="h-10 rounded-xl"
								onClick={() => setPeriod("week")}
							>
								Minggu
							</Button>
							<Button
								type="button"
								variant={stats.period.type === "month" ? "default" : "ghost"}
								className="h-10 rounded-xl"
								onClick={() => setPeriod("month")}
							>
								Bulan
							</Button>
						</div>
						<div className="flex items-center gap-1">
							<Button
								type="button"
								variant="outline"
								size="icon"
								aria-label="Periode sebelumnya"
								onClick={() => movePeriod(-1)}
							>
								<ChevronLeft className="size-4" />
							</Button>
							<Button
								type="button"
								variant="outline"
								size="icon"
								aria-label="Periode berikutnya"
								onClick={() => movePeriod(1)}
							>
								<ChevronRight className="size-4" />
							</Button>
						</div>
					</div>
				</section>

				<section className="mt-6 grid grid-cols-2 gap-3 px-4">
					<MetricCard
						label="Selesai"
						value={formatPercent(stats.prayer.completion.percentage)}
						detail={`${stats.prayer.completedPrayers}/${stats.prayer.elapsedPrayers} waktu berlalu`}
					/>
					<MetricCard
						label="Tepat Waktu"
						value={formatPercent(stats.prayer.onTime.percentage)}
						detail={`${stats.prayer.onTime.sampleSize} catatan selesai`}
					/>
					<MetricCard
						label="Khusyu"
						value={formatPercent(stats.journal.khusyu.percentage)}
						detail={`${stats.journal.khusyu.sampleSize} refleksi`}
					/>
					<MetricCard
						label="Jurnal"
						value={`${stats.journal.entries}`}
						detail={`${stats.journal.attachments} ayat terlampir`}
					/>
				</section>

				<Card className="mx-4 mt-4">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<CalendarDays className="size-4" />
							Jejak Solat
						</CardTitle>
					</CardHeader>
					<CardContent>
						<PrayerMatrix stats={stats} />
						<Legend
							items={[
								...Object.values(HEATMAP_STATUS_LABELS).map((item) => ({
									label: item.label,
									className: item.className,
								})),
								{ label: "Belum Tiba", className: "border border-dashed" },
							]}
						/>
						<p className="mt-4 text-muted-foreground text-xs leading-relaxed">
							Sel kosong berarti waktu solat belum tiba. Sel “Belum Dicatat”
							berarti tidak ada catatan selesai untuk waktu yang sudah berlalu.
						</p>
					</CardContent>
				</Card>

				<Card className="mx-4 mt-4">
					<CardHeader>
						<CardTitle className="text-base">Refleksi Jurnal</CardTitle>
					</CardHeader>
					<CardContent>
						{stats.journal.entries === 0 ? (
							<EmptyState text="Belum ada jurnal pada periode ini." />
						) : (
							<JournalMatrix stats={stats} />
						)}
						<Legend
							items={FEELING_STATUSES.map((status) => ({
								label: JOURNAL_FEELING_STYLES[status].label,
								className: JOURNAL_FEELING_STYLES[status].className,
							}))}
						/>
					</CardContent>
				</Card>

				<Card className="mx-4 mt-4">
					<CardHeader>
						<CardTitle className="text-base">Kualitas Perasaan Solat</CardTitle>
					</CardHeader>
					<CardContent>
						{hasFeelingData ? (
							<>
								<DonutChart
									className="mx-auto"
									data={stats.journal.feelingDistribution}
									size={190}
									strokeWidth={22}
									showLegend={true}
									centerLabel={`${stats.journal.feelingSampleSize}`}
									centerSubLabel="refleksi"
									title="Distribusi perasaan solat"
								/>
								<table className="mt-4 w-full text-sm">
									<caption className="sr-only">
										Ringkasan distribusi perasaan solat
									</caption>
									<tbody>
										{stats.journal.feelingDistribution.map((segment) => (
											<tr
												key={segment.label}
												className="border-border border-t"
											>
												<td className="py-2">{segment.label}</td>
												<td className="py-2 text-right">{segment.value}</td>
											</tr>
										))}
									</tbody>
								</table>
							</>
						) : (
							<EmptyState text="Belum ada catatan rasa pada periode ini." />
						)}
					</CardContent>
				</Card>
			</main>
		</div>
	);
}

function formatPercent(value: number | null) {
	return value === null ? "-" : `${value}%`;
}

function shiftPeriodDate(
	localDate: string,
	period: StatisticsPeriod,
	direction: -1 | 1,
) {
	if (period === "week") return addLocalDays(localDate, direction * 7);
	const [year, month, day] = localDate.split("-").map(Number);
	const shifted = new Date(Date.UTC(year, month - 1 + direction, 1, 12));
	const shiftedYear = shifted.getUTCFullYear();
	const shiftedMonth = shifted.getUTCMonth() + 1;
	const lastDay = new Date(
		Date.UTC(shiftedYear, shiftedMonth, 0, 12),
	).getUTCDate();
	const shiftedDay = Math.min(day, lastDay);
	return `${shiftedYear}-${String(shiftedMonth).padStart(2, "0")}-${String(shiftedDay).padStart(2, "0")}`;
}

function MetricCard({
	label,
	value,
	detail,
}: {
	label: string;
	value: string;
	detail: string;
}) {
	return (
		<div className="rounded-2xl bg-card p-4">
			<div className="text-muted-foreground text-xs">{label}</div>
			<div className="mt-2 font-bold text-2xl text-primary">{value}</div>
			<div className="mt-1 text-muted-foreground text-xs">{detail}</div>
		</div>
	);
}

function PrayerMatrix({ stats }: { stats: StatisticsData }) {
	return (
		<div className="overflow-x-auto">
			<table className="min-w-full border-collapse">
				<thead>
					<tr>
						<th className="w-16" />
						{stats.days.map((day) => (
							<th key={day.date} className="min-w-10 pb-3 text-center">
								<span className={day.isToday ? "text-primary" : ""}>
									{day.dayLabel}
								</span>
								<span className="block text-muted-foreground text-[10px]">
									{day.dayNumber}
								</span>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{PRAYERS.map((prayer, rowIndex) => (
						<tr key={prayer.key}>
							<th className="pb-3 pr-2 text-center font-medium text-[10px]">
								<prayer.icon className="mx-auto mb-1 size-5" />
								{prayer.label}
							</th>
							{stats.prayer.matrix[rowIndex].map((cell) => (
								<td
									key={`${cell.prayerDate}:${cell.prayerName}`}
									className="pb-3"
								>
									<StatusCell
										status={cell.status}
										label={`${prayer.label} ${cell.prayerDate}: ${cell.statusLabel}`}
									/>
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function JournalMatrix({ stats }: { stats: StatisticsData }) {
	return (
		<div className="overflow-x-auto">
			<table className="min-w-full border-collapse">
				<thead>
					<tr>
						<th className="w-16" />
						{stats.days.map((day) => (
							<th key={day.date} className="min-w-10 pb-3 text-center">
								{day.dayLabel}
								<span className="block text-muted-foreground text-[10px]">
									{day.dayNumber}
								</span>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{PRAYERS.map((prayer, rowIndex) => (
						<tr key={prayer.key}>
							<th className="pb-3 pr-2 text-center font-medium text-[10px]">
								{prayer.label}
							</th>
							{stats.journal.matrix[rowIndex].map((status, columnIndex) => (
								<td
									key={`${prayer.key}:${stats.days[columnIndex].date}`}
									className="pb-3"
								>
									<div
										className={`mx-auto h-8 w-8 rounded-xl ${
											status
												? JOURNAL_FEELING_STYLES[status].className
												: "border border-border/40 border-dashed bg-card/40"
										}`}
										title={`${prayer.label} ${stats.days[columnIndex].date}: ${
											status
												? JOURNAL_FEELING_STYLES[status].label
												: "Tidak ada refleksi"
										}`}
									/>
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function StatusCell({
	status,
	label,
}: {
	status: HeatmapStatus;
	label: string;
}) {
	const style =
		status === null
			? "border border-border/40 border-dashed bg-card/40"
			: HEATMAP_STATUS_LABELS[status].className;
	return (
		<div
			role="img"
			className={`mx-auto h-8 w-8 rounded-xl ${style}`}
			title={label}
			aria-label={label}
		/>
	);
}

function Legend({ items }: { items: { label: string; className: string }[] }) {
	return (
		<div className="mt-4 flex flex-wrap items-center justify-center gap-3">
			{items.map((item) => (
				<div key={item.label} className="flex items-center gap-1.5">
					<div className={`h-3 w-3 rounded-sm ${item.className}`} />
					<span className="text-[11px] text-muted-foreground">
						{item.label}
					</span>
				</div>
			))}
		</div>
	);
}

function EmptyState({ text }: { text: string }) {
	return (
		<div className="flex min-h-[160px] items-center justify-center rounded-3xl border border-border/50 border-dashed bg-background/40 px-6 text-center">
			<p className="text-muted-foreground text-sm">{text}</p>
		</div>
	);
}
