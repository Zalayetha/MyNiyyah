import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle2,
	Clock,
	CloudSun,
	type LucideIcon,
	Moon,
	Sun,
	Sunrise,
	Sunset,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SwipeToPray } from "#/components/SwipeToPray";
import {
	getPrayerWindowDetails,
	type PrayerName,
} from "#/lib/prayer-calculation";
import {
	completePrayerAction,
	getPrayerTrackerData,
	type PrayerTrackerData,
} from "#/lib/prayer-tracker-server";
import {
	formatLocalDate,
	formatLocalTime,
	getBrowserTimezone,
	getTimezoneAbbreviation,
	getTimezoneOffsetHours,
} from "#/lib/timezone";

export const Route = createFileRoute("/prayer-tracker")({
	loader: async () => {
		return await getPrayerTrackerData({
			data: {},
		});
	},
	component: PrayerTrackerPage,
});

interface PrayerMeta {
	id: PrayerName;
	name: string;
	icon: LucideIcon;
}

const PRAYER_METAS: PrayerMeta[] = [
	{ id: "subuh", name: "Subuh", icon: CloudSun },
	{ id: "zhuhur", name: "Zhuhur", icon: Sun },
	{ id: "ashar", name: "Ashar", icon: Sunrise },
	{ id: "maghrib", name: "Maghrib", icon: Sunset },
	{ id: "isya", name: "Isya", icon: Moon },
];

function PrayerHouseProgress({ completedCount }: { completedCount: number }) {
	const isComplete = completedCount >= PRAYER_METAS.length;

	return (
		<div className="relative -mt-10 flex flex-col items-center justify-center">
			<motion.svg
				viewBox="0 0 240 220"
				className="h-80 w-80 overflow-visible"
				initial={false}
				aria-label={`Rumah ibadah terbangun ${completedCount} dari ${PRAYER_METAS.length} bagian`}
				role="img"
			>
				<defs>
					<linearGradient id="houseGradient" x1="0" y1="0" x2="1" y2="1">
						<stop offset="0%" stopColor="#02bda7" />
						<stop offset="55%" stopColor="#32d7c4" />
						<stop offset="100%" stopColor="#a7fff5" />
					</linearGradient>
					<radialGradient id="houseGlow">
						<stop offset="0%" stopColor="#a7fff5" stopOpacity="0.7" />
						<stop offset="100%" stopColor="#32d7c4" stopOpacity="0" />
					</radialGradient>
					<filter id="softShine" x="-20%" y="-20%" width="140%" height="140%">
						<feGaussianBlur stdDeviation="1.5" />
					</filter>
				</defs>
				<g transform="translate(0 -34)">
					<motion.circle
						cx="120"
						cy="106"
						r="96"
						fill="url(#houseGlow)"
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{
							opacity: isComplete
								? [0.28, 0.48, 0.28]
								: completedCount > 0
									? 0.14
									: 0,
							scale: isComplete ? [0.98, 1.08, 0.98] : 0.96,
						}}
						transition={{
							duration: isComplete ? 2.2 : 0.45,
							repeat: isComplete ? Infinity : 0,
							ease: "easeInOut",
						}}
					/>

					<motion.path
						d="M44 184 H196"
						stroke="#32d7c4"
						strokeWidth="10"
						strokeLinecap="round"
						initial={{ pathLength: 0, opacity: 0 }}
						animate={{
							pathLength: completedCount >= 1 ? 1 : 0,
							opacity: completedCount >= 1 ? 1 : 0.25,
						}}
						transition={{ duration: 0.5 }}
					/>

					<motion.rect
						x="70"
						y="156"
						width="100"
						height="24"
						rx="8"
						fill="#101c31"
						stroke="#32d7c4"
						strokeWidth="3"
						initial={{ opacity: 0, y: 14 }}
						animate={{
							opacity: completedCount >= 1 ? 1 : 0,
							y: completedCount >= 1 ? 0 : 14,
						}}
						transition={{ duration: 0.45 }}
					/>

					<motion.rect
						x="78"
						y="96"
						width="84"
						height="66"
						rx="12"
						fill="#13233c"
						stroke="#32d7c4"
						strokeWidth="3"
						initial={{ opacity: 0, scaleY: 0 }}
						animate={{
							opacity: completedCount >= 2 ? 1 : 0,
							scaleY: completedCount >= 2 ? 1 : 0,
						}}
						style={{ originY: 1 }}
						transition={{ duration: 0.55, ease: "easeOut" }}
					/>

					<motion.path
						d="M58 105 L120 50 L182 105 Z"
						fill="url(#houseGradient)"
						initial={{ opacity: 0, y: -14, scale: 0.95 }}
						animate={{
							opacity: completedCount >= 3 ? 1 : 0,
							y: completedCount >= 3 ? 0 : -14,
							scale: completedCount >= 3 ? 1 : 0.95,
						}}
						transition={{ duration: 0.55, ease: "easeOut" }}
					/>

					<motion.rect
						x="105"
						y="126"
						width="30"
						height="36"
						rx="8"
						fill="#061d31"
						stroke="#32d7c4"
						strokeWidth="2"
						initial={{ opacity: 0, scale: 0.82 }}
						animate={{
							opacity: completedCount >= 4 ? 1 : 0,
							scale: completedCount >= 4 ? 1 : 0.82,
						}}
						transition={{ duration: 0.35 }}
					/>

					<motion.circle
						cx="120"
						cy="88"
						r="10"
						fill="#a7fff5"
						initial={{ opacity: 0, scale: 0.5 }}
						animate={{
							opacity: completedCount >= 4 ? 1 : 0,
							scale: completedCount >= 4 ? 1 : 0.5,
						}}
						transition={{ duration: 0.35, delay: 0.1 }}
					/>

					{isComplete && (
						<motion.g
							initial={{ x: -72, opacity: 0 }}
							animate={{ x: [-72, 74], opacity: [0, 0.9, 0] }}
							transition={{
								duration: 1.6,
								repeat: Infinity,
								repeatDelay: 1.2,
								ease: "easeInOut",
							}}
						>
							<motion.line
								x1="74"
								y1="170"
								x2="156"
								y2="58"
								stroke="#ffffff"
								strokeWidth="9"
								strokeLinecap="round"
								strokeOpacity="0.55"
								filter="url(#softShine)"
							/>
							<motion.line
								x1="78"
								y1="168"
								x2="160"
								y2="56"
								stroke="#a7fff5"
								strokeWidth="3"
								strokeLinecap="round"
								strokeOpacity="0.85"
							/>
						</motion.g>
					)}
				</g>
			</motion.svg>

			<div className="mt-1 text-center font-medium text-muted-foreground text-sm">
				{isComplete
					? "Rumah ibadah lengkap"
					: `${completedCount}/${PRAYER_METAS.length} solat selesai`}
			</div>
		</div>
	);
}

