"use strict";
// ---------------------------------------------------------------------------
// Pipeline configuration
// ---------------------------------------------------------------------------
// ADB_BASE_URL: obtain from https://api-portal.artdatabanken.se/ after
//   subscribing to the "Species Observations" product.
//   Typically looks like:
//   https://api.artdatabanken.se/species-observation-system/v1
// ADB_SUBSCRIPTION_KEY: your subscription key from the same portal.
// ---------------------------------------------------------------------------
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MANIFEST_FILENAME = exports.JSON_FILENAME = exports.DB_FILENAME = exports.OUTPUT_DIR = exports.GITHUB_TOKEN = exports.GITHUB_REPO = exports.GITHUB_OWNER = exports.IMAGO_LIFE_STAGE = exports.CURRENT_YEAR = exports.START_YEAR = exports.TAXON_BLACKLIST = exports.TAXON_GROUPS = exports.DYNTAXA_BASE_URL = exports.SOS_BASE_URL = exports.ADB_KEY = exports.ADB_BASE_URL = void 0;
exports.ADB_BASE_URL = (_a = process.env.ADB_BASE_URL) !== null && _a !== void 0 ? _a : "https://api.artdatabanken.se";
exports.ADB_KEY = (_b = process.env.ADB_SUBSCRIPTION_KEY) !== null && _b !== void 0 ? _b : "";
exports.SOS_BASE_URL = "".concat(exports.ADB_BASE_URL, "/species-observation-system/v1");
exports.DYNTAXA_BASE_URL = "".concat(process.env.ADB_BASE_URL, "/taxonservice/v1");
// Taxon groups to include in the dataset.
// taxonId: Dyntaxa ID for the root taxon (order/family/etc.)
// All child taxa (species) are automatically included via includeUnderlyingTaxa.
//
exports.TAXON_GROUPS = [
    { taxonId: 3000172, scientific: "Odonata", swedish: "Trollsländor" },
    // { taxonId: ..., scientific: 'Lepidoptera', swedish: 'Fjärilar' },
];
// Taxon IDs to exclude from the dataset entirely.
// New species not in this list are included automatically.
// Add Dyntaxa taxon IDs here to hide taxa you don't want displayed.
exports.TAXON_BLACKLIST = new Set([
// e.g. 3000001,
]);
// First year of observation data to include.
exports.START_YEAR = 2000;
exports.CURRENT_YEAR = new Date().getFullYear();
// Life stage value used in the SOS Extended field set.
// Observations not matching this value are discarded.
exports.IMAGO_LIFE_STAGE = "imago/adult";
// GitHub Releases: owner/repo where the pipeline publishes its output.
exports.GITHUB_OWNER = (_c = process.env.GITHUB_OWNER) !== null && _c !== void 0 ? _c : "";
exports.GITHUB_REPO = (_d = process.env.GITHUB_REPO) !== null && _d !== void 0 ? _d : "";
exports.GITHUB_TOKEN = (_e = process.env.GITHUB_TOKEN) !== null && _e !== void 0 ? _e : "";
exports.OUTPUT_DIR = (_f = process.env.OUTPUT_DIR) !== null && _f !== void 0 ? _f : "dist";
exports.DB_FILENAME = "observations.sqlite";
exports.JSON_FILENAME = "observations.json";
exports.MANIFEST_FILENAME = "manifest.json";
