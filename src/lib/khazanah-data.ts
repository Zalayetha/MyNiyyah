export interface KhazanahVerse {
	id: string;
	title: string;
	surahName: string;
	surahTranslation: string;
	juz: number;
	surahNumber: number;
	verseNumber: number;
	arabic: string;
	translation: string;
	segments?: string[];
	reference: string;
	category: "hikmah-shalat" | "pekerjaan" | "pengembangan-diri";
}

export interface KhazanahSourceMetadata {
	contentVersion: string;
	sourceName: string;
	translationEdition: string;
	license: string;
	verificationNote: string;
}

export interface KhazanahCategory {
	id: string;
	slug: string;
	title: string;
	subtitle: string;
	verses: KhazanahVerse[];
}

export interface KhazanahAttachmentSnapshot {
	verseId: string;
	segmentId: string | null;
	segmentIndex?: number;
	surahRef: string;
	quoteText: string;
}

export const KHAZANAH_SOURCE_METADATA: KhazanahSourceMetadata = {
	contentVersion: "quran-id-v1",
	sourceName: "Al-Qur'an dan Terjemahannya, Kementerian Agama RI",
	translationEdition: "Terjemahan Bahasa Indonesia Kemenag RI",
	license: "Digunakan sebagai kutipan terbatas untuk refleksi pribadi.",
	verificationNote:
		"Static v1 content is the canonical app source and the database seed is generated from this file.",
};

export const KHAZANAH_VERSES: KhazanahVerse[] = [
	{
		id: "an-nisa-58",
		title: "Sampaikan amanah",
		surahName: "An-Nisa",
		surahTranslation: "Perempuan",
		juz: 5,
		surahNumber: 4,
		verseNumber: 58,
		arabic:
			"إِنَّ اللَّهَ يَأْمُرُكُمْ أَنْ تُؤَدُّوا الْأَمَانَاتِ إِلَىٰ أَهْلِهَا وَإِذَا حَكَمْتُمْ بَيْنَ النَّاسِ أَنْ تَحْكُمُوا بِالْعَدْلِ إِنَّ اللَّهَ نِعِمَّا يَعِظُكُمْ بِهِ إِنَّ اللَّهَ كَانَ سَمِيعًا بَصِيرًا ۝",
		translation:
			"Sesungguhnya Allah menyuruh kamu menyampaikan amanah kepada pemiliknya. Apabila kamu menetapkan hukum di antara manusia, hendaklah kamu tetapkan secara adil. Sesungguhnya Allah memberi pengajaran yang paling baik kepadamu. Sesungguhnya Allah Maha Mendengar lagi Maha Melihat.",
		segments: [
			"Sesungguhnya Allah menyuruh kamu menyampaikan amanah kepada pemiliknya.",
			"Apabila kamu menetapkan hukum di antara manusia,",
			"hendaklah kamu tetapkan secara adil.",
			"Sesungguhnya Allah memberi pengajaran yang paling baik kepadamu.",
			"Sesungguhnya Allah Maha Mendengar lagi Maha Melihat.",
		],
		reference: "An-Nisa [4]: 58",
		category: "pekerjaan",
	},
	{
		id: "at-taubah-105",
		title: "Allah melihat pekerjaanmu",
		surahName: "At-Taubah",
		surahTranslation: "Pengampunan",
		juz: 11,
		surahNumber: 9,
		verseNumber: 105,
		arabic:
			"وَقُلِ اعْمَلُوا فَسَيَرَى اللَّهُ عَمَلَكُمْ وَرَسُولُهُ وَالْمُؤْمِنُونَ وَسَتُرَدُّونَ إِلَىٰ عَالِمِ الْغَيْبِ وَالشَّهَادَةِ فَيُنَبِّئُكُمْ بِمَا كُنْتُمْ تَعْمَلُونَ ۝",
		translation:
			'Katakanlah (Muhammad), "Bekerjalah! Maka, Allah, rasul-Nya, dan orang-orang mukmin akan melihat pekerjaanmu. Kamu akan dikembalikan kepada (Zat) yang mengetahui yang gaib dan yang nyata. Lalu, Dia akan memberitakan kepada kamu apa yang selama ini kamu kerjakan."',
		segments: [
			'Katakanlah (Muhammad), "Bekerjalah!',
			"Maka, Allah, rasul-Nya, dan orang-orang mukmin akan melihat pekerjaanmu.",
			"Kamu akan dikembalikan kepada (Zat) yang mengetahui yang gaib dan yang nyata.",
			'Lalu, Dia akan memberitakan kepada kamu apa yang selama ini kamu kerjakan."',
		],
		reference: "At-Taubah [9]: 105",
		category: "pekerjaan",
	},
	{
		id: "al-insyirah-7",
		title: "Kemudahan bersama kesulitan",
		surahName: "Al-Insyirah",
		surahTranslation: "Kelapangan",
		juz: 30,
		surahNumber: 94,
		verseNumber: 7,
		arabic: "فَإِذَا فَرَغْتَ فَانْصَبْ ۝",
		translation:
			"Apabila engkau telah selesai (dengan suatu kebajikan), teruslah bekerja keras (untuk kebajikan yang lain)",
		segments: [
			"Apabila engkau telah selesai (dengan suatu kebajikan),",
			"teruslah bekerja keras (untuk kebajikan yang lain)",
		],
		reference: "Al-Insyirah [94]: 7",
		category: "pekerjaan",
	},
	{
		id: "al-baqarah-45",
		title: "Shalat adalah penolong",
		surahName: "Al-Baqarah",
		surahTranslation: "Sapi Betina",
		juz: 1,
		surahNumber: 2,
		verseNumber: 45,
		arabic: "وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى الْخَاشِعِينَ ۝",
		translation:
			"Jadikanlah sabar dan shalat sebagai penolongmu. Dan sesungguhnya yang demikian itu sungguh berat, kecuali bagi orang-orang yang khusyu'.",
		segments: [
			"Jadikanlah sabar dan shalat sebagai penolongmu.",
			"Dan sesungguhnya yang demikian itu sungguh berat, kecuali bagi orang-orang yang khusyu'.",
		],
		reference: "Al-Baqarah [2]: 45",
		category: "hikmah-shalat",
	},
	{
		id: "al-baqarah-277",
		title: "Shalat adalah penyejuk hati",
		surahName: "Al-Baqarah",
		surahTranslation: "Sapi Betina",
		juz: 3,
		surahNumber: 2,
		verseNumber: 277,
		arabic:
			"إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَأَقَامُوا الصَّلَاةَ وَآتَوُا الزَّكَاةَ لَهُمْ أَجْرُهُمْ عِنْدَ رَبِّهِمْ وَلَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ ۝",
		translation:
			"Sungguh, orang-orang yang beriman, mengerjakan kebajikan, melaksanakan shalat dan menunaikan zakat, mereka mendapat pahala di sisi Tuhannya. Tidak ada rasa takut pada mereka dan mereka tidak bersedih hati.",
		segments: [
			"Sungguh, orang-orang yang beriman, mengerjakan kebajikan, melaksanakan shalat dan menunaikan zakat,",
			"mereka mendapat pahala di sisi Tuhannya.",
			"Tidak ada rasa takut pada mereka dan mereka tidak bersedih hati.",
		],
		reference: "Al-Baqarah [2]: 277",
		category: "hikmah-shalat",
	},
	{
		id: "al-ankabut-45",
		title: "Shalat mencegah keburukan",
		surahName: "Al-Ankabut",
		surahTranslation: "Laba-laba",
		juz: 21,
		surahNumber: 29,
		verseNumber: 45,
		arabic:
			"اتْلُ مَا أُوحِيَ إِلَيْكَ مِنَ الْكِتَابِ وَأَقِمِ الصَّلَاةَ إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنْكَرِ ۝",
		translation:
			"Bacalah Kitab (Al-Qur'an) yang telah diwahyukan kepadamu (Muhammad) dan laksanakanlah shalat. Sesungguhnya shalat itu mencegah dari (perbuatan) keji dan mungkar.",
		segments: [
			"Bacalah Kitab (Al-Qur'an) yang telah diwahyukan kepadamu (Muhammad) dan laksanakanlah shalat.",
			"Sesungguhnya shalat itu mencegah dari (perbuatan) keji dan mungkar.",
		],
		reference: "Al-Ankabut [29]: 45",
		category: "hikmah-shalat",
	},
];

