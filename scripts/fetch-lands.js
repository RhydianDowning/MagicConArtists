#!/usr/bin/env node
// One-time script to fetch all basic land art data from Scryfall and save to data/
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LANDS = ["Island", "Mountain", "Plains", "Swamp", "Forest"];

async function fetchLand(name) {
  const results = [];
  let nextPage = `https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(name)}"&unique=art`;

  while (nextPage) {
    const res = await fetch(nextPage, { headers: { "User-Agent": "ScryfallArtists/1.0" } });
    if (res.status === 429) {
      console.log("  Rate limited, waiting 31s...");
      await sleep(31000);
      continue;
    }
    if (!res.ok) { console.error(`  Failed for ${name}`); break; }
    const data = await res.json();
    data.data.forEach((card) => {
      const image = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || "";
      results.push({ artist: card.artist, set: card.set.toUpperCase(), num: card.collector_number, image, url: card.scryfall_uri });
    });
    nextPage = data.has_more ? data.next_page : null;
    await sleep(500);
  }

  return results;
}

for (const land of LANDS) {
  console.log(`Fetching: ${land}...`);
  const data = await fetchLand(land);
  fs.writeFileSync(path.join(dataDir, `${land.toLowerCase()}.json`), JSON.stringify(data));
  console.log(`  ✓ ${data.length} printings saved`);
}
console.log("Done!");
