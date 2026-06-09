import { ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { ARTISTS_DIR, USER_ARTISTS_DIR } from "../paths.js";

export function register() {
  ipcMain.handle("get-artist-lists", () => {
    const appLists = fs.readdirSync(ARTISTS_DIR).filter((f) => f.endsWith(".txt")).map((f) => ({ file: f, source: "app" }));
    const userLists = fs.readdirSync(USER_ARTISTS_DIR).filter((f) => f.endsWith(".txt")).map((f) => ({ file: f, source: "user" }));
    return [...appLists, ...userLists];
  });

  ipcMain.handle("delete-artist-list", (event, filename) => {
    const filePath = path.join(USER_ARTISTS_DIR, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  ipcMain.handle("save-artist-list", (event, { name, artists }) => {
    const filename = name.replace(/[/\\?%*:|"<>]/g, "_") + ".txt";
    const lines = artists.map((a) => a.info ? `${a.name}|${a.info}` : a.name);
    fs.writeFileSync(path.join(USER_ARTISTS_DIR, filename), lines.join("\n") + "\n");
    return filename;
  });
}
