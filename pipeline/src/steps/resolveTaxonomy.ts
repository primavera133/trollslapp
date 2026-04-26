import type { TaxonGroupConfig } from "../config.ts";
import type { Species } from "../types.ts";

// ---------------------------------------------------------------------------
// Name overrides — corrections for outdated names from Artfakta/SOS.
// Key: scientific name as it appears in the source data.
// Values override any combination of scientific name, Swedish name, and genus.
// When genus changes, the species is reassigned to the matching family.
// ---------------------------------------------------------------------------
const NAME_OVERRIDES: Record<
  string,
  { scientific?: string; swedish?: string; genus?: string }
> = {
  "Lestes viridis": {
    scientific: "Chalcolestes viridis",
    genus: "Chalcolestes",
  },
  "Aeshna isoceles": { scientific: "Isoaeschna isoceles", genus: "Isoaeschna" },
};

// ---------------------------------------------------------------------------
// Swedish Odonata taxonomy in standard taxonomic order.
// Zygoptera (damselflies) first, then Anisoptera (dragonflies).
// ---------------------------------------------------------------------------
interface GenusEntry {
  name: string;
  swedish: string;
}

interface FamilyEntry {
  family: string;
  swedish: string;
  genera: GenusEntry[];
}

const ODONATA_TAXONOMY: FamilyEntry[] = [
  // --- Zygoptera ---
  {
    family: "Lestidae",
    swedish: "Glansflicksländor",
    genera: [
      { name: "Chalcolestes", swedish: "Trädflicksländor" },
      { name: "Lestes", swedish: "Smaragdflicksländor" },
      { name: "Sympecma", swedish: "Vinterflicksländor" },
    ],
  },
  {
    family: "Calopterygidae",
    swedish: "Jungfrusländor",
    genera: [{ name: "Calopteryx", swedish: "Jungfrusländor" }],
  },
  {
    family: "Platycnemididae",
    swedish: "Flodflicksländor",
    genera: [{ name: "Platycnemis", swedish: "Flodflicksländor" }],
  },
  {
    family: "Coenagrionidae",
    swedish: "Dammflicksländor",
    genera: [
      { name: "Coenagrion", swedish: "Blå flicksländor" },
      { name: "Enallagma", swedish: "Sjöflicksländor" },
      { name: "Erythromma", swedish: "Rödögonflicksländor" },
      { name: "Ischnura", swedish: "Kustflicksländor" },
      { name: "Nehalennia", swedish: "Dvärgflicksländor" },
      { name: "Pyrrhosoma", swedish: "Röda flicksländor" },
    ],
  },
  // --- Anisoptera ---
  {
    family: "Aeshnidae",
    swedish: "Mosaiksländor",
    genera: [
      { name: "Aeshna", swedish: "Mosaiksländor" },
      { name: "Isoaeschna", swedish: "Kilfläcksländor" },
      { name: "Brachytron", swedish: "Tidiga mosaiksländor" },
      { name: "Anax", swedish: "Kejsartrollsländor" },
    ],
  },
  {
    family: "Gomphidae",
    swedish: "Flodtrollsländor",
    genera: [
      { name: "Gomphus", swedish: "Klubbtrollsländor" },
      { name: "Onychogomphus", swedish: "Tångtrollsländor" },
      { name: "Ophiogomphus", swedish: "Serpentintrollsländor" },
    ],
  },
  {
    family: "Cordulegastridae",
    swedish: "Kungstrollsländor",
    genera: [{ name: "Cordulegaster", swedish: "Kungstrollsländor" }],
  },
  {
    family: "Corduliidae",
    swedish: "Skimmertrollsländor",
    genera: [
      { name: "Cordulia", swedish: "Guldtrollsländor" },
      { name: "Epitheca", swedish: "Korgstjärtade trollsländor" },
      { name: "Somatochlora", swedish: "Glanstrollsländor" },
    ],
  },
  {
    family: "Libellulidae",
    swedish: "Segeltrollsländor",
    genera: [
      { name: "Crocothemis", swedish: "Karmintrollsländor" },
      { name: "Leucorrhinia", swedish: "Kärrtrollsländor" },
      { name: "Libellula", swedish: "Trollsländor" },
      { name: "Orthetrum", swedish: "Sjötrollsländor" },
      { name: "Sympetrum", swedish: "Ängstrollsländor" },
    ],
  },
];

const TAXONOMY_BY_GROUP: Record<string, FamilyEntry[]> = {
  Odonata: ODONATA_TAXONOMY,
};

export interface TaxonomyNames {
  families: Record<string, string>; // scientific → swedish
  genera: Record<string, string>; // scientific → swedish
}

export function getTaxonomyNames(): TaxonomyNames {
  const families: Record<string, string> = {};
  const genera: Record<string, string> = {};
  for (const taxonomy of Object.values(TAXONOMY_BY_GROUP)) {
    for (const fam of taxonomy) {
      families[fam.family] = fam.swedish;
      for (const g of fam.genera) {
        genera[g.name] = g.swedish;
      }
    }
  }
  return { families, genera };
}

export async function resolveTaxonomy(
  species: Map<number, Species>,
  groups: TaxonGroupConfig[],
): Promise<void> {
  console.log("Resolving taxonomy...");

  // Apply name overrides first
  for (const s of species.values()) {
    const override = NAME_OVERRIDES[s.scientific];
    if (override) {
      console.log(
        `  Override: ${s.scientific} → ${override.scientific ?? s.scientific}`,
      );
      if (override.scientific) s.scientific = override.scientific;
      if (override.swedish) s.swedish = override.swedish;
      if (override.genus) s.genus = override.genus;
    }
  }

  for (const group of groups) {
    const taxonomy = TAXONOMY_BY_GROUP[group.scientific];
    if (!taxonomy) {
      console.log(`  ${group.scientific}: no taxonomy mapping, skipping`);
      for (const s of species.values()) {
        if (s.groupId === group.taxonId) s.sortOrder = 0;
      }
      continue;
    }

    const groupSpecies = [...species.values()].filter(
      (s) => s.groupId === group.taxonId,
    );
    console.log(`  ${group.scientific}: ${groupSpecies.length} taxa`);

    // Build genus → family + sort position
    const genusFamily = new Map<string, string>();
    const genusSortBase = new Map<string, number>();
    let pos = 0;
    for (const fam of taxonomy) {
      for (const genus of fam.genera) {
        genusFamily.set(genus.name, fam.family);
        genusSortBase.set(genus.name, pos++);
      }
    }

    // Assign family and sort order
    for (const s of groupSpecies) {
      const family = genusFamily.get(s.genus);
      if (family) {
        s.family = family;
        const base = genusSortBase.get(s.genus)! * 1000;
        s.sortOrder = base;
      } else {
        console.log(`    Unmatched genus: ${s.genus} (${s.scientific})`);
        s.sortOrder = 99000;
      }
    }

    // Refine sort within each genus: alphabetical by scientific name
    const byGenus = new Map<string, Species[]>();
    for (const s of groupSpecies) {
      const list = byGenus.get(s.genus) ?? [];
      list.push(s);
      byGenus.set(s.genus, list);
    }
    for (const [, members] of byGenus) {
      members.sort((a, b) => a.scientific.localeCompare(b.scientific));
      for (let i = 0; i < members.length; i++) {
        members[i].sortOrder = members[i].sortOrder! + i;
      }
    }

    const assigned = groupSpecies.filter((s) => s.family !== null).length;
    console.log(`    Family assigned: ${assigned}/${groupSpecies.length}`);
  }
}