function PrayerTrackerPage() {
	const initialData = Route.useLoaderData();
	const [data, setData] = useState<PrayerTrackerData>(initialData);
	const [sliderKey, setSliderKey] = useState(0);
	const [activeTimezone, setActiveTimezone] = useState(data.timezone);
	const [currentTime, setCurrentTime] = useState(() =>
		formatLocalTime(new Date(), data.timezone, "."),
	);
	const [now, setNow] = useState(() => new Date());

	// Client-side real-time timezone detection
	useEffect(() => {
		const clientTz = getBrowserTimezone();
		if (clientTz && clientTz !== data.timezone) {
			const clientDate = formatLocalDate(new Date(), clientTz);
			setActiveTimezone(clientTz);
			void getPrayerTrackerData({
				data: {
					clientTimezone: clientTz,
					clientLocalDate: clientDate,
				},
			}).then((refreshed) => {
				setData(refreshed);
			});
		}
	}, [data.timezone]);

	// Real-time ticking clock and interval for prayer time window transitions
	useEffect(() => {
		const interval = setInterval(() => {
			const current = new Date();
			setNow(current);
			setCurrentTime(formatLocalTime(current, activeTimezone, "."));
		}, 1000);
		return () => clearInterval(interval);
	}, [activeTimezone]);

	const prayerCompletions = useMemo(() => {
		const completions = new Map<PrayerName, string | null>();
		for (const [key, value] of Object.entries(data.logs)) {
			if (value.completed) {
				completions.set(key as PrayerName, value.completedAt);
			}
		}
		return completions;
	}, [data.logs]);

	const completedCount = prayerCompletions.size;
	const isAllComplete = completedCount >= PRAYER_METAS.length;

	// Calculate contextual window details from schedule and recorded completions.
	const prayerDetails = useMemo(() => {
		return getPrayerWindowDetails(data.schedule, prayerCompletions, now);
	}, [data.schedule, prayerCompletions, now]);

	const detailMap = useMemo(() => {
		return new Map(prayerDetails.map((item) => [item.id, item]));
	}, [prayerDetails]);

	// Map prayer schedule items by id
	const scheduleMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const item of data.schedule.items) {
			map.set(item.id, item.time);
		}
		return map;
	}, [data.schedule.items]);

	// Initialize selected prayer to the current active prayer or next upcoming prayer
	const [selectedPrayerIndex, setSelectedPrayerIndex] = useState(() => {
		const initialDetails = getPrayerWindowDetails(
			initialData.schedule,
			new Map(
				Object.entries(initialData.logs)
					.filter(([, value]) => value.completed)
					.map(([key, value]) => [key as PrayerName, value.completedAt]),
			),
			new Date(),
		);
		const activeIdx = initialDetails.findIndex((d) => d.status === "active");
		if (activeIdx >= 0) return activeIdx;
		const upcomingIdx = initialDetails.findIndex(
			(d) => d.status === "upcoming",
		);
		if (upcomingIdx >= 0) return upcomingIdx;
		return 0;
	});

	const currentPrayerMeta =
		PRAYER_METAS[selectedPrayerIndex] ?? PRAYER_METAS[0];
	const currentPrayerTime = scheduleMap.get(currentPrayerMeta.id) ?? "00.00";
	const currentPrayerDetail =
		detailMap.get(currentPrayerMeta.id) ?? prayerDetails[0];

	const offsetHours = getTimezoneOffsetHours(now, activeTimezone);
	const tzAbbr = getTimezoneAbbreviation(activeTimezone, offsetHours);

	// Handle Swipe to Pray unlock with validation
	const handleUnlock = async () => {
		const prayerToComplete = currentPrayerMeta.id;
		const currentStatus = detailMap.get(prayerToComplete);

		if (!currentStatus?.canTrack) {
			return;
		}

		// Optimistic UI update
		setData((prev) => ({
			...prev,
			logs: {
				...prev.logs,
				[prayerToComplete]: {
					completed: true,
					completedAt: new Date().toISOString(),
					status: "completed",
				},
			},
			completedCount: prev.completedCount + 1,
		}));

		// Advance to next active or upcoming uncompleted prayer
		setTimeout(() => {
			setSelectedPrayerIndex((prevIndex) => {
				for (let i = prevIndex + 1; i < PRAYER_METAS.length; i++) {
					const detail = detailMap.get(PRAYER_METAS[i].id);
					if (detail && !detail.status.startsWith("completed")) {
						return i;
					}
				}
				for (let i = 0; i < prevIndex; i++) {
					const detail = detailMap.get(PRAYER_METAS[i].id);
					if (detail && !detail.status.startsWith("completed")) {
						return i;
					}
				}
				return prevIndex;
			});
			setSliderKey((prev) => prev + 1);
		}, 600);

		// Persist to database via server function
		try {
			await completePrayerAction({
				data: {
					prayerName: prayerToComplete,
					prayerDate: data.prayerDate,
					completedAt: new Date().toISOString(),
				},
			});
		} catch (error) {
			console.error("Failed to complete prayer log:", error);
		}
	};

	return (
		<div className="mx-auto min-h-screen max-w-md bg-background">
			{/* Top Bar */}
			<div className="flex flex-row items-center justify-between p-8">
				<Link to="/" search={{ section: undefined }}>
					<ArrowLeft className="size-6 text-foreground" />
				</Link>
				<div className="flex flex-col items-center justify-center">
					<h1 className="text-center font-semibold text-3xl text-foreground">
						{currentPrayerMeta.name}
					</h1>
					<div
						className={`mt-1 text-center font-medium text-sm ${
							currentPrayerDetail.status.startsWith("completed")
								? "text-primary"
								: currentPrayerDetail.status === "not-logged"
									? "text-muted-foreground"
									: currentPrayerDetail.status === "active"
										? "text-foreground"
										: "text-muted-foreground"
						}`}
					>
						{isAllComplete
							? "Semua Solat Selesai"
							: currentPrayerDetail.statusLabel}
					</div>
				</div>
				<div className="size-6" />
			</div>

			{/* House Progress Visualizer */}
			<PrayerHouseProgress completedCount={completedCount} />

			{/* Time and Timezone Badge */}
			<div className="mt-4 flex flex-row items-center justify-center gap-4">
				<div className="flex flex-col items-center gap-1 rounded-4xl bg-card px-8 py-4">
					<div className="font-semibold text-2xl text-muted-foreground">
						{currentTime}
					</div>
					<div className="font-medium text-md text-muted-foreground">
						{tzAbbr}
					</div>
				</div>
				<div className="flex flex-col items-center gap-1 rounded-4xl bg-card px-8 py-4 ring-1 ring-ring">
					<div className="font-semibold text-2xl text-foreground">
						{currentPrayerTime}
					</div>
					<div className="font-medium text-md text-foreground">{tzAbbr}</div>
				</div>
			</div>

			{/* Prayer Status Pills */}
			<div className="mt-8 flex flex-row justify-evenly px-4">
				{PRAYER_METAS.map(({ id, name, icon: Icon }, index) => {
					const detail = detailMap.get(id);
					const status = detail?.status ?? "upcoming";
					const isSelected = index === selectedPrayerIndex;

					let pillClass = "text-muted-foreground hover:text-foreground";
					if (status.startsWith("completed")) {
						pillClass = "bg-primary text-primary-foreground";
					} else if (status === "active") {
						pillClass = isSelected
							? "bg-card text-foreground ring-2 ring-primary"
							: "bg-card text-foreground ring-1 ring-ring";
					} else if (status === "not-logged") {
						pillClass = isSelected
							? "bg-card text-foreground ring-2 ring-border"
							: "bg-card text-muted-foreground ring-1 ring-border";
					} else if (isSelected) {
						pillClass = "bg-card text-foreground ring-1 ring-border";
					}

					return (
						<button
							key={id}
							type="button"
							onClick={() => {
								setSelectedPrayerIndex(index);
								setSliderKey((k) => k + 1);
							}}
							className="flex flex-col items-center justify-center gap-2 outline-none"
						>
							<div
								className={`flex size-10 items-center justify-center rounded-full transition-all ${pillClass}`}
							>
								<Icon className="h-5 w-5" fill="currentColor" />
							</div>
							<div
								className={`text-sm ${
									isSelected
										? "font-semibold text-foreground"
										: status.startsWith("completed")
											? "font-medium text-foreground"
											: status === "not-logged"
												? "text-muted-foreground"
												: "text-muted-foreground"
								}`}
							>
								{name}
							</div>
						</button>
					);
				})}
			</div>

			{/* Contextual Action Area: SwipeToPray or Status Banners */}
			{isAllComplete ? (
				<div className="mx-8 mt-8 flex items-center justify-center gap-2 rounded-4xl bg-card px-6 py-5 text-center font-semibold text-primary shadow-sm">
					<CheckCircle2 className="size-5" />
					<span>Alhamdulillah, semua solat hari ini selesai.</span>
				</div>
			) : currentPrayerDetail.status.startsWith("completed") ? (
				<div className="mx-8 mt-8 flex items-center justify-center gap-2 rounded-4xl bg-primary/10 border border-primary/25 px-6 py-5 text-center font-medium text-primary shadow-sm">
					<CheckCircle2 className="size-5" />
					<span>Solat {currentPrayerMeta.name} telah ditunaikan.</span>
				</div>
			) : currentPrayerDetail.status === "upcoming" ? (
				<div className="mx-8 mt-8 flex flex-col items-center justify-center rounded-4xl border border-border/40 bg-card/60 px-6 py-5 text-center shadow-sm">
					<div className="flex items-center gap-2 font-semibold text-foreground text-sm">
						<Clock className="size-4 text-muted-foreground" />
						<span>Belum Masuk Waktu</span>
					</div>
					<p className="mt-1 text-muted-foreground text-xs">
						Solat {currentPrayerMeta.name} mulai pukul {currentPrayerTime}{" "}
						{tzAbbr}.
					</p>
				</div>
			) : currentPrayerDetail.status === "not-logged" &&
				!currentPrayerDetail.canTrack ? (
				<div className="mx-8 mt-8 flex flex-col items-center justify-center rounded-4xl border border-border bg-card px-6 py-5 text-center shadow-sm">
					<div className="flex items-center gap-2 font-semibold text-foreground text-sm">
						<AlertCircle className="size-4" />
						<span>Belum Dicatat</span>
					</div>
					<p className="mt-1 text-muted-foreground text-xs">
						Tidak ada catatan solat {currentPrayerMeta.name} untuk hari ini.
					</p>
				</div>
			) : (
				<SwipeToPray
					key={sliderKey}
					onUnlock={handleUnlock}
					className="m-8"
					text={`Geser selesai ${currentPrayerMeta.name}`}
				/>
			)}
		</div>
	);
}
