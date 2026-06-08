const { USER_AGENT } = require("./config");
const { readCache, writeCache } = require("./cache");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getArtists(name) {
  const cached = readCache(name);
  if (cached) {
    console.error(`  [cached]`);
    return cached;
  }

  const url = `https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(name)}"&unique=art`;
  const results = [];
  let nextPage = url;

  while (nextPage) {
    await sleep(500);
    const res = await fetch(nextPage, {
      headers: { "User-Agent": USER_AGENT },
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

  writeCache(name, results);
  return results;
}

module.exports = { getArtists };
