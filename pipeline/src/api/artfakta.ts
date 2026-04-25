import { ADB_KEY, ARTFAKTA_BASE_URL } from "../config.ts";

const HEADERS = {
  "Content-Type": "application/json",
  "Ocp-Apim-Subscription-Key": ADB_KEY,
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface ArtfaktaSearchResult {
  taxonId: number;
  swedishName: string;
  scientificName: string;
}

interface ArtfaktaSpeciesData {
  taxonId: number;
  scientificName: string;
  swedishName: string;
  speciesData: {
    redlistInfo?: Array<{
      period: { current: boolean };
      category: string;
    }>;
    speciesFactText?: {
      characteristic: string | null;
      spreadAndStatus: string | null;
      ecology: string | null;
      threat: string | null;
    };
  };
}

export async function searchArtfaktaTaxon(
  scientificName: string,
): Promise<number | null> {
  const url = `${ARTFAKTA_BASE_URL}/speciesdata/search?searchString=${encodeURIComponent(scientificName)}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) return null;
  const data = (await res.json()) as ArtfaktaSearchResult[];
  const match = data.find(
    (r) => r.scientificName.toLowerCase() === scientificName.toLowerCase(),
  );
  return match?.taxonId ?? null;
}

export interface ArtfaktaInfo {
  description: string | null;
  spreadAndStatus: string | null;
  ecology: string | null;
  redListCategory: string | null;
}

export async function fetchArtfaktaSpeciesData(
  artfaktaTaxonId: number,
): Promise<ArtfaktaInfo | null> {
  const url = `${ARTFAKTA_BASE_URL}/speciesdata?taxa=${artfaktaTaxonId}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) return null;
  const data = (await res.json()) as ArtfaktaSpeciesData[];
  if (data.length === 0) return null;

  const item = data[0];
  const sd = item.speciesData;
  const currentRedlist = sd.redlistInfo?.find((r) => r.period?.current);
  const facts = sd.speciesFactText;

  return {
    description: facts?.characteristic?.trim() || null,
    spreadAndStatus: facts?.spreadAndStatus?.trim() || null,
    ecology: facts?.ecology?.trim() || null,
    redListCategory: currentRedlist?.category ?? null,
  };
}

async function fetchWithRetry(
  url: string,
  attempt = 0,
): Promise<Response> {
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? 0);
    const delay =
      retryAfter > 0 ? retryAfter * 1000 : Math.min(2 ** attempt * 1000, 60_000);
    if (attempt >= 8)
      throw new Error(`Rate limited after ${attempt} retries: ${url}`);
    await sleep(delay);
    return fetchWithRetry(url, attempt + 1);
  }
  return res;
}
