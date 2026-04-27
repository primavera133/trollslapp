// Web-only sync implementation.
// Downloads observations.json once (or when a newer version is available),
// stores it in the in-memory data layer (db.web.ts), and tracks the
// generatedAt timestamp in localStorage to avoid redundant fetches.

import { MANIFEST_URL, JSON_URL, GITHUB_BASE_URL } from '../constants'

// In development the Metro dev server serves pipeline/dist at /pipeline-data/
// (see metro.config.js). Relative URLs work in the browser — no hostname needed.
// In production the bundle is served from a CDN and GITHUB_BASE_URL is used instead.
const DATA_BASE = __DEV__ ? '/pipeline-data' : '/data'
const DEV_MANIFEST_URL = `${DATA_BASE}/manifest.json`
const DEV_JSON_URL = `${DATA_BASE}/observations.json`
import { setObservationsData, isDataLoaded } from './db.web'
import type { Manifest } from './db.web'

const STORAGE_KEY = 'trollslapp_generated_at'

export async function getDbPath(): Promise<string | null> {
  return null
}

// ---------------------------------------------------------------------------
// Fetch manifest, compare against stored version, download JSON if stale.
// Returns true if new data was loaded.
// ---------------------------------------------------------------------------
export async function syncIfNeeded(): Promise<boolean> {
  let manifest: Manifest
  try {
    console.log('[sync.web] Fetching manifest:', DEV_MANIFEST_URL)
    const res = await fetch(DEV_MANIFEST_URL)
    if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status} ${res.statusText}`)
    manifest = (await res.json()) as Manifest
    console.log('[sync.web] Manifest ok, generatedAt:', manifest.generatedAt)
  } catch (err) {
    console.error('[sync.web] Manifest fetch failed:', err)
    // Offline — try to load JSON directly (may be cached by browser)
    if (!isDataLoaded()) {
      try {
        await loadJson()
      } catch (err2) {
        console.error('[sync.web] JSON fallback also failed:', err2)
      }
    }
    return false
  }

  const stored = localStorage.getItem(STORAGE_KEY)

  if (stored === manifest.generatedAt && isDataLoaded()) {
    console.log('[sync.web] Data already up to date in memory')
    return false
  }

  await loadJson()
  localStorage.setItem(STORAGE_KEY, manifest.generatedAt)
  return true
}

async function loadJson(): Promise<void> {
  console.log('[sync.web] Fetching observations JSON:', DEV_JSON_URL)
  const res = await fetch(DEV_JSON_URL)
  if (!res.ok) throw new Error(`JSON fetch failed: ${res.status} ${res.statusText}`)
  const data = await res.json()
  setObservationsData(data)
  console.log('[sync.web] Data loaded OK')
}

// ---------------------------------------------------------------------------
// Returns true if data is loaded into memory (serves as "has local db" on web).
// ---------------------------------------------------------------------------
export async function hasLocalDb(): Promise<boolean> {
  return isDataLoaded()
}

// No background task support on web.
export async function registerBackgroundSync(): Promise<void> {
  // no-op
}
