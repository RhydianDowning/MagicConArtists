import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { DECKLISTS_DIR, ARTISTS_DIR, USER_ARTISTS_DIR, BASIC_LANDS } from "../src/config.js";
import { getArtists, isCached } from "../src/scryfall.js";
import { matchArtistCards, matchBasicLands } from "../src/matcher.js";
import { fetchDeck } from "../src/moxfield.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  fs.mkdirSync(USER_ARTISTS_DIR, { recursive: true });
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());

// IPC handlers

ipcMain.handle("get-decklists", () =>
  fs.readdirSync(DECKLISTS_DIR).filter((f) => f.endsWith(".txt"))
);

ipcMain.handle("import-moxfield", async (event, url) => {
  const { name, cards } = await fetchDeck(url);
  const filename = name.replace(/[/\\?%*:|"<>]/g, "_") + ".txt";
  const seen = new Set();
  const lines = cards.filter((c) => { if (seen.has(c.name)) return false; seen.add(c.name); return true; })
    .map((c) => `${c.name}|${c.set || ""}|${c.num || ""}|${c.board || "mainboard"}`);
  fs.writeFileSync(path.join(DECKLISTS_DIR, filename), lines.join("\n") + "\n");
  return { filename, count: lines.length };
});

ipcMain.handle("get-artist-lists", () => {
  const appLists = fs.readdirSync(ARTISTS_DIR).filter((f) => f.endsWith(".txt")).map((f) => ({ file: f, source: "app" }));
  const userLists = fs.readdirSync(USER_ARTISTS_DIR).filter((f) => f.endsWith(".txt")).map((f) => ({ file: f, source: "user" }));
  return [...appLists, ...userLists];
});

ipcMain.handle("delete-artist-list", (event, filename) => {
  const filePath = path.join(USER_ARTISTS_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
});

ipcMain.handle("delete-deck", (event, filename) => {
  const filePath = path.join(DECKLISTS_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
});

ipcMain.handle("save-deck", (event, { name, cards }) => {
  const filename = name.replace(/[/\\?%*:|"<>]/g, "_") + ".txt";
  const lines = cards.map((c) => c.set && c.num ? `${c.name}|${c.set}|${c.num}|mainboard` : c.name);
  fs.writeFileSync(path.join(DECKLISTS_DIR, filename), lines.join("\n") + "\n");
  return { filename, count: cards.length };
});

ipcMain.handle("save-artist-list", (event, { name, artists }) => {
  const filename = name.replace(/[/\\?%*:|"<>]/g, "_") + ".txt";
  const lines = artists.map((a) => a.info ? `${a.name}|${a.info}` : a.name);
  fs.writeFileSync(path.join(USER_ARTISTS_DIR, filename), lines.join("\n") + "\n");
  return filename;
});

ipcMain.handle("run-match", async (event, { deckFiles, artistFile, artistSource }) => {
  const rawCards = deckFiles.flatMap((f) =>
    fs.readFileSync(path.join(DECKLISTS_DIR, f), "utf-8").split("\n").map((l) => l.trim()).filter(Boolean)
  );
  const seen = new Set();
  const cards = rawCards.map((l) => {
    const parts = l.split("|");
    return { name: parts[0], set: parts[1] || "", num: parts[2] || "", board: parts[3] || "mainboard" };
  }).filter((c) => { if (seen.has(c.name)) return false; seen.add(c.name); return true; });

  const cardNames = cards.map((c) => c.name);
  const cardBoards = Object.fromEntries(cards.map((c) => [c.name, c.board]));
  const cardPrintings = Object.fromEntries(cards.filter((c) => c.set && c.num).map((c) => [c.name, { set: c.set, num: c.num }]));

  const artistDir = artistSource === "user" ? USER_ARTISTS_DIR : ARTISTS_DIR;
  const artistLines = fs.readFileSync(path.join(artistDir, artistFile), "utf-8").split("\n").map((l) => l.trim()).filter(Boolean);
  const myArtists = artistLines.map((l) => l.split("|")[0]);
  const artistBooths = Object.fromEntries(artistLines.map((l) => { const [name, booth] = l.split("|"); return [name, booth || ""]; }));

  const filteredCards = cardNames.filter((c) => !BASIC_LANDS.includes(c.toLowerCase()));

  // Report progress for uncached cards
  const uncachedCards = filteredCards.filter((c) => !isCached(c));
  const total = filteredCards.length;
  const cached = total - uncachedCards.length;

  event.sender.send("match-progress", { cached, total, fetching: uncachedCards.length });

  for (let i = 0; i < uncachedCards.length; i++) {
    event.sender.send("match-progress", { cached, total, fetching: uncachedCards.length, current: i + 1, card: uncachedCards[i] });
    await getArtists(uncachedCards[i], {
      onRateLimit: () => event.sender.send("match-progress", { cached, total, fetching: uncachedCards.length, current: i + 1, card: uncachedCards[i], rateLimited: true }),
      onResume: () => event.sender.send("match-progress", { cached, total, fetching: uncachedCards.length, current: i + 1, card: uncachedCards[i] }),
    });
  }

  const hasAnyPrintingData = Object.keys(cardPrintings).length > 0;
  const specificArtistCards = hasAnyPrintingData ? await matchArtistCards(filteredCards, cardBoards, myArtists, cardPrintings) : null;
  const allArtistCards = await matchArtistCards(filteredCards, cardBoards, myArtists, null);
  const specificBasicLandCards = hasAnyPrintingData ? matchBasicLands(myArtists, cardPrintings) : null;
  const allBasicLandCards = matchBasicLands(myArtists, null);

  return { specificArtistCards, allArtistCards, specificBasicLandCards, allBasicLandCards, artistBooths };
});
