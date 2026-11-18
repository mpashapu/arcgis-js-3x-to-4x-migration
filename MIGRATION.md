# Migration Guide: ArcGIS API for JavaScript 3.x → ArcGIS Maps SDK for JavaScript 4.x

This guide walks through the changes made to move the Fire Station Finder from
3.46 ([`v3/js/main.js`](v3/js/main.js)) to 4.34 ([`v4/js/main.js`](v4/js/main.js)).
Both versions share the same configuration, UI panel and distance math in
[`shared/`](shared/), so the diff between them is only the map API.

## Approach

1. **Separate app logic from map code first.** Config, distance ranking and the
   results panel live in `shared/` with no ArcGIS dependency. They moved over
   without changes and are unit tested in Node.
2. **Rewrite the map layer, don't translate line by line.** 4.x splits the old
   `Map` into a `Map` (data) and a `MapView` (display), and most patterns change.
   Esri recommends rewriting rather than porting, and that matched this project.
3. **Target components and current APIs.** Widgets are deprecated in favor of
   map components, AMD `require()` in favor of `$arcgis.import()`, and
   `geometryEngine` in favor of geometry operators. Using them now avoids a
   second migration.

## Side-by-side reference

| Concern | 3.x (3.46) | 4.x (4.34) |
|---|---|---|
| Module loading | Dojo AMD: `define([...], function (...) {})` | `await $arcgis.import([...])` with `@arcgis/core/...` paths |
| Map + view | `new Map("map", { basemap, center, zoom })` | `<arcgis-map basemap center zoom>` (wraps `Map` + `MapView`) |
| Basemap ids | `"topo"`, `"satellite"` | `"topo-vector"`, `"satellite"` |
| Feature layer | `new FeatureLayer(url, { mode, outFields, infoTemplate })` | `new FeatureLayer({ url, outFields, popupTemplate })` |
| Popup template | `new InfoTemplate("${NAME}", "${*}")` | `{ title: "{NAME}" }` or `layer.createPopupTemplate()` |
| Popup control | `map.infoWindow.setFeatures()` / `.show()` | `mapEl.openPopup({ features, location })` |
| Disable click popups | `map.setInfoWindowOnClick(false)` | `mapEl.popupDisabled = true` |
| Scale range override | `layer.setScaleRange(0, 0)` on `load` | `minScale: 0, maxScale: 0` in the constructor |
| Symbols / renderers | `new SimpleMarkerSymbol(STYLE, size, outline, Color)` | Autocast objects: `{ type: "simple-marker", ... }` |
| Graphics | `new Graphic(geometry, symbol)` | `new Graphic({ geometry, symbol })` |
| Clear graphics | `graphicsLayer.clear()` | `graphicsLayer.removeAll()` |
| Query | `new Query()` + properties, returns a Dojo Deferred | Plain object to `layer.queryFeatures()`, returns a Promise |
| Combining async calls | `dojo/promise/all` | `Promise.all` + `async`/`await` |
| Geodesic buffer | `geometryEngine.geodesicBuffer(pt, 2, "miles")` | `await geodesicBufferOperator.load()` then `.execute(pt, 2, { unit: "miles" })` |
| Lon/lat from Web Mercator | `webMercatorUtils.webMercatorToGeographic(pt)` | `pt.longitude`, `pt.latitude` |
| Highlight | Extra `GraphicsLayer` with a highlight symbol | `layerView.highlight(objectId)` |
| Map click | `map.on("click", e => e.mapPoint)` | `mapEl.addEventListener("arcgisViewClick", e => e.detail.mapPoint)` |
| Search | `esri/dijit/Search`, event `"select-result"` | `<arcgis-search>`, event `"arcgisSelectResult"` |
| Home / basemap toggle | `HomeButton`, `BasemapToggle` dijits + CSS positioning | `<arcgis-home slot="top-left">`, `<arcgis-basemap-toggle next-basemap="satellite">` |
| Legend / scale bar | `Legend`, `Scalebar` dijits | `<arcgis-legend>`, `<arcgis-scale-bar unit="dual">` |
| UI outside the map | DOM node id passed to the dijit | `reference-element="map"` on the component |
| Widget placement | Absolute CSS positioning | `slot="top-left"` (replaces the deprecated `position` attribute in 4.34) |
| CSS | `esri.css` + Dojo theme (`claro.css`) | None required with map components (Calcite handles theming) |

## Pitfalls hit during migration

- **Coordinate order.** Esri APIs use `[longitude, latitude]`. Swapping them puts
  Miami near Antarctica. `shared/geo-utils.js` rejects out-of-range values, but
  a swapped Miami point is still a valid coordinate, so range checks alone
  won't catch it. The unit tests pin known distances (Miami to Fort Lauderdale
  is about 25 miles) so a swap shows up as a failing test.
- **Spatial references.** Query results come back in the service's spatial
  reference unless you set `outSpatialReference`. Both versions request the
  map's spatial reference so buffers, results and highlights line up.
- **Service scale ranges.** Some county services hide layers at small scales.
  In 3.x you override that after `load`; in 4.x setting `minScale`/`maxScale`
  in the constructor takes priority over service values.
- **Popup templates on query results.** In 3.x, graphics returned by a query
  don't carry the layer's `InfoTemplate`, so it has to be reattached before
  showing the popup. In 4.x, query results keep a reference to their layer.
- **Race conditions.** Clicking twice quickly can let a slow first query
  overwrite a fast second one. Both versions tag each run with an id and drop
  stale results. Async/await makes this easier to read, but the bug exists in
  both APIs.
- **Loader conflicts.** The 3.x Dojo AMD loader conflicts with other AMD
  loaders and globally loaded libraries. Embedding each map in its own
  `<iframe>` (as `index.html` does here) keeps the two APIs, or a map and a
  legacy UI framework, from interfering. Pages can then talk through
  `postMessage`.
- **Operators load asynchronously.** Unlike `geometryEngine`, geometry operators
  can require `await operator.load()` before `execute()`. Load them once at
  startup.

## What's next: 5.x

Version 4.34 was the last 4.x release. Esri moved to semantic versioning in
2026, so 5.0 follows 4.34. This code already uses the patterns 5.x expects:

- Map components instead of widgets (all widgets are deprecated as of 5.0)
- `$arcgis.import()` instead of AMD `require()` (deprecated in 5.0)
- Geometry operators instead of `geometryEngine`

Upgrading should mostly mean updating the CDN script tags and checking the
[release notes](https://developers.arcgis.com/javascript/latest/release-notes/)
for breaking changes.

## References

- [ArcGIS API for JavaScript 3.x retirement (Esri blog)](https://www.esri.com/arcgis-blog/products/js-api-arcgis/developers/arcgis-api-for-javascript-version-3-x-retirement)
- [Components transition plan](https://developers.arcgis.com/javascript/latest/components-transition-plan/)
- [Using `$arcgis.import()` in CDN apps (Esri blog)](https://www.esri.com/arcgis-blog/products/js-api-arcgis/developers/future-proof-your-arcgis-javascript-app)
- [Moving to semantic versioning (Esri blog)](https://www.esri.com/arcgis-blog/products/js-api-arcgis/announcements/arcgis-maps-sdk-for-javascript-is-moving-to-semantic-versioning)
