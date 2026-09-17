import { motion } from "framer-motion";

interface DonutSegment {
	label: string;
	value: number;
	color: string;
}

interface DonutChartProps {
	data: DonutSegment[];
	size?: number;
	strokeWidth?: number;
	className?: string;
	showLegend?: boolean;
	centerLabel?: string;
	centerSubLabel?: string;
	title?: string;
}

export function DonutChart({
	data,
	size = 200,
	strokeWidth = 24,
	className = "",
	showLegend = true,
	centerLabel,
	centerSubLabel,
	title = "Donut chart",
}: DonutChartProps) {
	const total = data.reduce((sum, item) => sum + item.value, 0);
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const center = size / 2;

	let accumulatedOffset = 0;

	const segments = data.map((item) => {
		const percentage = total > 0 ? item.value / total : 0;
		const strokeDasharray = `${circumference * percentage} ${circumference}`;
		const segment = {
			...item,
			percentage,
			strokeDasharray,
			offset: accumulatedOffset,
		};
		accumulatedOffset -= circumference * percentage;
		return segment;
	});
	const summary =
		total > 0
			? segments
					.map(
						(segment) =>
							`${segment.label}: ${segment.value} (${Math.round(segment.percentage * 100)}%)`,
					)
					.join(", ")
			: "Tidak ada data";

	return (
		<div className={`flex flex-col items-center gap-4 ${className}`}>
			<div
				className="relative"
				style={{ width: size, height: size }}
				role="img"
				aria-label={`${title}. ${summary}`}
			>
				<svg
					width={size}
					height={size}
					viewBox={`0 0 ${size} ${size}`}
					className="-rotate-90"
				>
					<title>{title}</title>
					{/* Background track */}
					<circle
						cx={center}
						cy={center}
						r={radius}
						fill="none"
						stroke="currentColor"
						strokeWidth={strokeWidth}
						className="text-muted"
					/>

					{/* Animated segments */}
					{segments.map((segment, index) => (
						<motion.circle
							key={segment.label}
							cx={center}
							cy={center}
							r={radius}
							fill="none"
							stroke={segment.color}
							strokeWidth={strokeWidth}
							strokeLinecap="butt"
							strokeDasharray={segment.strokeDasharray}
							initial={{ strokeDashoffset: circumference }}
							animate={{ strokeDashoffset: segment.offset }}
							transition={{
								duration: 1,
								delay: index * 0.15,
								ease: "easeOut",
							}}
						/>
					))}
				</svg>

				{/* Center content */}
				{(centerLabel || centerSubLabel) && (
					<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
						{centerLabel && (
							<span className="text-2xl font-bold text-foreground">
								{centerLabel}
							</span>
						)}
						{centerSubLabel && (
							<span className="text-sm text-muted-foreground">
								{centerSubLabel}
							</span>
						)}
					</div>
				)}
			</div>

			{/* Legend */}
			{showLegend && (
				<div className="flex flex-wrap justify-center gap-3">
					{segments.map((segment) => (
						<div key={segment.label} className="flex items-center gap-2">
							<div
								className="w-3 h-3 rounded-sm"
								style={{ backgroundColor: segment.color }}
							/>
							<span className="text-sm text-muted-foreground">
								{segment.label} ({Math.round(segment.percentage * 100)}%)
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
