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

export type TaxonRank = 'species' | 'subspecies' | 'genus' | 'family'

export interface Species {
  id: number
  groupId: number
  scientific: string
  swedish: string | null
  genus: string
  family: string | null
  rank: TaxonRank
}

// A selection is a specific taxon row from the flat list.
// The rank on the selected Species determines how to aggregate:
//   species/subspecies → single taxon query
//   genus              → sum all species with same genus + groupId
//   family             → sum all species with same family + groupId
//   id === GROUP_ALL_ID → sum all taxa in the group
export type TaxonSelection = Species

export const GROUP_ALL_ID = -1

export function makeGroupAllSentinel(group: TaxonGroup): Species {
  return {
    id: GROUP_ALL_ID,
    groupId: group.id,
    scientific: group.scientific,
    swedish: `Alla ${group.swedish.toLowerCase()}`,
    genus: '',
    family: null,
    rank: 'species',
  }
}

export interface Locale {
  id: string
  type: 'province' | 'municipality' | 'sweden'
  name: string
}

export const SWEDEN_LOCALE: Locale = { id: '__sweden__', type: 'sweden', name: 'Sverige' }

export interface WeekCount {
  week: number
  total: number
}

export interface TopObserver {
  name: string
  speciesCount: number
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

// Flat list of all taxa for a group — families, genera, species, subspecies.
export function queryAllTaxa(groupId: number): Species[] {
  return getDb().getAllSync<Species>(
    `SELECT id, group_id AS groupId, scientific, swedish, genus, family, rank
     FROM species WHERE group_id = ?
     ORDER BY COALESCE(swedish, scientific) COLLATE NOCASE`,
    groupId
  )
}

export function queryLocales(type: 'province' | 'municipality'): Locale[] {
  return getDb().getAllSync<Locale>(
    'SELECT id, type, name FROM locales WHERE type = ? ORDER BY name',
    type
  )
}

// Genus-level rollup: sums all species in the same genus.
export function queryPhenologyByGenus(genus: string, groupId: number, localeId: string | null): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT o.week, SUM(o.count) AS total
       FROM observations o JOIN species s ON s.id = o.species_id
       WHERE s.genus = ? AND s.group_id = ?
       GROUP BY o.week ORDER BY o.week`,
      genus, groupId
    )
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT o.week, SUM(o.count) AS total
     FROM observations o JOIN species s ON s.id = o.species_id
     WHERE s.genus = ? AND s.group_id = ? AND o.locale_id = ?
     GROUP BY o.week ORDER BY o.week`,
    genus, groupId, localeId
  )
}

export function queryPhenologyYearByGenus(genus: string, groupId: number, localeId: string | null, year: number): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT o.week, SUM(o.count) AS total
       FROM observations o JOIN species s ON s.id = o.species_id
       WHERE s.genus = ? AND s.group_id = ? AND o.year = ?
       GROUP BY o.week ORDER BY o.week`,
      genus, groupId, year
    )
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT o.week, SUM(o.count) AS total
     FROM observations o JOIN species s ON s.id = o.species_id
     WHERE s.genus = ? AND s.group_id = ? AND o.locale_id = ? AND o.year = ?
     GROUP BY o.week ORDER BY o.week`,
    genus, groupId, localeId, year
  )
}

export function queryAvailableYearsByGenus(genus: string, groupId: number, localeId: string | null): number[] {
  const rows = localeId === null
    ? getDb().getAllSync<{ year: number }>(
        `SELECT DISTINCT o.year FROM observations o JOIN species s ON s.id = o.species_id
         WHERE s.genus = ? AND s.group_id = ? ORDER BY o.year DESC`,
        genus, groupId
      )
    : getDb().getAllSync<{ year: number }>(
        `SELECT DISTINCT o.year FROM observations o JOIN species s ON s.id = o.species_id
         WHERE s.genus = ? AND s.group_id = ? AND o.locale_id = ? ORDER BY o.year DESC`,
        genus, groupId, localeId
      )
  return rows.map(r => r.year)
}

// Family-level rollup: sums all species in the same family.
export function queryPhenologyByFamily(family: string, groupId: number, localeId: string | null): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT o.week, SUM(o.count) AS total
       FROM observations o JOIN species s ON s.id = o.species_id
       WHERE s.family = ? AND s.group_id = ?
       GROUP BY o.week ORDER BY o.week`,
      family, groupId
    )
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT o.week, SUM(o.count) AS total
     FROM observations o JOIN species s ON s.id = o.species_id
     WHERE s.family = ? AND s.group_id = ? AND o.locale_id = ?
     GROUP BY o.week ORDER BY o.week`,
    family, groupId, localeId
  )
}

