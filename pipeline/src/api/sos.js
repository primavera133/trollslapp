"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAreas = fetchAreas;
exports.fetchTaxonAggregation = fetchTaxonAggregation;
exports.countObservations = countObservations;
exports.fetchAllObservations = fetchAllObservations;
var config_ts_1 = require("../config.ts");
var HEADERS = {
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": config_ts_1.ADB_KEY,
};
// ---------------------------------------------------------------------------
// Areas
// ---------------------------------------------------------------------------
function fetchAreas(areaType) {
    return __awaiter(this, void 0, void 0, function () {
        var all, take, skip, total, url, res, body;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    all = [];
                    take = 500;
                    skip = 0;
                    total = Infinity;
                    _a.label = 1;
                case 1:
                    if (!(skip < total)) return [3 /*break*/, 4];
                    url = new URL("".concat(config_ts_1.SOS_BASE_URL, "/Areas"));
                    url.searchParams.set("take", String(take));
                    url.searchParams.set("skip", String(skip));
                    return [4 /*yield*/, fetch(url.toString(), { headers: HEADERS })];
                case 2:
                    res = _a.sent();
                    if (!res.ok)
                        throw new Error("GET /Areas \u2192 ".concat(res.status, " ").concat(res.statusText));
                    return [4 /*yield*/, res.json()];
                case 3:
                    body = (_a.sent());
                    total = body.totalCount;
                    all.push.apply(all, body.records);
                    skip += take;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, all.filter(function (a) { return a.areaType === areaType; })];
            }
        });
    });
}
function fetchTaxonAggregation(rootTaxonId) {
    return __awaiter(this, void 0, void 0, function () {
        var res, body;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, fetch("".concat(config_ts_1.SOS_BASE_URL, "/Observations/TaxonAggregation?take=2000"), {
                        method: "POST",
                        headers: HEADERS,
                        body: JSON.stringify({
                            taxon: { ids: [rootTaxonId], includeUnderlyingTaxa: true },
                        }),
                    })];
                case 1:
                    res = _c.sent();
                    if (!res.ok)
                        throw new Error("POST /Observations/TaxonAggregation \u2192 ".concat(res.status, " ").concat(res.statusText));
                    return [4 /*yield*/, res.json()];
                case 2:
                    body = (_c.sent());
                    return [2 /*return*/, (_b = (_a = body.records) !== null && _a !== void 0 ? _a : body.taxonCounts) !== null && _b !== void 0 ? _b : []];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Observation count — used to decide whether a query needs chunking
// ---------------------------------------------------------------------------
function countObservations(filter_1) {
    return __awaiter(this, arguments, void 0, function (filter, attempt) {
        var res, retryAfter, delay;
        var _a;
        if (attempt === void 0) { attempt = 0; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fetch("".concat(config_ts_1.SOS_BASE_URL, "/Observations/Count"), {
                        method: "POST",
                        headers: HEADERS,
                        body: JSON.stringify(filter),
                    })];
                case 1:
                    res = _b.sent();
                    if (!(res.status === 429)) return [3 /*break*/, 3];
                    retryAfter = Number((_a = res.headers.get("Retry-After")) !== null && _a !== void 0 ? _a : 0);
                    delay = retryAfter > 0 ? retryAfter * 1000 : Math.min(Math.pow(2, attempt) * 1000, 60000);
                    if (attempt >= 8)
                        throw new Error("POST /Observations/Count rate limited after ".concat(attempt, " retries"));
                    return [4 /*yield*/, sleep(delay)];
                case 2:
                    _b.sent();
                    return [2 /*return*/, countObservations(filter, attempt + 1)];
                case 3:
                    if (!res.ok)
                        throw new Error("POST /Observations/Count \u2192 ".concat(res.status, " ").concat(res.statusText));
                    return [2 /*return*/, res.json()];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Paginated observation search
// Max 1,000 per page; SOS enforces a 10,000 total ceiling per filter.
// Call chunkAndFetch() instead of this directly.
// ---------------------------------------------------------------------------
var sleep = function (ms) { return new Promise(function (resolve) { return setTimeout(resolve, ms); }); };
function fetchPage(filter_1, skip_1) {
    return __awaiter(this, arguments, void 0, function (filter, skip, attempt) {
        var url, res, retryAfter, delay, body;
        var _a;
        if (attempt === void 0) { attempt = 0; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = new URL("".concat(config_ts_1.SOS_BASE_URL, "/Observations/Search"));
                    url.searchParams.set("skip", String(skip));
                    url.searchParams.set("take", "1000");
                    return [4 /*yield*/, fetch(url.toString(), {
                            method: "POST",
                            headers: HEADERS,
                            body: JSON.stringify(filter),
                        })];
                case 1:
                    res = _b.sent();
                    if (!(res.status === 429)) return [3 /*break*/, 3];
                    retryAfter = Number((_a = res.headers.get("Retry-After")) !== null && _a !== void 0 ? _a : 0);
                    delay = retryAfter > 0
                        ? retryAfter * 1000
                        : Math.min(Math.pow(2, attempt) * 1000, 60000) // exponential: 1s, 2s, 4s … 60s cap
                    ;
                    if (attempt >= 8)
                        throw new Error("POST /Observations/Search rate limited after ".concat(attempt, " retries"));
                    process.stdout.write("\n      429 \u2014 waiting ".concat(delay / 1000, "s (attempt ").concat(attempt + 1, ")"));
                    return [4 /*yield*/, sleep(delay)];
                case 2:
                    _b.sent();
                    return [2 /*return*/, fetchPage(filter, skip, attempt + 1)];
                case 3:
                    if (!res.ok)
                        throw new Error("POST /Observations/Search (skip=".concat(skip, ") \u2192 ").concat(res.status, " ").concat(res.statusText));
                    return [4 /*yield*/, res.json()];
                case 4:
                    body = (_b.sent());
                    return [2 /*return*/, body.records];
            }
        });
    });
}
// Minimum delay between page fetches to stay under the rate limit.
var PAGE_DELAY_MS = 500;
// ---------------------------------------------------------------------------
// Chunked fetch — handles queries that exceed the 10,000 observation limit
// by splitting on area (province), then by year if still over limit.
// ---------------------------------------------------------------------------
var PAGE_SIZE = 1000;
var MAX_PER_QUERY = 10000;
function fetchAllObservations(baseFilter, provinceIds, onProgress) {
    return __awaiter(this, void 0, void 0, function () {
        var count, results, _i, provinceIds_1, provinceId, filter, provinceCount, _a, _b, _c, date, startYear, endYear, year, yearFilter, yearCount, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, countObservations(baseFilter)];
                case 1:
                    count = _g.sent();
                    onProgress === null || onProgress === void 0 ? void 0 : onProgress("  ".concat(count.toLocaleString(), " observations for this filter"));
                    if (count <= MAX_PER_QUERY) {
                        return [2 /*return*/, paginateFetch(baseFilter, count, onProgress)];
                    }
                    // Split by province
                    onProgress === null || onProgress === void 0 ? void 0 : onProgress("  Exceeds ".concat(MAX_PER_QUERY, " \u2014 splitting by province (").concat(provinceIds.length, ")"));
                    results = [];
                    _i = 0, provinceIds_1 = provinceIds;
                    _g.label = 2;
                case 2:
                    if (!(_i < provinceIds_1.length)) return [3 /*break*/, 11];
                    provinceId = provinceIds_1[_i];
                    filter = __assign(__assign({}, baseFilter), { geographics: {
                            areas: [{ areaType: "Province", featureId: provinceId }],
                        } });
                    return [4 /*yield*/, countObservations(filter)];
                case 3:
                    provinceCount = _g.sent();
                    onProgress === null || onProgress === void 0 ? void 0 : onProgress("    Province ".concat(provinceId, ": ").concat(provinceCount.toLocaleString()));
                    if (!(provinceCount <= MAX_PER_QUERY)) return [3 /*break*/, 5];
                    _b = (_a = results.push).apply;
                    _c = [results];
                    return [4 /*yield*/, paginateFetch(filter, provinceCount, onProgress)];
                case 4:
                    _b.apply(_a, _c.concat([(_g.sent())]));
                    return [3 /*break*/, 10];
                case 5:
                    date = baseFilter.date;
                    if (!(date === null || date === void 0 ? void 0 : date.startDate) || !(date === null || date === void 0 ? void 0 : date.endDate)) {
                        throw new Error("Province ".concat(provinceId, " has ").concat(provinceCount, " observations with no date range to split on"));
                    }
                    startYear = new Date(date.startDate).getFullYear();
                    endYear = new Date(date.endDate).getFullYear();
                    year = startYear;
                    _g.label = 6;
                case 6:
                    if (!(year <= endYear)) return [3 /*break*/, 10];
                    yearFilter = __assign(__assign({}, filter), { date: {
                            startDate: "".concat(year, "-01-01"),
                            endDate: "".concat(year, "-12-31"),
                        } });
                    return [4 /*yield*/, countObservations(yearFilter)];
                case 7:
                    yearCount = _g.sent();
                    if (yearCount > MAX_PER_QUERY) {
                        console.warn("  Province ".concat(provinceId, ", year ").concat(year, ": ").concat(yearCount, " > ").concat(MAX_PER_QUERY, " \u2014 truncating at ").concat(MAX_PER_QUERY));
                    }
                    _e = (_d = results.push).apply;
                    _f = [results];
                    return [4 /*yield*/, paginateFetch(yearFilter, Math.min(yearCount, MAX_PER_QUERY), onProgress)];
                case 8:
                    _e.apply(_d, _f.concat([(_g.sent())]));
                    _g.label = 9;
                case 9:
                    year++;
                    return [3 /*break*/, 6];
                case 10:
                    _i++;
                    return [3 /*break*/, 2];
                case 11: return [2 /*return*/, results];
            }
        });
    });
}
function paginateFetch(filter, total, onProgress) {
    return __awaiter(this, void 0, void 0, function () {
        var pages, results, page, skip, records;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pages = Math.ceil(Math.min(total, MAX_PER_QUERY) / PAGE_SIZE);
                    results = [];
                    page = 0;
                    _a.label = 1;
                case 1:
                    if (!(page < pages)) return [3 /*break*/, 6];
                    skip = page * PAGE_SIZE;
                    onProgress === null || onProgress === void 0 ? void 0 : onProgress("    Page ".concat(page + 1, "/").concat(pages, " (skip=").concat(skip, ")"));
                    if (!(page > 0)) return [3 /*break*/, 3];
                    return [4 /*yield*/, sleep(PAGE_DELAY_MS)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [4 /*yield*/, fetchPage(filter, skip)];
                case 4:
                    records = _a.sent();
                    results.push.apply(results, records);
                    if (records.length < PAGE_SIZE)
                        return [3 /*break*/, 6]; // last page
                    _a.label = 5;
                case 5:
                    page++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/, results];
            }
        });
    });
}
