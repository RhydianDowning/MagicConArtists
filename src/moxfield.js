import puppeteer from "puppeteer-core";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export async function fetchDeck(url) {
  const publicId = url.split("/").pop();
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled", "--window-size=400,300"],
    ignoreDefaultArgs: ["--enable-automation"],
  });

  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    let deckData = null;
    page.on("response", async (res) => {
      if (res.url().includes(`/decks/all/${publicId}`) && res.status() === 200) {
        try { deckData = await res.json(); } catch {}
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    if (!deckData) await new Promise((r) => setTimeout(r, 5000));

    if (!deckData) throw new Error("Could not fetch deck data. The page may be private or Cloudflare blocked us.");

    const cards = [];
    const boards = deckData.boards || {};
    for (const section of ["commanders", "mainboard", "sideboard", "companions", "maybeboard"]) {
      const board = section === "maybeboard" ? "considering" : section === "sideboard" ? "sideboard" : "mainboard";
      for (const [, entry] of Object.entries(boards[section]?.cards || {})) {
        if (entry?.card?.name) {
          cards.push({
            name: entry.card.name,
            set: entry.card.set?.toUpperCase() || "",
            num: entry.card.collector_number || entry.card.cn || "",
            board,
          });
        }
      }
    }

    return { name: deckData.name || publicId, cards };
  } finally {
    await browser.close();
  }
}
