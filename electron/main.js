import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { BASIC_LANDS } from "../src/config.js";
import { getArtists, isCached } from "../src/scryfall.js";
import { matchArtistCards, matchBasicLands, setDataDir } from "../src/matcher.js";
import { setCacheDir } from "../src/cache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use userData for writable directories in packaged builds, project root in dev
const isPackaged = app.isPackaged;
const userDataRoot = isPackaged ? app.getPath("userData") : path.join(__dirname, "..");
const DECKLISTS_DIR = path.join(userDataRoot, "localStorage", "Decklists");
const USER_ARTISTS_DIR = path.join(userDataRoot, "localStorage", "ArtistLists");
const CACHE_DIR = path.join(userDataRoot, "localStorage", "CardArtists");
const ARTISTS_DIR = isPackaged ? path.join(process.resourcesPath, "artistLists") : path.join(__dirname, "..", "artistLists");
const DATA_DIR = isPackaged ? path.join(process.resourcesPath, "data") : path.join(__dirname, "..", "data");

function createWindow() {
  fs.mkdirSync(DECKLISTS_DIR, { recursive: true });
  fs.mkdirSync(USER_ARTISTS_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  setCacheDir(CACHE_DIR);
  setDataDir(DATA_DIR);
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

// Helper: ensure filename is unique in a directory
function uniqueFilename(dir, basename) {
  let filename = basename + ".txt";
  let i = 1;
  while (fs.existsSync(path.join(dir, filename))) {
    filename = `${basename} (${i}).txt`;
    i++;
  }
  return filename;
}

// IPC handlers

ipcMain.handle("get-decklists", () =>
  fs.readdirSync(DECKLISTS_DIR).filter((f) => f.endsWith(".txt"))
);

ipcMain.handle("import-moxfield", async (event, url) => {
  const publicId = url.split("/").pop();

  const win = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  let deckData = null;

  // Intercept the deck API response
  session.defaultSession.webRequest.onCompleted({ urls: ["*://*.moxfield.com/*"] }, (details) => {});
  win.webContents.session.webRequest.onBeforeRequest({ urls: ["*://*.moxfield.com/*"] }, (details, callback) => {
    callback({ cancel: false });
  });

  const responsePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for deck data")), 45000);

    win.webContents.session.webRequest.onCompleted({ urls: ["*://*.moxfield.com/*"] }, async (details) => {
      if (details.url.includes(`/decks/all/${publicId}`) && details.statusCode === 200) {
        // We got the response, now fetch it from the renderer
        try {
          const json = await win.webContents.executeJavaScript(
            `fetch("${details.url}", { credentials: "include" }).then(r => r.json())`
          );
          deckData = json;
          clearTimeout(timeout);
          resolve();
        } catch {}
      }
    });

    win.loadURL(url).catch(reject);

    // Fallback: wait a bit then try fetching directly from the page context
    setTimeout(async () => {
      if (deckData) return;
      try {
        const json = await win.webContents.executeJavaScript(
          `fetch("https://api2.moxfield.com/v3/decks/all/${publicId}", { credentials: "include" }).then(r => r.ok ? r.json() : null)`
        );
        if (json) { deckData = json; clearTimeout(timeout); resolve(); }
      } catch {}
    }, 10000);
  });

  try {
    await responsePromise;
  } finally {
    win.destroy();
  }

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

  const name = deckData.name || publicId;
  const filename = uniqueFilename(DECKLISTS_DIR, name.replace(/[/\\?%*:|"<>]/g, "_"));
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
  const filename = uniqueFilename(DECKLISTS_DIR, name.replace(/[/\\?%*:|"<>]/g, "_"));
  const lines = cards.map((c) => c.set && c.num ? `${c.name}|${c.set}|${c.num}|${c.board || "mainboard"}` : `${c.name}|||${c.board || "mainboard"}`);
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
    await new Promise((r) => setTimeout(r, 500));
  }

  const hasAnyPrintingData = Object.keys(cardPrintings).length > 0;
  const specificArtistCards = hasAnyPrintingData ? await matchArtistCards(filteredCards, cardBoards, myArtists, cardPrintings) : null;
  const allArtistCards = await matchArtistCards(filteredCards, cardBoards, myArtists, null);
  const specificBasicLandCards = hasAnyPrintingData ? matchBasicLands(myArtists, cardPrintings) : null;
  const allBasicLandCards = matchBasicLands(myArtists, null);

  return { specificArtistCards, allArtistCards, specificBasicLandCards, allBasicLandCards, artistBooths };
});
