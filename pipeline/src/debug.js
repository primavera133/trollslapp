"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
// Diagnostic script — run with: npx tsx src/debug.ts
// Checks that the SOS API is reachable and returning data.
var config_ts_1 = require("./config.ts");
var sos_ts_1 = require("./api/sos.ts");
var sos_ts_2 = require("./api/sos.ts");
if (!config_ts_1.ADB_KEY) {
    console.error('ADB_SUBSCRIPTION_KEY is not set');
    process.exit(1);
}
console.log('API base:', config_ts_1.SOS_BASE_URL);
console.log('Key set:', config_ts_1.ADB_KEY ? 'yes' : 'no');
console.log();
for (var _i = 0, TAXON_GROUPS_1 = config_ts_1.TAXON_GROUPS; _i < TAXON_GROUPS_1.length; _i++) {
    var group = TAXON_GROUPS_1[_i];
    console.log("=== ".concat(group.scientific, " (taxonId=").concat(group.taxonId, ") ==="));
    // 1. Taxon aggregation
    console.log('Fetching taxon aggregation...');
    var agg = await (0, sos_ts_1.fetchTaxonAggregation)(group.taxonId);
    console.log("  Returned ".concat(agg.length, " items"));
    if (agg.length > 0) {
        console.log('  First 3 items:');
        for (var _a = 0, _b = agg.slice(0, 3); _a < _b.length; _a++) {
            var t = _b[_a];
            console.log("    taxonId=".concat(t.taxonId, " categoryId=").concat(t.taxonCategoryId, " name=").concat(t.scientificName));
        }
        var categoryIds = new Set(agg.map(function (t) { return t.taxonCategoryId; }));
        console.log('  Unique taxonCategoryIds:', __spreadArray([], categoryIds, true).sort(function (a, b) { return a - b; }).join(', '));
    }
    console.log();
    // 2. Observation count for 2024
    console.log('Counting observations for 2024...');
    var count = await (0, sos_ts_2.countObservations)({
        taxon: { ids: [group.taxonId], includeUnderlyingTaxa: true },
        date: { startDate: '2024-01-01', endDate: '2024-12-31' },
        output: { fieldSet: 'Extended' },
    });
    console.log("  Count: ".concat(count));
}
