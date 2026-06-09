import fs from "fs";
import path from "path";
import { DATA_DIR as DEFAULT_DATA_DIR, BASIC_LANDS } from "./config.js";
import { getArtists } from "./scryfall.js";

let dataDir = DEFAULT_DATA_DIR;
export function setDataDir(dir) { dataDir = dir; }

function artistMatches(artist, myArtists) {
  return myArtists.some((a) => artist.toLowerCase().includes(a.toLowerCase()));
}

export async function matchArtistCards(filteredCards, cardBoards, myArtists, cardPrintings = null) {
  const artistCards = {};
  for (const card of filteredCards) {
    const results = await getArtists(card);
    const board = cardBoards[card] || "mainboard";
    const specificPrinting = cardPrintings?.[card];
    for (const { artist, set, num, image, url } of results) {
      if (!artistMatches(artist, myArtists)) continue;
      if (specificPrinting && set !== specificPrinting.set) continue;
      if (specificPrinting && num !== specificPrinting.num) continue;
      if (!artistCards[artist]) artistCards[artist] = [];
      if (!artistCards[artist].some((e) => e.card === card && e.set === set && e.num === num)) {
        artistCards[artist].push({ card, set, num, image, url, board });
      }
    }
  }
  return artistCards;
}

export function matchBasicLands(myArtists, cardPrintings = null) {
  const basicLandCards = {};
  for (const land of BASIC_LANDS) {
    const landData = JSON.parse(fs.readFileSync(path.join(dataDir, `${land}.json`), "utf-8"));
    const cardName = land.charAt(0).toUpperCase() + land.slice(1);
    const specificPrinting = cardPrintings?.[cardName];
    for (const { artist, set, num, image, url } of landData) {
      if (!artistMatches(artist, myArtists)) continue;
      if (specificPrinting && set !== specificPrinting.set) continue;
      if (specificPrinting && num !== specificPrinting.num) continue;
      if (!basicLandCards[artist]) basicLandCards[artist] = [];
      basicLandCards[artist].push({ card: cardName, set, num, image, url, board: "basicland" });
    }
  }
  return basicLandCards;
}
