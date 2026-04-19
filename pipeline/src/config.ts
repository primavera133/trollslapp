// ---------------------------------------------------------------------------
// Pipeline configuration
// ---------------------------------------------------------------------------
// ADB_BASE_URL: obtain from https://api-portal.artdatabanken.se/ after
//   subscribing to the "Species Observations" product.
//   Typically looks like:
//   https://api.artdatabanken.se/species-observation-system/v1
// ADB_SUBSCRIPTION_KEY: your subscription key from the same portal.
// ---------------------------------------------------------------------------

export const ADB_BASE_URL =
  process.env.ADB_BASE_URL ?? "https://api.artdatabanken.se";
export const ADB_KEY = process.env.ADB_SUBSCRIPTION_KEY ?? "";
export const DYNTAXA_KEY = process.env.DYNTAXA_SUBSCRIPTION_KEY ?? "";

export const SOS_BASE_URL = `${ADB_BASE_URL}/species-observation-system/v1`;
export const DYNTAXA_BASE_URL = `${ADB_BASE_URL}/taxonservice/v1`;

// Taxon groups to include in the dataset.
// taxonId: Dyntaxa ID for the root taxon (order/family/etc.)
// All child taxa (species) are automatically included via includeUnderlyingTaxa.
//
export const TAXON_GROUPS: TaxonGroupConfig[] = [
  { taxonId: 3000172, scientific: "Odonata", swedish: "Trollsländor" },
  // { taxonId: ..., scientific: 'Lepidoptera', swedish: 'Fjärilar' },
];

// Taxon IDs to exclude from the dataset entirely.
// New species not in this list are included automatically.
// Add Dyntaxa taxon IDs here to hide taxa you don't want displayed.
export const TAXON_BLACKLIST: ReadonlySet<number> = new Set([
  // e.g. 3000001,
]);

export interface TaxonGroupConfig {
  taxonId: number;
  scientific: string;
  swedish: string;
}

// First year of observation data to include.
export const START_YEAR = 2000;
export const CURRENT_YEAR = new Date().getFullYear();

// GitHub Releases: owner/repo where the pipeline publishes its output.
export const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "";
export const GITHUB_REPO = process.env.GITHUB_REPO ?? "";
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";

export const OUTPUT_DIR = process.env.OUTPUT_DIR ?? "dist";
export const DB_FILENAME = "observations.sqlite";
export const JSON_FILENAME = "observations.json";
export const MANIFEST_FILENAME = "manifest.json";
