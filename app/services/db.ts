import * as SQLite from 'expo-sqlite'
import { DB_NAME } from '../constants'

// Re-export for use in sync.ts
export interface Manifest {
  generatedAt: string
  pipelineVersion: string
  dbFilename: string
}

export interface TaxonGroup {
  id: number
  scientific: string
  swedish: string
}

export interface Species {
  id: number
  groupId: number
  scientific: string
  swedish: string | null
}

export interface Locale {
  id: string
  type: 'province' | 'municipality'
  name: string
}

export interface WeekCount {
  week: number
  total: number
}

// ---------------------------------------------------------------------------
// Singleton DB handle — opened once, reused across the app.
// ---------------------------------------------------------------------------
let _db: SQLite.SQLiteDatabase | null = null

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) _db = SQLite.openDatabaseSync(DB_NAME)
  return _db
}

// Call this after a new DB file is downloaded to pick up the new data.
export function resetDb(): void {
  _db?.closeSync()
  _db = null
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function queryTaxonGroups(): TaxonGroup[] {
  return getDb().getAllSync<TaxonGroup>(
    'SELECT id, scientific, swedish FROM taxon_groups ORDER BY swedish'
  )
}

export function querySpecies(groupId: number): Species[] {
  return getDb().getAllSync<Species>(
    `SELECT id, group_id AS groupId, scientific, swedish
     FROM species WHERE group_id = ? ORDER BY swedish, scientific`,
    groupId
  )
}

export function queryLocales(type: 'province' | 'municipality'): Locale[] {
  return getDb().getAllSync<Locale>(
    'SELECT id, type, name FROM locales WHERE type = ? ORDER BY name',
    type
  )
}

// All-years phenology curve: one row per week, summed across all years.
export function queryPhenology(speciesId: number, localeId: string): WeekCount[] {
  return getDb().getAllSync<WeekCount>(
    `SELECT week, SUM(count) AS total
     FROM observations
     WHERE species_id = ? AND locale_id = ?
     GROUP BY week ORDER BY week`,
    speciesId, localeId
  )
}

// Single-year curve.
export function queryPhenologyYear(
  speciesId: number,
  localeId: string,
  year: number
): WeekCount[] {
  return getDb().getAllSync<WeekCount>(
    `SELECT week, count AS total
     FROM observations
     WHERE species_id = ? AND locale_id = ? AND year = ?
     ORDER BY week`,
    speciesId, localeId, year
  )
}

// Years that have data for a given species + locale combination.
export function queryAvailableYears(speciesId: number, localeId: string): number[] {
  const rows = getDb().getAllSync<{ year: number }>(
    `SELECT DISTINCT year FROM observations
     WHERE species_id = ? AND locale_id = ?
     ORDER BY year DESC`,
    speciesId, localeId
  )
  return rows.map(r => r.year)
}

// Whether the DB has any data at all (used to detect first launch).
export function isDbPopulated(): boolean {
  try {
    const row = getDb().getFirstSync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM taxon_groups'
    )
    return (row?.n ?? 0) > 0
  } catch {
    return false
  }
}
