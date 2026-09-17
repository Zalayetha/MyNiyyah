import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { getDashboardData } from "#/lib/dashboard-server";
import { getNextPrayerStatus } from "#/lib/prayer-calculation";
import { getPrayerHeatmapData } from "#/lib/prayer-heatmap-server";
import { getPrayerTrackerData } from "#/lib/prayer-tracker-server";
import { AccountSection } from "../components/AccountSection";
import { BottomNavbar } from "../components/BottomNavbar";
import { HomeSection } from "../components/HomeSection";
import { JournalSection } from "../components/JournalSection";

const sections = ["home", "journal", "account"] as const;
type Section = (typeof sections)[number];

function parseSection(value: unknown): Section | undefined {
	if (typeof value === "string" && sections.includes(value as Section)) {
		return value as Section;
	}
	return undefined;
}

export const Route = createFileRoute("/")({
	loader: async () => {
		const [trackerData, heatmapData, dashboardData] = await Promise.all([
			getPrayerTrackerData({
				data: {},
			}),
			getPrayerHeatmapData({
				data: {},
			}),
			getDashboardData(),
		]);

		return { trackerData, heatmapData, dashboardData };
	},
	component: Home,
	validateSearch: (search: Record<string, unknown>) => ({
		section: parseSection(search.section),
	}),
});

function Home() {
	const { section } = Route.useSearch();
	const { trackerData, heatmapData, dashboardData } = Route.useLoaderData();
	const currentSection: Section = section ?? "home";

	const user = dashboardData.user;

	const nextPrayerInfo = useMemo(() => {
		if (!trackerData?.schedule) {
			return { next: "Zhuhur", time: "11 : 39" };
		}
		const status = getNextPrayerStatus(trackerData.schedule, new Date());
		return {
			next: status.nextPrayer.name,
			time: status.nextPrayer.time.replace(".", " : "),
		};
	}, [trackerData?.schedule]);

	const prayer = {
		next: nextPrayerInfo.next,
		time: nextPrayerInfo.time,
	};

	const ayah = dashboardData.ayah;

	const chartData = useMemo(() => {
		return heatmapData.days.map((day, columnIndex) => {
			const completedPrayers = heatmapData.matrix.reduce((total, row) => {
				const status = row[columnIndex];
				return status === 0 || status === 1 ? total + 1 : total;
			}, 0);
			const elapsedPrayers = heatmapData.matrix.reduce(
				(total, row) => (row[columnIndex] === null ? total : total + 1),
				0,
			);

			return {
				day: day.dayLabel,
				value:
					elapsedPrayers === 0 ? 0 : (completedPrayers / elapsedPrayers) * 100,
				date: day.date,
				completedPrayers,
				elapsedPrayers,
				isToday: day.isToday,
			};
		});
	}, [heatmapData.days, heatmapData.matrix]);

	const accountStats = dashboardData.stats;

	return (
		<div className="mx-auto min-h-screen max-w-md bg-background">
			<section className={currentSection === "home" ? "" : "hidden"}>
				<HomeSection
					user={user}
					prayer={prayer}
					ayah={ayah}
					chartData={chartData}
				/>
			</section>

			<section className={currentSection === "journal" ? "" : "hidden"}>
				<JournalSection stats={accountStats} />
			</section>

			<section className={currentSection === "account" ? "" : "hidden"}>
				<AccountSection
					user={user}
					stats={accountStats}
					location={dashboardData.location}
				/>
			</section>

			<BottomNavbar />
		</div>
	);
}
