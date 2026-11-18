"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const U = require("../shared/geo-utils.js");

// Downtown Miami and downtown Fort Lauderdale (lon, lat)
const MIAMI = { lon: -80.1918, lat: 25.7617 };
const FORT_LAUDERDALE = { lon: -80.1373, lat: 26.1224 };

test("haversineMiles returns 0 for the same point", () => {
  assert.equal(U.haversineMiles(MIAMI.lon, MIAMI.lat, MIAMI.lon, MIAMI.lat), 0);
});

test("haversineMiles matches a known distance (Miami to Fort Lauderdale ~25 mi)", () => {
  const miles = U.haversineMiles(MIAMI.lon, MIAMI.lat, FORT_LAUDERDALE.lon, FORT_LAUDERDALE.lat);
  assert.ok(miles > 24.5 && miles < 25.5, `got ${miles}`);
});

test("haversineMiles is symmetric", () => {
  const ab = U.haversineMiles(MIAMI.lon, MIAMI.lat, FORT_LAUDERDALE.lon, FORT_LAUDERDALE.lat);
  const ba = U.haversineMiles(FORT_LAUDERDALE.lon, FORT_LAUDERDALE.lat, MIAMI.lon, MIAMI.lat);
  assert.ok(Math.abs(ab - ba) < 1e-9);
});

test("haversineMiles rejects out-of-range coordinates (e.g. a swapped western-US point)", () => {
  // Los Angeles with lat/lon swapped: -118.24 is not a valid latitude
  assert.throws(() => U.haversineMiles(34.05, -118.24, -80.19, 25.76), RangeError);
});

test("a swapped Miami point is still in range, so known distances are pinned instead", () => {
  // -80.19 is a valid latitude, so no error; the distance is just wrong.
  const swapped = U.haversineMiles(25.7617, -80.1918, FORT_LAUDERDALE.lon, FORT_LAUDERDALE.lat);
  assert.ok(swapped > 1000, `swap should produce an absurd distance, got ${swapped}`);
});

test("haversineMiles rejects non-numeric input", () => {
  assert.throws(() => U.haversineMiles("-80", 25, -80, 25), TypeError);
  assert.throws(() => U.haversineMiles(NaN, 25, -80, 25), TypeError);
});

test("rankByDistance sorts nearest first and does not mutate input", () => {
  const items = [
    { id: "far", lon: FORT_LAUDERDALE.lon, lat: FORT_LAUDERDALE.lat },
    { id: "near", lon: -80.195, lat: 25.765 }
  ];
  const ranked = U.rankByDistance(MIAMI, items);
  assert.deepEqual(ranked.map((r) => r.id), ["near", "far"]);
  assert.ok(ranked[0].distanceMiles < ranked[1].distanceMiles);
  assert.equal(items[0].distanceMiles, undefined);
});

test("rankByDistance handles empty or missing input", () => {
  assert.deepEqual(U.rankByDistance(MIAMI, []), []);
  assert.deepEqual(U.rankByDistance(MIAMI, undefined), []);
});

test("formatMiles", () => {
  assert.equal(U.formatMiles(0.04), "< 0.1 mi");
  assert.equal(U.formatMiles(1.234), "1.2 mi");
  assert.equal(U.formatMiles(NaN), "");
  assert.equal(U.formatMiles(undefined), "");
});

test("municipalityLabel falls back to unincorporated", () => {
  assert.equal(U.municipalityLabel("CORAL GABLES"), "Coral Gables");
  assert.equal(U.municipalityLabel("  "), "Unincorporated Miami-Dade");
  assert.equal(U.municipalityLabel(null), "Unincorporated Miami-Dade");
});

test("escapeHtml escapes markup characters", () => {
  assert.equal(U.escapeHtml(`<b>"A&B"</b>`), "&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;");
  assert.equal(U.escapeHtml(null), "");
});
