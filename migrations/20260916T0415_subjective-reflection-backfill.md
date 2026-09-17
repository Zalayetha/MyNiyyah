# T2 Subjective Reflection Backfill

Run `20260916T0415_subjective-reflection-backfill.sql` after the T1 integrity migration. It is safe to resume: existing reflections retain their non-null values, and already-cleared prayer-log subjective fields are ignored.

Before and after the run, compare counts grouped by user/date/prayer for non-null `feelingScore` and `khusyuScore` in `journalPrayerReflection`. Also compare `prayerLog.status`, `prayerLog.completedAt`, and `prayerLog.completedAt` counts; these objective completion values must be unchanged.

The application now reads and writes subjective values through `journalPrayerReflection`; `prayerLog` remains the canonical source for completion status and timestamps.
