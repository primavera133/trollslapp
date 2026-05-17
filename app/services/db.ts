import * as SQLite from "expo-sqlite";
import { DB_NAME } from "../constants";

// Re-export for use in sync.ts
export interface Manifest {
  generatedAt: string;
  pipelineVersion: string;
  dbFilename: string;
}

export interface TaxonGroup {
  id: number;
  scientific: string;
  swedish: string;
}

export type TaxonRank = "species" | "subspecies" | "genus" | "family";

export interface Species {
  id: number;
  groupId: number;
  scientific: string;
  swedish: string | null;
  genus: string;
  family: string | null;
  rank: TaxonRank;
  sortOrder: number;
}

// A selection is a specific taxon row from the flat list.
// The rank on the selected Species determines how to aggregate:
//   species/subspecies → single taxon query
//   genus              → sum all species with same genus + groupId
//   family             → sum all species with same family + groupId
//   id === GROUP_ALL_ID → sum all taxa in the group
export type TaxonSelection = Species;

export const GROUP_ALL_ID = -1;

export function makeGroupAllSentinel(group: TaxonGroup): Species {
  return {
    id: GROUP_ALL_ID,
    groupId: group.id,
    scientific: group.scientific,
    swedish: `Alla ${group.swedish.toLowerCase()}`,
    genus: "",
    family: null,
    rank: "species",
    sortOrder: -1,
  };
}

export interface Locale {
  id: string;
  type: "province" | "municipality" | "sweden";
  name: string;
}

export const SWEDEN_LOCALE: Locale = {
  id: "__sweden__",
  type: "sweden",
  name: "Sverige",
};

export interface WeekCount {
  week: number;
  total: number;
}

export interface TopObserver {
  name: string;
  speciesCount: number;
}

export interface ObserverSpecies {
  speciesId: number;
  scientificName: string;
  swedishName: string | null;
  firstDate: string;
}

// ---------------------------------------------------------------------------
// Singleton DB handle — opened once, reused across the app.
// ---------------------------------------------------------------------------
let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) _db = SQLite.openDatabaseSync(DB_NAME);
  return _db;
}

// Call this after a new DB file is downloaded to pick up the new data.
export function resetDb(): void {
  _db?.closeSync();
  _db = null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export interface TaxonomyNames {
  families: Record<string, string>;
  genera: Record<string, string>;
}

export function queryTaxonomyNames(): TaxonomyNames {
  // Taxonomy names are embedded in the JSON bundle only; native uses the same
  // hardcoded mapping via the web layer. Return empty for native-only usage.
  return { families: {}, genera: {} };
}

export function queryTaxonGroups(): TaxonGroup[] {
  return getDb().getAllSync<TaxonGroup>(
    "SELECT id, scientific, swedish FROM taxon_groups ORDER BY swedish",
  );
}

// Flat list of all taxa for a group — families, genera, species, subspecies.
export function queryAllTaxa(groupId: number): Species[] {
  try {
    return getDb().getAllSync<Species>(
      `SELECT id, group_id AS groupId, scientific, swedish, genus, family, rank, sort_order AS sortOrder
       FROM species WHERE group_id = ?
       ORDER BY COALESCE(swedish, scientific) COLLATE NOCASE`,
      groupId,
    );
  } catch {
    return getDb().getAllSync<Species>(
      `SELECT id, group_id AS groupId, scientific, swedish, genus, family, rank, 0 AS sortOrder
       FROM species WHERE group_id = ?
       ORDER BY COALESCE(swedish, scientific) COLLATE NOCASE`,
      groupId,
    );
  }
}

export function queryLocales(type: "province" | "municipality"): Locale[] {
  return getDb().getAllSync<Locale>(
    "SELECT id, type, name FROM locales WHERE type = ? ORDER BY name",
    type,
  );
}

// Genus-level rollup: sums all species in the same genus.
export function queryPhenologyByGenus(
  genus: string,
  groupId: number,
  localeId: string | null,
): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT o.week, SUM(o.count) AS total
       FROM observations o JOIN species s ON s.id = o.species_id
       WHERE s.genus = ? AND s.group_id = ?
       GROUP BY o.week ORDER BY o.week`,
      genus,
      groupId,
    );
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT o.week, SUM(o.count) AS total
     FROM observations o JOIN species s ON s.id = o.species_id
     WHERE s.genus = ? AND s.group_id = ? AND o.locale_id = ?
     GROUP BY o.week ORDER BY o.week`,
    genus,
    groupId,
    localeId,
  );
}

export function queryPhenologyYearByGenus(
  genus: string,
  groupId: number,
  localeId: string | null,
  year: number,
): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT o.week, SUM(o.count) AS total
       FROM observations o JOIN species s ON s.id = o.species_id
       WHERE s.genus = ? AND s.group_id = ? AND o.year = ?
       GROUP BY o.week ORDER BY o.week`,
      genus,
      groupId,
      year,
    );
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT o.week, SUM(o.count) AS total
     FROM observations o JOIN species s ON s.id = o.species_id
     WHERE s.genus = ? AND s.group_id = ? AND o.locale_id = ? AND o.year = ?
     GROUP BY o.week ORDER BY o.week`,
    genus,
    groupId,
    localeId,
    year,
  );
}

