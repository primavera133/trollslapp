// Shared types used across pipeline steps.

export interface Locale {
  id: string; // SOS featureId
  type: "province" | "municipality";
  name: string;
}

// Taxonomic ranks we keep in the dataset.
// 'species' and 'subspecies' are exact identifications.
// 'genus' and 'family' cover observations recorded at a coarser level.
export type TaxonRank = "species" | "subspecies" | "genus" | "family";

// Dyntaxa taxonCategoryId → our TaxonRank
export const TAXON_CATEGORY_RANK: Record<number, TaxonRank> = {
  17: "species",
  19: "subspecies",
  14: "genus",
  10: "family",
};

export interface Species {
  id: number; // Dyntaxa taxon ID
  groupId: number; // parent taxon group ID
  scientific: string;
  swedish: string | null;
  genus: string; // first word of scientific name, e.g. "Anax"
  family: string | null; // family scientific name, e.g. "Aeshnidae"
  rank: TaxonRank;
  sortOrder?: number; // taxonomic sort order within the group
}

export interface TaxonGroup {
  id: number;
  scientific: string;
  swedish: string;
}

// Pre-aggregated observation count for a species × locale × year × week cell.
export interface ObservationCell {
  speciesId: number;
  localeId: string;
  year: number;
  week: number; // ISO week number, 1–53
  count: number;
}

// Shape of a single observation returned by the SOS Extended field set.
export interface SosObservation {
  occurrence: {
    occurrenceId: string;
    // lifeStage is absent when the data provider did not record it.
    lifeStage?: { id: number; value: string };
    // Observer name(s), comma- or semicolon-separated when multiple.
    recordedBy?: string;
    url?: string;
  };
  identification?: {
    // true when the observer themselves flagged the identification as uncertain
    // (Artportalen "osäker"). Not filterable via the SOS API — must be
    // checked client-side after fetching.
    uncertainIdentification?: boolean;
    validated?: boolean;
  };
  event: {
    startDate: string; // ISO 8601
  };
  location: {
    municipality?: { featureId: string; name: string };
    province?: { featureId: string; name: string };
    decimalLatitude?: number;
    decimalLongitude?: number;
  };
  taxon: {
    id: number;
    scientificName: string;
    vernacularName?: string;
    attributes?: {
      taxonCategory?: { id: number; value: string };
    };
  };
}

// Shape returned by GET /Areas
export interface SosArea {
  featureId: string;
  name: string;
  areaType: string;
}

// Shape returned by Dyntaxa taxon search
export interface DyntaxaTaxon {
  taxonId: number;
  scientificName: string;
  swedishName?: string;
  taxonCategory: string;
  parentTaxonId?: number;
}

// Top observer entry: one row per observer per locale.
export interface TopObserver {
  name: string;
  speciesCount: number;
  species: Array<{ speciesId: number; firstDate: string }>;
}

export interface SpeciesInfo {
  taxonId: number;
  description: string | null;
  spreadAndStatus: string | null;
  ecology: string | null;
  redListCategory: string | null;
}

export interface GridCell {
  taxonId: number;
  topLat: number;
  topLng: number;
  bottomLat: number;
  bottomLng: number;
  count: number;
}

export interface SupercellPhenology {
  cellLat: number; // integer index: Math.floor(lat / 0.2)
  cellLng: number; // integer index: Math.floor(lng / 0.3515625)
  speciesId: number;
  week: number;
}

export interface Manifest {
  generatedAt: string; // ISO 8601
  pipelineVersion: string;
  dbFilename: string;
}
