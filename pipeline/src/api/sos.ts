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
  const url = new URL(`${SOS_BASE_URL}/Areas`);
  url.searchParams.set("areaType", areaType);
  url.searchParams.set("take", "1000");

  const res = await fetch(url.toString(), { headers: HEADERS });
  if (!res.ok)
    throw new Error(
      `GET /Areas?areaType=${areaType} → ${res.status} ${res.statusText}`,
    );

  const body = (await res.json()) as { records: SosArea[] };
  return body.records;
}

// ---------------------------------------------------------------------------
// Observation count — used to decide whether a query needs chunking
// ---------------------------------------------------------------------------

export async function countObservations(
  filter: SosSearchFilter,
): Promise<number> {
  const res = await fetch(`${SOS_BASE_URL}/Observations/Count`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(filter),
  });
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

async function fetchPage(
  filter: SosSearchFilter,
  skip: number,
): Promise<SosObservation[]> {
  const url = new URL(`${SOS_BASE_URL}/Observations/Search`);
  url.searchParams.set("skip", String(skip));
  url.searchParams.set("take", "1000");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(filter),
  });

  if (!res.ok)
    throw new Error(
      `POST /Observations/Search (skip=${skip}) → ${res.status} ${res.statusText}`,
    );

  const body = (await res.json()) as { records: SosObservation[] };
  return body.records;
}

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
