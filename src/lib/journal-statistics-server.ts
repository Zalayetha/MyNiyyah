import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	buildJournalFeelingDistribution,
	buildJournalFeelingMatrix,
	type JournalFeelingSegment,
	type JournalFeelingStatus,
	type JournalReflectionRecord,
} from "./journal-statistics";
import { db } from "./prisma";
import { parseIsoDate, parseTimezone } from "./server-validation";
import { getCurrentSession } from "./session";
import { getWeekDayColumns, type PeriodDayColumn } from "./statistics";
import { formatLocalDate } from "./timezone";

export interface JournalStatisticsData {
	days: PeriodDayColumn[];
	matrix: JournalFeelingStatus[][];
	feelingDistribution: JournalFeelingSegment[];
	totalFeelingLogs: number;
	timezone: string;
}

import { setPrivateCacheControl } from "./cache";

export const getJournalStatisticsData = createServerFn({ method: "GET" })
	.validator((input: { clientLocalDate?: string; clientTimezone?: string }) => {
		if (input.clientLocalDate)
			parseIsoDate(input.clientLocalDate, "clientLocalDate");
		if (input.clientTimezone)
			parseTimezone(input.clientTimezone, "clientTimezone");
		return input;
	})
	.handler(async ({ data }): Promise<JournalStatisticsData> => {
		const session = await getCurrentSession();
		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: { redirect: "/journal/complete-statistic" },
			});
		}
		setPrivateCacheControl();

		const preference = await db.orm.public.UserLocationPreference.where({
			userId: session.user.id,
		})
			.select("timezone")
			.first();
		const timezone =
			preference?.timezone || data?.clientTimezone?.trim() || "Asia/Jakarta";
		const localDate =
			data?.clientLocalDate?.trim() || formatLocalDate(new Date(), timezone);
		const days = getWeekDayColumns(localDate, 7, timezone);

		const entries = await db.orm.public.JournalEntry.where({
			userId: session.user.id,
		})
			.where((entry) => entry.journalDate.gte(days[0].date))
			.where((entry) => entry.journalDate.lte(days[days.length - 1].date))
			.select("id", "journalDate")
			.all();
		const entryIds = entries.map((entry) => entry.id);
		const reflections = entryIds.length
			? await db.orm.public.JournalPrayerReflection.where((reflection) =>
					reflection.journalEntryId.in(entryIds),
				)
					.select(
						"journalEntryId",
						"prayerName",
						"feeling",
						"feelingScore",
						"khusyuScore",
					)
					.all()
			: [];
		const journalDateByEntryId = new Map(
			entries.map((entry) => [entry.id, entry.journalDate]),
		);
		const journalReflections: JournalReflectionRecord[] = reflections.map(
			(row) => ({
				journalDate: journalDateByEntryId.get(row.journalEntryId) ?? "",
				prayerName: row.prayerName,
				feeling: row.feeling,
				feelingScore: row.feelingScore,
				khusyuScore: row.khusyuScore,
			}),
		);
		const feelingDistribution =
			buildJournalFeelingDistribution(journalReflections);

		return {
			days,
			matrix: buildJournalFeelingMatrix(days, journalReflections),
			feelingDistribution,
			totalFeelingLogs: feelingDistribution.reduce(
				(total, segment) => total + segment.value,
				0,
			),
			timezone,
		};
	});
