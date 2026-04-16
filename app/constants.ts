// ---------------------------------------------------------------------------
// Remote data source.
// In production this points at GitHub Releases. For local development set:
//   EXPO_PUBLIC_DATA_BASE_URL=http://localhost:8081/pipeline-data
// in a .env.local file (Metro dev server serves pipeline/dist at that path).
// ---------------------------------------------------------------------------
const GITHUB_OWNER = "primavera133";
const GITHUB_REPO = "trollslapp";
const RELEASE_TAG = "data-latest";

export const GITHUB_BASE_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${RELEASE_TAG}`;
const BASE_URL = GITHUB_BASE_URL;

export const MANIFEST_URL = `${BASE_URL}/manifest.json`;
export const DB_URL = `${BASE_URL}/observations.sqlite`;
export const JSON_URL = `${BASE_URL}/observations.json`;

export const DB_NAME = "observations.sqlite";
export const SYNC_TASK_NAME = "TROLLSLAPP_SYNC";
// Sync interval: 7 days in seconds
export const SYNC_INTERVAL_SECONDS = 7 * 24 * 60 * 60;
