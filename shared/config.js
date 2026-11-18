/*
 * Shared configuration used by BOTH the 3.x and 4.x versions of the app.
 * Keeping data sources and settings here means the two versions differ only
 * in how they talk to the ArcGIS API, which is the point of this repo.
 */
(function (root) {
  "use strict";

  root.APP_CONFIG = {
    title: "Miami-Dade Fire Station Finder",

    // Initial view (longitude, latitude) and zoom level
    center: [-80.3, 25.72],
    zoom: 10,

    // Search radius options shown in the panel (miles)
    bufferChoices: [1, 2, 3, 5],
    defaultBufferMiles: 2,

    // Optional ArcGIS Location Platform API key (4.x only).
    // Leave empty for the public demo. Add one if the basemap or address
    // search stops returning results for anonymous users.
    apiKey: "",

    // Public Miami-Dade County GIS services (no sign-in required)
    layers: {
      municipalities: {
        title: "Municipal Boundaries",
        url: "https://gisweb.miamidade.gov/arcgis/rest/services/MD_GISLocation/MapServer/0",
        nameField: "NAME",
        codeField: "MUNICID"
      },
      fireStations: {
        title: "County Fire Stations",
        url: "https://gisws.miamidade.gov/arcgis/rest/services/CommissionDistrict_overall/MapServer/3",
        nameField: "NAME",
        addressField: "ADDRESS"
      }
    },

    dataSource: "Miami-Dade County GIS public ArcGIS REST services"
  };
})(window);
