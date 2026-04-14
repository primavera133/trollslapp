// Shared types used across pipeline steps.

export interface Locale {
  id: string         // SOS featureId
  type: 'province' | 'municipality'
  name: string
}

export interface Species {
  id: number         // Dyntaxa taxon ID
  groupId: number    // parent taxon group ID
  scientific: string
  swedish: string | null
}

export interface TaxonGroup {
  id: number
  scientific: string
  swedish: string
}

// Pre-aggregated observation count for a species × locale × year × week cell.
export interface ObservationCell {
  speciesId: number
  localeId: string
  year: number
  week: number       // ISO week number, 1–53
  count: number
}

// Shape of a single observation returned by the SOS Extended field set.
export interface SosObservation {
  occurrence: {
    occurrenceId: string
    lifeStage?: { id: number; value: string }
  }
  event: {
    startDate: string  // ISO 8601 date string
  }
  location: {
    municipality?: { featureId: string; name: string }
    province?: { featureId: string; name: string }
  }
  taxon: {
    id: number
    scientificName: string
    vernacularName?: string
  }
}

// Shape returned by GET /Areas
export interface SosArea {
  featureId: string
  name: string
  areaType: string
}

// Shape returned by Dyntaxa taxon search
export interface DyntaxaTaxon {
  taxonId: number
  scientificName: string
  swedishName?: string
  taxonCategory: string
  parentTaxonId?: number
}

export interface Manifest {
  generatedAt: string    // ISO 8601
  pipelineVersion: string
  dbFilename: string
}
