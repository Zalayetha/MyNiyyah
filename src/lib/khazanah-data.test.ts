import { describe, expect, it } from "vitest";
import {
	getKhazanahCategory,
	getKhazanahSegmentId,
	getKhazanahVerse,
	getKhazanahVerseSegments,
	KHAZANAH_CATEGORIES,
	KHAZANAH_SOURCE_METADATA,
	KHAZANAH_VERSES,
	resolveKhazanahAttachment,
} from "./khazanah-data";

describe("khazanah content repository", () => {
	it("ships source metadata for the canonical content set", () => {
		expect(KHAZANAH_SOURCE_METADATA.contentVersion).toBeTruthy();
		expect(KHAZANAH_SOURCE_METADATA.sourceName).toContain("Kementerian Agama");
		expect(KHAZANAH_SOURCE_METADATA.translationEdition).toBeTruthy();
		expect(KHAZANAH_SOURCE_METADATA.license).toBeTruthy();
		expect(KHAZANAH_SOURCE_METADATA.verificationNote).toBeTruthy();
		expect(KHAZANAH_VERSES.length).toBeGreaterThan(0);
	});

	it("does not silently fallback for invalid category or verse IDs", () => {
		expect(getKhazanahCategory("missing-category")).toBeNull();
		expect(getKhazanahVerse("missing-verse")).toBeNull();
	});

	it("keeps categories reconciled with shipped verses", () => {
		for (const category of KHAZANAH_CATEGORIES) {
			expect(category.verses).toEqual(
				KHAZANAH_VERSES.filter((verse) => verse.category === category.id),
			);
		}
	});

	it("derives journal attachment snapshots from trusted verse data", () => {
		const verse = KHAZANAH_VERSES[0];
		const segmentId = getKhazanahSegmentId(verse.id, 0);
		const snapshot = resolveKhazanahAttachment(verse.id, segmentId);

		expect(snapshot).toMatchObject({
			verseId: verse.id,
			segmentId,
			surahRef: verse.reference,
			quoteText: getKhazanahVerseSegments(verse)[0],
		});
		expect(resolveKhazanahAttachment(verse.id, `${verse.id}-999`)).toBeNull();
		expect(resolveKhazanahAttachment("missing", null)).toBeNull();
	});
});
