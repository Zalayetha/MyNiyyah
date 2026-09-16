import type { CalculationMethodValues } from "./prayer-calculation";
import { db } from "./prisma";
import { validationError } from "./server-errors";

export async function getCalculationMethodValues(
	methodId: string,
): Promise<CalculationMethodValues> {
	const method = await db.orm.public.PrayerCalculationMethod.where({
		id: methodId,
	}).first();
	if (!method) throw validationError("Calculation method is invalid.");
	return {
		fajrAngle: method.fajrAngle,
		ishaAngle: method.ishaAngle,
		ishaIntervalMinutes: method.ishaIntervalMinutes,
	};
}
