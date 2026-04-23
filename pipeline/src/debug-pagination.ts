// Verifies whether the pipeline's pagination is losing observations.
// Fetches brun kejsartrollslända (208293) in June 2019 using the same
// fetchAllObservations function as the pipeline and checks for Magnus Billqvist.
//
// Run: npm run debug-pagination

import { ADB_KEY, SOS_BASE_URL } from "./config.ts";
import { fetchAllObservations, countObservations } from "./api/sos.ts";
import type { SosSearchFilter } from "./api/sos.ts";

if (!ADB_KEY) {
  console.error("ADB_SUBSCRIPTION_KEY is not set");
  process.exit(1);
}

const HEADERS = {
  "Content-Type": "application/json",
  "Ocp-Apim-Subscription-Key": ADB_KEY,
};

// Test 1: Fetch brun kejsartrollslända in June 2019 using the pipeline's function
console.log("=== Test 1: fetchAllObservations for June 2019 Odonata ===");

const juneFilter: SosSearchFilter = {
  taxon: { ids: [3000172], includeUnderlyingTaxa: true },
  date: { startDate: "2019-06-01", endDate: "2019-06-30" },
  output: { fieldSet: "Extended" },
};

const juneCount = await countObservations(juneFilter);
console.log(`Count endpoint says: ${juneCount.toLocaleString()} observations`);

const juneObs = await fetchAllObservations(juneFilter, msg => console.log(`  ${msg}`));
console.log(`Actually fetched: ${juneObs.length.toLocaleString()}`);
console.log(`Difference: ${juneCount - juneObs.length}`);

// Filter for species 208293 in Skåne
const target = juneObs.filter(
  o => o.taxon.id === 208293 && o.location.province?.featureId === "1"
);
console.log(`\nSpecies 208293 in Skåne: ${target.length} observations`);
for (const obs of target) {
  const rb = obs.occurrence.recordedBy ?? "(no recordedBy)";
  console.log(`  ${obs.event.startDate?.slice(0, 19)}  ${rb}`);
  console.log(`    occurrenceId: ${obs.occurrence.occurrenceId}`);
  console.log(`    uncertainIdentification: ${obs.identification?.uncertainIdentification}`);
}

const hasMagnus = target.some(o =>
  (o.occurrence.recordedBy ?? "").toLowerCase().includes("magnus billqvist")
);
console.log(`\nMagnus Billqvist found: ${hasMagnus}`);

// Test 2: Also try with sorting (if API supports it)
console.log("\n=== Test 2: Direct search for species 208293, June 2019, Skåne ===");
const directFilter: SosSearchFilter = {
  taxon: { ids: [208293], includeUnderlyingTaxa: false },
  date: { startDate: "2019-06-01", endDate: "2019-06-30" },
  output: { fieldSet: "Extended" },
};
const directObs = await fetchAllObservations(directFilter, msg => console.log(`  ${msg}`));
const directSkane = directObs.filter(o => o.location.province?.featureId === "1");
console.log(`Direct fetch: ${directSkane.length} observations in Skåne`);
for (const obs of directSkane) {
  const rb = obs.occurrence.recordedBy ?? "(no recordedBy)";
  console.log(`  ${obs.event.startDate?.slice(0, 19)}  ${rb}`);
}

// Test 3: Run fetchAllObservations twice to check for non-determinism
console.log("\n=== Test 3: Second fetch for comparison ===");
const juneObs2 = await fetchAllObservations(juneFilter, msg => console.log(`  ${msg}`));
console.log(`Second fetch: ${juneObs2.length.toLocaleString()}`);

const ids1 = new Set(juneObs.map(o => o.occurrence.occurrenceId));
const ids2 = new Set(juneObs2.map(o => o.occurrence.occurrenceId));
const onlyIn1 = [...ids1].filter(id => !ids2.has(id));
const onlyIn2 = [...ids2].filter(id => !ids1.has(id));
console.log(`Only in first fetch: ${onlyIn1.length}`);
console.log(`Only in second fetch: ${onlyIn2.length}`);
if (onlyIn1.length > 0 || onlyIn2.length > 0) {
  console.log("*** PAGINATION IS NON-DETERMINISTIC ***");
}
