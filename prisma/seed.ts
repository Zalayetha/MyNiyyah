import "dotenv/config";
import { Pool } from "pg";
import { KHAZANAH_CATEGORIES } from "../src/lib/khazanah-data";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

const now = new Date();

const prayerCalculationMethods = [
	{
		id: "kemenag",
		name: "Kementerian Agama RI (Kemenag)",
		description: "Standar resmi Republik Indonesia (Fajr 20°, Isha 18°)",
		fajrAngle: 20,
		ishaAngle: 18,
		ishaIntervalMinutes: null,
	},
	{
		id: "mwl",
		name: "Muslim World League (MWL)",
		description: "Fajr 18°, Isha 17°",
		fajrAngle: 18,
		ishaAngle: 17,
		ishaIntervalMinutes: null,
	},
	{
		id: "makkah",
		name: "Umm Al-Qura University (Makkah)",
		description: "Fajr 18.5°, Isha 90 min after Maghrib",
		fajrAngle: 18.5,
		ishaAngle: null,
		ishaIntervalMinutes: 90,
	},
] as const;

const cities = [
	{
		id: "jkt",
		name: "Jakarta Pusat",
		province: "DKI Jakarta",
		latitude: -6.2088,
		longitude: 106.8456,
		timezone: "Asia/Jakarta",
		timezoneOffset: 7,
	},
	{
		id: "bdg",
		name: "Bandung",
		province: "Jawa Barat",
		latitude: -6.9175,
		longitude: 107.6191,
		timezone: "Asia/Jakarta",
		timezoneOffset: 7,
	},
	{
		id: "sby",
		name: "Surabaya",
		province: "Jawa Timur",
		latitude: -7.2575,
		longitude: 112.7521,
		timezone: "Asia/Jakarta",
		timezoneOffset: 7,
	},
	{
		id: "yk",
		name: "Yogyakarta",
		province: "DI Yogyakarta",
		latitude: -7.7956,
		longitude: 110.3695,
		timezone: "Asia/Jakarta",
		timezoneOffset: 7,
	},
	{
		id: "smg",
		name: "Semarang",
		province: "Jawa Tengah",
		latitude: -6.9667,
		longitude: 110.4167,
		timezone: "Asia/Jakarta",
		timezoneOffset: 7,
	},
	{
		id: "mdn",
		name: "Medan",
		province: "Sumatera Utara",
		latitude: 3.5952,
		longitude: 98.6722,
		timezone: "Asia/Jakarta",
		timezoneOffset: 7,
	},
	{
		id: "mks",
		name: "Makassar",
		province: "Sulawesi Selatan",
		latitude: -5.1477,
		longitude: 119.4327,
		timezone: "Asia/Makassar",
		timezoneOffset: 8,
	},
] as const;

const journalThemes = [
	{ id: "pekerjaan", slug: "pekerjaan", title: "Pekerjaan", sortOrder: 1 },
	{ id: "keluarga", slug: "keluarga", title: "Keluarga", sortOrder: 2 },
	{ id: "kesehatan", slug: "kesehatan", title: "Kesehatan", sortOrder: 3 },
	{ id: "teman", slug: "teman", title: "Teman", sortOrder: 4 },
] as const;

