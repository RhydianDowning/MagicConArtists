#!/usr/bin/env node
import fs from "fs";
import path from "path";
import select from "@inquirer/select";
import cliProgress from "cli-progress";
import chalk from "chalk";
import { DECKLISTS_DIR, ARTISTS_DIR, BASIC_LANDS, DATA_DIR } from "./src/config.js";
import { getArtists, isCached } from "./src/scryfall.js";
import { printResults, printIgnored } from "./src/display.js";
import { matchArtistCards, matchBasicLands } from "./src/matcher.js";

const CANCEL = "__cancel__";
const IMPORT = "__import__";
const ALL = "__all__";

let deckFiles;
while (true) {
  const decklists = fs.readdirSync(DECKLISTS_DIR).filter((f) => f.endsWith(".txt"));
  const deckChoice = await select({
    message: "Select a decklist:",
    choices: [
      ...decklists.map((f) => ({ name: f, value: f })),
      { name: chalk.magenta("★ All decklists"), value: ALL },
      { name: chalk.cyan("⟳ Import from Moxfield"), value: IMPORT },
      { name: chalk.red("Cancel & Exit"), value: CANCEL },
    ],
  });
  if (deckChoice === CANCEL) process.exit(0);
  if (deckChoice === IMPORT) {
    const { fetchDeck } = await import("./src/moxfield.js");
    const { input } = await import("@inquirer/prompts");
    const url = await input({ message: "Moxfield deck URL:" });
    if (url) {
      console.log(chalk.dim("Opening Chrome to fetch deck from Moxfield..."));
      try {
        const { name, cards } = await fetchDeck(url);
        const filename = name.replace(/[/\\?%*:|"<>]/g, "_") + ".txt";
        const seen = new Set();
        const lines = cards.filter((c) => { if (seen.has(c.name)) return false; seen.add(c.name); return true; })
          .map((c) => `${c.name}|${c.set || ""}|${c.num || ""}|${c.board || "mainboard"}`);
        fs.writeFileSync(path.join(DECKLISTS_DIR, filename), lines.join("\n") + "\n");
        console.log(chalk.green(`✓ Saved ${lines.length} unique cards to ${filename}\n`));
      } catch (e) { console.error(chalk.red(`✗ ${e.message}\n`)); }
    }
    continue;
  }
  if (deckChoice === ALL) {
    deckFiles = fs.readdirSync(DECKLISTS_DIR).filter((f) => f.endsWith(".txt"));
  } else {
    deckFiles = [deckChoice];
  }
  break;
}

const artistFiles = fs.readdirSync(ARTISTS_DIR).filter((f) => f.endsWith(".txt"));

const artistFile = await select({
  message: "Select an artist list:",
  choices: [...artistFiles.map((f) => ({ name: f, value: f })), { name: chalk.red("Cancel & Exit"), value: CANCEL }],
});
if (artistFile === CANCEL) process.exit(0);

const useSpecificPrintings = await select({
  message: "Use specific printings from decklist where available?",
  choices: [
    { name: "No — show all printings by matched artists", value: false },
    { name: "Yes — only show the exact printings in my list", value: true },
  ],
});

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
const artistLines = fs.readFileSync(path.join(ARTISTS_DIR, artistFile), "utf-8").split("\n").map((l) => l.trim()).filter(Boolean);
const myArtists = artistLines.map((l) => l.split("|")[0]);
const artistBooths = Object.fromEntries(artistLines.map((l) => { const [name, booth] = l.split("|"); return [name, booth || ""]; }));

const ignoredLands = {};
const filteredCards = cardNames.filter((c) => {
  if (BASIC_LANDS.includes(c.toLowerCase())) {
    ignoredLands[c] = (ignoredLands[c] || 0) + 1;
    return false;
  }
  return true;
});

// Split into cached and uncached
const cachedCards = filteredCards.filter((c) => isCached(c));
const uncachedCards = filteredCards.filter((c) => !isCached(c));

console.log();
console.log(chalk.green(`✓ ${cachedCards.length}/${filteredCards.length} cached results found`));
if (uncachedCards.length > 0) {
  console.log(chalk.yellow(`⟳ Fetching ${uncachedCards.length} new card(s) from Scryfall...\n`));

  const barFormat = (options, params, payload) => {
    const color = payload.rateLimited ? chalk.yellow : chalk.cyan;
    const label = payload.rateLimited ? "30 second Timeout due to Scryfall Rate Limits" : payload.card;
    return color("{bar}").replace("{bar}", options.barCompleteChar.repeat(Math.round(params.progress * options.barsize)) + options.barIncompleteChar.repeat(options.barsize - Math.round(params.progress * options.barsize)))
      + ` ${Math.round(params.progress * 100)}% | ${params.value}/${params.total} | ` + chalk.dim(label);
  };

  const bar = new cliProgress.SingleBar({
    format: barFormat,
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
    barsize: 30,
  });

  bar.start(uncachedCards.length, 0, { card: "", rateLimited: false });
  for (let i = 0; i < uncachedCards.length; i++) {
    bar.update(i, { card: uncachedCards[i], rateLimited: false });
    await getArtists(uncachedCards[i], {
      onRateLimit: () => bar.update(i, { card: uncachedCards[i], rateLimited: true }),
      onResume: () => bar.update(i, { card: uncachedCards[i], rateLimited: false }),
    });
    bar.update(i + 1, { card: uncachedCards[i], rateLimited: false });
  }
  bar.stop();
  console.log(chalk.green("\n✓ All cards fetched and cached."));
} else {
  console.log(chalk.green("✓ All cards already cached — no API calls needed."));
}

// Prompt to view results
console.log();
const viewChoice = await select({
  message: "How would you like to view results?",
  choices: [
    { name: "View in browser (Images)", value: "browser" },
    { name: "View in terminal (List)", value: "terminal" },
  ],
});

// Process all cards from cache - both specific and all printings
const hasAnyPrintingData = Object.keys(cardPrintings).length > 0;
const specificArtistCards = hasAnyPrintingData ? await matchArtistCards(filteredCards, cardBoards, myArtists, cardPrintings) : null;
const allArtistCards = await matchArtistCards(filteredCards, cardBoards, myArtists, null);

// Load basic land data from pre-fetched files
const specificBasicLandCards = hasAnyPrintingData ? matchBasicLands(myArtists, cardPrintings) : null;
const allBasicLandCards = matchBasicLands(myArtists, null);

if (viewChoice === "terminal") {
  console.log();
  printResults(useSpecificPrintings ? specificArtistCards : allArtistCards, useSpecificPrintings ? specificBasicLandCards : allBasicLandCards, artistBooths);
  printIgnored(ignoredLands);
} else {
  const { serve } = await import("./src/server.js");
  const server = serve(specificArtistCards, 3000, specificBasicLandCards, allArtistCards, allBasicLandCards, artistBooths);
  console.log(chalk.green("\n✓ Opened in browser. Press Ctrl+C to stop the server."));
}
