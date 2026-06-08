#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { input } from "@inquirer/prompts";
import chalk from "chalk";
import { DECKLISTS_DIR } from "./src/config.js";
import { fetchDeck } from "./src/moxfield.js";

const url = await input({ message: "Moxfield deck URL:" });
if (!url) process.exit(0);

console.log(chalk.dim("Opening Chrome to fetch deck from Moxfield..."));

try {
  const { name, cards } = await fetchDeck(url);
  const filename = name.replace(/[/\\?%*:|"<>]/g, "_") + ".txt";
  const filePath = path.join(DECKLISTS_DIR, filename);

  // Format: "Card Name|SET|NUM|BOARD" - pipe-separated so we can parse it back
  const seen = new Set();
  const lines = cards.filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  }).map((c) => `${c.name}|${c.set || ""}|${c.num || ""}|${c.board || "mainboard"}`);

  fs.writeFileSync(filePath, lines.join("\n") + "\n");
  console.log(chalk.green(`✓ Saved ${lines.length} unique cards to ${filename}`));
} catch (e) {
  console.error(chalk.red(`✗ ${e.message}`));
  process.exit(1);
}
