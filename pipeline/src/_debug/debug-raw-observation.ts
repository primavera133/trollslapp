// Fetches sibirisk vinterflickslända observations by Christer Bergendorff and
// dumps the identification fields to see how SOS represents the "osäker" flag.
//
// Run: npm run debug-raw-observation

import { existsSync, readFileSync } from "node:fs";
import { ADB_KEY, SOS_BASE_URL } from "../config.ts";

const OBSERVER = "Stefan Cherrug";
const VERNACULAR = "griptångsflickslända";

if (!ADB_KEY) {
  console.error("ADB_SUBSCRIPTION_KEY is not set");
  process.exit(1);
}

const HEADERS = {
  "Content-Type": "application/json",
  "Ocp-Apim-Subscription-Key": ADB_KEY,
};

// Resolve taxon ID from dump
const dump = "debug-observations.json";
if (!existsSync(dump)) {
  console.error(`${dump} not found — run npm run debug-fetch first`);
  process.exit(1);
}
const all: Array<{ vernacular: string; taxonId: number }> = JSON.parse(
  readFileSync(dump, "utf8"),
);
const match = all.find(
  (r) => r.vernacular.toLowerCase() === VERNACULAR.toLowerCase(),
);
if (!match) {
  console.error(`"${VERNACULAR}" not found in dump`);
  process.exit(1);
}
console.log(`Taxon ID: ${match.taxonId}\n`);

const filter = {
  taxon: { ids: [match.taxonId], includeUnderlyingTaxa: false },
  output: { fieldSet: "Extended" },
};

const countRes = await fetch(`${SOS_BASE_URL}/Observations/Count`, {
  method: "POST",
  headers: HEADERS,
  body: JSON.stringify(filter),
});
const total = (await countRes.json()) as number;
console.log(
  `Total SOS observations for ${VERNACULAR}: ${total.toLocaleString()}`,
);

// Paginate and find Christer's observations
const obs_lc = OBSERVER.toLowerCase();
let skip = 0;
const found: any[] = [];

while (skip < total && found.length < 20) {
  const res = await fetch(
    `${SOS_BASE_URL}/Observations/Search?skip=${skip}&take=1000`,
    {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(filter),
    },
  );
  const body = (await res.json()) as { records: any[] };
  for (const obs of body.records) {
    if ((obs.occurrence?.recordedBy ?? "").toLowerCase().includes(obs_lc)) {
      found.push(obs);
    }
  }
  skip += body.records.length;
  if (body.records.length < 1000) break;
  await new Promise((r) => setTimeout(r, 300));
}

console.log(`Found ${found.length} observation(s) by "${OBSERVER}"\n`);
for (const obs of found) {
  console.log("─".repeat(60));
  console.log("date:        ", obs.event?.startDate);
  console.log("recordedBy:  ", obs.occurrence?.recordedBy);
  console.log(
    "province:    ",
    obs.location?.province?.name,
    `(${obs.location?.province?.featureId})`,
  );
  console.log(
    "municipality:",
    obs.location?.municipality?.name,
    `(${obs.location?.municipality?.featureId})`,
  );
  console.log("url:         ", obs.occurrence?.url);
  console.log("identification:", JSON.stringify(obs.identification, null, 2));
}
