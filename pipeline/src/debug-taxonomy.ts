import { DYNTAXA_KEY } from './config.ts'
import { fetchTaxon, fetchChildIds } from './api/dyntaxa.ts'

if (!DYNTAXA_KEY) {
  console.error('DYNTAXA_SUBSCRIPTION_KEY is not set')
  process.exit(1)
}

const ODONATA_ID = 3000172

console.log('Fetching Odonata tree from Dyntaxa...\n')

const order = await fetchTaxon(ODONATA_ID)
console.log(`Order: ${order.scientificName} (${order.taxonCategory})`)

const children = await fetchChildIds(ODONATA_ID)
console.log(`Direct children: ${children.length}\n`)

for (const childId of children) {
  const child = await fetchTaxon(childId)
  console.log(`${child.scientificName} (${child.taxonCategory})`)

  const grandchildren = await fetchChildIds(childId)
  for (const gcId of grandchildren) {
    const gc = await fetchTaxon(gcId)
    console.log(`  ${gc.scientificName} (${gc.taxonCategory})`)

    const ggc = await fetchChildIds(gcId)
    for (const ggcId of ggc) {
      const t = await fetchTaxon(ggcId)
      console.log(`    ${t.scientificName} (${t.taxonCategory})`)
    }
  }
}
