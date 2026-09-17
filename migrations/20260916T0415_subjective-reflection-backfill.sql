-- T2: move subjective prayer data to JournalPrayerReflection.
-- Run after T1. The statements are idempotent and preserve prayer completion fields.
BEGIN;

INSERT INTO "journalPrayerReflection" (
  id, "journalEntryId", "prayerLogId", "prayerName", "adzanAt", "completedAt",
  punctuality, feeling, "feelingScore", "khusyuScore", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  j.id,
  p.id,
  p."prayerName",
  p."scheduledAt",
  p."completedAt",
  NULL,
  p.feeling,
  p."feelingScore",
  p."khusyuScore",
  now(),
  now()
FROM "prayerLog" p
JOIN "journalEntry" j
  ON j."userId" = p."userId" AND j."journalDate" = p."prayerDate"
WHERE p.feeling IS NOT NULL OR p."feelingScore" IS NOT NULL OR p."khusyuScore" IS NOT NULL
ON CONFLICT ("journalEntryId", "prayerName") DO UPDATE SET
  "prayerLogId" = COALESCE("journalPrayerReflection"."prayerLogId", EXCLUDED."prayerLogId"),
  feeling = COALESCE("journalPrayerReflection".feeling, EXCLUDED.feeling),
  "feelingScore" = COALESCE("journalPrayerReflection"."feelingScore", EXCLUDED."feelingScore"),
  "khusyuScore" = COALESCE("journalPrayerReflection"."khusyuScore", EXCLUDED."khusyuScore"),
  "updatedAt" = now();

-- Remove only duplicated subjective columns. Objective status/timestamps remain untouched.
UPDATE "prayerLog" p
SET feeling = NULL, "feelingScore" = NULL, "khusyuScore" = NULL, "updatedAt" = now()
WHERE (p.feeling IS NOT NULL OR p."feelingScore" IS NOT NULL OR p."khusyuScore" IS NOT NULL)
  AND EXISTS (
    SELECT 1
    FROM "journalEntry" j
    WHERE j."userId" = p."userId" AND j."journalDate" = p."prayerDate"
  );

COMMIT;
