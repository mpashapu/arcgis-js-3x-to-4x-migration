/*
 * Side-panel UI shared by both versions. It knows nothing about ArcGIS:
 * each version passes in plain data and callbacks. This mirrors a useful
 * migration practice: separate app/UI logic from map-API code first, so the
 * API swap touches as little code as possible.
 */
(function (root) {
  "use strict";

  var U = root.GeoUtils;

  function byId(id) {
    return document.getElementById(id);
  }

  var PanelUI = {
    /**
     * handlers: { onRadiusChange(miles), onModeChange(isAnalyzeMode), onClear(), onSelect(index) }
     */
    init: function (config, handlers) {
      this._handlers = handlers;

      byId("appTitle").textContent = config.title;
      byId("dataSource").textContent = config.dataSource;

      var select = byId("bufferSelect");
      select.innerHTML = "";
      config.bufferChoices.forEach(function (miles) {
        var option = document.createElement("option");
        option.value = String(miles);
        option.textContent = miles + (miles === 1 ? " mile" : " miles");
        if (miles === config.defaultBufferMiles) option.selected = true;
        select.appendChild(option);
      });

      select.addEventListener("change", function () {
        handlers.onRadiusChange(PanelUI.getMiles());
      });
      byId("analyzeToggle").addEventListener("change", function (evt) {
        handlers.onModeChange(evt.target.checked);
      });
      byId("clearButton").addEventListener("click", function () {
        handlers.onClear();
      });
      byId("results").addEventListener("click", function (evt) {
        var button = evt.target.closest ? evt.target.closest("button[data-index]") : null;
        if (button) handlers.onSelect(Number(button.getAttribute("data-index")));
      });

      this.setStatus("Click the map or search an address to find nearby fire stations.");
    },

    getMiles: function () {
      return Number(byId("bufferSelect").value);
    },

    isAnalyzeMode: function () {
      return byId("analyzeToggle").checked;
    },

    setStatus: function (message, isError) {
      var el = byId("status");
      el.textContent = message;
      el.className = isError ? "status status--error" : "status";
    },

    /**
     * data: { municipality, miles, stations: [{ name, address, distanceMiles }] }
     */
    renderResults: function (data) {
      var html =
        '<p class="summary"><strong>Location:</strong> ' +
        U.escapeHtml(U.municipalityLabel(data.municipality)) +
        "</p>";

      if (!data.stations.length) {
        html += '<p class="empty">No county fire stations within ' + data.miles +
          " mi. Try a larger radius.</p>";
      } else {
        html += '<ol class="station-list">';
        data.stations.forEach(function (station, index) {
          html +=
            '<li><button type="button" data-index="' + index + '">' +
            '<span class="station-name">' + U.escapeHtml(U.titleCase(station.name)) + "</span>" +
            (station.address
              ? '<span class="station-address">' + U.escapeHtml(U.titleCase(station.address)) + "</span>"
              : "") +
            '<span class="station-distance">' + U.formatMiles(station.distanceMiles) + "</span>" +
            "</button></li>";
        });
        html += "</ol>";
      }

      byId("results").innerHTML = html;
      this.setStatus(
        data.stations.length + " station" + (data.stations.length === 1 ? "" : "s") +
        " within " + data.miles + " mi, nearest first."
      );
    },

    setSelected: function (index) {
      var buttons = byId("results").querySelectorAll("button[data-index]");
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute("aria-pressed", String(i === index));
      }
    },

    clear: function () {
      byId("results").innerHTML = "";
      this.setStatus("Cleared. Click the map or search an address.");
    }
  };

  root.PanelUI = PanelUI;
})(window);
