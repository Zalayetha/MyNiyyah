import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CloudSun, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { DonutChart } from "#/components/DonutChart";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { getPrayerHeatmapData } from "#/lib/prayer-heatmap-server";

export const Route = createFileRoute("/journal/complete-statistic")({
	loader: async () => {
		return await getPrayerHeatmapData({
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

type Status = 0 | 1 | 2 | 3;

const STATUS_CLASS: Record<Status, string> = {
	0: "bg-primary",
	1: "bg-lime-200",
	2: "bg-orange-300",
	3: "bg-cyan-900",
};

const STATUS_LABELS: { label: string; className: string }[] = [
	{ label: "Ditunaikan", className: "bg-primary" },
	{ label: "Terlambat", className: "bg-lime-200" },
	{ label: "Berat", className: "bg-orange-300" },
	{ label: "Tertinggal", className: "bg-cyan-900" },
];

function RouteComponent() {
	const heatmapData = Route.useLoaderData();
	const hasFeelingData = heatmapData.totalFeelingLogs > 0;

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

			{/* Prayer Heatmap Matrix */}
			<Card className="mx-4 mt-8">
				<CardContent className="px-0">
					<table className="w-full border-collapse">
						<thead>
							<tr>
								<th className="w-14" />
								{heatmapData.days.map((day) => (
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
									{heatmapData.matrix[rowIdx].map((status, colIdx) => (
										<td
											key={`${prayer.label}-${heatmapData.days[colIdx].date}`}
											className="pb-3 text-center"
										>
											{status !== null ? (
												<div
													className={`mx-auto h-8 w-8 rounded-xl ${STATUS_CLASS[status]}`}
													title={`${prayer.label} ${heatmapData.days[colIdx].dayLabel}: ${
														STATUS_LABELS.find(
															(s) => s.className === STATUS_CLASS[status],
														)?.label ?? ""
													}`}
												/>
											) : (
												<div
													className="mx-auto h-8 w-8 rounded-xl border border-border/40 border-dashed bg-card/40"
													title={`${prayer.label} ${heatmapData.days[colIdx].dayLabel}: Belum Tiba`}
												/>
											)}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>

					<div className="flex flex-wrap items-center justify-center gap-4 pt-1">
						{STATUS_LABELS.map((s) => (
							<div key={s.label} className="flex items-center gap-1.5">
								<div className={`h-3 w-3 rounded-sm ${s.className}`} />
								<span className="text-[11px] text-muted-foreground">
									{s.label}
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
							data={heatmapData.feelingDistribution}
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
