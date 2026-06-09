import fs from "fs";
import path from "path";
import { CACHE_DIR } from "./config.js";

let cacheDir = CACHE_DIR;
export function setCacheDir(dir) { cacheDir = dir; }

function getCachePath(name) {
  return path.join(cacheDir, name.replace(/[/\\?%*:|"<>]/g, "_") + ".json");
}

export function readCache(name) {
  const p = getCachePath(name);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  return null;
}

export function writeCache(name, data) {
  fs.writeFileSync(getCachePath(name), JSON.stringify(data));
}
