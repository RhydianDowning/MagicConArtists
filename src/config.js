import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, "..");
export const CACHE_DIR = path.join(ROOT, "localStorage", "CardArtists");
export const DECKLISTS_DIR = path.join(ROOT, "localStorage", "Decklists");
export const ARTISTS_DIR = path.join(ROOT, "artistLists");
export const DATA_DIR = path.join(ROOT, "data");
export const BASIC_LANDS = ["island", "mountain", "plains", "swamp", "forest"];
export const USER_AGENT = "ScryfallArtists/1.0";
