#!/usr/bin/env -S node
import type {
  Contract as End,
  Contract as Start,
} from '../../snapshots/c2f82a9bcfa86e67bcbe3885a844d19a430923799b5f335f912b422fbd537fbb/contract';
import endContract from '../../snapshots/c2f82a9bcfa86e67bcbe3885a844d19a430923799b5f335f912b422fbd537fbb/contract.json' with { type: 'json' };
import startContract from '../../snapshots/5251d4f502fc462517c068e7b6f9032eca2837f1ec81765060fbde0dcb358502/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
} from '@prisma/orm-postgres/migration';

const foreignKeys = [
  ['session', 'userId', 'user', 'session_userId_fkey', 'cascade'],
  ['account', 'userId', 'user', 'account_userId_fkey', 'cascade'],
  ['userProfile', 'userId', 'user', 'userProfile_userId_fkey', 'cascade'],
  ['userPreference', 'userId', 'user', 'userPreference_userId_fkey', 'cascade'],
  ['userLocationPreference', 'userId', 'user', 'userLocationPreference_userId_fkey', 'cascade'],
  ['userLocationPreference', 'cityId', 'cityCatalog', 'userLocationPreference_cityId_fkey', 'setNull'],
  ['userLocationPreference', 'calculationMethodId', 'prayerCalculationMethod', 'userLocationPreference_calculationMethodId_fkey', 'restrict'],
  ['prayerSchedule', 'calculationMethodId', 'prayerCalculationMethod', 'prayerSchedule_calculationMethodId_fkey', 'restrict'],
  ['prayerLog', 'userId', 'user', 'prayerLog_userId_fkey', 'cascade'],
  ['journalEntry', 'userId', 'user', 'journalEntry_userId_fkey', 'cascade'],
  ['journalEntry', 'themeId', 'journalTheme', 'journalEntry_themeId_fkey', 'setNull'],
  ['journalPrayerReflection', 'journalEntryId', 'journalEntry', 'journalPrayerReflection_journalEntryId_fkey', 'cascade'],
  ['journalPrayerReflection', 'prayerLogId', 'prayerLog', 'journalPrayerReflection_prayerLogId_fkey', 'setNull'],
  ['khazanahVerse', 'categoryId', 'khazanahCategory', 'khazanahVerse_categoryId_fkey', 'restrict'],
  ['khazanahVerseSegment', 'verseId', 'khazanahVerse', 'khazanahVerseSegment_verseId_fkey', 'cascade'],
  ['journalAttachedVerse', 'journalEntryId', 'journalEntry', 'journalAttachedVerse_journalEntryId_fkey', 'cascade'],
  ['journalAttachedVerse', 'verseId', 'khazanahVerse', 'journalAttachedVerse_verseId_fkey', 'cascade'],
  ['journalAttachedVerse', 'segmentId', 'khazanahVerseSegment', 'journalAttachedVerse_segmentId_fkey', 'setNull'],
] as const;

const checks = [
  ['cityCatalog', 'valid_city_coordinates_f8ed1647', "(latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)"],
  ['cityCatalog', 'valid_city_timezone_d08d6136', "timezone ~ '^[A-Za-z0-9_+.-]+(/[A-Za-z0-9_+.-]+)+$'"],
  ['cityCatalog', 'valid_city_timezone_offset_890d833d', 'timezoneOffset BETWEEN -14 AND 14'],
  ['journalEntry', 'valid_journal_date_12c9aee1', "journalDate ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'"],
  ['journalEntry', 'valid_journal_percentages_0c42645e', '(khusyuPercentage IS NULL OR khusyuPercentage BETWEEN 0 AND 100) AND (punctualityPercentage IS NULL OR punctualityPercentage BETWEEN 0 AND 100)'],
  ['journalPrayerReflection', 'valid_reflection_prayer_name_e423c318', "prayerName IN ('subuh', 'zhuhur', 'ashar', 'maghrib', 'isya')"],
  ['journalPrayerReflection', 'valid_reflection_punctuality_2d073994', "punctuality IS NULL OR punctuality IN ('Belum Dicatat', 'Awal Waktu', 'Tepat Waktu', 'Terlambat')"],
  ['journalPrayerReflection', 'valid_reflection_scores_3b182229', '(feelingScore IS NULL OR feelingScore BETWEEN 1 AND 4) AND (khusyuScore IS NULL OR khusyuScore BETWEEN 1 AND 4)'],
  ['khazanahVerseSegment', 'valid_verse_segment_position_4dfe36f4', 'position > 0'],
  ['prayerCalculationMethod', 'valid_calculation_angles_e7063b9b', '(fajrAngle IS NULL OR fajrAngle BETWEEN 0 AND 90) AND (ishaAngle IS NULL OR ishaAngle BETWEEN 0 AND 90)'],
  ['prayerCalculationMethod', 'valid_isha_interval_677bc4d5', 'ishaIntervalMinutes IS NULL OR ishaIntervalMinutes BETWEEN 0 AND 1440'],
  ['prayerLog', 'valid_prayer_log_date_c09903cf', "prayerDate ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'"],
  ['prayerLog', 'valid_prayer_log_name_e423c318', "prayerName IN ('subuh', 'zhuhur', 'ashar', 'maghrib', 'isya')"],
  ['prayerLog', 'valid_prayer_log_scores_3b182229', '(feelingScore IS NULL OR feelingScore BETWEEN 1 AND 4) AND (khusyuScore IS NULL OR khusyuScore BETWEEN 1 AND 4)'],
  ['prayerLog', 'valid_prayer_log_status_23d18405', "status IN ('pending', 'completed')"],
  ['prayerSchedule', 'valid_schedule_date_c09903cf', "prayerDate ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'"],
  ['prayerSchedule', 'valid_schedule_prayer_name_e423c318', "prayerName IN ('subuh', 'zhuhur', 'ashar', 'maghrib', 'isya')"],
  ['prayerSchedule', 'valid_schedule_timezone_d08d6136', "timezone ~ '^[A-Za-z0-9_+.-]+(/[A-Za-z0-9_+.-]+)+$'"],
  ['userLocationPreference', 'valid_location_coordinates_f8ed1647', '(latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)'],
  ['userLocationPreference', 'valid_location_source_8fa376db', "source IN ('manual', 'auto')"],
  ['userLocationPreference', 'valid_location_timezone_d08d6136', "timezone ~ '^[A-Za-z0-9_+.-]+(/[A-Za-z0-9_+.-]+)+$'"],
  ['userLocationPreference', 'valid_location_timezone_offset_890d833d', 'timezoneOffset BETWEEN -14 AND 14'],
] as const;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      ...foreignKeys.map(([table, column, refTable, name, onDelete]) =>
        this.addForeignKey({
          schema: 'public',
          table,
          foreignKey: {
            name,
            columns: [column],
            references: { schema: 'public', table: refTable, columns: ['id'] },
            onDelete,
          },
        }),
      ),
      ...checks.map(([table, name, expression]) =>
        this.addCheckConstraint({
          schema: 'public',
          table,
          constraint: name,
          expression,
        }),
      ),
      this.createIndex({
        schema: 'public',
        table: 'journalAttachedVerse',
        index: 'journalAttachedVerse_unique_normalized_segment',
        expression: '"journalEntryId", "verseId", COALESCE("segmentId", \'\')',
        extras: { unique: true },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
