// Shows the species list for a given observer in a given province,
// and flags which species come from co-observations (observer not first in list).
//
// Run: npm run debug-observer-species

import { ADB_KEY, SOS_BASE_URL } from "./config.ts";
import { START_YEAR, CURRENT_YEAR } from "./config.ts";

const OBSERVER = "Anna Fohrman";
const PROVINCE_FEATURE_ID = "1";   // Skåne
const ODONATA_TAXON_ID = 3000172;

if (!ADB_KEY) {
  console.error("ADB_SUBSCRIPTION_KEY is not set");
  process.exit(1);
}

const HEADERS = {
  "Content-Type": "application/json",
  "Ocp-Apim-Subscription-Key": ADB_KEY,
};

const obs_lc = OBSERVER.toLowerCase();

// species map: taxonId → { scientificName, vernacularName, firstDate, primary: bool }
const speciesMap = new Map<number, {
  scientific: string;
  swedish: string;
  firstDate: string;
  primary: boolean;   // was observer listed first?
  recordedBy: string;
}>();

async function fetchYear(year: number): Promise<void> {
  const filter = {
    taxon: { ids: [ODONATA_TAXON_ID], includeUnderlyingTaxa: true },
    date: { startDate: `${year}-01-01`, endDate: `${year}-12-31` },
    output: { fieldSet: "Extended" },
  };

  const countRes = await fetch(`${SOS_BASE_URL}/Observations/Count`, {
    method: "POST", headers: HEADERS, body: JSON.stringify(filter),
  });
  const total = await countRes.json() as number;

  if (total === 0) return;

  // SOS enforces skip+take ≤ 50,000. Split by month if needed.
  if (total > 10_000) {
    for (let month = 1; month <= 12; month++) {
      const mm = String(month).padStart(2, "0");
      const lastDay = new Date(year, month, 0).getDate();
      const mFilter = {
        ...filter,
        date: { startDate: `${year}-${mm}-01`, endDate: `${year}-${mm}-${lastDay}` },
      };
      await fetchAll(mFilter);
    }
  } else {
    await fetchAll(filter);
  }
}

async function fetchAll(filter: object): Promise<void> {
  let skip = 0;
  while (true) {
    const res = await fetch(`${SOS_BASE_URL}/Observations/Search?skip=${skip}&take=1000`, {
      method: "POST", headers: HEADERS, body: JSON.stringify(filter),
    });
    if (!res.ok) {
      console.error(`HTTP ${res.status}: ${await res.text()}`);
      return;
    }
    const body = await res.json() as { records: any[] };

    for (const obs of body.records) {
      const recordedBy: string = obs.occurrence?.recordedBy ?? "";
      if (!recordedBy.toLowerCase().includes(obs_lc)) continue;
      if (obs.location?.province?.featureId !== PROVINCE_FEATURE_ID) continue;
      if (obs.identification?.uncertainIdentification) continue;

      const taxonId: number = obs.taxon?.id;
      const scientific: string = obs.taxon?.scientificName ?? "";
      const swedish: string = obs.taxon?.vernacularName ?? "";
      const date: string = obs.event?.startDate ?? "";

      const parts = recordedBy.split(/[;,]/).map((s: string) => s.trim());
      const isPrimary = parts[0].toLowerCase() === obs_lc;

      const existing = speciesMap.get(taxonId);
      if (!existing || date < existing.firstDate) {
        speciesMap.set(taxonId, { scientific, swedish, firstDate: date, primary: isPrimary, recordedBy });
      } else if (existing && !existing.primary && isPrimary) {
        speciesMap.set(taxonId, { ...existing, primary: true, recordedBy });
      }
    }

    skip += body.records.length;
    if (body.records.length < 1000) break;
    await new Promise(r => setTimeout(r, 300));
  }
}

console.log(`Fetching year by year for "${OBSERVER}" in province "${PROVINCE_FEATURE_ID}"...`);
for (let year = START_YEAR; year <= CURRENT_YEAR; year++) {
  process.stdout.write(`  ${year}... `);
  await fetchYear(year);
  console.log(`(${speciesMap.size} species so far)`);
}

const species = [...speciesMap.entries()].sort((a, b) => a[1].firstDate.localeCompare(b[1].firstDate));
const primary = species.filter(([, s]) => s.primary);
const secondary = species.filter(([, s]) => !s.primary);

console.log(`\nTotal unique species in province ${PROVINCE_FEATURE_ID}: ${species.length}`);
console.log(`  As primary observer:   ${primary.length}`);
console.log(`  As secondary observer: ${secondary.length}`);

if (secondary.length > 0) {
  console.log("\n─── Species where observer is NOT listed first ───");
  for (const [id, s] of secondary) {
    console.log(`  [${id}] ${s.swedish ?? s.scientific} (${s.firstDate.slice(0, 10)})`);
    console.log(`    recordedBy: ${s.recordedBy}`);
  }
}

console.log("\n─── All species (chronological) ───");
for (const [id, s] of species) {
  const marker = s.primary ? "   " : "[2]";
  console.log(`${marker} ${s.firstDate.slice(0, 10)}  ${s.swedish ?? s.scientific}`);
}
