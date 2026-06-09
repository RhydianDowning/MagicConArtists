import { ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { DECKLISTS_DIR, CACHE_DIR } from "../paths.js";

function uniqueFilename(dir, basename) {
  let filename = basename + ".txt";
  let i = 1;
  while (fs.existsSync(path.join(dir, filename))) {
    filename = `${basename} (${i}).txt`;
    i++;
  }
  return filename;
}

export { uniqueFilename };

export function register() {
  ipcMain.handle("get-decklists", () =>
    fs.readdirSync(DECKLISTS_DIR).filter((f) => f.endsWith(".txt"))
  );

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

  ipcMain.handle("reset-cache", () => {
    const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));
    files.forEach((f) => fs.unlinkSync(path.join(CACHE_DIR, f)));
    return files.length;
  });
}