export function queryAvailableYearsByGenus(
  genus: string,
  groupId: number,
  localeId: string | null,
): number[] {
  const rows =
    localeId === null
      ? getDb().getAllSync<{ year: number }>(
          `SELECT DISTINCT o.year FROM observations o JOIN species s ON s.id = o.species_id
         WHERE s.genus = ? AND s.group_id = ? ORDER BY o.year DESC`,
          genus,
          groupId,
        )
      : getDb().getAllSync<{ year: number }>(
          `SELECT DISTINCT o.year FROM observations o JOIN species s ON s.id = o.species_id
         WHERE s.genus = ? AND s.group_id = ? AND o.locale_id = ? ORDER BY o.year DESC`,
          genus,
          groupId,
          localeId,
        );
  return rows.map((r) => r.year);
}

// Family-level rollup: sums all species in the same family.
export function queryPhenologyByFamily(
  family: string,
  groupId: number,
  localeId: string | null,
): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT o.week, SUM(o.count) AS total
       FROM observations o JOIN species s ON s.id = o.species_id
       WHERE s.family = ? AND s.group_id = ?
       GROUP BY o.week ORDER BY o.week`,
      family,
      groupId,
    );
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT o.week, SUM(o.count) AS total
     FROM observations o JOIN species s ON s.id = o.species_id
     WHERE s.family = ? AND s.group_id = ? AND o.locale_id = ?
     GROUP BY o.week ORDER BY o.week`,
    family,
    groupId,
    localeId,
  );
}

export function queryPhenologyYearByFamily(
  family: string,
  groupId: number,
  localeId: string | null,
  year: number,
): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT o.week, SUM(o.count) AS total
       FROM observations o JOIN species s ON s.id = o.species_id
       WHERE s.family = ? AND s.group_id = ? AND o.year = ?
       GROUP BY o.week ORDER BY o.week`,
      family,
      groupId,
      year,
    );
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT o.week, SUM(o.count) AS total
     FROM observations o JOIN species s ON s.id = o.species_id
     WHERE s.family = ? AND s.group_id = ? AND o.locale_id = ? AND o.year = ?
     GROUP BY o.week ORDER BY o.week`,
    family,
    groupId,
    localeId,
    year,
  );
}

export function queryAvailableYearsByFamily(
  family: string,
  groupId: number,
  localeId: string | null,
): number[] {
  const rows =
    localeId === null
      ? getDb().getAllSync<{ year: number }>(
          `SELECT DISTINCT o.year FROM observations o JOIN species s ON s.id = o.species_id
         WHERE s.family = ? AND s.group_id = ? ORDER BY o.year DESC`,
          family,
          groupId,
        )
      : getDb().getAllSync<{ year: number }>(
          `SELECT DISTINCT o.year FROM observations o JOIN species s ON s.id = o.species_id
         WHERE s.family = ? AND s.group_id = ? AND o.locale_id = ? ORDER BY o.year DESC`,
          family,
          groupId,
          localeId,
        );
  return rows.map((r) => r.year);
}

// All-years phenology curve: one row per week, summed across all years.
export function queryPhenology(
  speciesId: number,
  localeId: string | null,
): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT week, SUM(count) AS total FROM observations WHERE species_id = ? GROUP BY week ORDER BY week`,
      speciesId,
    );
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT week, SUM(count) AS total FROM observations WHERE species_id = ? AND locale_id = ? GROUP BY week ORDER BY week`,
    speciesId,
    localeId,
  );
}

// Single-year curve.
export function queryPhenologyYear(
  speciesId: number,
  localeId: string | null,
  year: number,
): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT week, count AS total FROM observations WHERE species_id = ? AND year = ? ORDER BY week`,
      speciesId,
      year,
    );
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT week, count AS total FROM observations WHERE species_id = ? AND locale_id = ? AND year = ? ORDER BY week`,
    speciesId,
    localeId,
    year,
  );
}

// Years that have data for a given species + locale combination.
export function queryAvailableYears(
  speciesId: number,
  localeId: string | null,
): number[] {
  const rows =
    localeId === null
      ? getDb().getAllSync<{ year: number }>(
          `SELECT DISTINCT year FROM observations WHERE species_id = ? ORDER BY year DESC`,
          speciesId,
        )
      : getDb().getAllSync<{ year: number }>(
          `SELECT DISTINCT year FROM observations WHERE species_id = ? AND locale_id = ? ORDER BY year DESC`,
          speciesId,
          localeId,
        );
  return rows.map((r) => r.year);
}

// Group-level rollup: sums all taxa in the group.
export function queryPhenologyByGroup(
  groupId: number,
  localeId: string | null,
): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT o.week, SUM(o.count) AS total
       FROM observations o JOIN species s ON s.id = o.species_id
       WHERE s.group_id = ? GROUP BY o.week ORDER BY o.week`,
      groupId,
    );
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT o.week, SUM(o.count) AS total
     FROM observations o JOIN species s ON s.id = o.species_id
     WHERE s.group_id = ? AND o.locale_id = ? GROUP BY o.week ORDER BY o.week`,
    groupId,
    localeId,
  );
}

