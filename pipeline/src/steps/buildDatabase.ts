import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { OUTPUT_DIR, DB_FILENAME, JSON_FILENAME, MANIFEST_FILENAME } from '../config.ts'
import type { TaxonGroupConfig } from '../config.ts'
import type { Locale, Species, ObservationCell, TopObserver, Manifest } from '../types.ts'

// Compact observation record for the JSON bundle (short keys to save bytes).
interface JsonObservation { s: number; l: string; y: number; w: number; c: number }

export interface ObservationsJson {
  meta: { generatedAt: string; pipelineVersion: string }
  taxonGroups: Array<{ id: number; scientific: string; swedish: string }>
  species: Array<{ id: number; groupId: number; scientific: string; swedish: string | null; genus: string; family: string | null; rank: string }>
  locales: Array<{ id: string; type: string; name: string }>
  observations: JsonObservation[]
  // localeId → [{n: name, c: speciesCount, s: [{i: speciesId, d: firstDate}]}]
  topObservers: Record<string, Array<{ n: string; c: number; s: Array<{ i: number; d: string }> }>>
}

export function buildDatabase(
  groups: TaxonGroupConfig[],
  locales: Locale[],
  species: Species[],
  cells: ObservationCell[],
  topObservers: Map<string, TopObserver[]>,
): { dbPath: string; jsonPath: string; manifestPath: string } {
  console.log('Building database...')

  mkdirSync(OUTPUT_DIR, { recursive: true })
  const dbPath = join(OUTPUT_DIR, DB_FILENAME)

  // Always start fresh so schema changes are applied cleanly.
  if (existsSync(dbPath)) rmSync(dbPath)
  const manifestPath = join(OUTPUT_DIR, MANIFEST_FILENAME)

  const db = new DatabaseSync(dbPath)

  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')

  // Schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS taxon_groups (
      id         INTEGER PRIMARY KEY,
      scientific TEXT NOT NULL,
      swedish    TEXT
    );

    CREATE TABLE IF NOT EXISTS species (
      id         INTEGER PRIMARY KEY,
      group_id   INTEGER NOT NULL REFERENCES taxon_groups(id),
      scientific TEXT NOT NULL,
      swedish    TEXT,
      genus      TEXT NOT NULL,
      family     TEXT,
      rank       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS locales (
      id   TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS observations (
      species_id INTEGER NOT NULL REFERENCES species(id),
      locale_id  TEXT    NOT NULL REFERENCES locales(id),
      year       INTEGER NOT NULL,
      week       INTEGER NOT NULL,
      count      INTEGER NOT NULL,
      PRIMARY KEY (species_id, locale_id, year, week)
    );

    CREATE TABLE IF NOT EXISTS top_observers (
      locale_id     TEXT    NOT NULL,
      rank          INTEGER NOT NULL,
      name          TEXT    NOT NULL,
      species_count INTEGER NOT NULL,
      PRIMARY KEY (locale_id, rank)
    );

    CREATE TABLE IF NOT EXISTS observer_species (
      locale_id     TEXT    NOT NULL,
      observer_name TEXT    NOT NULL,
      species_id    INTEGER NOT NULL,
      first_date    TEXT    NOT NULL,
      PRIMARY KEY (locale_id, observer_name, species_id)
    );

    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `)

  // Insert taxon groups
  const insertGroup = db.prepare(
    'INSERT OR REPLACE INTO taxon_groups (id, scientific, swedish) VALUES (?, ?, ?)'
  )
  for (const g of groups) {
    insertGroup.run(g.taxonId, g.scientific, g.swedish)
  }
  console.log(`  ${groups.length} taxon groups`)

  // Insert locales
  const insertLocale = db.prepare(
    'INSERT OR REPLACE INTO locales (id, type, name) VALUES (?, ?, ?)'
  )
  for (const l of locales) {
    insertLocale.run(l.id, l.type, l.name)
  }
  console.log(`  ${locales.length} locales`)

  // Insert species
  const insertSpecies = db.prepare(
    'INSERT OR REPLACE INTO species (id, group_id, scientific, swedish, genus, family, rank) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  for (const s of species) {
    insertSpecies.run(s.id, s.groupId, s.scientific, s.swedish ?? null, s.genus, s.family ?? null, s.rank)
  }
  console.log(`  ${species.length} species`)

  // Insert observation cells in one transaction
  const insertCell = db.prepare(
    'INSERT OR REPLACE INTO observations (species_id, locale_id, year, week, count) VALUES (?, ?, ?, ?, ?)'
  )
  db.exec('BEGIN')
  try {
    for (const r of cells) {
      insertCell.run(r.speciesId, r.localeId, r.year, r.week, r.count)
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
  console.log(`  ${cells.length.toLocaleString()} observation cells`)

  // Insert top observers
  const insertObserver = db.prepare(
    'INSERT OR REPLACE INTO top_observers (locale_id, rank, name, species_count) VALUES (?, ?, ?, ?)'
  )
  const insertObserverSpecies = db.prepare(
    'INSERT OR REPLACE INTO observer_species (locale_id, observer_name, species_id, first_date) VALUES (?, ?, ?, ?)'
  )
  let observerRows = 0
  let observerSpeciesRows = 0
  db.exec('BEGIN')
  try {
    for (const [localeId, observers] of topObservers) {
      observers.forEach((obs, i) => {
        insertObserver.run(localeId, i + 1, obs.name, obs.speciesCount)
        observerRows++
        for (const sp of obs.species) {
          insertObserverSpecies.run(localeId, obs.name, sp.speciesId, sp.firstDate)
          observerSpeciesRows++
        }
      })
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
  console.log(`  ${observerRows} observer rows, ${observerSpeciesRows} observer-species rows`)

  // Indexes for common query patterns
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_obs_species_locale
      ON observations (species_id, locale_id);
    CREATE INDEX IF NOT EXISTS idx_obs_locale
      ON observations (locale_id);
    CREATE INDEX IF NOT EXISTS idx_species_group
      ON species (group_id);
    CREATE INDEX IF NOT EXISTS idx_species_genus
      ON species (genus);
    CREATE INDEX IF NOT EXISTS idx_species_family
      ON species (family);
    CREATE INDEX IF NOT EXISTS idx_top_observers_locale
      ON top_observers (locale_id);
    CREATE INDEX IF NOT EXISTS idx_observer_species_lookup
      ON observer_species (locale_id, observer_name);
  `)

  // Meta
  const generatedAt = new Date().toISOString()
  const insertMeta = db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)')
  insertMeta.run('generated_at', generatedAt)
  insertMeta.run('pipeline_version', '1.0.0')

  db.close()
  console.log(`  DB written to ${dbPath}`)

  // Manifest
  const manifest: Manifest = {
    generatedAt,
    pipelineVersion: '1.0.0',
    dbFilename: DB_FILENAME,
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`  Manifest written to ${manifestPath}`)

  // JSON bundle for web (no SQLite WASM needed)
  const jsonPath = join(OUTPUT_DIR, JSON_FILENAME)
  const topObserversJson: Record<string, Array<{ n: string; c: number }>> = {}
  for (const [localeId, observers] of topObservers) {
    topObserversJson[localeId] = observers.map(o => ({
      n: o.name,
      c: o.speciesCount,
      s: o.species.map(sp => ({ i: sp.speciesId, d: sp.firstDate })),
    }))
  }

  const jsonBundle: ObservationsJson = {
    meta: { generatedAt, pipelineVersion: '1.0.0' },
    taxonGroups: groups.map(g => ({ id: g.taxonId, scientific: g.scientific, swedish: g.swedish })),
    species: species.map(s => ({ id: s.id, groupId: s.groupId, scientific: s.scientific, swedish: s.swedish, genus: s.genus, family: s.family ?? null, rank: s.rank })),
    locales: locales.map(l => ({ id: l.id, type: l.type, name: l.name })),
    observations: cells.map(c => ({ s: c.speciesId, l: c.localeId, y: c.year, w: c.week, c: c.count })),
    topObservers: topObserversJson,
  }
  writeFileSync(jsonPath, JSON.stringify(jsonBundle))
  console.log(`  JSON written to ${jsonPath} (${(JSON.stringify(jsonBundle).length / 1024).toFixed(0)} KB)`)

  return { dbPath, jsonPath, manifestPath }
}
