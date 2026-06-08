import fs from "fs";
import path from "path";
import { DATA_DIR, BASIC_LANDS } from "./config.js";
import { getArtists } from "./scryfall.js";

function artistMatches(artist, myArtists) {
  return myArtists.some((a) => artist.toLowerCase().includes(a.toLowerCase()));
}

export async function matchArtistCards(filteredCards, cardBoards, myArtists) {
  const artistCards = {};
  for (const card of filteredCards) {
    const results = await getArtists(card);
    const board = cardBoards[card] || "mainboard";
    for (const { artist, set, num, image, url } of results) {
      if (artistMatches(artist, myArtists)) {
        if (!artistCards[artist]) artistCards[artist] = [];
        if (!artistCards[artist].some((e) => e.card === card && e.set === set && e.num === num)) {
          artistCards[artist].push({ card, set, num, image, url, board });
        }
      }
    }
  }
  return artistCards;
}

export function matchBasicLands(myArtists) {
  const basicLandCards = {};
  for (const land of BASIC_LANDS) {
    const landData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${land}.json`), "utf-8"));
    for (const { artist, set, num, image, url } of landData) {
      if (artistMatches(artist, myArtists)) {
        if (!basicLandCards[artist]) basicLandCards[artist] = [];
        basicLandCards[artist].push({ card: land.charAt(0).toUpperCase() + land.slice(1), set, num, image, url, board: "basicland" });
      }
    }
  }
  return basicLandCards;
}
