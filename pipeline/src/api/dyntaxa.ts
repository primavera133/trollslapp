import { DYNTAXA_KEY, DYNTAXA_BASE_URL } from "../config.ts";
import type { DyntaxaTaxon } from "../types.ts";

const HEADERS = {
  "Content-Type": "application/json",
  "Ocp-Apim-Subscription-Key": DYNTAXA_KEY,
};

// ---------------------------------------------------------------------------
// Fetch all descendant taxon IDs under a parent taxon.
// Returns every taxon in the subtree (all levels, not just direct children).
// ---------------------------------------------------------------------------

export async function fetchChildIds(parentTaxonId: number): Promise<number[]> {
  const url = `${DYNTAXA_BASE_URL}/taxa/${parentTaxonId}/childids`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  const body = (await res.json()) as { taxonIds?: number[] } | number[];
  return Array.isArray(body) ? body : (body.taxonIds ?? []);
}

// ---------------------------------------------------------------------------
// Fetch a single taxon by ID (used to get the root group's own names).
// ---------------------------------------------------------------------------

export async function fetchTaxon(taxonId: number): Promise<DyntaxaTaxon> {
  const res = await fetch(`${DYNTAXA_BASE_URL}/taxa/${taxonId}`, {
    headers: HEADERS,
  });
  if (!res.ok)
    throw new Error(`GET /taxa/${taxonId} → ${res.status} ${res.statusText}`);
  return res.json() as Promise<DyntaxaTaxon>;
}

// ---------------------------------------------------------------------------
// Search taxa by scientific name — useful for verifying a taxon ID.
// ---------------------------------------------------------------------------

export async function searchTaxa(name: string): Promise<DyntaxaTaxon[]> {
  const url = new URL(`${DYNTAXA_BASE_URL}/taxa`);
  url.searchParams.set("searchString", name);
  url.searchParams.set("take", "10");

  const res = await fetch(url.toString(), { headers: HEADERS });
  if (!res.ok)
    throw new Error(
      `GET /taxa?searchString=${name} → ${res.status} ${res.statusText}`,
    );

  const body = (await res.json()) as { records?: DyntaxaTaxon[] };
  return body.records ?? (body as unknown as DyntaxaTaxon[]);
}
