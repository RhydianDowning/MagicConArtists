import { ipcMain, BrowserWindow, session } from "electron";
import fs from "fs";
import path from "path";
import { DECKLISTS_DIR } from "../paths.js";
import { uniqueFilename } from "./decklists.js";

export function register() {
  ipcMain.handle("import-moxfield", async (event, url) => {
    const publicId = url.split("/").pop();

    const win = new BrowserWindow({
      width: 400,
      height: 300,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    let deckData = null;

    session.defaultSession.webRequest.onCompleted({ urls: ["*://*.moxfield.com/*"] }, () => {});
    win.webContents.session.webRequest.onBeforeRequest({ urls: ["*://*.moxfield.com/*"] }, (details, callback) => {
      callback({ cancel: false });
    });

    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for deck data")), 45000);

      win.webContents.session.webRequest.onCompleted({ urls: ["*://*.moxfield.com/*"] }, async (details) => {
        if (details.url.includes(`/decks/all/${publicId}`) && details.statusCode === 200) {
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
}
