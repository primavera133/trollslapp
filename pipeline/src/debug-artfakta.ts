// Quick test of GeoGridAggregation at different zoom levels.
// Run: npm run debug-artfakta

import { ADB_KEY, SOS_BASE_URL } from "./config.ts";

if (!ADB_KEY) {
  console.error("ADB_SUBSCRIPTION_KEY is not set");
  process.exit(1);
}

const HEADERS = {
  "Content-Type": "application/json",
  "Ocp-Apim-Subscription-Key": ADB_KEY,
};

const TAXON_ID = 206046; // Aeshna cyanea (SOS/Dyntaxa ID)

for (const zoom of [7, 9, 10, 11]) {
  const url = `${SOS_BASE_URL}/Observations/GeoGridAggregation?zoom=${zoom}`;
  const res = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      taxon: { ids: [TAXON_ID], includeUnderlyingTaxa: false },
    }),
  });
  const data = await res.json();
  const cells = data.gridCells ?? [];
  const totalObs = cells.reduce((sum: number, c: any) => sum + c.observationsCount, 0);
  const maxObs = cells.length > 0 ? Math.max(...cells.map((c: any) => c.observationsCount)) : 0;

  // Calculate cell size from first cell
  let cellSizeKm = "";
  if (cells.length > 0) {
    const c = cells[0];
    const latDiff = Math.abs(c.boundingBox.topLeft.latitude - c.boundingBox.bottomRight.latitude);
    const lngDiff = Math.abs(c.boundingBox.bottomRight.longitude - c.boundingBox.topLeft.longitude);
    cellSizeKm = `~${(latDiff * 111).toFixed(0)}×${(lngDiff * 111 * Math.cos(c.boundingBox.topLeft.latitude * Math.PI / 180)).toFixed(0)}km`;
  }

  console.log(
    `zoom=${zoom}: ${cells.length} cells, ${totalObs} total obs, max=${maxObs}/cell, cell size ${cellSizeKm}`,
  );
}
