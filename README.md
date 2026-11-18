# ArcGIS JS 3.x → 4.x Migration: Same App, Two APIs

![CI](https://github.com/mpashapu/arcgis-js-3x-to-4x-migration/actions/workflows/ci.yml/badge.svg)

A small Miami-Dade **fire station finder** built twice: once with the legacy
**ArcGIS API for JavaScript 3.46** and once with **ArcGIS Maps SDK for
JavaScript 4.34** using map components. The two versions share their config,
UI and distance math, so the difference between them is only the map API. A
[migration guide](MIGRATION.md) explains each change.

**Live demo:** https://mpashapu.github.io/arcgis-js-3x-to-4x-migration/
(side-by-side view, both apps running at once)

<!-- Add a screenshot after the first deploy: docs/screenshot.png -->

## What the app does

- Search an address or click the map
- Draws a geodesic buffer (1–5 miles) around the point
- Queries Miami-Dade County fire stations inside the buffer and ranks them by distance
- Identifies which municipality the point is in (or unincorporated Miami-Dade)
- Click a result to zoom, highlight and open its popup

Data comes live from Miami-Dade County's public ArcGIS REST services. No
sign-in or API key is needed.

## Why this repo exists

Esri retired the 3.x API on July 1, 2024, and many local governments still run
3.x apps. This project shows the migration end to end on a realistic feature
set (layers, popups, search, spatial queries, geometry operations and UI), not
just a "hello map".

Highlights of the 4.x version:

- **Map components** (`<arcgis-map>`, `<arcgis-search>`, `<arcgis-legend>`, ...)
  instead of deprecated widgets, using the 4.34 `slot` layout
- **`$arcgis.import()`** instead of the Dojo AMD loader
- **Geometry operators** (`geodesicBufferOperator`) instead of `geometryEngine`
- **Promises and async/await** instead of Dojo Deferreds, with stale-result
  protection when users click quickly
- **Layer-view highlighting** instead of a separate highlight graphics layer

See [MIGRATION.md](MIGRATION.md) for the full side-by-side table and the
pitfalls hit along the way.

## Project structure

```
├── index.html          Side-by-side demo (each version in its own iframe)
├── MIGRATION.md        Migration guide and 3.x → 4.x reference table
├── shared/             API-independent code used by both versions
│   ├── config.js       Service URLs, fields, map defaults
│   ├── geo-utils.js    Distance ranking and formatting (unit tested)
│   ├── panel.js        Results panel UI
│   └── app.css         Shared layout
├── v3/                 ArcGIS API for JavaScript 3.46 (Dojo AMD, dijits, ES5)
├── v4/                 ArcGIS Maps SDK for JavaScript 4.34 (components, ES modules)
└── tests/              Node unit tests (no dependencies)
```

## Run locally

The pages must be served over HTTP (not opened as files). Any static server works:

```bash
# Python
python -m http.server 8080

# or Node
npm start
```

Then open http://localhost:8080/ for the side-by-side view, or `/v3/` and
`/v4/` individually.

Run the tests (Node 18+):

```bash
npm test
```

## Deploy to GitHub Pages

1. Push to the `main` branch.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch
   `main`, folder `/ (root)`.

The site is static, so no build step is needed. The `.nojekyll` file tells
GitHub Pages to serve the files as-is.

## Configuration

Everything that changes between environments lives in
[`shared/config.js`](shared/config.js): service URLs, field names, the
starting view and buffer distances. To point the app at your own data, change
the layer `url` and field names there; neither `main.js` needs editing.

If Esri's basemaps or address search ever require a key for anonymous use, add
an ArcGIS Location Platform API key to `apiKey` (used by the 4.x version).

## Notes

- **3.x status:** retired, no fixes or support. Esri keeps it on its CDN for a
  grace period so existing apps don't break. The 3.x code here is for
  comparison, not new development.
- **4.x → 5.x:** 4.34 was the final 4.x release; Esri moved to semantic
  versioning, so 5.0 came next. The 4.x code already uses components,
  `$arcgis.import()` and geometry operators, which is what 5.x expects. See
  the "What's next" section of [MIGRATION.md](MIGRATION.md).
- **Data:** Miami-Dade County GIS public services. Service availability and
  schemas are controlled by the county; if a layer moves, update
  `shared/config.js`.

## Tech

JavaScript (ES5 and ES2022), ArcGIS API for JavaScript 3.46, ArcGIS Maps SDK
for JavaScript 4.34, Calcite components, ArcGIS REST API, HTML/CSS, Node test
runner, GitHub Actions, GitHub Pages.

## License

[MIT](LICENSE) © 2026 Malla Reddy Pashapu
