const fs = require("fs");
const path = require("path");
const { CACHE_DIR } = require("./config");

function getCachePath(name) {
  return path.join(CACHE_DIR, name.replace(/[/\\?%*:|"<>]/g, "_") + ".json");
}

function readCache(name) {
  const cachePath = getCachePath(name);
  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  }
  return null;
}

function writeCache(name, data) {
  fs.writeFileSync(getCachePath(name), JSON.stringify(data));
}

module.exports = { readCache, writeCache };
