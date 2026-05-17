import { fetchAreas } from "../api/sos.ts";
import type { Locale } from "../types.ts";

export async function fetchLocales(): Promise<Locale[]> {
  console.log("Fetching locales...");

  const [provinces, municipalities] = await Promise.all([
    fetchAreas("Province"),
    fetchAreas("Municipality"),
  ]);

  console.log(
    `  ${provinces.length} provinces, ${municipalities.length} municipalities`,
  );

  const locales: Locale[] = [
    ...provinces.map((a) => ({
      id: a.featureId,
      type: "province" as const,
      name: a.name,
    })),
    ...municipalities.map((a) => ({
      id: a.featureId,
      type: "municipality" as const,
      name: a.name,
    })),
  ];

  return locales;
}
