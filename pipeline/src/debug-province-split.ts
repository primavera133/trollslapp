// Diagnoses why Stefan Cherrug's griptångsflickslända (taxon 208273) in Skåne
// is missing from the pipeline output.
//
// Checks:
//  1. Does fetchAreas('Province') return province featureId "1" (Skåne)?
//  2. What is the 2014 Odonata count for province "1"?
//  3. Does griptångsflickslända appear in those results?
//
// Run: npm run debug-province-split

import { ADB_KEY, SOS_BASE_URL } from "./config.ts";
import { fetchAreas } from "./api/sos.ts";

const ODONATA_TAXON_ID = 3000172;
const TARGET_TAXON_ID = 208273; // griptångsflickslända
const TARGET_OBSERVER = "stefan cherrug";
const TARGET_YEAR = 2014;

if (!ADB_KEY) {
  console.error("ADB_SUBSCRIPTION_KEY is not set");
  process.exit(1);
}

const HEADERS = {
  "Content-Type": "application/json",
  "Ocp-Apim-Subscription-Key": ADB_KEY,
};

// 1. Check fetchAreas
console.log("=== 1. fetchAreas('Province') ===");
const provinces = await fetchAreas("Province");
console.log(`Returned ${provinces.length} provinces`);
const hasSkane = provinces.some(p => p.featureId === "1");
console.log(`Province featureId "1" (Skåne) present: ${hasSkane}`);
if (!hasSkane) {
  console.log("Province IDs returned:", provinces.map(p => p.featureId).sort().join(", "));
}

// 2. Count 2014 Odonata for province "1" specifically
console.log(`\n=== 2. Count 2014 Odonata for province "1" ===`);
const filter2014Skane = {
  taxon: { ids: [ODONATA_TAXON_ID], includeUnderlyingTaxa: true },
  date: { startDate: `${TARGET_YEAR}-01-01`, endDate: `${TARGET_YEAR}-12-31` },
  geographics: { areas: [{ areaType: "Province", featureId: "1" }] },
  output: { fieldSet: "Extended" },
};
const countRes = await fetch(`${SOS_BASE_URL}/Observations/Count`, {
  method: "POST", headers: HEADERS, body: JSON.stringify(filter2014Skane),
});
const count2014Skane = await countRes.json() as number;
console.log(`2014 Odonata count in province "1": ${count2014Skane.toLocaleString()}`);

// 3. Fetch up to 1000 and look for griptångsflickslända by Stefan Cherrug
console.log(`\n=== 3. Searching for taxon ${TARGET_TAXON_ID} by "${TARGET_OBSERVER}" ===`);
const take = Math.min(count2014Skane, 10000);
let found = false;
let skip = 0;

while (skip < Math.min(count2014Skane, 10000)) {
  const res = await fetch(`${SOS_BASE_URL}/Observations/Search?skip=${skip}&take=1000`, {
    method: "POST", headers: HEADERS, body: JSON.stringify(filter2014Skane),
  });
  const body = await res.json() as { records: any[] };

  for (const obs of body.records) {
    if (obs.taxon?.id === TARGET_TAXON_ID) {
      console.log(`\nFound taxon ${TARGET_TAXON_ID}:`);
      console.log("  recordedBy:", obs.occurrence?.recordedBy);
      console.log("  date:      ", obs.event?.startDate);
      console.log("  province:  ", obs.location?.province?.name, `(${obs.location?.province?.featureId})`);
      console.log("  uncertainIdentification:", obs.identification?.uncertainIdentification);
      console.log("  taxonCategory:", obs.taxon?.attributes?.taxonCategory);
      if ((obs.occurrence?.recordedBy ?? "").toLowerCase().includes(TARGET_OBSERVER)) {
        console.log("  *** MATCHES target observer ***");
        found = true;
      }
    }
  }

  skip += body.records.length;
  if (body.records.length < 1000) break;
  await new Promise(r => setTimeout(r, 300));
}

if (!found) {
  console.log(`\nNot found in 2014 Skåne Odonata results.`);
}

// 4. Also check 2014 Sweden total to see if splitting would be triggered
console.log(`\n=== 4. Count 2014 Odonata total (Sweden) ===`);
const filter2014All = {
  taxon: { ids: [ODONATA_TAXON_ID], includeUnderlyingTaxa: true },
  date: { startDate: `${TARGET_YEAR}-01-01`, endDate: `${TARGET_YEAR}-12-31` },
  output: { fieldSet: "Extended" },
};
const countRes2 = await fetch(`${SOS_BASE_URL}/Observations/Count`, {
  method: "POST", headers: HEADERS, body: JSON.stringify(filter2014All),
});
const count2014All = await countRes2.json() as number;
console.log(`2014 Odonata total Sweden: ${count2014All.toLocaleString()} (MAX_PER_QUERY = 10,000)`);
console.log(`Province splitting would be triggered: ${count2014All > 10000}`);
