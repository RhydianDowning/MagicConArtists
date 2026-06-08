import fs from "fs";
import path from "path";
import { CACHE_DIR } from "./config.js";

function getCachePath(name) {
  return path.join(CACHE_DIR, name.replace(/[/\\?%*:|"<>]/g, "_") + ".json");
}

export function readCache(name) {
  const p = getCachePath(name);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  return null;
}

export function writeCache(name, data) {
  fs.writeFileSync(getCachePath(name), JSON.stringify(data));
}
