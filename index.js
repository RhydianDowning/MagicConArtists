#!/usr/bin/env node
import fs from "fs";
import path from "path";
import select from "@inquirer/select";
import cliProgress from "cli-progress";
import chalk from "chalk";
import { DECKLISTS_DIR, ARTISTS_DIR, BASIC_LANDS } from "./src/config.js";
import { getArtists, isCached } from "./src/scryfall.js";
import { printResults, printIgnored } from "./src/display.js";

const CANCEL = "__cancel__";

const decklists = fs.readdirSync(DECKLISTS_DIR).filter((f) => f.endsWith(".txt"));
const artistFiles = fs.readdirSync(ARTISTS_DIR).filter((f) => f.endsWith(".txt"));

const deckFile = await select({
  message: "Select a decklist:",
  choices: [...decklists.map((f) => ({ name: f, value: f })), { name: chalk.red("Cancel & Exit"), value: CANCEL }],
});
if (deckFile === CANCEL) process.exit(0);

const artistFile = await select({
  message: "Select an artist list:",
  choices: [...artistFiles.map((f) => ({ name: f, value: f })), { name: chalk.red("Cancel & Exit"), value: CANCEL }],
});
if (artistFile === CANCEL) process.exit(0);

const cards = fs.readFileSync(path.join(DECKLISTS_DIR, deckFile), "utf-8").split("\n").map((l) => l.trim()).filter(Boolean);
const myArtists = fs.readFileSync(path.join(ARTISTS_DIR, artistFile), "utf-8").split("\n").map((l) => l.trim()).filter(Boolean);

const ignoredLands = {};
const filteredCards = cards.filter((c) => {
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
await select({
  message: "Ready to display results",
  choices: [{ name: "View results", value: "view" }],
});

// Process all cards from cache
const artistCards = {};
for (const card of filteredCards) {
  const results = await getArtists(card);
  for (const { artist, set, num } of results) {
    if (myArtists.some((a) => artist.toLowerCase().includes(a.toLowerCase()))) {
      if (!artistCards[artist]) artistCards[artist] = [];
      if (!artistCards[artist].some((e) => e.card === card && e.set === set && e.num === num)) {
        artistCards[artist].push({ card, set, num });
      }
    }
  }
}

console.log();
printResults(artistCards);
printIgnored(ignoredLands);
