# Trollslapp — Implementation Plan

Swedish dragonfly observation app with offline support and weekly data updates.

---

## What We're Building

An offline-capable app showing phenology histograms (observations per week of year) for
dragonfly species (and other insect groups) in Sweden, broken down by locale.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Data pipeline | Node.js + TypeScript |
| Pipeline scheduler | GitHub Actions (weekly cron) |
| Data hosting | GitHub Releases |
| App framework | Expo (React Native + Web) |
| Local DB | expo-sqlite (SQLite WASM on web) |
| Language | TypeScript throughout |

---

## Data Source

**SLU Artdatabanken — Species Observation System (SOS) API**
- Developer portal: https://api-portal.artdatabanken.se/
- Requires a free subscription key (register at portal, subscribe to "Species Observations")
- GitHub docs: https://github.com/biodiversitydata-se/SOS/tree/master/Docs

**Key API facts:**
- Life stage is returned as `occurrence.lifeStage` in the `Extended` field set
  - Filter value for adults: `"imago/adult"`
  - No server-side life stage filter — must filter after fetching
- Supported area types: `Province` (landskap, 25), `Municipality` (kommun, ~290)
- Taxon filter: `taxon.ids` + `taxon.includeUnderlyingTaxa: true`
- Pagination: max 1,000 per page, 10,000 total via search — use async export for full dataset
- Async export: up to 2M records, delivered as CSV/DwC

**Dyntaxa** (taxonomy lookup):
- Use to resolve taxon IDs for each configured group (e.g. Odonata)
- Need to look up the Dyntaxa ID for Odonata via developer portal before first pipeline run

---

## Repo Structure

```
trollslapp/
├── pipeline/                   # Node.js + TypeScript data pipeline
│   ├── src/
│   │   ├── config.ts           # Taxon groups to include
│   │   ├── api/
│   │   │   ├── sos.ts          # SOS API client (fetch + paginate)
│   │   │   └── dyntaxa.ts      # Dyntaxa taxon ID lookup
│   │   ├── steps/
│   │   │   ├── fetchLocales.ts # GET /Areas for province + municipality
│   │   │   ├── fetchSpecies.ts # Resolve all species under each group
│   │   │   ├── fetchObservations.ts  # Async export + filter imago/adult
│   │   │   ├── aggregate.ts    # Group by species × locale × year × week
│   │   │   └── buildDatabase.ts # Write output SQLite with better-sqlite3
│   │   ├── publish.ts          # Upload to GitHub Releases via @octokit/rest
│   │   └── index.ts            # Orchestrate all steps
│   ├── package.json
│   └── tsconfig.json
│
├── app/                        # Expo app
│   ├── app/
│   │   ├── _layout.tsx
│   │   └── (tabs)/
│   │       ├── _layout.tsx
│   │       └── index.tsx       # Main screen
│   ├── components/
│   │   ├── Histogram.tsx       # Bar chart (react-native-svg)
│   │   ├── LocalePicker.tsx    # Province / municipality selector
│   │   └── SpeciesPicker.tsx   # Group → species selector
│   ├── services/
│   │   ├── db.ts               # expo-sqlite query layer
│   │   └── sync.ts             # Manifest check + SQLite download
│   ├── package.json
│   └── tsconfig.json
│
└── .github/
    └── workflows/
        ├── pipeline.yml        # Weekly cron: run pipeline + publish
        └── app.yml             # Optional: EAS build on tag
```

---

## SQLite Schema

Built by the pipeline, read-only in the app.

```sql
CREATE TABLE taxon_groups (
  id         INTEGER PRIMARY KEY,  -- Dyntaxa taxon ID for the group root
  scientific TEXT NOT NULL,        -- e.g. "Odonata"
  swedish    TEXT                  -- e.g. "Trollsländor"
);

CREATE TABLE species (
  id         INTEGER PRIMARY KEY,  -- Dyntaxa taxon ID
  group_id   INTEGER NOT NULL REFERENCES taxon_groups(id),
  scientific TEXT NOT NULL,
  swedish    TEXT
);

CREATE TABLE locales (
  id         TEXT PRIMARY KEY,     -- SOS featureId (e.g. "687")
  type       TEXT NOT NULL,        -- 'province' | 'municipality'
  name       TEXT NOT NULL
);

CREATE TABLE observations (
  species_id INTEGER NOT NULL REFERENCES species(id),
  locale_id  TEXT    NOT NULL REFERENCES locales(id),
  year       INTEGER NOT NULL,
  week       INTEGER NOT NULL,     -- ISO week 1-53
  count      INTEGER NOT NULL,
  PRIMARY KEY (species_id, locale_id, year, week)
);

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT
  -- keys: generated_at, pipeline_version
);
```

