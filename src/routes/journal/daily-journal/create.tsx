import { Icon } from "@iconify/react";
import {
	createFileRoute,
	Link,
	Outlet,
	useLocation,
} from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/journal/daily-journal/create")({
	component: RouteComponent,
});

function RouteComponent() {
	const location = useLocation();

	if (location.pathname !== "/journal/daily-journal/create") {
		return <Outlet />;
	}

	return (
		<div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-4 pb-8 text-foreground">
			<header className="pt-14">
				<Link
					to="/journal/daily-journal"
					search={{ page: 1 }}
					className="inline-flex h-10 w-10 items-center justify-start"
					aria-label="Kembali ke jurnal harian"
				>
					<ArrowLeft className="size-7" strokeWidth={2.75} />
				</Link>
			</header>

			<main className="flex flex-1 flex-col items-center text-center">
				<section className="flex flex-1 flex-col items-center justify-center pb-8">
					<h1 className="mb-16 font-bold text-[40px] tracking-[0.12em]">
						Jejak Ibadah
					</h1>

					<Icon
						icon="hugeicons:prayer-rug-01"
						className="text-primary"
						fontSize={220}
						aria-hidden="true"
					/>

					<p className="mt-12 max-w-[330px] text-[17px] text-foreground/90 leading-snug">
						Lihat kembali bagaimana kau menjalani shalat lima waktu hari ini.
					</p>
				</section>

				<Link
					to="/journal/daily-journal/create/$step"
					params={{ step: "journal-1-subuh" }}
					className="gradient-secondary flex h-13 w-full items-center justify-center rounded-full font-semibold text-background tracking-wide"
				>
					Lihat Jejak Ibadah
				</Link>
			</main>
		</div>
	);
}
