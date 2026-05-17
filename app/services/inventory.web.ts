import {
  queryAllTaxa,
  queryGridCells,
  querySupercellWeeks,
  queryTaxonGroups,
  type Species,
} from "./db";

export const GPS_AVAILABLE = true;

const SUPERCELL_LNG_STEP = 0.3515625;
const SUPERCELL_LAT_STEP = 0.2;

function getCurrentWeek(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.ceil(diff / oneWeek + start.getDay() / 7);
}

function isWithinWeekRange(
  week: number,
  current: number,
  range: number,
): boolean {
  let diff = Math.abs(week - current);
  if (diff > 26) diff = 52 - diff;
  return diff <= range;
}

export function querySpeciesNearLocation(lat: number, lng: number): Species[] {
  const grps = queryTaxonGroups();
  if (grps.length === 0) return [];

  const currentWeek = getCurrentWeek();
  const cellLat = Math.floor(lat / SUPERCELL_LAT_STEP);
  const cellLng = Math.floor(lng / SUPERCELL_LNG_STEP);

  const allTaxa = queryAllTaxa(grps[0].id).filter(
    (s) => s.rank === "species" || s.rank === "subspecies",
  );

  const results: { species: Species; count: number }[] = [];

  for (const sp of allTaxa) {
    const cells = queryGridCells(sp.id);
    let matchedCount = 0;
    for (const cell of cells) {
      if (
        lat >= cell.bottomLat &&
        lat <= cell.topLat &&
        lng >= cell.topLng &&
        lng <= cell.bottomLng
      ) {
        matchedCount = cell.count;
        break;
      }
    }
    if (matchedCount === 0) continue;

    const weeks = querySupercellWeeks(cellLat, cellLng, sp.id);
    const hasRecentObs = weeks.some((w: number) =>
      isWithinWeekRange(w, currentWeek, 3),
    );
    if (!hasRecentObs) continue;

    results.push({ species: sp, count: matchedCount });
  }

  results.sort((a, b) => b.count - a.count);
  return results.map((r) => r.species);
}
