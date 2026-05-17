import { getDb, type Species } from './db'

export const GPS_AVAILABLE = true

const SUPERCELL_LNG_STEP = 0.3515625
const SUPERCELL_LAT_STEP = 0.2

function getCurrentWeek(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  return Math.ceil((diff / oneWeek) + start.getDay() / 7)
}

function weekRange(): number[] {
  const current = getCurrentWeek()
  const weeks: number[] = []
  for (let offset = -3; offset <= 3; offset++) {
    let w = current + offset
    if (w < 1) w += 52
    if (w > 52) w -= 52
    weeks.push(w)
  }
  return weeks
}

export function querySpeciesNearLocation(lat: number, lng: number): Species[] {
  const weeks = weekRange()
  const placeholders = weeks.map(() => '?').join(',')

  const cellLat = Math.floor(lat / SUPERCELL_LAT_STEP)
  const cellLng = Math.floor(lng / SUPERCELL_LNG_STEP)

  return getDb().getAllSync<Species>(
    `SELECT DISTINCT s.id, s.group_id AS groupId, s.scientific, s.swedish,
            s.genus, s.family, s.rank, s.sort_order AS sortOrder
     FROM grid_cells gc
     JOIN species s ON s.id = gc.taxon_id
     WHERE s.rank IN ('species', 'subspecies')
       AND ? BETWEEN gc.bottom_lat AND gc.top_lat
       AND ? BETWEEN gc.top_lng AND gc.bottom_lng
       AND EXISTS (
         SELECT 1 FROM supercell_phenology sp
         WHERE sp.species_id = s.id
           AND sp.cell_lat = ?
           AND sp.cell_lng = ?
           AND sp.week IN (${placeholders})
       )
     ORDER BY gc.count DESC`,
    lat, lng, cellLat, cellLng, ...weeks
  )
}
