// Publishes whatever is already in dist/ to GitHub Releases.
// Use this when you've already run the pipeline locally and just want to upload.
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { OUTPUT_DIR, DB_FILENAME, JSON_FILENAME, MANIFEST_FILENAME, GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN } from './config.ts'
import { publishRelease } from './publish.ts'

const dbPath = join(OUTPUT_DIR, DB_FILENAME)
const jsonPath = join(OUTPUT_DIR, JSON_FILENAME)
const manifestPath = join(OUTPUT_DIR, MANIFEST_FILENAME)

for (const [label, p] of [[DB_FILENAME, dbPath], [JSON_FILENAME, jsonPath], [MANIFEST_FILENAME, manifestPath]] as const) {
  if (!existsSync(p)) {
    console.error(`Missing: ${p} — run the pipeline first (npm start)`)
    process.exit(1)
  }
}

if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
  console.error('Set GITHUB_OWNER, GITHUB_REPO, and GITHUB_TOKEN before publishing.')
  process.exit(1)
}

await publishRelease(dbPath, jsonPath, manifestPath)
console.log('Done.')
