// ---------------------------------------------------------------------------
// Remote data source
// Set GITHUB_OWNER and GITHUB_REPO to match your repository.
// ---------------------------------------------------------------------------
const GITHUB_OWNER = "primavera133";
const GITHUB_REPO = "trollslapp";
const RELEASE_TAG = "data-latest";

const BASE_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${RELEASE_TAG}`;

export const MANIFEST_URL = `${BASE_URL}/manifest.json`;
export const DB_URL = `${BASE_URL}/observations.sqlite`;

export const DB_NAME = "observations.sqlite";
export const SYNC_TASK_NAME = "TROLLSLAPP_SYNC";
// Sync interval: 7 days in seconds
export const SYNC_INTERVAL_SECONDS = 7 * 24 * 60 * 60;
