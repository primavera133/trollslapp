// Web-only implementation of the data layer.
// Instead of SQLite, we query an in-memory JSON bundle fetched from the network.

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

export interface ObserverSpecies {
  speciesId: number
  scientificName: string
  swedishName: string | null
  firstDate: string
}

// ---------------------------------------------------------------------------
// In-memory store — populated by sync.web.ts after fetching observations.json
// ---------------------------------------------------------------------------

interface JsonObservation { s: number; l: string; y: number; w: number; c: number }

interface ObservationsJson {
  meta: { generatedAt: string; pipelineVersion: string }
  taxonGroups: Array<{ id: number; scientific: string; swedish: string }>
  species: Array<{ id: number; groupId: number; scientific: string; swedish: string | null; genus: string; family: string | null; rank: string }>
  locales: Array<{ id: string; type: string; name: string }>
  observations: JsonObservation[]
  topObservers: Record<string, Array<{ n: string; c: number; s: Array<{ i: number; d: string }> }>>
  speciesInfo?: Record<number, { d: string | null; ss: string | null; e: string | null; r: string | null }>
  gridData?: Record<number, Array<{ tla: number; tln: number; bla: number; bln: number; c: number }>>
}

let _data: ObservationsJson | null = null

export function setObservationsData(json: ObservationsJson): void {
  _data = json
}

export function isDataLoaded(): boolean {
  return _data !== null
}

// On native, resetDb() closes the SQLite handle so the next query re-opens
// the newly-downloaded file. On web there is no handle — data is already in
// memory after syncIfNeeded() loaded it, so this is intentionally a no-op.
export function resetDb(): void {
  // no-op on web
}

// No-op on web (no SQLite handle to open).
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function getDb(): never {
  throw new Error('getDb() is not available on web — use the query functions directly')
}

// ---------------------------------------------------------------------------
// Queries — mirror the signatures in db.ts exactly
// ---------------------------------------------------------------------------

export function queryTaxonGroups(): TaxonGroup[] {
  if (!_data) return []
  return [..._data.taxonGroups].sort((a, b) => a.swedish.localeCompare(b.swedish, 'sv'))
}

export function queryAllTaxa(groupId: number): Species[] {
  if (!_data) return []
  return _data.species
    .filter(s => s.groupId === groupId)
    .map(s => s as unknown as Species)
    .sort((a, b) =>
      (a.swedish ?? a.scientific).localeCompare(b.swedish ?? b.scientific, 'sv')
    )
}

function rollupPhenology(speciesIds: Set<number>, localeId: string | null): WeekCount[] {
  if (!_data) return []
  const totals = new Map<number, number>()
  for (const obs of _data.observations) {
    if (speciesIds.has(obs.s) && (localeId === null || obs.l === localeId)) {
      totals.set(obs.w, (totals.get(obs.w) ?? 0) + obs.c)
    }
  }
  return Array.from(totals.entries()).map(([week, total]) => ({ week, total })).sort((a, b) => a.week - b.week)
}

function rollupPhenologyYear(speciesIds: Set<number>, localeId: string | null, year: number): WeekCount[] {
  if (!_data) return []
  const totals = new Map<number, number>()
  for (const obs of _data.observations) {
    if (speciesIds.has(obs.s) && (localeId === null || obs.l === localeId) && obs.y === year) {
      totals.set(obs.w, (totals.get(obs.w) ?? 0) + obs.c)
    }
  }
  return Array.from(totals.entries()).map(([week, total]) => ({ week, total })).sort((a, b) => a.week - b.week)
}

function rollupAvailableYears(speciesIds: Set<number>, localeId: string | null): number[] {
  if (!_data) return []
  const years = new Set<number>()
  for (const obs of _data.observations) {
    if (speciesIds.has(obs.s) && (localeId === null || obs.l === localeId)) years.add(obs.y)
  }
  return Array.from(years).sort((a, b) => b - a)
}

export function queryPhenologyByGenus(genus: string, groupId: number, localeId: string | null): WeekCount[] {
  if (!_data) return []
  const ids = new Set(_data.species.filter(s => s.genus === genus && s.groupId === groupId).map(s => s.id))
  return rollupPhenology(ids, localeId)
}

export function queryPhenologyYearByGenus(genus: string, groupId: number, localeId: string | null, year: number): WeekCount[] {
  if (!_data) return []
  const ids = new Set(_data.species.filter(s => s.genus === genus && s.groupId === groupId).map(s => s.id))
  return rollupPhenologyYear(ids, localeId, year)
}

export function queryAvailableYearsByGenus(genus: string, groupId: number, localeId: string | null): number[] {
  if (!_data) return []
  const ids = new Set(_data.species.filter(s => s.genus === genus && s.groupId === groupId).map(s => s.id))
  return rollupAvailableYears(ids, localeId)
}

export function queryPhenologyByFamily(family: string, groupId: number, localeId: string | null): WeekCount[] {
  if (!_data) return []
  const ids = new Set(_data.species.filter(s => s.family === family && s.groupId === groupId).map(s => s.id))
  return rollupPhenology(ids, localeId)
}

