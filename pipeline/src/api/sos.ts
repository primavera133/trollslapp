import { ADB_KEY, SOS_BASE_URL } from "../config.ts";
import type { SosArea, SosObservation } from "../types.ts";

const HEADERS = {
  "Content-Type": "application/json",
  "Ocp-Apim-Subscription-Key": ADB_KEY,
};

// ---------------------------------------------------------------------------
// Areas
// ---------------------------------------------------------------------------

export async function fetchAreas(
  areaType: "Province" | "Municipality",
): Promise<SosArea[]> {
  // The areaType query param is not reliably filtered server-side,
  // so we fetch all pages and filter by the areaType field in each record.
  const all: SosArea[] = []
  const take = 500
  let skip = 0
  let total = Infinity

  while (skip < total) {
    const url = new URL(`${SOS_BASE_URL}/Areas`)
    url.searchParams.set("take", String(take))
    url.searchParams.set("skip", String(skip))

    let res: Response
    let attempt = 0
    while (true) {
      res = await fetch(url.toString(), { headers: HEADERS })
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After") ?? 0)
        const delay = retryAfter > 0 ? retryAfter * 1000 : Math.min(2 ** attempt * 1000, 60_000)
        if (attempt >= 8) throw new Error(`GET /Areas rate limited after ${attempt} retries`)
        await sleep(delay)
        attempt++
        continue
      }
      break
    }
    if (!res.ok)
      throw new Error(`GET /Areas → ${res.status} ${res.statusText}`)

    const body = (await res.json()) as {
      records: SosArea[]
      totalCount: number
    }
    total = body.totalCount
    all.push(...body.records)
    skip += take
  }

  return all.filter(a => a.areaType === areaType)
}

// ---------------------------------------------------------------------------
// Taxon aggregation — returns species that actually have observations
// under a given root taxon. Used instead of Dyntaxa to build the species list.
// ---------------------------------------------------------------------------

export interface SosTaxonAggregationItem {
  taxonId: number
  taxonCategoryId: number
  scientificName: string
  swedishName: string
  count: number
}

export async function fetchTaxonAggregation(
  rootTaxonId: number,
): Promise<SosTaxonAggregationItem[]> {
  const res = await fetch(`${SOS_BASE_URL}/Observations/TaxonAggregation?take=2000`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      taxon: { ids: [rootTaxonId], includeUnderlyingTaxa: true },
    }),
  })
  if (!res.ok)
    throw new Error(
      `POST /Observations/TaxonAggregation → ${res.status} ${res.statusText}`,
    )

  const body = (await res.json()) as {
    records?: SosTaxonAggregationItem[]
    taxonCounts?: SosTaxonAggregationItem[]
  }
  return body.records ?? body.taxonCounts ?? []
}

// ---------------------------------------------------------------------------
// Observation count — used to decide whether a query needs chunking
// ---------------------------------------------------------------------------

export async function countObservations(
  filter: SosSearchFilter,
  attempt = 0,
): Promise<number> {
  const res = await fetch(`${SOS_BASE_URL}/Observations/Count`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(filter),
  });
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? 0)
    const delay = retryAfter > 0 ? retryAfter * 1000 : Math.min(2 ** attempt * 1000, 60_000)
    if (attempt >= 8) throw new Error(`POST /Observations/Count rate limited after ${attempt} retries`)
    await sleep(delay)
    return countObservations(filter, attempt + 1)
  }
  if (!res.ok)
    throw new Error(
      `POST /Observations/Count → ${res.status} ${res.statusText}`,
    );
  return res.json() as Promise<number>;
}

// ---------------------------------------------------------------------------
// Paginated observation search
// Max 1,000 per page; SOS enforces a 10,000 total ceiling per filter.
// Call chunkAndFetch() instead of this directly.
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchPage(
  filter: SosSearchFilter,
  skip: number,
  attempt = 0,
): Promise<SosObservation[]> {
  const url = new URL(`${SOS_BASE_URL}/Observations/Search`);
  url.searchParams.set("skip", String(skip));
  url.searchParams.set("take", "1000");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(filter),
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? 0)
    const delay = retryAfter > 0
      ? retryAfter * 1000
      : Math.min(2 ** attempt * 1000, 60_000)   // exponential: 1s, 2s, 4s … 60s cap
    if (attempt >= 8) throw new Error(`POST /Observations/Search rate limited after ${attempt} retries`)
    process.stdout.write(`\n      429 — waiting ${delay / 1000}s (attempt ${attempt + 1})`)
    await sleep(delay)
    return fetchPage(filter, skip, attempt + 1)
  }

  if (!res.ok)
    throw new Error(
      `POST /Observations/Search (skip=${skip}) → ${res.status} ${res.statusText}`,
    );

  const body = (await res.json()) as { records: SosObservation[] };
  return body.records;
}

