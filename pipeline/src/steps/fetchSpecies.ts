import { fetchTaxonAggregation } from '../api/sos.ts'
import type { TaxonGroupConfig } from '../config.ts'
import type { Species } from '../types.ts'

// taxonCategoryId for species rank in SOS/Dyntaxa:
// 17 = Species, 19 = Subspecies — include both
const SPECIES_CATEGORY_IDS = new Set([17, 19])

export async function fetchSpecies(groups: TaxonGroupConfig[]): Promise<Species[]> {
  console.log('Fetching species...')
  const all: Species[] = []

  for (const group of groups) {
    console.log(`  ${group.scientific} (taxonId=${group.taxonId})`)
    const taxa = await fetchTaxonAggregation(group.taxonId)

    const species = taxa
      .filter(t => SPECIES_CATEGORY_IDS.has(t.taxonCategoryId))
      .map(t => ({
        id: t.taxonId,
        groupId: group.taxonId,
        scientific: t.scientificName,
        swedish: t.swedishName || null,
      }))

    console.log(`    ${species.length} species with observations (of ${taxa.length} taxa)`)
    all.push(...species)
  }

  return all
}
