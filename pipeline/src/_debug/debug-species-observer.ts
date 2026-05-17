// Fetches all observations of a single species by a single observer directly from SOS.
// Results are saved to a file named after the species and observer.
//
// Edit the constants below, then run: npm run debug-species-observer

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { PAGE_SIZE } from "../api/sos.ts";
import { ADB_KEY, SOS_BASE_URL } from "../config.ts";

const SCIENTIFIC_NAME = "Somatochlora metallica";
const OBSERVER_NAME = "Jonas Myrenås"; // substring match, case-insensitive
// Set to 0 to auto-resolve from debug-observations.json, or hardcode to skip the lookup.
let TAXON_ID = 0;

if (!ADB_KEY) {
  console.error("ADB_SUBSCRIPTION_KEY is not set");
  process.exit(1);
}

const SOS_HEADERS = {
  "Content-Type": "application/json",
  "Ocp-Apim-Subscription-Key": ADB_KEY,
};

// 1. Resolve taxon ID from debug-observations.json if not hardcoded
if (TAXON_ID === 0) {
  const dump = "debug-observations.json";
  if (!existsSync(dump)) {
    console.error(`No taxon ID set and ${dump} not found.`);
    console.error(
      `Either run "npm run debug-fetch" first, or set TAXON_ID manually at the top of this script.`,
    );
    process.exit(1);
  }
  console.log(`Looking up "${SCIENTIFIC_NAME}" in ${dump}...`);
  const all: Array<{ scientific: string; taxonId: number }> = JSON.parse(
    readFileSync(dump, "utf8"),
  );
  const match = all.find(
    (r) => r.scientific.toLowerCase() === SCIENTIFIC_NAME.toLowerCase(),
  );
  if (!match) {
    console.error(
      `"${SCIENTIFIC_NAME}" not found in ${dump}. Check spelling or set TAXON_ID manually.`,
    );
    process.exit(1);
  }
  TAXON_ID = match.taxonId;
  console.log(`Found taxon ID: ${TAXON_ID}\n`);
} else {
  console.log(`Using taxon ID: ${TAXON_ID}\n`);
}

// 2. Count total observations for this species
const filter = {
  taxon: { ids: [TAXON_ID], includeUnderlyingTaxa: false },
  output: { fieldSet: "Extended" },
};
const countRes = await fetch(`${SOS_BASE_URL}/Observations/Count`, {
  method: "POST",
  headers: SOS_HEADERS,
  body: JSON.stringify(filter),
});
if (!countRes.ok) {
  console.error(`Count failed: ${countRes.status}`);
  process.exit(1);
}
const total = (await countRes.json()) as number;
console.log(`Total SOS observations for species: ${total.toLocaleString()}`);

// 3. Fetch all pages
const obs_lc = OBSERVER_NAME.toLowerCase();
const seen = new Set<string>(); // deduplicates against SOS pagination sort instability
const rows: {
  date: string;
  province: string;
  municipality: string;
  recordedBy: string;
  url: string;
}[] = [];

let skip = 0;
let page = 1;
const pages = Math.ceil(total / PAGE_SIZE);
process.stdout.write(`Fetching ${pages} page(s)`);

while (skip < total) {
  const url = new URL(`${SOS_BASE_URL}/Observations/Search`);
  url.searchParams.set("skip", String(skip));
  url.searchParams.set("take", String(PAGE_SIZE));
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: SOS_HEADERS,
    body: JSON.stringify(filter),
  });
  if (!res.ok) {
    process.stdout.write(` [${res.status} at page ${page}]`);
    break;
  }
  const body = (await res.json()) as { records: any[] };

  for (const obs of body.records) {
    const by: string = obs.occurrence?.recordedBy ?? "";
    if (!by.toLowerCase().includes(obs_lc)) continue;
    const url = obs.occurrence?.url ?? obs.occurrence?.occurrenceId ?? "";
    if (seen.has(url)) continue; // deduplicate against pagination sort instability
    seen.add(url);
    rows.push({
      date: obs.event?.startDate ?? "?",
      province: obs.location?.province?.name ?? "—",
      municipality: obs.location?.municipality?.name ?? "—",
      recordedBy: by,
      url,
    });
  }

  skip += body.records.length;
  page++;
  process.stdout.write(".");
  if (body.records.length < PAGE_SIZE) break;
  await new Promise((r) => setTimeout(r, 300));
}
process.stdout.write("\n\n");

// 4. Print results
rows.sort((a, b) => a.date.localeCompare(b.date));
const p = (s: string, n: number) => s.slice(0, n).padEnd(n);
console.log(
  `Observations of "${SCIENTIFIC_NAME}" by "${OBSERVER_NAME}": ${rows.length}`,
);
console.log("─".repeat(100));
console.log(
  `${p("Date", 14)} ${p("Province", 20)} ${p("Municipality", 22)} ${p("recordedBy", 24)} URL`,
);
console.log("─".repeat(100));
for (const r of rows) {
  console.log(
    `${p(r.date, 14)} ${p(r.province, 20)} ${p(r.municipality, 22)} ${p(r.recordedBy, 24)} ${r.url}`,
  );
}

// 5. Save to file
const safeName = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");
const outFile = `debug-${safeName(SCIENTIFIC_NAME)}-${safeName(OBSERVER_NAME)}.json`;
writeFileSync(outFile, JSON.stringify(rows, null, 2));
console.log(`\nSaved ${rows.length} row(s) to ${outFile}`);
