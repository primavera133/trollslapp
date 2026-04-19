// Counts how many observations are excluded by isUncertain: false, per year.
// Helps diagnose discrepancies between SOS and Artportalen.
//
// Run: npm run debug-count-uncertain

import { ADB_KEY, SOS_BASE_URL, TAXON_GROUPS, START_YEAR, CURRENT_YEAR } from './config.ts'

if (!ADB_KEY) { console.error('ADB_SUBSCRIPTION_KEY is not set'); process.exit(1) }

const HEADERS = {
  'Content-Type': 'application/json',
  'Ocp-Apim-Subscription-Key': ADB_KEY,
}

const group = TAXON_GROUPS[0]
console.log(`Group: ${group.scientific} (taxonId=${group.taxonId})`)
console.log(`Comparing counts with and without isUncertain: false\n`)
console.log(`${'Year'.padEnd(6)} ${'All'.padStart(8)} ${'Certain'.padStart(8)} ${'Uncertain'.padStart(10)} ${'% uncertain'.padStart(12)}`)
console.log('─'.repeat(50))

let totalAll = 0
let totalCertain = 0

for (let year = START_YEAR; year <= CURRENT_YEAR; year++) {
  const base = {
    taxon: { ids: [group.taxonId], includeUnderlyingTaxa: true },
    date:  { startDate: `${year}-01-01`, endDate: `${year}-12-31` },
  }

  const [resAll, resCertain] = await Promise.all([
    fetch(`${SOS_BASE_URL}/Observations/Count`, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify(base),
    }),
    fetch(`${SOS_BASE_URL}/Observations/Count`, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify({ ...base, taxon: { ...base.taxon, isUncertain: false } }),
    }),
  ])

  if (!resAll.ok || !resCertain.ok) {
    console.log(`${year}: count failed (${resAll.status} / ${resCertain.status})`)
    continue
  }

  const all = await resAll.json() as number
  const certain = await resCertain.json() as number
  const uncertain = all - certain
  const pct = all > 0 ? ((uncertain / all) * 100).toFixed(1) : '0.0'

  totalAll += all
  totalCertain += certain

  console.log(`${String(year).padEnd(6)} ${all.toLocaleString().padStart(8)} ${certain.toLocaleString().padStart(8)} ${uncertain.toLocaleString().padStart(10)} ${(pct + '%').padStart(12)}`)

  await new Promise(r => setTimeout(r, 200))
}

console.log('─'.repeat(50))
const totalUncertain = totalAll - totalCertain
const totalPct = totalAll > 0 ? ((totalUncertain / totalAll) * 100).toFixed(1) : '0.0'
console.log(`${'TOTAL'.padEnd(6)} ${totalAll.toLocaleString().padStart(8)} ${totalCertain.toLocaleString().padStart(8)} ${totalUncertain.toLocaleString().padStart(10)} ${(totalPct + '%').padStart(12)}`)
