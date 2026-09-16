import {
	motion,
	type PanInfo,
	useMotionValue,
	useTransform,
} from "framer-motion";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

interface SwipeToPrayProps {
	onUnlock: () => Promise<boolean>;
	text?: string;
	className?: string;
	hapticsEnabled?: boolean;
}

export function SwipeToPray({
	onUnlock,
	text = "Geser untuk tandai selesai",
	className,
	hapticsEnabled = true,
}: SwipeToPrayProps) {
	const [isUnlocked, setIsUnlocked] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const trackWidth = 300;
	const thumbSize = 56;
	const maxX = trackWidth - thumbSize - 8;
	const x = useMotionValue(0);
	const opacity = useTransform(x, [0, maxX * 0.5, maxX], [1, 0.8, 0.3]);
	const bgOpacity = useTransform(x, [0, maxX], [0.2, 1]);

	const handleDragEnd = (
		_: MouseEvent | TouchEvent | PointerEvent,
		info: PanInfo,
	) => {
		if (
			isSubmitting ||
			(info.offset.x <= maxX * 0.8 && info.velocity.x <= 500)
		) {
			x.set(0);
			return;
		}
		x.set(maxX);
		setIsSubmitting(true);
		if (hapticsEnabled && "vibrate" in navigator) navigator.vibrate(10);
		void onUnlock().then((success) => {
			setIsSubmitting(false);
			if (success) setIsUnlocked(true);
			else x.set(0);
		});
	};

	if (isUnlocked) {
		return (
			<div
				className={twMerge(
					"flex h-16 items-center justify-center rounded-full bg-primary px-4",
					className,
				)}
			>
				<Check className="size-7 text-primary-foreground" aria-hidden="true" />
			</div>
		);
	}

	return (
		<div
			className={twMerge(
				"relative flex h-16 items-center rounded-full bg-card px-2",
				className,
			)}
		>
			<motion.div
				className="absolute inset-1 rounded-full bg-primary/20"
				style={{ opacity: bgOpacity }}
			/>
			<motion.button
				type="button"
				aria-label={text}
				disabled={isSubmitting}
				className="absolute left-1 z-10 flex items-center justify-center rounded-full bg-primary shadow-lg enabled:cursor-grab enabled:active:cursor-grabbing disabled:cursor-wait"
				style={{ width: thumbSize, height: thumbSize, x }}
				drag="x"
				dragMomentum={false}
				dragConstraints={{ left: 0, right: maxX }}
				dragElastic={0.5}
				onDragEnd={handleDragEnd}
			>
				{isSubmitting ? (
					<LoaderCircle
						className="size-6 animate-spin text-primary-foreground"
						aria-hidden="true"
					/>
				) : (
					<ArrowRight
						className="size-6 text-primary-foreground"
						aria-hidden="true"
					/>
				)}
			</motion.button>
			<motion.div
				className="pointer-events-none absolute inset-0 flex items-center justify-center"
				style={{ opacity }}
			>
				<span className="text-muted-foreground text-sm">{text}</span>
			</motion.div>
		</div>
	);
}
