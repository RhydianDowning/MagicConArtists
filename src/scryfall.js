import { USER_AGENT } from "./config.js";
import { readCache, writeCache } from "./cache.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function isCached(name) {
  return readCache(name) !== null;
}

export async function getArtists(name, { onRateLimit, onResume } = {}) {
  const cached = readCache(name);
  if (cached) return cached;

  const url = `https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(name)}"&unique=art`;
  const results = [];
  let nextPage = url;

  while (nextPage) {
    await sleep(500);
    const res = await fetch(nextPage, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (res.status === 429) {
      if (onRateLimit) onRateLimit();
      await sleep(31000);
      if (onResume) onResume();
      continue;
    }
    if (!res.ok) return [];
    const data = await res.json();
    data.data.forEach((card) => results.push({ artist: card.artist, set: card.set.toUpperCase(), num: card.collector_number }));
    nextPage = data.has_more ? data.next_page : null;
  }

  writeCache(name, results);
  return results;
}
