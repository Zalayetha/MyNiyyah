import { Link } from "@tanstack/react-router";
import { BookOpen, CloudSun, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { cn } from "#/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { buttonVariants } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface HomeSectionProps {
	user: {
		name: string;
		avatar: string;
	};
	prayer: {
		next: string;
		time: string;
	};
	ayah: {
		text: string;
		source: string;
	};
	chartData: Array<{ day: string; value: number }>;
}

const prayerIcons = [
	{ id: "subuh", icon: CloudSun },
	{ id: "dzuhur", icon: Sun },
	{ id: "ashar", icon: Sunrise },
	{ id: "maghrib", icon: Sunset },
	{ id: "isya", icon: Moon },
];

export function HomeSection({
	user,
	prayer,
	ayah,
	chartData,
}: HomeSectionProps) {
	return (
		<div className="w-full pb-32">
			{/* Avatar & Greeting */}
			<div className="flex flex-row p-4 items-center gap-4">
				<Avatar className="ring-2 ring-ring">
					<AvatarImage src={user.avatar} alt={user.name} />
					<AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
				</Avatar>
				<div className="text-lg text-muted-foreground">Ahlan, {user.name}</div>
			</div>

			{/* Prayer Card */}
			<div className="mx-8 mt-4">
				<Card
					size="sm"
					className="border-0 gradient-primary text-primary-foreground"
				>
					<CardContent className="flex flex-col gap-4">
						<div className="text-sm text-center text-primary-foreground">
							Mendatang: {prayer.next}
						</div>
						<div className="text-6xl font-semibold text-center text-primary-foreground">
							{prayer.time}
						</div>

						<div className="flex flex-row justify-evenly">
							{prayerIcons.map(({ id, icon: Icon }, i) => (
								<div
									key={id}
									className={`flex h-12 w-12 items-center justify-center rounded-full ${
										i === 0
											? "bg-[#06223a]"
											: "bg-[#0a1527]/15 shadow-inner shadow-black/25"
									}`}
								>
									<Icon
										className={`h-6 w-6 ${
											i === 0 ? "text-primary" : "text-white"
										}`}
										fill={i === 0 ? "currentColor" : "#ffffff"}
									/>
								</div>
							))}
						</div>
						<Link
							to="/prayer-tracker"
							className={cn(
								buttonVariants({ variant: "default" }),
								"w-full bg-background font-semibold text-primary hover:bg-background/90 mt-4 rounded-full px-4 py-2",
							)}
						>
							Catat Solat
						</Link>
					</CardContent>
				</Card>
			</div>

			{/* Ayah of the Day */}
			<div className="mx-8 mt-4">
				<Card
					size="sm"
					className="bg-card border-0 text-card-foreground relative overflow-hidden"
				>
					<CardContent className="flex flex-col gap-3">
						<svg width="0" height="0" className="absolute" aria-hidden="true">
							<defs>
								<linearGradient
									id="cyan-gradient"
									x1="0%"
									y1="0%"
									x2="100%"
									y2="0%"
								>
									<stop offset="0%" stopColor="#02bda7" />
									<stop offset="50%" stopColor="#53d7c8" />
									<stop offset="100%" stopColor="#a7fff5" />
								</linearGradient>
							</defs>
						</svg>
						<div>"{ayah.text}"</div>
						<div className="flex flex-row justify-between items-center">
							<div className="flex flex-row gap-2 items-center">
								<BookOpen
									className="size-4"
									stroke="url(#cyan-gradient)"
									fill="url(#cyan-gradient)"
								/>
								<div className="text-xs font-medium bg-linear-to-r from-[#02bda7] via-[#53d7c8] to-[#a7fff5] bg-clip-text text-transparent">
									{ayah.source}
								</div>
							</div>
						</div>
						<BookOpen
							size={100}
							fill="url(#cyan-gradient)"
							stroke="url(#cyan-gradient)"
							className="absolute -bottom-12 -right-1"
						/>
					</CardContent>
				</Card>
			</div>

			{/* Prayer Chart */}
			<div className="mx-8 mt-4">
				<Card
					size="sm"
					className="bg-card border-0 text-card-foreground overflow-hidden"
				>
					<CardContent className="flex flex-col gap-4">
						<div className="flex justify-between">
							{chartData.map((item) => (
								<div
									key={item.day}
									className="flex flex-col items-center gap-3"
								>
									<div className="h-32 w-6 bg-muted rounded-full flex items-end p-1">
										<div
											className="w-full rounded-full bg-primary"
											style={{ height: `${item.value}%` }}
										/>
									</div>
									<span className="text-card-foreground">{item.day}</span>
								</div>
							))}
						</div>
						<Link
							to="/journal/complete-statistic"
							className={cn(
								buttonVariants({ variant: "default" }),
								"w-full bg-primary text-primary-foreground font-semibold mt-4 rounded-full px-4 py-2 hover:bg-primary/90",
							)}
						>
							Lihat Statistik
						</Link>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
