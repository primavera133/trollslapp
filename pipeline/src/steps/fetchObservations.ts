import { fetchAllObservations } from '../api/sos.ts'
import type { SosSearchFilter } from '../api/sos.ts'
import { START_YEAR, CURRENT_YEAR } from '../config.ts'
import type { TaxonGroupConfig } from '../config.ts'
import type { ObservationCell, Species, Locale } from '../types.ts'

// Life stage values that are explicitly NOT adult.
// Observations with these values are excluded.
// Observations with no lifeStage field are INCLUDED — virtually all
// untagged dragonfly observations are of flying adults.
const NON_ADULT_STAGES = new Set([
  'larv/nymf', 'larv', 'nymf', 'ägg', 'puppa', 'juvenil',
  'larva', 'nymph', 'egg', 'pupa',
])

export interface ObservationResult {
  cells: ObservationCell[]
  species: Map<number, Species>       // taxonId → Species
  locales: Map<string, Locale>        // featureId → Locale
}

export async function fetchObservations(
  groups: TaxonGroupConfig[],
): Promise<ObservationResult> {
  console.log('Fetching observations...')

  // Accumulate counts: key = `speciesId:localeId:year:week`
  const counts = new Map<string, number>()
  const species = new Map<number, Species>()
  const locales = new Map<string, Locale>()

  const bump = (speciesId: number, localeId: string, year: number, week: number) => {
    const key = `${speciesId}:${localeId}:${year}:${week}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  for (const group of groups) {
    console.log(`  Group: ${group.scientific}`)

    // Fetch year by year to stay within the 10,000 observation ceiling per query.
    // Province IDs are not pre-fetched; chunking uses IDs collected from
    // previously processed observations (starts empty, grows each year).
    const knownProvinceIds: string[] = []

    for (let year = START_YEAR; year <= CURRENT_YEAR; year++) {
      process.stdout.write(`    ${year}... `)

      const filter: SosSearchFilter = {
        taxon: { ids: [group.taxonId], includeUnderlyingTaxa: true },
        date: { startDate: `${year}-01-01`, endDate: `${year}-12-31` },
        output: { fieldSet: 'Extended' },
      }

      const observations = await fetchAllObservations(
        filter,
        knownProvinceIds,
        msg => process.stdout.write(`\n      ${msg}`),
      )

      let kept = 0
      for (const obs of observations) {
        // Collect province IDs as we discover them (for chunking future years)
        const prov = obs.location.province
        if (prov && !knownProvinceIds.includes(prov.featureId)) {
          knownProvinceIds.push(prov.featureId)
        }

        // Life stage filter: skip only explicitly non-adult stages
        const lifeStageValue = obs.occurrence.lifeStage?.value?.toLowerCase()
        if (lifeStageValue && NON_ADULT_STAGES.has(lifeStageValue)) continue

        // Collect species
        const taxon = obs.taxon
        if (!species.has(taxon.id)) {
          species.set(taxon.id, {
            id: taxon.id,
            groupId: group.taxonId,
            scientific: taxon.scientificName,
            swedish: taxon.vernacularName ?? null,
          })
        }

        const dateStr = obs.event.startDate
        if (!dateStr) continue
        const date = new Date(dateStr)
        const obsYear = date.getFullYear()
        const week = isoWeek(date)

        // Credit to municipality
        const muni = obs.location.municipality
        if (muni) {
          if (!locales.has(muni.featureId)) {
            locales.set(muni.featureId, { id: muni.featureId, type: 'municipality', name: muni.name })
          }
          bump(taxon.id, muni.featureId, obsYear, week)
        }

        // Credit to province
        if (prov) {
          if (!locales.has(prov.featureId)) {
            locales.set(prov.featureId, { id: prov.featureId, type: 'province', name: prov.name })
          }
          bump(taxon.id, prov.featureId, obsYear, week)
        }

        kept++
      }

      console.log(`\n      kept ${kept} of ${observations.length}`)
    }
  }

  const cells: ObservationCell[] = []
  for (const [key, count] of counts) {
    const [speciesId, localeId, year, week] = key.split(':')
    cells.push({ speciesId: Number(speciesId), localeId, year: Number(year), week: Number(week), count })
  }

  console.log(`  ${species.size} species, ${locales.size} locales, ${cells.length.toLocaleString()} cells`)
  return { cells, species, locales }
}

// ISO 8601 week number
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
}
