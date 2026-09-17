import { PRAYER_NAMES, type PrayerName } from "./prayer-calculation";
import type { PeriodDayColumn } from "./statistics";
import { calculateFeelingDistribution } from "./statistics";

export type JournalFeelingLabel = "Ngantuk" | "Berat" | "Tenang" | "Khusyu'";
export type JournalFeelingStatus = 1 | 2 | 3 | 4 | null;

export interface JournalReflectionRecord {
	journalDate: string;
	prayerName: string;
	feeling?: string | null;
	feelingScore?: number | null;
	khusyuScore?: number | null;
}

export interface JournalFeelingSegment {
	label: JournalFeelingLabel;
	value: number;
	color: string;
}

export const JOURNAL_FEELING_STYLES: Record<
	Exclude<JournalFeelingStatus, null>,
	{ label: JournalFeelingLabel; className: string; color: string }
> = {
	1: { label: "Ngantuk", className: "bg-[#3C1642]", color: "#3C1642" },
	2: { label: "Berat", className: "bg-[#C33C54]", color: "#C33C54" },
	3: { label: "Tenang", className: "bg-[#0B8F8C]", color: "#0B8F8C" },
	4: { label: "Khusyu'", className: "bg-[#47E1CF]", color: "#47E1CF" },
};

function normalizeFeelingText(feeling: string) {
	return feeling.toLowerCase().trim().replace(/[’']/g, "").replace(/\s+/g, " ");
}

export function getJournalFeelingStatus(
	reflection: Pick<
		JournalReflectionRecord,
		"feeling" | "feelingScore" | "khusyuScore"
	>,
): JournalFeelingStatus {
	const score = reflection.feelingScore ?? reflection.khusyuScore;
	if (score === 1 || score === 2 || score === 3 || score === 4) return score;

	const feeling = normalizeFeelingText(reflection.feeling ?? "");
	if (feeling === "ngantuk") return 1;
	if (feeling === "berat") return 2;
	if (feeling === "tenang") return 3;
	if (feeling === "khusyu") return 4;
	return null;
}

export function buildJournalFeelingMatrix(
	days: PeriodDayColumn[],
	reflections: JournalReflectionRecord[],
): JournalFeelingStatus[][] {
	const statusByPrayerDate = new Map<string, JournalFeelingStatus>();
	for (const reflection of reflections) {
		statusByPrayerDate.set(
			`${reflection.journalDate}:${reflection.prayerName.toLowerCase()}`,
			getJournalFeelingStatus(reflection),
		);
	}

	return PRAYER_NAMES.map((prayerName) =>
		days.map(
			(day) => statusByPrayerDate.get(`${day.date}:${prayerName}`) ?? null,
		),
	);
}

export function buildJournalFeelingDistribution(
	reflections: JournalReflectionRecord[],
): JournalFeelingSegment[] {
	const labels = ["Khusyu'", "Tenang", "Berat", "Ngantuk"] as const;
	const distribution = calculateFeelingDistribution(
		reflections.map((reflection) => {
			const status = getJournalFeelingStatus(reflection);
			return {
				label: status === null ? null : JOURNAL_FEELING_STYLES[status].label,
			};
		}),
		labels,
	);

	return labels.map((label) => {
		const style = Object.values(JOURNAL_FEELING_STYLES).find(
			(item) => item.label === label,
		);
		return {
			label,
			value: distribution.counts[label],
			color: style?.color ?? "#000000",
		};
	});
}

export function isPrayerName(value: string): value is PrayerName {
	return PRAYER_NAMES.includes(value as PrayerName);
}