export function queryPhenologyYearByFamily(family: string, groupId: number, localeId: string | null, year: number): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT o.week, SUM(o.count) AS total
       FROM observations o JOIN species s ON s.id = o.species_id
       WHERE s.family = ? AND s.group_id = ? AND o.year = ?
       GROUP BY o.week ORDER BY o.week`,
      family, groupId, year
    )
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT o.week, SUM(o.count) AS total
     FROM observations o JOIN species s ON s.id = o.species_id
     WHERE s.family = ? AND s.group_id = ? AND o.locale_id = ? AND o.year = ?
     GROUP BY o.week ORDER BY o.week`,
    family, groupId, localeId, year
  )
}

export function queryAvailableYearsByFamily(family: string, groupId: number, localeId: string | null): number[] {
  const rows = localeId === null
    ? getDb().getAllSync<{ year: number }>(
        `SELECT DISTINCT o.year FROM observations o JOIN species s ON s.id = o.species_id
         WHERE s.family = ? AND s.group_id = ? ORDER BY o.year DESC`,
        family, groupId
      )
    : getDb().getAllSync<{ year: number }>(
        `SELECT DISTINCT o.year FROM observations o JOIN species s ON s.id = o.species_id
         WHERE s.family = ? AND s.group_id = ? AND o.locale_id = ? ORDER BY o.year DESC`,
        family, groupId, localeId
      )
  return rows.map(r => r.year)
}

// All-years phenology curve: one row per week, summed across all years.
export function queryPhenology(speciesId: number, localeId: string | null): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT week, SUM(count) AS total FROM observations WHERE species_id = ? GROUP BY week ORDER BY week`,
      speciesId
    )
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT week, SUM(count) AS total FROM observations WHERE species_id = ? AND locale_id = ? GROUP BY week ORDER BY week`,
    speciesId, localeId
  )
}

// Single-year curve.
export function queryPhenologyYear(
  speciesId: number,
  localeId: string | null,
  year: number
): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT week, count AS total FROM observations WHERE species_id = ? AND year = ? ORDER BY week`,
      speciesId, year
    )
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT week, count AS total FROM observations WHERE species_id = ? AND locale_id = ? AND year = ? ORDER BY week`,
    speciesId, localeId, year
  )
}

// Years that have data for a given species + locale combination.
export function queryAvailableYears(speciesId: number, localeId: string | null): number[] {
  const rows = localeId === null
    ? getDb().getAllSync<{ year: number }>(
        `SELECT DISTINCT year FROM observations WHERE species_id = ? ORDER BY year DESC`,
        speciesId
      )
    : getDb().getAllSync<{ year: number }>(
        `SELECT DISTINCT year FROM observations WHERE species_id = ? AND locale_id = ? ORDER BY year DESC`,
        speciesId, localeId
      )
  return rows.map(r => r.year)
}

// Group-level rollup: sums all taxa in the group.
export function queryPhenologyByGroup(groupId: number, localeId: string | null): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT o.week, SUM(o.count) AS total
       FROM observations o JOIN species s ON s.id = o.species_id
       WHERE s.group_id = ? GROUP BY o.week ORDER BY o.week`,
      groupId
    )
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT o.week, SUM(o.count) AS total
     FROM observations o JOIN species s ON s.id = o.species_id
     WHERE s.group_id = ? AND o.locale_id = ? GROUP BY o.week ORDER BY o.week`,
    groupId, localeId
  )
}

export function queryPhenologyYearByGroup(groupId: number, localeId: string | null, year: number): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT o.week, SUM(o.count) AS total
       FROM observations o JOIN species s ON s.id = o.species_id
       WHERE s.group_id = ? AND o.year = ? GROUP BY o.week ORDER BY o.week`,
      groupId, year
    )
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT o.week, SUM(o.count) AS total
     FROM observations o JOIN species s ON s.id = o.species_id
     WHERE s.group_id = ? AND o.locale_id = ? AND o.year = ? GROUP BY o.week ORDER BY o.week`,
    groupId, localeId, year
  )
}

export function queryAvailableYearsByGroup(groupId: number, localeId: string | null): number[] {
  const rows = localeId === null
    ? getDb().getAllSync<{ year: number }>(
        `SELECT DISTINCT o.year FROM observations o JOIN species s ON s.id = o.species_id
         WHERE s.group_id = ? ORDER BY o.year DESC`,
        groupId
      )
    : getDb().getAllSync<{ year: number }>(
        `SELECT DISTINCT o.year FROM observations o JOIN species s ON s.id = o.species_id
         WHERE s.group_id = ? AND o.locale_id = ? ORDER BY o.year DESC`,
        groupId, localeId
      )
  return rows.map(r => r.year)
}

export function queryTopObservers(localeId: string | null, limit = 10): TopObserver[] {
  const lid = localeId ?? '__sweden__'
  return getDb().getAllSync<TopObserver>(
    `SELECT name, species_count AS speciesCount FROM top_observers
     WHERE locale_id = ? ORDER BY rank LIMIT ?`,
    lid, limit
  )
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
