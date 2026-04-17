import { fetchAllObservations } from '../api/sos.ts'
import type { SosSearchFilter } from '../api/sos.ts'
import { fetchChildIds } from '../api/dyntaxa.ts'
import { START_YEAR, CURRENT_YEAR, TAXON_BLACKLIST } from '../config.ts'
import type { TaxonGroupConfig } from '../config.ts'
import type { ObservationCell, Species, Locale, TaxonRank } from '../types.ts'
import { TAXON_CATEGORY_RANK } from '../types.ts'

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
    // Province IDs are collected from processed observations for chunking.
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

        // Rank filter: use the taxon's own category from the observation.
        // This filters out infraorders (Anisoptera etc.) and orders — anything
        // whose taxonCategoryId is not in TAXON_CATEGORY_RANK is skipped.
        const categoryId = obs.taxon.attributes?.taxonCategory?.id
        const rank: TaxonRank | undefined = categoryId ? TAXON_CATEGORY_RANK[categoryId] : undefined
        if (!rank) continue

        // Blacklist filter
        if (TAXON_BLACKLIST.has(obs.taxon.id)) continue

        // Life stage filter: skip only explicitly non-adult stages
        const lifeStageValue = obs.occurrence.lifeStage?.value?.toLowerCase()
        if (lifeStageValue && NON_ADULT_STAGES.has(lifeStageValue)) continue

        // Collect species
        const taxon = obs.taxon
        if (!species.has(taxon.id)) {
          const genus = taxon.scientificName.split(' ')[0]
          species.set(taxon.id, {
            id: taxon.id,
            groupId: group.taxonId,
            scientific: taxon.scientificName,
            swedish: taxon.vernacularName ?? null,
            genus,
            family: null,  // taxonomy hierarchy not available without Dyntaxa access
            rank,
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

  // ---------------------------------------------------------------------------
  // Post-process: assign family names using Dyntaxa childids.
  // For each family-rank taxon, fetch all its descendants and mark every
  // species/genus in the collection with that family's scientific name.
  // ---------------------------------------------------------------------------
  const familyTaxa = [...species.values()].filter(s => s.rank === 'family')
  if (familyTaxa.length > 0) {
    console.log(`  Assigning family names via Dyntaxa (${familyTaxa.length} families)...`)
    for (const fam of familyTaxa) {
      try {
        const descendantIds = new Set(await fetchChildIds(fam.id))
        for (const s of species.values()) {
          if (s.rank !== 'family' && descendantIds.has(s.id)) {
            s.family = fam.scientific
          }
        }
        // A family-rank taxon is its own family
        fam.family = fam.scientific
      } catch (err) {
        console.warn(`    Warning: could not fetch children of ${fam.scientific} (${fam.id}): ${err}`)
      }
    }
  }

  // Also assign family for genus-rank taxa based on their species members' family
  for (const s of species.values()) {
    if (s.rank === 'genus' && s.family === null) {
      // Find a species with the same genus that has a family assigned
      const match = [...species.values()].find(
        other => other.rank === 'species' && other.genus === s.genus && other.family !== null
      )
      if (match) s.family = match.family
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
