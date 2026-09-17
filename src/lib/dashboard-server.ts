import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { setPrivateCacheControl } from "./cache";
import { calculateDailyPrayerSchedule } from "./prayer-calculation";
import { getCalculationMethodValues } from "./prayer-method-server";
import { db } from "./prisma";
import { getCurrentSession } from "./session";
import {
	calculateJournalStreak,
	calculateKhusyuAverage,
	calculateOnTimeRate,
	calculatePrayerStreak,
} from "./statistics";
import { formatLocalDate } from "./timezone";
import { ensureUserCompanionRows } from "./user-bootstrap";

export interface DashboardData {
	user: { name: string; email: string; avatar: string | null };
	location: string;
	stats: {
		totalPrayers: number;
		prayerStreak: number;
		journalStreak: number;
		journalEntries: number;
		attachedVerses: number;
		onTimePercentage: number | null;
		khusyuPercentage: number | null;
	};
	ayah: { text: string; source: string } | null;
}

export const getDashboardData = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardData> => {
		const session = await getCurrentSession();
		if (!session?.user) {
			throw redirect({ to: "/login", search: { redirect: "/" } });
		}
		setPrivateCacheControl();
		const userId = session.user.id;
		await ensureUserCompanionRows(userId);
		const [user, location, logs, entries, verse] = await Promise.all([
			db.orm.public.User.where({ id: userId }).first(),
			db.orm.public.UserLocationPreference.where({ userId }).first(),
			db.orm.public.PrayerLog.where({ userId, status: "completed" })
				.select("prayerDate", "prayerName", "scheduledAt", "completedAt")
				.all(),
			db.orm.public.JournalEntry.where({ userId })
				.select("id", "journalDate")
				.all(),
			db.orm.public.KhazanahVerse.select("translation", "reference").first(),
		]);
		if (!user) throw new Error("User unavailable");
		const attachedVerses = entries.length
			? await db.orm.public.JournalAttachedVerse.where((item) =>
					item.journalEntryId.in(entries.map((entry) => entry.id)),
				)
					.select("id")
					.all()
			: [];
		const today = formatLocalDate(
			new Date(),
			location?.timezone ?? "Asia/Jakarta",
		);
		const counts = new Map<string, number>();
		for (const log of logs)
			counts.set(log.prayerDate, (counts.get(log.prayerDate) ?? 0) + 1);
		const methodId = location?.calculationMethodId ?? "kemenag";
		const methodValues = await getCalculationMethodValues(methodId);
		const onTimeRecords = logs.flatMap((log) => {
			const schedule = calculateDailyPrayerSchedule(log.prayerDate, {
				latitude: location?.latitude ?? -6.2088,
				longitude: location?.longitude ?? 106.8456,
				timezoneOffset: location?.timezoneOffset ?? 7,
				timezone: location?.timezone ?? "Asia/Jakarta",
				calculationMethodId: methodId,
				methodValues,
			});
			const index = schedule.items.findIndex(
				(item) => item.id === log.prayerName,
			);
			if (index < 0 || !log.completedAt) return [];
			return [
				{
					scheduledAt: schedule.items[index].scheduledAt,
					onTimeWindowEndAt:
						schedule.items[index + 1]?.scheduledAt ??
						new Date(schedule.items[0].scheduledAt.getTime() + 86400000),
					completedAt: log.completedAt,
				},
			];
		});
		const reflectionRows = entries.length
			? await db.orm.public.JournalPrayerReflection.where((reflection) =>
					reflection.journalEntryId.in(entries.map((entry) => entry.id)),
				)
					.select("khusyuScore")
					.all()
			: [];
		const khusyu = calculateKhusyuAverage(
			reflectionRows.map((reflection) => ({ score: reflection.khusyuScore })),
		);
		const onTime = calculateOnTimeRate(onTimeRecords);
		return {
			user: { name: user.name, email: user.email, avatar: user.image },
			location: location?.cityName || "Koordinat GPS",
			stats: {
				totalPrayers: logs.length,
				prayerStreak: calculatePrayerStreak(counts, today),
				journalStreak: calculateJournalStreak(
					entries.map((entry) => entry.journalDate),
					today,
				),
				journalEntries: entries.length,
				attachedVerses: attachedVerses.length,
				onTimePercentage: onTime.sampleSize ? onTime.percentage : null,
				khusyuPercentage: khusyu.sampleSize ? khusyu.percentage : null,
			},
			ayah: verse ? { text: verse.translation, source: verse.reference } : null,
		};
	},
);
