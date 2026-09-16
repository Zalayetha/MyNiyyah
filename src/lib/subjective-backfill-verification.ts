import { db } from "./prisma";

export async function getSubjectiveBackfillReport() {
	const [logs, reflections] = await Promise.all([
		db.orm.public.PrayerLog.select(
			"userId",
			"prayerDate",
			"prayerName",
			"status",
			"completedAt",
			"feelingScore",
			"khusyuScore",
		).all(),
		db.orm.public.JournalPrayerReflection.select(
			"journalEntryId",
			"prayerName",
			"feelingScore",
			"khusyuScore",
		).all(),
	]);
	return {
		legacySubjectiveRows: logs.filter(
			(log) => log.feelingScore !== null || log.khusyuScore !== null,
		).length,
		canonicalReflectionRows: reflections.filter(
			(row) => row.feelingScore !== null || row.khusyuScore !== null,
		).length,
		completedPrayerLogs: logs.filter((log) => log.status === "completed")
			.length,
		reflectionScores: reflections.filter(
			(row) => row.feelingScore !== null || row.khusyuScore !== null,
		).length,
	};
}