export const KHAZANAH_CATEGORIES: KhazanahCategory[] = [
	{
		id: "hikmah-shalat",
		slug: "hikmah-shalat",
		title: "Hikmah Shalat",
		subtitle: "Pahami hikmah ibadahmu",
		verses: KHAZANAH_VERSES.filter((v) => v.category === "hikmah-shalat"),
	},
	{
		id: "pekerjaan",
		slug: "pekerjaan",
		title: "Pekerjaan",
		subtitle: "Pahami hikmah ibadahmu",
		verses: KHAZANAH_VERSES.filter((v) => v.category === "pekerjaan"),
	},
	{
		id: "pengembangan-diri",
		slug: "pengembangan-diri",
		title: "Pengembangan diri",
		subtitle: "Tingkatkan kualitas pribadimu",
		verses: KHAZANAH_VERSES.filter((v) => v.category === "pengembangan-diri"),
	},
];

export function getKhazanahCategories() {
	return KHAZANAH_CATEGORIES;
}

export function getKhazanahCategory(slug: string) {
	return KHAZANAH_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function getKhazanahVerse(id: string) {
	return KHAZANAH_VERSES.find((verse) => verse.id === id) ?? null;
}

export function getKhazanahVerseSegments(verse: KhazanahVerse) {
	return verse.segments?.length ? verse.segments : [verse.translation];
}

export function getKhazanahSegmentId(verseId: string, segmentIndex: number) {
	return `${verseId}-${segmentIndex}`;
}

export function resolveKhazanahAttachment(
	verseId: string,
	segmentId?: string | null,
): KhazanahAttachmentSnapshot | null {
	const verse = getKhazanahVerse(verseId);
	if (!verse) return null;
	if (!segmentId) {
		return {
			verseId: verse.id,
			segmentId: null,
			surahRef: verse.reference,
			quoteText: verse.translation,
		};
	}

	const segments = getKhazanahVerseSegments(verse);
	const prefix = `${verse.id}-`;
	if (!segmentId.startsWith(prefix)) return null;
	const segmentIndex = Number(segmentId.slice(prefix.length));
	if (
		!Number.isInteger(segmentIndex) ||
		segmentIndex < 0 ||
		segmentIndex >= segments.length
	) {
		return null;
	}

	return {
		verseId: verse.id,
		segmentId,
		segmentIndex,
		surahRef: verse.reference,
		quoteText: segments[segmentIndex],
	};
}

export function resolveKhazanahAttachmentBySegmentIndex(
	verseId: string,
	segmentIndex: number,
) {
	return resolveKhazanahAttachment(
		verseId,
		getKhazanahSegmentId(verseId, segmentIndex),
	);
}
