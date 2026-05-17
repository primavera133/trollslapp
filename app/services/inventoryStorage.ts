import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@trollslapp/reports";

export interface ReportEntry {
  speciesId: number;
  swedish: string | null;
  scientific: string;
  count: number;
}

export interface SavedReport {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  latitude: number;
  longitude: number;
  entries: ReportEntry[];
}

export async function saveReport(report: SavedReport): Promise<void> {
  const existing = await loadReports();
  existing.unshift(report);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export async function loadReports(): Promise<SavedReport[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedReport[];
  } catch {
    return [];
  }
}

export async function deleteReport(id: string): Promise<void> {
  const existing = await loadReports();
  const filtered = existing.filter((r) => r.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function formatReportText(report: SavedReport): string {
  const observed = report.entries.filter((e) => e.count > 0);
  const totalSpecies = observed.length;
  const totalIndividuals = observed.reduce((sum, e) => sum + e.count, 0);

  const lines: string[] = [
    `INVENTERING ${report.date} ${report.startTime}–${report.endTime}`,
    `Plats: ${report.latitude.toFixed(4)}°N, ${report.longitude.toFixed(4)}°E`,
    `Varaktighet: 15 min`,
    "",
    "Art".padEnd(35) + "Antal",
  ];

  for (const entry of observed) {
    const name = entry.swedish ?? entry.scientific;
    lines.push(name.padEnd(35) + String(entry.count));
  }

  lines.push("");
  lines.push(`Totalt: ${totalSpecies} arter, ${totalIndividuals} individer`);

  return lines.join("\n");
}
