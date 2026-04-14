import { fetchChildSpecies } from '../api/dyntaxa.ts'
import type { TaxonGroupConfig } from '../config.ts'
import type { Species } from '../types.ts'

export async function fetchSpecies(groups: TaxonGroupConfig[]): Promise<Species[]> {
  console.log('Fetching species...')
  const all: Species[] = []

  for (const group of groups) {
    console.log(`  ${group.scientific} (taxonId=${group.taxonId})`)
    const taxa = await fetchChildSpecies(group.taxonId)

    // Keep only species-rank taxa (filter out genus, family, etc.)
    const species = taxa
      .filter(t => t.taxonCategory.toLowerCase() === 'species')
      .map(t => ({
        id: t.taxonId,
        groupId: group.taxonId,
        scientific: t.scientificName,
        swedish: t.swedishName ?? null,
      }))

    console.log(`    ${species.length} species`)
    all.push(...species)
  }

  return all
}
