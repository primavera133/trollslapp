import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { OUTPUT_DIR, DB_FILENAME, MANIFEST_FILENAME } from '../config.ts'
import type { TaxonGroupConfig } from '../config.ts'
import type { Locale, Species, ObservationCell, Manifest } from '../types.ts'

export function buildDatabase(
  groups: TaxonGroupConfig[],
  locales: Locale[],
  species: Species[],
  cells: ObservationCell[],
): { dbPath: string; manifestPath: string } {
  console.log('Building database...')

  mkdirSync(OUTPUT_DIR, { recursive: true })
  const dbPath = join(OUTPUT_DIR, DB_FILENAME)
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
      swedish    TEXT
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
    'INSERT OR REPLACE INTO species (id, group_id, scientific, swedish) VALUES (?, ?, ?, ?)'
  )
  for (const s of species) {
    insertSpecies.run(s.id, s.groupId, s.scientific, s.swedish ?? null)
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

  // Indexes for common query patterns
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_obs_species_locale
      ON observations (species_id, locale_id);
    CREATE INDEX IF NOT EXISTS idx_obs_locale
      ON observations (locale_id);
    CREATE INDEX IF NOT EXISTS idx_species_group
      ON species (group_id);
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

  return { dbPath, manifestPath }
}