export function queryPhenologyYearByFamily(family: string, groupId: number, localeId: string | null, year: number): WeekCount[] {
  if (!_data) return []
  const ids = new Set(_data.species.filter(s => s.family === family && s.groupId === groupId).map(s => s.id))
  return rollupPhenologyYear(ids, localeId, year)
}

export function queryAvailableYearsByFamily(family: string, groupId: number, localeId: string | null): number[] {
  if (!_data) return []
  const ids = new Set(_data.species.filter(s => s.family === family && s.groupId === groupId).map(s => s.id))
  return rollupAvailableYears(ids, localeId)
}

export function queryLocales(type: 'province' | 'municipality'): Locale[] {
  if (!_data) return []
  return _data.locales
    .filter(l => l.type === type)
    .sort((a, b) => a.name.localeCompare(b.name, 'sv')) as Locale[]
}

export function queryPhenology(speciesId: number, localeId: string | null): WeekCount[] {
  if (!_data) return []
  const totals = new Map<number, number>()
  for (const obs of _data.observations) {
    if (obs.s === speciesId && (localeId === null || obs.l === localeId)) {
      totals.set(obs.w, (totals.get(obs.w) ?? 0) + obs.c)
    }
  }
  return Array.from(totals.entries())
    .map(([week, total]) => ({ week, total }))
    .sort((a, b) => a.week - b.week)
}

export function queryPhenologyYear(
  speciesId: number,
  localeId: string | null,
  year: number,
): WeekCount[] {
  if (!_data) return []
  const totals = new Map<number, number>()
  for (const obs of _data.observations) {
    if (obs.s === speciesId && (localeId === null || obs.l === localeId) && obs.y === year) {
      totals.set(obs.w, (totals.get(obs.w) ?? 0) + obs.c)
    }
  }
  return Array.from(totals.entries())
    .map(([week, total]) => ({ week, total }))
    .sort((a, b) => a.week - b.week)
}

export function queryAvailableYears(speciesId: number, localeId: string | null): number[] {
  if (!_data) return []
  const years = new Set<number>()
  for (const obs of _data.observations) {
    if (obs.s === speciesId && (localeId === null || obs.l === localeId)) years.add(obs.y)
  }
  return Array.from(years).sort((a, b) => b - a)
}

// Group-level rollup: sums all taxa in the group.
export function queryPhenologyByGroup(groupId: number, localeId: string | null): WeekCount[] {
  if (!_data) return []
  const ids = new Set(_data.species.filter(s => s.groupId === groupId).map(s => s.id))
  return rollupPhenology(ids, localeId)
}

export function queryPhenologyYearByGroup(groupId: number, localeId: string | null, year: number): WeekCount[] {
  if (!_data) return []
  const ids = new Set(_data.species.filter(s => s.groupId === groupId).map(s => s.id))
  return rollupPhenologyYear(ids, localeId, year)
}

export function queryAvailableYearsByGroup(groupId: number, localeId: string | null): number[] {
  if (!_data) return []
  const ids = new Set(_data.species.filter(s => s.groupId === groupId).map(s => s.id))
  return rollupAvailableYears(ids, localeId)
}

export function queryObserverSpecies(localeId: string | null, observerName: string): ObserverSpecies[] {
  if (!_data) return []
  const lid = localeId ?? '__sweden__'
  const entry = (_data.topObservers?.[lid] ?? []).find(e => e.n === observerName)
  if (!entry) return []
  const speciesById = new Map(_data.species.map(s => [s.id, s]))
  return entry.s
    .map(sp => {
      const s = speciesById.get(sp.i)
      return s
        ? { speciesId: sp.i, scientificName: s.scientific, swedishName: s.swedish, firstDate: sp.d }
        : null
    })
    .filter((x): x is ObserverSpecies => x !== null)
    .sort((a, b) => a.firstDate.localeCompare(b.firstDate))
}

export function queryTopObservers(localeId: string | null, limit = 10): TopObserver[] {
  if (!_data) return []
  const lid = localeId ?? '__sweden__'
  const entries = _data.topObservers?.[lid] ?? []
  return entries.slice(0, limit).map(e => ({ name: e.n, speciesCount: e.c }))
}

export function isDbPopulated(): boolean {
  return (_data?.taxonGroups.length ?? 0) > 0
}

// ---------------------------------------------------------------------------
// Species info & grid data queries
// ---------------------------------------------------------------------------

export interface SpeciesInfoData {
  taxonId: number
  description: string | null
  spreadAndStatus: string | null
  ecology: string | null
  redListCategory: string | null
}

export interface GridCellData {
  topLat: number
  topLng: number
  bottomLat: number
  bottomLng: number
  count: number
}

export function querySpeciesInfo(taxonId: number): SpeciesInfoData | null {
  if (!_data?.speciesInfo) return null
  const info = _data.speciesInfo[taxonId]
  if (!info) return null
  return {
    taxonId,
    description: info.d,
    spreadAndStatus: info.ss,
    ecology: info.e,
    redListCategory: info.r,
  }
}

export function queryGridCells(taxonId: number): GridCellData[] {
  if (!_data?.gridData) return []
  const cells = _data.gridData[taxonId]
  if (!cells) return []
  return cells.map(c => ({
    topLat: c.tla,
    topLng: c.tln,
    bottomLat: c.bla,
    bottomLng: c.bln,
    count: c.c,
  }))
}
