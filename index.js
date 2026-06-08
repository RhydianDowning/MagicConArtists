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
  const results = [];
  let nextPage = url;

  while (nextPage) {
    if (requestCount > 0 && requestCount % 5 === 0) await sleep(3000);
    requestCount++;
    const res = await fetch(nextPage, {
      headers: { "User-Agent": "ScryfallArtists/1.0" },
    });
    if (res.status === 429) {
      console.error(`  Rate limited, waiting 30s...`);
      await sleep(30000);
      continue;
    }
    if (!res.ok) {
      console.error(`Could not find: ${name}`);
      return [];
    }
    const data = await res.json();
    data.data.forEach((card) => results.push({ artist: card.artist, set: card.set.toUpperCase(), num: card.collector_number }));
    nextPage = data.has_more ? data.next_page : null;
  }

  return results;
}

const myArtists = fs
  .readFileSync(path.join(__dirname, "artists.txt"), "utf-8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

const BASIC_LANDS = ["island", "mountain", "plains", "swamp", "forest"];
const ignoredLands = {};
const filteredCards = cards.filter((c) => {
  const lower = c.toLowerCase();
  if (BASIC_LANDS.includes(lower)) {
    ignoredLands[c] = (ignoredLands[c] || 0) + 1;
    return false;
  }
  return true;
});

(async () => {
  const artistCards = {};

  for (let i = 0; i < filteredCards.length; i++) {
    const card = filteredCards[i];
    console.error(`[${i + 1}/${filteredCards.length}] Fetching: ${card}`);
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

  for (const [artist, cardList] of Object.entries(artistCards)) {
    console.log(`${artist}:`);
    cardList.forEach((e, i) => console.log(`  ${i + 1}) ${e.card} - ${e.set} #${e.num}`));
    console.log();
  }

  if (Object.keys(ignoredLands).length > 0) {
    const parts = Object.entries(ignoredLands).map(([name, count]) => `${count} [ ${name} ]`);
    console.log(`Basic lands are not searched, therefore: Ignored ${parts.join(" and ")}`);
  }
})();
