/*
 * Framework-agnostic helpers shared by the 3.x and 4.x apps.
 * No ArcGIS or DOM dependencies, so they can be unit tested in Node.
 *
 * Works as a browser global (window.GeoUtils) and as a CommonJS module.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GeoUtils = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var EARTH_RADIUS_MILES = 3958.7613;

  function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  function assertLonLat(lon, lat, label) {
    if (typeof lon !== "number" || typeof lat !== "number" || isNaN(lon) || isNaN(lat)) {
      throw new TypeError(label + ": longitude and latitude must be numbers");
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      // Often caused by passing (lat, lon) instead of (lon, lat). Not every swap
      // is out of range, so tests also pin known distances.
      throw new RangeError(label + ": coordinates out of range (expected lon, lat order)");
    }
  }

  /**
   * Great-circle distance between two lon/lat points, in miles.
   */
  function haversineMiles(lon1, lat1, lon2, lat2) {
    assertLonLat(lon1, lat1, "origin");
    assertLonLat(lon2, lat2, "destination");

    var dLat = toRadians(lat2 - lat1);
    var dLon = toRadians(lon2 - lon1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /**
   * Adds distanceMiles to each item and sorts nearest first.
   * origin: { lon, lat }; items: [{ lon, lat, ... }]
   * Returns a new array; the input is not modified.
   */
  function rankByDistance(origin, items) {
    return (items || [])
      .map(function (item) {
        var copy = {};
        for (var key in item) {
          if (Object.prototype.hasOwnProperty.call(item, key)) copy[key] = item[key];
        }
        copy.distanceMiles = haversineMiles(origin.lon, origin.lat, item.lon, item.lat);
        return copy;
      })
      .sort(function (a, b) {
        return a.distanceMiles - b.distanceMiles;
      });
  }

  function formatMiles(miles) {
    if (typeof miles !== "number" || isNaN(miles)) return "";
    if (miles < 0.1) return "< 0.1 mi";
    return miles.toFixed(1) + " mi";
  }

  function titleCase(text) {
    if (!text) return "";
    return String(text)
      .toLowerCase()
      .replace(/\b([a-z])/g, function (m) {
        return m.toUpperCase();
      });
  }

  /**
   * Points outside every municipality are in unincorporated Miami-Dade.
   */
  function municipalityLabel(name) {
    var trimmed = name ? String(name).trim() : "";
    return trimmed ? titleCase(trimmed) : "Unincorporated Miami-Dade";
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  return {
    EARTH_RADIUS_MILES: EARTH_RADIUS_MILES,
    haversineMiles: haversineMiles,
    rankByDistance: rankByDistance,
    formatMiles: formatMiles,
    titleCase: titleCase,
    municipalityLabel: municipalityLabel,
    escapeHtml: escapeHtml
  };
});
