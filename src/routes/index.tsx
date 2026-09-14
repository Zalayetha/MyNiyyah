import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { authClient } from "#/lib/auth-client";
import { getNextPrayerStatus } from "#/lib/prayer-calculation";
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
		return await getPrayerTrackerData({
			data: {},
		});
	},
	component: Home,
	validateSearch: (search: Record<string, unknown>) => ({
		section: parseSection(search.section),
	}),
});

function Home() {
	const { section } = Route.useSearch();
	const trackerData = Route.useLoaderData();
	const { data: session } = authClient.useSession();
	const currentSection: Section = section ?? "home";

	const user = {
		name: session?.user.name ?? "User",
		email: session?.user.email ?? "",
		avatar:
			session?.user.image ??
			"https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png",
	};

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

	const ayah = {
		text: "...Sesungguhnya shalat mencegah dari perbuatan buruk dan mungkar...",
		source: "Q.S Al-Ankabut: 45",
	};

	const chartData = [
		{ day: "Sab", value: 25 },
		{ day: "Min", value: 40 },
		{ day: "Sen", value: 70 },
		{ day: "Sel", value: 25 },
		{ day: "Rab", value: 70 },
		{ day: "Kam", value: 90 },
		{ day: "Jum", value: 90 },
	];

	const accountStats = {
		totalPrayers: trackerData?.totalPrayers ?? 0,
		streak: 14,
		journalEntries: 28,
	};

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
				<JournalSection />
			</section>

			<section className={currentSection === "account" ? "" : "hidden"}>
				<AccountSection user={user} stats={accountStats} />
			</section>

			<BottomNavbar />
		</div>
	);
}
