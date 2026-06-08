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
    data.data.forEach((card) => {
      const image = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || "";
      results.push({ artist: card.artist, set: card.set.toUpperCase(), num: card.collector_number, image, url: card.scryfall_uri });
    });
    nextPage = data.has_more ? data.next_page : null;
    await sleep(500);
  }

  writeCache(name, results);
  return results;
}
