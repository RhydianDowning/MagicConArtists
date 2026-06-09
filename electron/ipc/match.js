import { ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { DECKLISTS_DIR, ARTISTS_DIR, USER_ARTISTS_DIR } from "../paths.js";
import { BASIC_LANDS } from "../../src/config.js";
import { getArtists, isCached } from "../../src/scryfall.js";
import { matchArtistCards, matchBasicLands } from "../../src/matcher.js";
import { readCache } from "../../src/cache.js";

let cancelled = false;

export function register() {
  ipcMain.handle("cancel-match", () => { cancelled = true; });

  ipcMain.handle("run-match", async (event, { deckFiles, artistFile, artistSource }) => {
    cancelled = false;

    const rawCards = deckFiles.flatMap((f) =>
      fs.readFileSync(path.join(DECKLISTS_DIR, f), "utf-8").split("\n").map((l) => l.trim()).filter(Boolean)
    );
    const seen = new Set();
    const cards = rawCards.map((l) => {
      const parts = l.split("|");
      return { name: parts[0], set: parts[1] || "", num: parts[2] || "", board: parts[3] || "mainboard" };
    }).filter((c) => { if (seen.has(c.name)) return false; seen.add(c.name); return true; });

    const cardNames = cards.map((c) => c.name);
    const cardBoards = Object.fromEntries(cards.map((c) => [c.name, c.board]));
    const cardPrintings = Object.fromEntries(cards.filter((c) => c.set && c.num).map((c) => [c.name, { set: c.set, num: c.num }]));

    const artistDir = artistSource === "user" ? USER_ARTISTS_DIR : ARTISTS_DIR;
    const artistLines = fs.readFileSync(path.join(artistDir, artistFile), "utf-8").split("\n").map((l) => l.trim()).filter(Boolean);
    const myArtists = artistLines.map((l) => l.split("|")[0]);
    const artistBooths = Object.fromEntries(artistLines.map((l) => { const [name, booth] = l.split("|"); return [name, booth || ""]; }));

    const filteredCards = cardNames.filter((c) => !BASIC_LANDS.includes(c.toLowerCase()));

    const uncachedCards = filteredCards.filter((c) => !isCached(c));
    const total = filteredCards.length;
    const cached = total - uncachedCards.length;

    event.sender.send("match-progress", { cached, total, fetching: uncachedCards.length });

    for (let i = 0; i < uncachedCards.length; i++) {
      if (cancelled) return null;
      event.sender.send("match-progress", { cached, total, fetching: uncachedCards.length, current: i + 1, card: uncachedCards[i] });
      await getArtists(uncachedCards[i], {
        onRateLimit: () => event.sender.send("match-progress", { cached, total, fetching: uncachedCards.length, current: i + 1, card: uncachedCards[i], rateLimited: true }),
        onResume: () => event.sender.send("match-progress", { cached, total, fetching: uncachedCards.length, current: i + 1, card: uncachedCards[i] }),
      });
      await new Promise((r) => setTimeout(r, 500));
    }

    if (cancelled) return null;

    // Identify cards not found on Scryfall
    const notFound = filteredCards.filter((c) => {
      const data = readCache(c);
      return data && data.length === 0;
    });

    const hasAnyPrintingData = Object.keys(cardPrintings).length > 0;
    const specificArtistCards = hasAnyPrintingData ? await matchArtistCards(filteredCards, cardBoards, myArtists, cardPrintings) : null;
    const allArtistCards = await matchArtistCards(filteredCards, cardBoards, myArtists, null);
    const specificBasicLandCards = hasAnyPrintingData ? matchBasicLands(myArtists, cardPrintings) : null;
    const allBasicLandCards = matchBasicLands(myArtists, null);

    const matchedCards = new Set(Object.values(allArtistCards).flatMap((cards) => cards.map((c) => c.card)));
    const noMatch = filteredCards.filter((c) => !matchedCards.has(c) && !notFound.includes(c));

    return { specificArtistCards, allArtistCards, specificBasicLandCards, allBasicLandCards, artistBooths, notFound, noMatch };
  });
}
