import { fetchAllObservations } from '../api/sos.ts'
import type { SosSearchFilter } from '../api/sos.ts'
import { IMAGO_LIFE_STAGE, START_YEAR, CURRENT_YEAR } from '../config.ts'
import type { TaxonGroupConfig } from '../config.ts'
import type { ObservationCell, Locale } from '../types.ts'

export async function fetchObservations(
  groups: TaxonGroupConfig[],
  locales: Locale[],
): Promise<ObservationCell[]> {
  console.log('Fetching observations...')

  const provinceIds = locales
    .filter(l => l.type === 'province')
    .map(l => l.id)

  const municipalityById = new Map(
    locales.filter(l => l.type === 'municipality').map(l => [l.id, l])
  )
  const provinceById = new Map(
    locales.filter(l => l.type === 'province').map(l => [l.id, l])
  )

  // Accumulate counts: key = `speciesId:localeId:year:week`
  const counts = new Map<string, number>()

  const bump = (speciesId: number, localeId: string, year: number, week: number) => {
    const key = `${speciesId}:${localeId}:${year}:${week}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  for (const group of groups) {
    console.log(`  Group: ${group.scientific}`)

    // Fetch year by year to stay comfortably under the 10,000 ceiling
    for (let year = START_YEAR; year <= CURRENT_YEAR; year++) {
      process.stdout.write(`    ${year}... `)

      const filter: SosSearchFilter = {
        taxon: { ids: [group.taxonId], includeUnderlyingTaxa: true },
        date: { startDate: `${year}-01-01`, endDate: `${year}-12-31` },
        output: { fieldSet: 'Extended' },
      }

      const observations = await fetchAllObservations(
        filter,
        provinceIds,
        msg => process.stdout.write(`\n      ${msg}`),
      )

      process.stdout.write(`\n`)

      let kept = 0
      for (const obs of observations) {
        // Filter to imago/adult life stage
        if (obs.occurrence.lifeStage?.value !== IMAGO_LIFE_STAGE) continue

        const speciesId = obs.taxon.id
        const dateStr = obs.event.startDate
        if (!dateStr) continue

        const date = new Date(dateStr)
        const obsYear = date.getFullYear()
        const week = isoWeek(date)

        // Credit the observation to both its municipality and its province
        const muni = obs.location.municipality
        if (muni && municipalityById.has(muni.featureId)) {
          bump(speciesId, muni.featureId, obsYear, week)
        }

        const prov = obs.location.province
        if (prov && provinceById.has(prov.featureId)) {
          bump(speciesId, prov.featureId, obsYear, week)
        }

        kept++
      }

      console.log(`      kept ${kept} imago/adult out of ${observations.length}`)
    }
  }

  // Unpack the map into ObservationCell array
  const cells: ObservationCell[] = []
  for (const [key, count] of counts) {
    const [speciesId, localeId, year, week] = key.split(':')
    cells.push({
      speciesId: Number(speciesId),
      localeId,
      year: Number(year),
      week: Number(week),
      count,
    })
  }

  console.log(`  Total cells: ${cells.length.toLocaleString()}`)
  return cells
}

// ---------------------------------------------------------------------------
// ISO 8601 week number
// ---------------------------------------------------------------------------

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
}
