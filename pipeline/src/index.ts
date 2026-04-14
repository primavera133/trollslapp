import { ADB_KEY, TAXON_GROUPS } from './config.ts'
import { fetchObservations } from './steps/fetchObservations.ts'
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

  const { cells, species, locales } = await fetchObservations(TAXON_GROUPS)

  const { dbPath, manifestPath } = buildDatabase(
    TAXON_GROUPS,
    [...locales.values()],
    [...species.values()],
    cells,
  )

  await publishRelease(dbPath, manifestPath)

  console.log('=== Done ===')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