**Key queries:**

```sql
-- All-years phenology curve
SELECT week, SUM(count) AS total
FROM observations
WHERE species_id = ? AND locale_id = ?
GROUP BY week ORDER BY week;

-- Single year drill-down
SELECT week, count AS total
FROM observations
WHERE species_id = ? AND locale_id = ? AND year = ?
ORDER BY week;

-- Available years for a species+locale
SELECT DISTINCT year FROM observations
WHERE species_id = ? AND locale_id = ?
ORDER BY year DESC;
```

---

## Pipeline Config

```typescript
// pipeline/src/config.ts
export const TAXON_GROUPS = [
  { taxonId: 3000025, swedish: 'Trollsländor' },
  // Add more groups here — each is one line
  // { taxonId: ..., swedish: 'Dagfjärilar' },
];
```

> **TODO:** Verify the Dyntaxa taxon ID for Odonata via the developer portal before
> the first pipeline run. The ID above (3000025) is unverified.

---

## App Update Flow

```
App opens
  → GET manifest.json from GitHub Releases
  → compare generated_at vs stored value in AsyncStorage
  → if newer:  download observations.sqlite (~1–5 MB)
               replace local file
               update stored timestamp
  → if same:   use cached DB silently
  → if offline: use cached DB silently
```

On native: also register `expo-background-fetch` task to sync while app is in background.
On web: check-on-open only (no background tasks in browsers).

---

## App UX Flow

```
Home screen
  └── Pick locale type: Landskap | Kommun
       └── Pick locale (searchable list)
            └── Pick taxon group (e.g. Trollsländor)
                 └── Pick species (searchable list)
                      └── Histogram view
                           ├── X axis: week 1–52
                           ├── Y axis: observation count
                           ├── Default: all years combined
                           └── Year picker → drill into single year
                                (combined curve shown faintly behind)
```

---

## Key Dependencies

**Pipeline:**
```json
"better-sqlite3": "^9.x",
"@octokit/rest": "^20.x",
"undici": "^6.x",
"tsx": "^4.x"
```

**App:**
```json
"expo": "^52.x",
"expo-sqlite": "^14.x",
"expo-file-system": "^17.x",
"expo-background-fetch": "^12.x",
"expo-task-manager": "^11.x",
"react-native-svg": "^15.x"
```

---

## GitHub Actions Workflow (outline)

```yaml
# .github/workflows/pipeline.yml
on:
  schedule:
    - cron: '0 3 * * 1'   # Every Monday at 03:00 UTC
  workflow_dispatch:        # Also allow manual trigger

jobs:
  run-pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
        working-directory: pipeline
      - run: npm start
        working-directory: pipeline
        env:
          ADB_SUBSCRIPTION_KEY: ${{ secrets.ADB_SUBSCRIPTION_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Suggested Build Order

1. **Pipeline skeleton** — project setup, config, SOS API client
2. **Fetch locales** — GET /Areas for province + municipality, write to DB
3. **Fetch species** — Dyntaxa lookup for each taxon group, write to DB
4. **Fetch + filter observations** — async export, filter imago/adult, aggregate
5. **Build SQLite** — write final DB with better-sqlite3
6. **Publish** — manifest.json + SQLite to GitHub Releases
7. **GitHub Actions workflow** — wire up weekly cron
8. **Expo app scaffold** — Expo Router setup, expo-sqlite wrapper
9. **Sync service** — manifest check + file download
10. **DB query layer** — typed functions over expo-sqlite
11. **UI: pickers** — locale, group, species
12. **UI: histogram** — react-native-svg bar chart, year toggle
