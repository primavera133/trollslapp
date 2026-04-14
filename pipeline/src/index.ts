import { ADB_KEY, TAXON_GROUPS } from "./config.ts";
import { publishRelease } from "./publish.ts";
import { buildDatabase } from "./steps/buildDatabase.ts";
import { fetchLocales } from "./steps/fetchLocales.ts";
import { fetchObservations } from "./steps/fetchObservations.ts";
import { fetchSpecies } from "./steps/fetchSpecies.ts";

async function main() {
  console.log("=== Trollslapp pipeline ===");
  console.log(
    `Taxon groups: ${TAXON_GROUPS.map((g) => g.scientific).join(", ")}`,
  );

  if (!ADB_KEY) {
    throw new Error(
      "ADB_SUBSCRIPTION_KEY is not set.\n" +
        "Register at https://api-portal.artdatabanken.se/ and set the env var.",
    );
  }

  const locales = await fetchLocales();
  const species = await fetchSpecies(TAXON_GROUPS);
  const cells = await fetchObservations(TAXON_GROUPS, locales);
  const { dbPath, manifestPath } = buildDatabase(
    TAXON_GROUPS,
    locales,
    species,
    cells,
  );

  await publishRelease(dbPath, manifestPath);

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
