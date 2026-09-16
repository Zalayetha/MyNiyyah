import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CloudSun, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { DonutChart } from "#/components/DonutChart";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
	JOURNAL_FEELING_STYLES,
	type JournalFeelingStatus,
} from "#/lib/journal-statistics";
import { getJournalStatisticsData } from "#/lib/journal-statistics-server";

export const Route = createFileRoute("/journal/complete-statistic")({
	loader: async () => {
		return await getJournalStatisticsData({
			data: {},
		});
	},
	component: RouteComponent,
});

const PRAYERS = [
	{ icon: CloudSun, label: "Subuh" },
	{ icon: Sun, label: "Zhuhur" },
	{ icon: Sunrise, label: "Ashar" },
	{ icon: Sunset, label: "Maghrib" },
	{ icon: Moon, label: "Isya" },
] as const;

const FEELING_STATUSES = [1, 2, 3, 4] as const satisfies Exclude<
	JournalFeelingStatus,
	null
>[];

function RouteComponent() {
	const journalStatistics = Route.useLoaderData();
	const hasFeelingData = journalStatistics.totalFeelingLogs > 0;

	return (
		<div className="mx-auto min-h-screen max-w-md bg-background pb-24">
			<div className="flex flex-row justify-between px-4 py-8">
				<Link to="/" search={{ section: "journal" }}>
					<ArrowLeft className="size-6 text-foreground" />
				</Link>
			</div>
			<div className="text-center font-medium text-3xl text-foreground">
				Statistik Lengkap
			</div>

			{/* Journal reflection matrix */}
			<Card className="mx-4 mt-8">
				<CardContent className="px-0">
					<table className="w-full border-collapse">
						<thead>
							<tr>
								<th className="w-14" />
								{journalStatistics.days.map((day) => (
									<th key={day.date} className="pb-3 text-center">
										<div className="flex flex-col items-center">
											<span
												className={`text-xs ${
													day.isToday
														? "font-semibold text-primary"
														: "font-medium text-foreground"
												}`}
											>
												{day.dayLabel}
											</span>
											<span className="text-[10px] text-muted-foreground">
												{day.dayNumber}
											</span>
										</div>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{PRAYERS.map((prayer, rowIdx) => (
								<tr key={prayer.label}>
									<td className="pb-3 pr-2">
										<div className="flex flex-col items-center gap-1">
											<prayer.icon className="h-5 w-5 text-foreground" />
											<span className="text-center font-medium text-[10px] text-foreground leading-tight">
												{prayer.label}
											</span>
										</div>
									</td>
									{journalStatistics.matrix[rowIdx].map((status, colIdx) => (
										<td
											key={`${prayer.label}-${journalStatistics.days[colIdx].date}`}
											className="pb-3 text-center"
										>
											{status !== null ? (
												<div
													className={`mx-auto h-8 w-8 rounded-xl ${JOURNAL_FEELING_STYLES[status].className}`}
													title={`${prayer.label} ${journalStatistics.days[colIdx].dayLabel}: ${JOURNAL_FEELING_STYLES[status].label}`}
												/>
											) : (
												<div
													className="mx-auto h-8 w-8 rounded-xl border border-border/40 border-dashed bg-card/40"
													title={`${prayer.label} ${journalStatistics.days[colIdx].dayLabel}: Belum diisi`}
												/>
											)}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>

					<div className="flex flex-wrap items-center justify-center gap-4 pt-1">
						{FEELING_STATUSES.map((status) => (
							<div key={status} className="flex items-center gap-1.5">
								<div
									className={`h-3 w-3 rounded-sm ${JOURNAL_FEELING_STYLES[status].className}`}
								/>
								<span className="text-[11px] text-muted-foreground">
									{JOURNAL_FEELING_STYLES[status].label}
								</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Card className="mx-4 mt-4">
				<CardHeader>
					<CardTitle>Kualitas Perasaanmu ketika Solat</CardTitle>
				</CardHeader>
				<CardContent>
					{hasFeelingData ? (
						<DonutChart
							className="mx-auto"
							data={journalStatistics.feelingDistribution}
							size={200}
							strokeWidth={24}
							showLegend={true}
							title="Distribusi perasaan sholat"
						/>
					) : (
						<div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-border/50 bg-background/40 px-6 text-center">
							<p className="font-semibold text-foreground">
								Belum ada catatan rasa
							</p>
							<p className="mt-2 max-w-[260px] text-muted-foreground text-sm leading-relaxed">
								Simpan jurnal harian setelah Isya untuk melihat distribusi
								perasaan sholatmu di sini.
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
