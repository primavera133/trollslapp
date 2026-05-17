// Filters debug-observations.json locally — no network calls.
// Edit the constants below, then run: npm run debug-filter
//
// Requires debug-observations.json to exist (run npm run debug-fetch first).

import { readFileSync } from "node:fs";

const OBSERVER_NAME = "Magnus Billqvist"; // substring match against recordedBy (case-insensitive)
const SPECIES_FILTER = ""; // substring match against vernacular or scientific; empty = all species

const IN_FILE = "debug-observations.json";

interface RawObs {
  date: string;
  vernacular: string;
  scientific: string;
  taxonId: number;
  province: string;
  provinceId: string;
  municipality: string;
  muniId: string;
  recordedBy: string;
  url: string;
}

console.log(`Reading ${IN_FILE}...`);
const all: RawObs[] = JSON.parse(readFileSync(IN_FILE, "utf8"));
console.log(`${all.length.toLocaleString()} total observations loaded`);
console.log(`Observer filter: "${OBSERVER_NAME}"`);
console.log(`Species filter:  "${SPECIES_FILTER || "(all)"}"`);
console.log();

const obs_lc = OBSERVER_NAME.toLowerCase();
const spec_lc = SPECIES_FILTER.toLowerCase();

const rows = all.filter(
  (r) =>
    r.recordedBy.toLowerCase().includes(obs_lc) &&
    (!SPECIES_FILTER ||
      r.vernacular.toLowerCase().includes(spec_lc) ||
      r.scientific.toLowerCase().includes(spec_lc)),
);

rows.sort((a, b) => a.date.localeCompare(b.date));

// Unique species by taxon ID — species/subspecies only (binomial scientific name).
// Genus- and family-level observations (single-word scientific name) are excluded,
// matching the pipeline's observer ranking logic.
const uniqueSpecies = new Map<number, string>();
const genusOrAbove = new Set<number>();
for (const r of rows) {
  const isSpeciesLevel = r.scientific.includes(" ");
  if (isSpeciesLevel) {
    if (!uniqueSpecies.has(r.taxonId))
      uniqueSpecies.set(r.taxonId, r.vernacular || r.scientific);
  } else {
    genusOrAbove.add(r.taxonId);
  }
}
const uniqueSpeciesSorted = [...uniqueSpecies.entries()].sort((a, b) =>
  a[1].localeCompare(b[1], "sv"),
);

const p = (s: string, n: number) => s.slice(0, n).padEnd(n);
console.log(`Total matching observations: ${rows.length}`);
console.log(`Unique species (taxon IDs):  ${uniqueSpecies.size}`);
if (genusOrAbove.size > 0) {
  console.log(
    `Genus/family-level excluded: ${genusOrAbove.size} (not counted in ranking)`,
  );
}
console.log();
console.log("Species seen:");
for (const [id, name] of uniqueSpeciesSorted) {
  console.log(`  ${String(id).padStart(8)}  ${name}`);
}
console.log();
console.log("─".repeat(110));
console.log(
  `${p("Date", 12)} ${p("Vernacular", 26)} ${p("Province", 18)} ${p("Municipality", 20)} ${p("recordedBy", 22)} URL`,
);
console.log("─".repeat(110));
for (const r of rows) {
  console.log(
    `${p(r.date, 12)} ${p(r.vernacular, 26)} ${p(r.province, 18)} ${p(r.municipality, 20)} ${p(r.recordedBy, 22)} ${r.url}`,
  );
}
