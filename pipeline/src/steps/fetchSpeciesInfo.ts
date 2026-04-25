import { searchArtfaktaTaxon, fetchArtfaktaSpeciesData } from '../api/artfakta.ts'
import { fetchGeoGridAggregation } from '../api/sos.ts'
import { GRID_ZOOM } from '../config.ts'
import type { Species, SpeciesInfo, GridCell } from '../types.ts'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const DELAY_MS = 500

export async function fetchSpeciesInfo(
  species: Map<number, Species>,
): Promise<{
  speciesInfo: Map<number, SpeciesInfo>
  gridData: Map<number, GridCell[]>
}> {
  const speciesInfo = new Map<number, SpeciesInfo>()
  const gridData = new Map<number, GridCell[]>()

  const targets = [...species.values()].filter(
    s => s.rank === 'species' || s.rank === 'subspecies',
  )
  console.log(`Fetching species info for ${targets.length} species...`)

  for (let i = 0; i < targets.length; i++) {
    const sp = targets[i]
    process.stdout.write(`  ${i + 1}/${targets.length} ${sp.scientific}...`)

    // Artfakta uses different taxon IDs — search by scientific name
    const artfaktaId = await searchArtfaktaTaxon(sp.scientific)
    if (artfaktaId) {
      await sleep(DELAY_MS)
      const info = await fetchArtfaktaSpeciesData(artfaktaId)
      if (info) {
        speciesInfo.set(sp.id, {
          taxonId: sp.id,
          description: info.description,
          spreadAndStatus: info.spreadAndStatus,
          ecology: info.ecology,
          redListCategory: info.redListCategory,
        })
      }
    }

    // GeoGrid uses SOS taxon IDs (same as Dyntaxa)
    await sleep(DELAY_MS)
    const cells = await fetchGeoGridAggregation(sp.id, GRID_ZOOM)
    if (cells.length > 0) {
      gridData.set(
        sp.id,
        cells.map(c => ({
          taxonId: sp.id,
          topLat: c.boundingBox.topLeft.latitude,
          topLng: c.boundingBox.topLeft.longitude,
          bottomLat: c.boundingBox.bottomRight.latitude,
          bottomLng: c.boundingBox.bottomRight.longitude,
          count: c.observationsCount,
        })),
      )
    }

    const infoStatus = speciesInfo.has(sp.id) ? 'info' : 'no info'
    const gridStatus = gridData.has(sp.id) ? `${gridData.get(sp.id)!.length} cells` : 'no grid'
    console.log(` ${infoStatus}, ${gridStatus}`)
  }

  console.log(`  ${speciesInfo.size} species with info, ${gridData.size} with grid data`)
  return { speciesInfo, gridData }
}