async function seed() {
	for (const method of prayerCalculationMethods) {
		await pool.query(
			`INSERT INTO "prayerCalculationMethod" (id, name, description, "fajrAngle", "ishaAngle", "ishaIntervalMinutes", "createdAt", "updatedAt")
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
			 ON CONFLICT (id) DO UPDATE SET
			 name = EXCLUDED.name,
			 description = EXCLUDED.description,
			 "fajrAngle" = EXCLUDED."fajrAngle",
			 "ishaAngle" = EXCLUDED."ishaAngle",
			 "ishaIntervalMinutes" = EXCLUDED."ishaIntervalMinutes",
			 "updatedAt" = EXCLUDED."updatedAt"`,
			[
				method.id,
				method.name,
				method.description,
				method.fajrAngle,
				method.ishaAngle,
				method.ishaIntervalMinutes,
				now,
			],
		);
	}

	for (const city of cities) {
		await pool.query(
			`INSERT INTO "cityCatalog" (id, name, province, country, latitude, longitude, timezone, "timezoneOffset", "createdAt", "updatedAt")
			 VALUES ($1, $2, $3, 'Indonesia', $4, $5, $6, $7, $8, $8)
			 ON CONFLICT (id) DO UPDATE SET
			 name = EXCLUDED.name,
			 province = EXCLUDED.province,
			 latitude = EXCLUDED.latitude,
			 longitude = EXCLUDED.longitude,
			 timezone = EXCLUDED.timezone,
			 "timezoneOffset" = EXCLUDED."timezoneOffset",
			 "updatedAt" = EXCLUDED."updatedAt"`,
			[
				city.id,
				city.name,
				city.province,
				city.latitude,
				city.longitude,
				city.timezone,
				city.timezoneOffset,
				now,
			],
		);
	}

	for (const theme of journalThemes) {
		await pool.query(
			`INSERT INTO "journalTheme" (id, slug, title, "sortOrder", "createdAt", "updatedAt")
			 VALUES ($1, $2, $3, $4, $5, $5)
			 ON CONFLICT (id) DO UPDATE SET
			 slug = EXCLUDED.slug,
			 title = EXCLUDED.title,
			 "sortOrder" = EXCLUDED."sortOrder",
			 "updatedAt" = EXCLUDED."updatedAt"`,
			[theme.id, theme.slug, theme.title, theme.sortOrder, now],
		);
	}

	for (const [categoryIndex, category] of KHAZANAH_CATEGORIES.entries()) {
		await pool.query(
			`INSERT INTO "khazanahCategory" (id, slug, title, subtitle, "sortOrder", "createdAt", "updatedAt")
			 VALUES ($1, $2, $3, $4, $5, $6, $6)
			 ON CONFLICT (id) DO UPDATE SET
			 slug = EXCLUDED.slug,
			 title = EXCLUDED.title,
			 subtitle = EXCLUDED.subtitle,
			 "sortOrder" = EXCLUDED."sortOrder",
			 "updatedAt" = EXCLUDED."updatedAt"`,
			[
				category.id,
				category.slug,
				category.title,
				category.subtitle,
				categoryIndex + 1,
				now,
			],
		);

		for (const verse of category.verses) {
			await pool.query(
				`INSERT INTO "khazanahVerse" (id, "categoryId", title, "surahName", "surahTranslation", juz, "surahNumber", "verseNumber", arabic, translation, reference, "createdAt", "updatedAt")
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
				 ON CONFLICT (id) DO UPDATE SET
				 "categoryId" = EXCLUDED."categoryId",
				 title = EXCLUDED.title,
				 "surahName" = EXCLUDED."surahName",
				 "surahTranslation" = EXCLUDED."surahTranslation",
				 juz = EXCLUDED.juz,
				 "surahNumber" = EXCLUDED."surahNumber",
				 "verseNumber" = EXCLUDED."verseNumber",
				 arabic = EXCLUDED.arabic,
				 translation = EXCLUDED.translation,
				 reference = EXCLUDED.reference,
				 "updatedAt" = EXCLUDED."updatedAt"`,
				[
					verse.id,
					category.id,
					verse.title,
					verse.surahName,
					verse.surahTranslation,
					verse.juz,
					verse.surahNumber,
					verse.verseNumber,
					verse.arabic,
					verse.translation,
					verse.reference,
					now,
				],
			);

			for (const [segmentIndex, segment] of (verse.segments ?? []).entries()) {
				await pool.query(
					`INSERT INTO "khazanahVerseSegment" (id, "verseId", position, text, "createdAt", "updatedAt")
					 VALUES ($1, $2, $3, $4, $5, $5)
					 ON CONFLICT ("verseId", position) DO UPDATE SET
					 text = EXCLUDED.text,
					 "updatedAt" = EXCLUDED."updatedAt"`,
					[
						`${verse.id}-${segmentIndex}`,
						verse.id,
						segmentIndex,
						segment,
						now,
					],
				);
			}
			await pool.query(
				`DELETE FROM "khazanahVerseSegment"
				 WHERE "verseId" = $1 AND position >= $2`,
				[verse.id, verse.segments?.length ?? 0],
			);
		}
	}
}

try {
	await seed();
	console.log("Database seed completed.");
} finally {
	await pool.end();
}
