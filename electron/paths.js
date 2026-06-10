import { app } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isPackaged = app.isPackaged;
const userDataRoot = isPackaged ? app.getPath("userData") : path.join(__dirname, "..");

export const DECKLISTS_DIR = path.join(userDataRoot, "localStorage", "Decklists");
export const USER_ARTISTS_DIR = path.join(userDataRoot, "localStorage", "ArtistLists");
export const CACHE_DIR = path.join(userDataRoot, "localStorage", "CardArtists");
export const CONVENTIONS_DIR = path.join(userDataRoot, "localStorage", "Conventions");
export const ARTISTS_DIR = isPackaged ? path.join(process.resourcesPath, "artistLists") : path.join(__dirname, "..", "artistLists");
export const DATA_DIR = isPackaged ? path.join(process.resourcesPath, "data") : path.join(__dirname, "..", "data");
export const PRELOAD_PATH = path.join(__dirname, "preload.js");
export const INDEX_HTML = path.join(__dirname, "renderer", "index.html");

export function ensureDirs() {
  fs.mkdirSync(DECKLISTS_DIR, { recursive: true });
  fs.mkdirSync(USER_ARTISTS_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(CONVENTIONS_DIR, { recursive: true });
}
