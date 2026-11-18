/*
 * Fire Station Finder, modern version.
 * ArcGIS Maps SDK for JavaScript 4.34 with map components.
 *
 * Same features as ../../v3/js/main.js, rewritten with:
 *  - $arcgis.import() instead of the Dojo AMD loader
 *  - <arcgis-*> web components instead of dijits/widgets
 *  - Promises and async/await instead of Deferreds
 *  - autocast symbols and renderers instead of constructors
 *  - geometry operators instead of geometryEngine
 *  - layer-view highlights instead of a highlight GraphicsLayer
 */
const cfg = window.APP_CONFIG;
const U = window.GeoUtils;
const ui = window.PanelUI;

const muniCfg = cfg.layers.municipalities;
const fireCfg = cfg.layers.fireStations;

// 4.32+: promise-based CDN module loader; paths match the npm @arcgis/core package
const [esriConfig, FeatureLayer, GraphicsLayer, Graphic, geodesicBufferOperator] =
  await $arcgis.import([
    "@arcgis/core/config.js",
    "@arcgis/core/layers/FeatureLayer.js",
    "@arcgis/core/layers/GraphicsLayer.js",
    "@arcgis/core/Graphic.js",
    "@arcgis/core/geometry/operators/geodesicBufferOperator.js"
  ]);

if (cfg.apiKey) esriConfig.apiKey = cfg.apiKey;

// 4.x: symbols autocast from plain objects
const BUFFER_SYMBOL = {
  type: "simple-fill",
  color: [217, 83, 25, 0.12],
  outline: { style: "dash", color: [217, 83, 25, 0.9], width: 2 }
};

const ORIGIN_SYMBOL = {
  type: "simple-marker",
  style: "circle",
  size: 12,
  color: [18, 53, 91],
  outline: { color: [255, 255, 255], width: 2 }
};

// 4.x: popupTemplate uses {FIELD} (no "$")
const muniLayer = new FeatureLayer({
  url: muniCfg.url,
  title: muniCfg.title,
  outFields: [muniCfg.nameField, muniCfg.codeField],
  // Properties set by the app win over the service's scale range
  minScale: 0,
  maxScale: 0,
  renderer: {
    type: "simple",
    symbol: {
      type: "simple-fill",
      color: [0, 0, 0, 0.03],
      outline: { color: [80, 80, 80, 0.8], width: 1.5 }
    }
  },
  popupTemplate: {
    title: `{${muniCfg.nameField}}`,
    content: `Municipality code: {${muniCfg.codeField}}`
  }
});

const fireLayer = new FeatureLayer({
  url: fireCfg.url,
  title: fireCfg.title,
  outFields: ["*"],
  minScale: 0,
  maxScale: 0,
  renderer: {
    type: "simple",
    symbol: {
      type: "simple-marker",
      style: "square",
      size: 10,
      color: [200, 30, 30],
      outline: { color: [255, 255, 255], width: 1 }
    }
  }
});

const analysisLayer = new GraphicsLayer({ title: "Analysis", listMode: "hide" });

let lastPoint = null;
let lastStations = [];
let runId = 0;
let highlightHandle = null;

// 4.x: <arcgis-map> owns the Map and MapView
const mapEl = document.querySelector("arcgis-map");
await mapEl.viewOnReady();
mapEl.map.addMany([muniLayer, fireLayer, analysisLayer]);

// 4.x: build the popup from the layer's fields once it loads (3.x used "${*}")
fireLayer.load().then(() => {
  const template = fireLayer.createPopupTemplate();
  if (template) {
    template.title = `{${fireCfg.nameField}}`;
    fireLayer.popupTemplate = template;
  }
}).catch((error) => {
  ui.setStatus(`Layer failed to load: ${error.message}`, true);
});

muniLayer.load().catch((error) => {
  ui.setStatus(`Layer failed to load: ${error.message}`, true);
});

// Operators must load their dependencies before execute()
await geodesicBufferOperator.load();

