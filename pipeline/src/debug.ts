// Temporary debug script — run with: npx tsx src/debug.ts
import { ADB_KEY, SOS_BASE_URL } from './config.ts'

const HEADERS = {
  'Content-Type': 'application/json',
  'Ocp-Apim-Subscription-Key': ADB_KEY,
}

const obsRes = await fetch(`${SOS_BASE_URL}/Observations/Search?take=1`, {
  method: 'POST',
  headers: HEADERS,
  body: JSON.stringify({
    taxon: { ids: [3000172], includeUnderlyingTaxa: true },
    output: { fieldSet: 'Extended' },
  }),
})
const obsBody = await obsRes.json() as { records: unknown[] }
// Print full observation so we can see taxon + occurrence.lifeStage fields
console.log(JSON.stringify(obsBody.records[0], null, 2))
