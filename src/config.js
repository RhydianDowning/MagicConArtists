const path = require("path");

const ROOT = path.join(__dirname, "..");
const CACHE_DIR = path.join(ROOT, "localStorage", "CardArtists");
const DECKLIST_PATH = path.join(ROOT, "localStorage", "Decklists", "decklist.txt");
const ARTISTS_PATH = path.join(ROOT, "artistLists", "magicConAmsterdam26.txt");
const BASIC_LANDS = ["island", "mountain", "plains", "swamp", "forest"];
const USER_AGENT = "ScryfallArtists/1.0";

module.exports = { CACHE_DIR, DECKLIST_PATH, ARTISTS_PATH, BASIC_LANDS, USER_AGENT };
