// Debug script: show all dragonfly observations for a given observer.
// Filters by species name (Swedish or scientific, case-insensitive substring).
// Matches exactly what the pipeline sees from SOS.
//
// Edit the constants below, then run: npm run debug-observer

import {
  ADB_KEY,
  CURRENT_YEAR,
  SOS_BASE_URL,
  START_YEAR,
  TAXON_GROUPS,
} from "./config.ts";

const OBSERVER_NAME = "jonasmyrenas"; // substring match against occurrence.recordedBy
const SPECIES_FILTER = "Somatochlora arctica"; // substring match against vernacularName or scientificName; empty = show all

if (!ADB_KEY) {
  console.error("ADB_SUBSCRIPTION_KEY is not set");
  process.exit(1);
}

const HEADERS = {
  "Content-Type": "application/json",
  "Ocp-Apim-Subscription-Key": ADB_KEY,
};

const group = TAXON_GROUPS[0];
console.log(`Group: ${group.scientific} (taxonId=${group.taxonId})`);
console.log(`Observer filter: "${OBSERVER_NAME}"`);
console.log(`Species filter:  "${SPECIES_FILTER || "(all)"}"`);
console.log();

interface Row {
  date: string;
  vernacular: string;
  scientific: string;
  province: string;
  municipality: string;
  recordedBy: string;
  url: string;
}

const rows: Row[] = [];

for (let year = START_YEAR; year <= CURRENT_YEAR; year++) {
  const filter = {
    taxon: {
      ids: [group.taxonId],
      includeUnderlyingTaxa: true,
      isUncertain: false,
    },
    date: { startDate: `${year}-01-01`, endDate: `${year}-12-31` },
    output: { fieldSet: "Extended" },
  };

  const countRes = await fetch(`${SOS_BASE_URL}/Observations/Count`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(filter),
  });
  if (!countRes.ok) {
    process.stdout.write(`  ${year}: count failed\n`);
    continue;
  }
  const total = (await countRes.json()) as number;
  if (total === 0) continue;

  let skip = 0;
  let yearFound = 0;

  while (skip < Math.min(total, 10_000)) {
    const url = new URL(`${SOS_BASE_URL}/Observations/Search`);
    url.searchParams.set("skip", String(skip));
    url.searchParams.set("take", "1000");
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(filter),
    });
    if (!res.ok) {
      process.stdout.write(`  ${year} skip=${skip}: ${res.status}\n`);
      break;
    }
    const body = (await res.json()) as { records: any[] };

    for (const obs of body.records) {
      const by: string = obs.occurrence?.recordedBy ?? "";
      if (!by.toLowerCase().includes(OBSERVER_NAME.toLowerCase())) continue;

      const vernacular: string = obs.taxon?.vernacularName ?? "";
      const scientific: string = obs.taxon?.scientificName ?? "";
      const nameMatch =
        !SPECIES_FILTER ||
        vernacular.toLowerCase().includes(SPECIES_FILTER.toLowerCase()) ||
        scientific.toLowerCase().includes(SPECIES_FILTER.toLowerCase());
      if (!nameMatch) continue;

      rows.push({
        date: obs.event?.startDate ?? "?",
        vernacular,
        scientific,
        province: obs.location?.province?.name ?? "—",
        municipality: obs.location?.municipality?.name ?? "—",
        recordedBy: by,
        url: obs.occurrence?.url ?? obs.occurrence?.occurrenceId ?? "",
      });
      yearFound++;
    }

    skip += body.records.length;
    if (body.records.length < 1000) break;
  }

  if (yearFound > 0)
    process.stdout.write(`  ${year}: ${yearFound} matching obs\n`);
}

// Print results
rows.sort((a, b) => a.date.localeCompare(b.date));
const p = (s: string, n: number) => s.slice(0, n).padEnd(n);
console.log();
console.log(`Total: ${rows.length} observations`);
console.log("─".repeat(100));
console.log(
  `${p("Date", 12)} ${p("Vernacular", 24)} ${p("Province", 18)} ${p("Municipality", 20)} ${p("recordedBy", 20)} URL`,
);
console.log("─".repeat(100));
for (const r of rows) {
  console.log(
    `${p(r.date, 12)} ${p(r.vernacular, 24)} ${p(r.province, 18)} ${p(r.municipality, 20)} ${p(r.recordedBy, 20)} ${r.url}`,
  );
}
