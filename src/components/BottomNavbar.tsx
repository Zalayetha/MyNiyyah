import { useNavigate, useSearch } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { BookOpen, House, User } from "lucide-react";
import { Route as IndexRoute } from "../routes/index";

type Section = "home" | "journal" | "account";

interface NavItem {
	id: Section;
	label: string;
	icon: LucideIcon;
}

export const navItems: NavItem[] = [
	{ id: "home", label: "Beranda", icon: House },
	{ id: "journal", label: "Muhasabah", icon: BookOpen },
	{ id: "account", label: "Akun", icon: User },
];

interface BottomNavbarViewProps {
	currentSection: Section;
	onNavigate: (id: Section) => void;
	reduceMotion?: boolean;
}

export function BottomNavbarView({
	currentSection,
	onNavigate,
	reduceMotion = false,
}: BottomNavbarViewProps) {
	return (
		<nav
			aria-label="Navigasi utama"
			className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full p-1.5 bg-[#0c182b]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_16px_36px_-4px_rgba(0,0,0,0.65),0_0_0_1px_rgba(50,215,196,0.12),inset_0_1px_1px_0_rgba(255,255,255,0.1)]"
		>
			{navItems.map((item) => {
				const Icon = item.icon;
				const isActive = currentSection === item.id;

				return (
					<button
						key={item.id}
						type="button"
						aria-current={isActive ? "page" : undefined}
						aria-label={item.label}
						onClick={() => onNavigate(item.id)}
						className={`relative flex min-h-11 min-w-11 items-center justify-center rounded-full text-sm font-medium transition-colors duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
							isActive
								? "gap-2 px-4 text-[#061d31]"
								: "text-muted-foreground/75 hover:text-foreground hover:bg-white/[0.06]"
						}`}
					>
						{isActive && (
							<motion.div
								layoutId="bottomNavbarActivePill"
								className="absolute inset-0 rounded-full bg-linear-to-r from-[#02bda7] via-[#32d7c4] to-[#53d7c8] shadow-[0_2px_14px_rgba(50,215,196,0.35)]"
								transition={{
									type: reduceMotion ? false : "spring",
									stiffness: 400,
									damping: 30,
									duration: reduceMotion ? 0 : undefined,
								}}
							/>
						)}
						<Icon
							className="relative z-10 size-5 shrink-0"
							strokeWidth={isActive ? 2.3 : 1.9}
						/>
						{isActive ? (
							<motion.span
								initial={reduceMotion ? false : { opacity: 0, x: -3 }}
								animate={{ opacity: 1, x: 0 }}
								exit={reduceMotion ? undefined : { opacity: 0, x: -3 }}
								transition={{ duration: reduceMotion ? 0 : 0.15 }}
								className="relative z-10 text-xs font-bold tracking-wide"
							>
								{item.label}
							</motion.span>
						) : null}
					</button>
				);
			})}
		</nav>
	);
}

export function BottomNavbar() {
	const { section } = useSearch({ from: IndexRoute.id });
	const navigate = useNavigate();
	const reduceMotion = useReducedMotion();

	const currentSection = section ?? "home";

	const handleNavigate = (id: Section) => {
		if ("vibrate" in navigator) {
			navigator.vibrate(8);
		}
		navigate({ to: "/", search: { section: id } });
	};

	return (
		<BottomNavbarView
			currentSection={currentSection}
			onNavigate={handleNavigate}
			reduceMotion={Boolean(reduceMotion)}
		/>
	);
}