// Minimum delay between page fetches to stay under the rate limit.
const PAGE_DELAY_MS = 500

// ---------------------------------------------------------------------------
// Chunked fetch — splits queries into time windows small enough that each
// fits in a single API page (≤1000 results), eliminating multi-page
// pagination entirely. SOS pagination is non-deterministic (the same
// skip/take query returns different results on each call), so avoiding
// pagination is the only way to get reliable results.
//
// Splitting strategy: year → month → day.
// ---------------------------------------------------------------------------

export const PAGE_SIZE = 1000;

export async function fetchAllObservations(
  baseFilter: SosSearchFilter,
  onProgress?: (msg: string) => void,
): Promise<SosObservation[]> {
  const count = await countObservations(baseFilter);
  onProgress?.(`  ${count.toLocaleString()} observations`);

  if (count <= PAGE_SIZE) {
    return fetchPage(baseFilter, 0);
  }

  if (!baseFilter.date?.startDate || !baseFilter.date?.endDate) {
    throw new Error(`Cannot split filter with ${count} observations: no date range`);
  }

  const results: SosObservation[] = [];

  const rangeStart = new Date(baseFilter.date.startDate);
  const rangeEnd   = new Date(baseFilter.date.endDate);

  let cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (cur <= rangeEnd) {
    const yyyy = cur.getFullYear();
    const mm   = String(cur.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(yyyy, cur.getMonth() + 1, 0).getDate();
    const monthStart = `${yyyy}-${mm}-01`;
    const monthEnd   = `${yyyy}-${mm}-${lastDay}`;

    const monthFilter: SosSearchFilter = {
      ...baseFilter,
      date: { startDate: monthStart, endDate: monthEnd },
    };
    const monthCount = await countObservations(monthFilter);

    if (monthCount <= PAGE_SIZE) {
      onProgress?.(`    ${monthStart}: ${monthCount}`);
      if (monthCount > 0) results.push(...await fetchPage(monthFilter, 0));
    } else {
      onProgress?.(`    ${monthStart}: ${monthCount} — splitting by day`);
      results.push(...await fetchByDay(monthFilter, yyyy, cur.getMonth(), onProgress));
    }

    cur = new Date(yyyy, cur.getMonth() + 1, 1);
  }

  // Deduplicate: observations on day boundaries may appear in adjacent chunks
  // due to timezone differences between SOS date matching and observation timestamps.
  const seen = new Set<string>();
  const deduped: SosObservation[] = [];
  for (const obs of results) {
    const id = obs.occurrence.occurrenceId;
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(obs);
    }
  }
  if (deduped.length < results.length) {
    onProgress?.(`  Deduplicated: ${results.length} → ${deduped.length}`);
  }

  return deduped;
}

async function fetchByDay(
  monthFilter: SosSearchFilter,
  year: number,
  month: number,
  onProgress?: (msg: string) => void,
): Promise<SosObservation[]> {
  const results: SosObservation[] = [];
  const lastDay = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayFilter: SosSearchFilter = {
      ...monthFilter,
      date: { startDate: dateStr, endDate: dateStr },
    };

    await sleep(PAGE_DELAY_MS);
    const records = await fetchPage(dayFilter, 0);
    if (records.length > 0) {
      results.push(...records);
    }
    if (records.length >= PAGE_SIZE) {
      console.warn(`  ${dateStr}: ${records.length} observations — may be truncated at ${PAGE_SIZE}`);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Types for the search filter sent to SOS
// ---------------------------------------------------------------------------

export interface SosSearchFilter {
  taxon?: {
    ids: number[];
    includeUnderlyingTaxa: boolean;
  };
  date?: {
    startDate: string;
    endDate: string;
  };
  output?: {
    fieldSet: "Minimum" | "Extended" | "AllWithValues" | "All";
  };
}
