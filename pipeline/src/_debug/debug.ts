// Diagnostic script — run with: npm run debug
import {
  ADB_KEY,
  DYNTAXA_BASE_URL,
  DYNTAXA_KEY,
  SOS_BASE_URL,
  TAXON_GROUPS,
} from "../config.ts";

if (!ADB_KEY) {
  console.error("ADB_SUBSCRIPTION_KEY is not set");
  process.exit(1);
}

const group = TAXON_GROUPS[0];
console.log(`Group: ${group.scientific} (taxonId=${group.taxonId})`);
console.log("SOS base:", SOS_BASE_URL);
console.log("Dyntaxa base:", DYNTAXA_BASE_URL);
console.log("Dyntaxa key set:", DYNTAXA_KEY ? "yes" : "no");
console.log();

// 1. Raw SOS observation (Extended field set) — check taxon.attributes structure
console.log("=== SOS observation (Extended) ===");
const obsRes = await fetch(`${SOS_BASE_URL}/Observations/Search?take=1`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": ADB_KEY,
  },
  body: JSON.stringify({
    taxon: {
      ids: [group.taxonId],
      includeUnderlyingTaxa: true,
      isUncertain: false,
    },
    date: { startDate: "2024-01-01", endDate: "2024-12-31" },
    output: { fieldSet: "Extended" },
  }),
});
const obsBody = (await obsRes.json()) as { records: unknown[] };
const obs = obsBody.records[0] as any;
console.log("taxon.id:", obs?.taxon?.id);
console.log("taxon.scientificName:", obs?.taxon?.scientificName);
console.log("taxon.vernacularName:", obs?.taxon?.vernacularName);
console.log(
  "taxon.attributes:",
  JSON.stringify(obs?.taxon?.attributes, null, 2),
);
console.log("occurrence (full):", JSON.stringify(obs?.occurrence, null, 2));
console.log();

// 2. Test Dyntaxa childids endpoint
console.log("=== Dyntaxa childids ===");
const DH = { "Ocp-Apim-Subscription-Key": DYNTAXA_KEY };

// Get direct children of Odonata
const childUrl = `${DYNTAXA_BASE_URL}/taxa/${group.taxonId}/childids`;
const r1 = await fetch(childUrl, { headers: DH });
console.log(`childids(Odonata): ${r1.status}`);
if (r1.ok) {
  const raw = await r1.json();
  console.log("  Raw response:", JSON.stringify(raw).slice(0, 500));
  const ids = Array.isArray(raw)
    ? (raw as number[])
    : ((raw as any)?.taxonIds ??
      (raw as any)?.ids ??
      (raw as any)?.childTaxonIds ??
      []);
  console.log(`  Resolved to ${ids.length} IDs:`, ids.slice(0, 10));

  // Drill one level deeper on the first child
  const unwrap = (raw: unknown): number[] =>
    Array.isArray(raw) ? raw : ((raw as any)?.taxonIds ?? []);

  if (ids.length > 0) {
    const r2 = await fetch(`${DYNTAXA_BASE_URL}/taxa/${ids[0]}/childids`, {
      headers: DH,
    });
    const ids2 = r2.ok ? unwrap(await r2.json()) : [];
    console.log(
      `  childids(${ids[0]}): ${ids2.length} IDs:`,
      ids2.slice(0, 10),
    );

    if (ids2.length > 0) {
      const r3 = await fetch(`${DYNTAXA_BASE_URL}/taxa/${ids2[0]}/childids`, {
        headers: DH,
      });
      const ids3 = r3.ok ? unwrap(await r3.json()) : [];
      console.log(
        `    childids(${ids2[0]}): ${ids3.length} IDs:`,
        ids3.slice(0, 5),
      );
    }
  }
} else {
  console.log("  Body:", await r1.text());
}