function clearHighlight() {
  highlightHandle?.remove();
  highlightHandle = null;
}

async function runAnalysis(point) {
  const thisRun = ++runId;
  const miles = ui.getMiles();
  lastPoint = point;

  analysisLayer.removeAll();
  clearHighlight();
  mapEl.closePopup();
  ui.setStatus(`Searching within ${miles} mi...`);

  const buffer = geodesicBufferOperator.execute(point, miles, { unit: "miles" });
  analysisLayer.addMany([
    new Graphic({ geometry: buffer, symbol: BUFFER_SYMBOL }),
    new Graphic({ geometry: point, symbol: ORIGIN_SYMBOL })
  ]);
  // goTo rejects when interrupted by another navigation; that's expected
  mapEl.goTo(buffer.extent.clone().expand(1.3)).catch(() => {});

  try {
    // 4.x: queries are plain objects and return native Promises
    const [stationSet, muniSet] = await Promise.all([
      fireLayer.queryFeatures({
        geometry: buffer,
        spatialRelationship: "intersects",
        outFields: ["*"],
        returnGeometry: true,
        outSpatialReference: mapEl.spatialReference
      }),
      muniLayer.queryFeatures({
        geometry: point,
        spatialRelationship: "intersects",
        outFields: [muniCfg.nameField],
        returnGeometry: false
      })
    ]);

    if (thisRun !== runId) return; // a newer click superseded this one

    // 4.x: points expose longitude/latitude directly, no webMercatorUtils needed
    const origin = { lon: point.longitude, lat: point.latitude };
    lastStations = U.rankByDistance(
      origin,
      stationSet.features.map((graphic) => ({
        lon: graphic.geometry.longitude,
        lat: graphic.geometry.latitude,
        graphic
      }))
    );

    ui.renderResults({
      municipality: muniSet.features[0]?.attributes[muniCfg.nameField] ?? "",
      miles,
      stations: lastStations.map(({ graphic, distanceMiles }) => ({
        name: graphic.attributes[fireCfg.nameField],
        address: graphic.attributes[fireCfg.addressField],
        distanceMiles
      }))
    });
  } catch (error) {
    if (thisRun !== runId) return;
    ui.setStatus(`Query failed: ${error.message}`, true);
  }
}

async function selectStation(index) {
  const station = lastStations[index];
  if (!station) return;
  const { graphic } = station;

  ui.setSelected(index);
  clearHighlight();

  // 4.x: highlight through the layer view instead of drawing extra graphics
  const layerView = await mapEl.whenLayerView(fireLayer);
  highlightHandle = layerView.highlight(graphic.attributes[fireLayer.objectIdField]);

  mapEl.goTo({ target: graphic.geometry, zoom: Math.max(mapEl.zoom, 14) }).catch(() => {});
  mapEl.openPopup({ features: [graphic], location: graphic.geometry });
}

function clearAll() {
  runId++;
  lastPoint = null;
  lastStations = [];
  analysisLayer.removeAll();
  clearHighlight();
  mapEl.closePopup();
  ui.clear();
}

function setAnalyzeMode(enabled) {
  // 4.x: popupDisabled stops click-to-open; openPopup() still works
  mapEl.popupDisabled = enabled;
}

// 4.x components emit camelCase DOM events prefixed with "arcgis"
mapEl.addEventListener("arcgisViewClick", (event) => {
  if (ui.isAnalyzeMode()) runAnalysis(event.detail.mapPoint);
});

document.querySelector("arcgis-search").addEventListener("arcgisSelectResult", (event) => {
  const feature = event.detail.result?.feature;
  if (feature) runAnalysis(feature.geometry);
});

ui.init(cfg, {
  onRadiusChange: () => {
    if (lastPoint) runAnalysis(lastPoint);
  },
  onModeChange: setAnalyzeMode,
  onClear: clearAll,
  onSelect: selectStation
});

setAnalyzeMode(ui.isAnalyzeMode());
