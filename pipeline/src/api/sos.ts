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

    const res = await fetch(url.toString(), { headers: HEADERS })
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
// Chunked fetch — handles queries that exceed the 10,000 observation limit
// by splitting on area (province), then by year if still over limit.
// ---------------------------------------------------------------------------

const PAGE_SIZE = 1000;
const MAX_PER_QUERY = 10_000;

export async function fetchAllObservations(
  baseFilter: SosSearchFilter,
  provinceIds: string[],
  onProgress?: (msg: string) => void,
): Promise<SosObservation[]> {
  const count = await countObservations(baseFilter);
  onProgress?.(`  ${count.toLocaleString()} observations for this filter`);

  if (count <= MAX_PER_QUERY) {
    return paginateFetch(baseFilter, count, onProgress);
  }

  // Split by province
  onProgress?.(
    `  Exceeds ${MAX_PER_QUERY} — splitting by province (${provinceIds.length})`,
  );
  const results: SosObservation[] = [];

  for (const provinceId of provinceIds) {
    const filter: SosSearchFilter = {
      ...baseFilter,
      geographics: {
        areas: [{ areaType: "Province", featureId: provinceId }],
      },
    };
    const provinceCount = await countObservations(filter);
    onProgress?.(
      `    Province ${provinceId}: ${provinceCount.toLocaleString()}`,
    );

    if (provinceCount <= MAX_PER_QUERY) {
      results.push(...(await paginateFetch(filter, provinceCount, onProgress)));
    } else {
      // Rare: split by individual year within province
      const { date } = baseFilter;
      if (!date?.startDate || !date?.endDate) {
        throw new Error(
          `Province ${provinceId} has ${provinceCount} observations with no date range to split on`,
        );
      }
      const startYear = new Date(date.startDate).getFullYear();
      const endYear = new Date(date.endDate).getFullYear();

      for (let year = startYear; year <= endYear; year++) {
        const yearFilter: SosSearchFilter = {
          ...filter,
          date: {
            startDate: `${year}-01-01`,
            endDate: `${year}-12-31`,
          },
        };
        const yearCount = await countObservations(yearFilter);
        if (yearCount > MAX_PER_QUERY) {
          console.warn(
            `  Province ${provinceId}, year ${year}: ${yearCount} > ${MAX_PER_QUERY} — truncating at ${MAX_PER_QUERY}`,
          );
        }
        results.push(
          ...(await paginateFetch(
            yearFilter,
            Math.min(yearCount, MAX_PER_QUERY),
            onProgress,
          )),
        );
      }
    }
  }

  return results;
}

async function paginateFetch(
  filter: SosSearchFilter,
  total: number,
  onProgress?: (msg: string) => void,
): Promise<SosObservation[]> {
  const pages = Math.ceil(Math.min(total, MAX_PER_QUERY) / PAGE_SIZE);
  const results: SosObservation[] = [];

  for (let page = 0; page < pages; page++) {
    const skip = page * PAGE_SIZE;
    onProgress?.(`    Page ${page + 1}/${pages} (skip=${skip})`);
    if (page > 0) await sleep(PAGE_DELAY_MS)
    const records = await fetchPage(filter, skip);
    results.push(...records);
    if (records.length < PAGE_SIZE) break; // last page
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
  geographics?: {
    areas: Array<{ areaType: "Province" | "Municipality"; featureId: string }>;
  };
  output?: {
    fieldSet: "Minimum" | "Extended" | "AllWithValues" | "All";
  };
}
