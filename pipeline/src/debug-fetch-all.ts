// Fetches ALL dragonfly observations from SOS and saves them to debug-observations.json.
// Uses the same province-splitting logic as the production pipeline to avoid the
// 10,000-observation-per-query ceiling. Run once, then use debug-filter-observer.ts locally.
//
// Run: npm run debug-fetch

import { writeFileSync } from 'node:fs'
import { ADB_KEY, SOS_BASE_URL, TAXON_GROUPS, START_YEAR, CURRENT_YEAR } from './config.ts'
import { fetchAllObservations } from './api/sos.ts'

if (!ADB_KEY) { console.error('ADB_SUBSCRIPTION_KEY is not set'); process.exit(1) }

const OUT_FILE = 'debug-observations.json'

const group = TAXON_GROUPS[0]
console.log(`Group: ${group.scientific} (taxonId=${group.taxonId})`)
console.log(`Years: ${START_YEAR}–${CURRENT_YEAR}`)
console.log(`Output: ${OUT_FILE}`)
console.log()

interface RawObs {
  date:         string
  vernacular:   string
  scientific:   string
  taxonId:      number
  province:     string
  provinceId:   string
  municipality: string
  muniId:       string
  recordedBy:   string
  url:          string
}

const all: RawObs[] = []

for (let year = START_YEAR; year <= CURRENT_YEAR; year++) {
  process.stdout.write(`  ${year}: `)

  const filter = {
    taxon: { ids: [group.taxonId], includeUnderlyingTaxa: true },
    date:  { startDate: `${year}-01-01`, endDate: `${year}-12-31` },
    output: { fieldSet: 'Extended' as const },
  }

  const records = await fetchAllObservations(filter, msg => {
    process.stdout.write(`\n    ${msg}`)
  })

  for (const obs of records) {
    all.push({
      date:         obs.event?.startDate ?? '',
      vernacular:   obs.taxon?.vernacularName ?? '',
      scientific:   obs.taxon?.scientificName ?? '',
      taxonId:      obs.taxon?.id ?? 0,
      province:     obs.location?.province?.name     ?? '',
      provinceId:   obs.location?.province?.featureId ?? '',
      municipality: obs.location?.municipality?.name  ?? '',
      muniId:       obs.location?.municipality?.featureId ?? '',
      recordedBy:   obs.occurrence?.recordedBy ?? '',
      url:          obs.occurrence?.url ?? obs.occurrence?.occurrenceId ?? '',
    })
  }

  process.stdout.write(` → ${records.length.toLocaleString()} obs\n`)
}

console.log()
console.log(`Total observations fetched: ${all.length.toLocaleString()}`)
console.log(`Writing to ${OUT_FILE}...`)
writeFileSync(OUT_FILE, JSON.stringify(all, null, 0))
console.log(`Done. File size: ${(JSON.stringify(all).length / 1024 / 1024).toFixed(1)} MB`)
