import { ADB_KEY, DYNTAXA_BASE_URL } from "../config.ts";
import type { DyntaxaTaxon } from "../types.ts";

// The Dyntaxa taxon service is accessed through the same API management
// gateway as SOS. The base path may differ — adjust DYNTAXA_BASE_URL if
// the portal shows a different URL after subscribing to the Dyntaxa product.
//
// Common pattern: https://api.artdatabanken.se/taxonservice/v1
const HEADERS = {
  "Content-Type": "application/json",
  "Ocp-Apim-Subscription-Key": ADB_KEY,
};

// ---------------------------------------------------------------------------
// Fetch all child species (leaves) under a root taxon ID.
// Uses the /taxa/{id}/subtaxa endpoint to walk the tree.
// ---------------------------------------------------------------------------

export async function fetchChildSpecies(
  rootTaxonId: number,
): Promise<DyntaxaTaxon[]> {
  const url = new URL(`${DYNTAXA_BASE_URL}/taxa/${rootTaxonId}/subtaxa`);
  url.searchParams.set("take", "1000");

  const res = await fetch(url.toString(), { headers: HEADERS });
  if (!res.ok)
    throw new Error(
      `GET ${DYNTAXA_BASE_URL}/taxa/${rootTaxonId}/subtaxa → ${res.status} ${res.statusText}`,
    );

  const body = (await res.json()) as {
    records?: DyntaxaTaxon[];
    taxa?: DyntaxaTaxon[];
  };
  // Handle both response shapes the API might use
  const taxa = body.records ?? body.taxa ?? (body as unknown as DyntaxaTaxon[]);
  return Array.isArray(taxa) ? taxa : [];
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