export function queryPhenologyYearByGroup(
  groupId: number,
  localeId: string | null,
  year: number,
): WeekCount[] {
  if (localeId === null) {
    return getDb().getAllSync<WeekCount>(
      `SELECT o.week, SUM(o.count) AS total
       FROM observations o JOIN species s ON s.id = o.species_id
       WHERE s.group_id = ? AND o.year = ? GROUP BY o.week ORDER BY o.week`,
      groupId,
      year,
    );
  }
  return getDb().getAllSync<WeekCount>(
    `SELECT o.week, SUM(o.count) AS total
     FROM observations o JOIN species s ON s.id = o.species_id
     WHERE s.group_id = ? AND o.locale_id = ? AND o.year = ? GROUP BY o.week ORDER BY o.week`,
    groupId,
    localeId,
    year,
  );
}

export function queryAvailableYearsByGroup(
  groupId: number,
  localeId: string | null,
): number[] {
  const rows =
    localeId === null
      ? getDb().getAllSync<{ year: number }>(
          `SELECT DISTINCT o.year FROM observations o JOIN species s ON s.id = o.species_id
         WHERE s.group_id = ? ORDER BY o.year DESC`,
          groupId,
        )
      : getDb().getAllSync<{ year: number }>(
          `SELECT DISTINCT o.year FROM observations o JOIN species s ON s.id = o.species_id
         WHERE s.group_id = ? AND o.locale_id = ? ORDER BY o.year DESC`,
          groupId,
          localeId,
        );
  return rows.map((r) => r.year);
}

export function queryObserverSpecies(
  localeId: string | null,
  observerName: string,
): ObserverSpecies[] {
  const lid = localeId ?? "__sweden__";
  try {
    return getDb().getAllSync<ObserverSpecies>(
      `SELECT os.species_id AS speciesId, s.scientific AS scientificName, s.swedish AS swedishName, os.first_date AS firstDate
       FROM observer_species os
       JOIN species s ON s.id = os.species_id
       WHERE os.locale_id = ? AND os.observer_name = ?
       ORDER BY os.first_date`,
      lid,
      observerName,
    );
  } catch {
    return [];
  }
}

export function queryTopObservers(
  localeId: string | null,
  limit = 10,
): TopObserver[] {
  const lid = localeId ?? "__sweden__";
  return getDb().getAllSync<TopObserver>(
    `SELECT name, species_count AS speciesCount FROM top_observers
     WHERE locale_id = ? ORDER BY rank LIMIT ?`,
    lid,
    limit,
  );
}

// Whether the DB has any data at all (used to detect first launch).
export function isDbPopulated(): boolean {
  try {
    const row = getDb().getFirstSync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM taxon_groups",
    );
    return (row?.n ?? 0) > 0;
  } catch {
    return false;
  }
}

export function queryGeneratedAt(): string | null {
  try {
    const row = getDb().getFirstSync<{ generated_at: string }>(
      "SELECT value AS generated_at FROM meta WHERE key = 'generated_at'",
    );
    return row?.generated_at ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Species info & grid data queries
// ---------------------------------------------------------------------------

export interface SpeciesInfoData {
  taxonId: number;
  description: string | null;
  spreadAndStatus: string | null;
  ecology: string | null;
  redListCategory: string | null;
}

export interface GridCellData {
  topLat: number;
  topLng: number;
  bottomLat: number;
  bottomLng: number;
  count: number;
}

export function querySpeciesInfo(taxonId: number): SpeciesInfoData | null {
  try {
    const row = getDb().getFirstSync<{
      taxon_id: number;
      description: string | null;
      spread_and_status: string | null;
      ecology: string | null;
      red_list_category: string | null;
    }>("SELECT * FROM species_info WHERE taxon_id = ?", taxonId);
    if (!row) return null;
    return {
      taxonId: row.taxon_id,
      description: row.description,
      spreadAndStatus: row.spread_and_status,
      ecology: row.ecology,
      redListCategory: row.red_list_category,
    };
  } catch {
    return null;
  }
}

export function queryGridCells(taxonId: number): GridCellData[] {
  try {
    return getDb().getAllSync<GridCellData>(
      `SELECT top_lat AS topLat, top_lng AS topLng,
              bottom_lat AS bottomLat, bottom_lng AS bottomLng,
              count FROM grid_cells WHERE taxon_id = ?`,
      taxonId,
    );
  } catch {
    return [];
  }
}

export function querySupercellWeeks(
  cellLatIdx: number,
  cellLngIdx: number,
  speciesId: number,
): number[] {
  try {
    const rows = getDb().getAllSync<{ week: number }>(
      "SELECT week FROM supercell_phenology WHERE cell_lat = ? AND cell_lng = ? AND species_id = ?",
      cellLatIdx,
      cellLngIdx,
      speciesId,
    );
    return rows.map((r) => r.week);
  } catch {
    return [];
  }
}
