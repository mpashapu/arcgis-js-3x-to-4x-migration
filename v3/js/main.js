/*
 * Fire Station Finder, legacy version.
 * ArcGIS API for JavaScript 3.46 (retired July 1, 2024).
 *
 * Written in the style a typical 3.x app used: Dojo AMD modules, ES5,
 * Deferreds, dijits, and constructor-based symbols.
 * Compare with ../../v4/js/main.js and MIGRATION.md.
 */
define([
  "esri/map",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/graphic",
  "esri/InfoTemplate",
  "esri/tasks/query",
  "esri/geometry/geometryEngine",
  "esri/geometry/webMercatorUtils",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/renderers/SimpleRenderer",
  "esri/Color",
  "esri/dijit/Search",
  "esri/dijit/HomeButton",
  "esri/dijit/BasemapToggle",
  "esri/dijit/Legend",
  "esri/dijit/Scalebar",
  "dojo/_base/array",
  "dojo/promise/all",
  "dojo/domReady!"
], function (
  Map, FeatureLayer, GraphicsLayer, Graphic, InfoTemplate, Query,
  geometryEngine, webMercatorUtils,
  SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol, SimpleRenderer, Color,
  Search, HomeButton, BasemapToggle, Legend, Scalebar,
  array, all
) {
  "use strict";

  var cfg = window.APP_CONFIG;
  var U = window.GeoUtils;
  var ui = window.PanelUI;

  var muniCfg = cfg.layers.municipalities;
  var fireCfg = cfg.layers.fireStations;

  var map, muniLayer, fireLayer, analysisLayer, highlightLayer;
  var lastPoint = null;
  var lastStations = [];
  var runId = 0;

  // 3.x: symbols are built with constructors and style constants
  var BUFFER_SYMBOL = new SimpleFillSymbol(
    SimpleFillSymbol.STYLE_SOLID,
    new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new Color([217, 83, 25, 0.9]), 2),
    new Color([217, 83, 25, 0.12])
  );

  var ORIGIN_SYMBOL = new SimpleMarkerSymbol(
    SimpleMarkerSymbol.STYLE_CIRCLE, 12,
    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 255, 255]), 2),
    new Color([18, 53, 91])
  );

  var HIGHLIGHT_SYMBOL = new SimpleMarkerSymbol(
    SimpleMarkerSymbol.STYLE_CIRCLE, 22,
    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 255]), 3),
    new Color([0, 0, 0, 0])
  );

  function createLayers() {
    // 3.x: InfoTemplate uses ${FIELD} placeholders
    muniLayer = new FeatureLayer(muniCfg.url, {
      id: "municipalities",
      mode: FeatureLayer.MODE_ONDEMAND,
      outFields: [muniCfg.nameField, muniCfg.codeField],
      infoTemplate: new InfoTemplate(
        "${" + muniCfg.nameField + "}",
        "Municipality code: ${" + muniCfg.codeField + "}"
      )
    });
    muniLayer.setRenderer(new SimpleRenderer(new SimpleFillSymbol(
      SimpleFillSymbol.STYLE_SOLID,
      new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([80, 80, 80, 0.8]), 1.5),
      new Color([0, 0, 0, 0.03])
    )));

    // "${*}" lists every attribute; fine for a demo, explicit fields in production
    fireLayer = new FeatureLayer(fireCfg.url, {
      id: "fireStations",
      mode: FeatureLayer.MODE_ONDEMAND,
      outFields: ["*"],
      infoTemplate: new InfoTemplate("${" + fireCfg.nameField + "}", "${*}")
    });
    fireLayer.setRenderer(new SimpleRenderer(new SimpleMarkerSymbol(
      SimpleMarkerSymbol.STYLE_SQUARE, 10,
      new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 255, 255]), 1),
      new Color([200, 30, 30])
    )));

    // 3.x: service scale ranges are overridden after the layer loads
    array.forEach([muniLayer, fireLayer], function (layer) {
      layer.on("load", function () {
        layer.setScaleRange(0, 0);
      });
      layer.on("error", function (evt) {
        ui.setStatus("Layer failed to load: " + (evt.error && evt.error.message), true);
      });
    });

    analysisLayer = new GraphicsLayer({ id: "analysis" });
    highlightLayer = new GraphicsLayer({ id: "highlight" });
  }

  function createWidgets() {
    new HomeButton({ map: map }, "homeButton").startup();
    new BasemapToggle({ map: map, basemap: "satellite" }, "basemapToggle").startup();
    new Scalebar({ map: map, attachTo: "bottom-left", scalebarUnit: "dual" });

    var search = new Search({ map: map, enableInfoWindow: false }, "search");
    search.startup();
    // 3.x: dijit events use dash-case names
    search.on("select-result", function (evt) {
      if (evt.result && evt.result.feature) runAnalysis(evt.result.feature.geometry);
    });

    new Legend({
      map: map,
      layerInfos: [
        { layer: fireLayer, title: fireCfg.title },
        { layer: muniLayer, title: muniCfg.title }
      ]
    }, "legend").startup();
  }

  // 3.x points may be Web Mercator or geographic; normalize to lon/lat
  function toLonLat(point) {
    var geo = point.spatialReference && point.spatialReference.isWebMercator()
      ? webMercatorUtils.webMercatorToGeographic(point)
      : point;
    return { lon: geo.x, lat: geo.y };
  }

  function runAnalysis(point) {
    var thisRun = ++runId;
    var miles = ui.getMiles();
    lastPoint = point;

    analysisLayer.clear();
    highlightLayer.clear();
    map.infoWindow.hide();
    ui.setStatus("Searching within " + miles + " mi...");

    // 3.x: geometryEngine is synchronous and needs Web Mercator or WGS84 input
    var buffer = geometryEngine.geodesicBuffer(point, miles, "miles");
    analysisLayer.add(new Graphic(buffer, BUFFER_SYMBOL));
    analysisLayer.add(new Graphic(point, ORIGIN_SYMBOL));
    map.setExtent(buffer.getExtent().expand(1.3));

    var stationQuery = new Query();
    stationQuery.geometry = buffer;
    stationQuery.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
    stationQuery.outFields = ["*"];
    stationQuery.returnGeometry = true;
    stationQuery.outSpatialReference = map.spatialReference;

    var muniQuery = new Query();
    muniQuery.geometry = point;
    muniQuery.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
    muniQuery.outFields = [muniCfg.nameField];
    muniQuery.returnGeometry = false;

    // 3.x: queries return dojo Deferreds; dojo/promise/all combines them
    all({
      stations: fireLayer.queryFeatures(stationQuery),
      munis: muniLayer.queryFeatures(muniQuery)
    }).then(function (result) {
      if (thisRun !== runId) return; // a newer click superseded this one

      var origin = toLonLat(point);
      var items = array.map(result.stations.features, function (graphic) {
        var lonLat = toLonLat(graphic.geometry);
        return { lon: lonLat.lon, lat: lonLat.lat, graphic: graphic };
      });
      lastStations = U.rankByDistance(origin, items);

      var muni = result.munis.features[0];
      ui.renderResults({
        municipality: muni ? muni.attributes[muniCfg.nameField] : "",
        miles: miles,
        stations: array.map(lastStations, function (s) {
          return {
            name: s.graphic.attributes[fireCfg.nameField],
            address: s.graphic.attributes[fireCfg.addressField],
            distanceMiles: s.distanceMiles
          };
        })
      });
    }, function (error) {
      if (thisRun !== runId) return;
      ui.setStatus("Query failed: " + (error && error.message ? error.message : error), true);
    });
  }

  function selectStation(index) {
    var station = lastStations[index];
    if (!station) return;
    var graphic = station.graphic;

    highlightLayer.clear();
    highlightLayer.add(new Graphic(graphic.geometry, HIGHLIGHT_SYMBOL));
    ui.setSelected(index);

    // Query results don't carry the layer's InfoTemplate; attach it
    graphic.setInfoTemplate(fireLayer.infoTemplate);
    map.centerAt(graphic.geometry);
    map.infoWindow.setFeatures([graphic]);
    map.infoWindow.show(graphic.geometry);
  }

  function clearAll() {
    runId++;
    lastPoint = null;
    lastStations = [];
    analysisLayer.clear();
    highlightLayer.clear();
    map.infoWindow.hide();
    ui.clear();
  }

  function setAnalyzeMode(enabled) {
    // 3.x: stop the map's built-in click-to-identify while analyzing
    map.setInfoWindowOnClick(!enabled);
  }

  function start() {
    // 3.x: the Map is both the model and the view; center is [lon, lat]
    map = new Map("map", {
      basemap: "topo",
      center: cfg.center,
      zoom: cfg.zoom
    });

    createLayers();

    map.on("layers-add-result", createWidgets);
    map.addLayers([muniLayer, fireLayer, analysisLayer, highlightLayer]);

    map.on("load", function () {
      setAnalyzeMode(ui.isAnalyzeMode());
    });

    map.on("click", function (evt) {
      if (ui.isAnalyzeMode()) runAnalysis(evt.mapPoint);
    });

    ui.init(cfg, {
      onRadiusChange: function () {
        if (lastPoint) runAnalysis(lastPoint);
      },
      onModeChange: setAnalyzeMode,
      onClear: clearAll,
      onSelect: selectStation
    });
  }

  return { start: start };
});
