import { app, BrowserWindow, shell, ipcMain } from "electron";
import { ensureDirs, PRELOAD_PATH, INDEX_HTML, CACHE_DIR, DATA_DIR } from "./paths.js";
import { setCacheDir } from "../src/cache.js";
import { setDataDir } from "../src/matcher.js";
import { register as registerDecklists } from "./ipc/decklists.js";
import { register as registerArtists } from "./ipc/artists.js";
import { register as registerMoxfield } from "./ipc/moxfield.js";
import { register as registerMatch } from "./ipc/match.js";
import { register as registerExport } from "./ipc/export.js";

function createWindow() {
  ensureDirs();
  setCacheDir(CACHE_DIR);
  setDataDir(DATA_DIR);

  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(INDEX_HTML);
}

registerDecklists();
registerArtists();
registerMoxfield();
registerMatch();
registerExport();

ipcMain.handle("open-urls", (event, urls) => {
  urls.forEach((url) => shell.openExternal(url));
});

ipcMain.handle("open-file", (event, filePath) => {
  shell.openPath(filePath);
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
