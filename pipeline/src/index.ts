import { ADB_KEY, TAXON_GROUPS } from './config.ts'
import { fetchObservations } from './steps/fetchObservations.ts'
import { resolveTaxonomy } from './steps/resolveTaxonomy.ts'
import { fetchSpeciesInfo } from './steps/fetchSpeciesInfo.ts'
import { buildDatabase } from './steps/buildDatabase.ts'
import { publishRelease } from './publish.ts'

async function main() {
  console.log('=== Trollslapp pipeline ===')
  console.log(`Taxon groups: ${TAXON_GROUPS.map(g => g.scientific).join(', ')}`)

  if (!ADB_KEY) {
    throw new Error(
      'ADB_SUBSCRIPTION_KEY is not set.\n' +
      'Register at https://api-portal.artdatabanken.se/ and set the env var.'
    )
  }

  const { cells, species, locales, topObservers } = await fetchObservations(TAXON_GROUPS)

  await resolveTaxonomy(species, TAXON_GROUPS)

  const { speciesInfo, gridData } = await fetchSpeciesInfo(species)

  const { dbPath, jsonPath, manifestPath } = buildDatabase(
    TAXON_GROUPS,
    [...locales.values()],
    [...species.values()],
    cells,
    topObservers,
    speciesInfo,
    gridData,
  )

  await publishRelease(dbPath, jsonPath, manifestPath)

  console.log('=== Done ===')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
