const fs = require("fs");
const path = require("path");

const cards = fs
  .readFileSync(path.join(__dirname, "decklist.txt"), "utf-8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let requestCount = 0;

async function getArtists(name) {
  const url = `https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(name)}"&unique=art`;
  const artists = new Set();
  let nextPage = url;

  while (nextPage) {
    if (requestCount > 0 && requestCount % 5 === 0) await sleep(3000);
    requestCount++;
    const res = await fetch(nextPage, {
      headers: { "User-Agent": "ScryfallArtists/1.0" },
    });
    if (!res.ok) {
      console.error(`Could not find: ${name}`);
      return [];
    }
    const data = await res.json();
    data.data.forEach((card) => artists.add(card.artist));
    nextPage = data.has_more ? data.next_page : null;
  }

  return [...artists];
}

(async () => {
  for (const card of cards) {
    const artists = await getArtists(card);
    console.log(`${card}:`);
    artists.forEach((a, i) => console.log(`  ${i + 1}) ${a}`));
    console.log();
  }
})();
