"use strict";

// Guards against the two versions drifting apart: both pages must load the
// same shared scripts and expose the same panel element ids.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const v3 = fs.readFileSync(path.join(root, "v3/index.html"), "utf8");
const v4 = fs.readFileSync(path.join(root, "v4/index.html"), "utf8");

const SHARED_SCRIPTS = ["../shared/config.js", "../shared/geo-utils.js", "../shared/panel.js"];
const PANEL_IDS = ["appTitle", "bufferSelect", "clearButton", "analyzeToggle", "status", "results", "dataSource"];

for (const [name, html] of [["v3", v3], ["v4", v4]]) {
  test(`${name} loads every shared script`, () => {
    for (const src of SHARED_SCRIPTS) {
      assert.ok(html.includes(`src="${src}"`), `${name} is missing ${src}`);
    }
  });

  test(`${name} has every panel element`, () => {
    for (const id of PANEL_IDS) {
      assert.ok(html.includes(`id="${id}"`), `${name} is missing #${id}`);
    }
  });
}

test("v3 pins the final 3.x release and v4 the final 4.x release", () => {
  assert.ok(v3.includes("https://js.arcgis.com/3.46/"));
  assert.ok(v4.includes("https://js.arcgis.com/4.34/"));
});

test("shared config uses HTTPS service URLs", () => {
  const config = fs.readFileSync(path.join(root, "shared/config.js"), "utf8");
  const urls = config.match(/url:\s*"([^"]+)"/g) || [];
  assert.ok(urls.length >= 2);
  for (const url of urls) assert.ok(url.includes("https://"), url);
});
