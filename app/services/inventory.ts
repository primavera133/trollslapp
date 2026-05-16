import { getDb, type Species } from './db'

export const GPS_AVAILABLE = true

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

  return getDb().getAllSync<Species>(
    `SELECT DISTINCT s.id, s.group_id AS groupId, s.scientific, s.swedish,
            s.genus, s.family, s.rank, s.sort_order AS sortOrder
     FROM grid_cells gc
     JOIN species s ON s.id = gc.taxon_id
     WHERE s.rank IN ('species', 'subspecies')
       AND ? BETWEEN gc.bottom_lat AND gc.top_lat
       AND ? BETWEEN gc.top_lng AND gc.bottom_lng
       AND EXISTS (
         SELECT 1 FROM observations o
         WHERE o.species_id = s.id AND o.week IN (${placeholders})
       )
     ORDER BY gc.count DESC`,
    lat, lng, ...weeks
  )
}
