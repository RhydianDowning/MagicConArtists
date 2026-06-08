const fs = require("fs");
const { DECKLIST_PATH, ARTISTS_PATH, BASIC_LANDS } = require("./src/config");
const { getArtists } = require("./src/scryfall");

const cards = fs.readFileSync(DECKLIST_PATH, "utf-8").split("\n").map((l) => l.trim()).filter(Boolean);
const myArtists = fs.readFileSync(ARTISTS_PATH, "utf-8").split("\n").map((l) => l.trim()).filter(Boolean);

const ignoredLands = {};
const filteredCards = cards.filter((c) => {
  if (BASIC_LANDS.includes(c.toLowerCase())) {
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
