import { ipcMain } from "electron";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import pako from "pako";
import { CONVENTIONS_DIR } from "../paths.js";

function conPath(id) {
  return path.join(CONVENTIONS_DIR, `${id}.json`);
}

function readCon(id) {
  const p = conPath(id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function writeCon(id, data) {
  fs.writeFileSync(conPath(id), JSON.stringify(data, null, 2));
}

export function register() {
  ipcMain.handle("get-conventions", () => {
    return fs.readdirSync(CONVENTIONS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const data = JSON.parse(fs.readFileSync(path.join(CONVENTIONS_DIR, f), "utf-8"));
        return { id: f.replace(".json", ""), name: data.name };
      });
  });

  ipcMain.handle("create-convention", (event, name) => {
    const id = name.replace(/[/\\?%*:|"<>]/g, "_").toLowerCase().replace(/\s+/g, "-");
    const data = { name, cards: [] };
    writeCon(id, data);
    return { id, name };
  });

  ipcMain.handle("get-convention", (event, id) => {
    return readCon(id);
  });

  ipcMain.handle("add-to-convention", (event, { id, cards }) => {
    const data = readCon(id);
    if (!data) return null;
    for (const card of cards) {
      const exists = data.cards.some((c) => c.name === card.name && c.artist === card.artist);
      if (!exists) data.cards.push({ ...card, signed: false });
    }
    writeCon(id, data);
    return data;
  });

  ipcMain.handle("toggle-signed", (event, { id, artist, name }) => {
    const data = readCon(id);
    if (!data) return null;
    const card = data.cards.find((c) => c.name === name && c.artist === artist);
    if (card) card.signed = !card.signed;
    writeCon(id, data);
    return data;
  });

  ipcMain.handle("delete-convention", (event, id) => {
    const p = conPath(id);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  ipcMain.handle("remove-from-convention", (event, { id, artist, name }) => {
    const data = readCon(id);
    if (!data) return null;
    data.cards = data.cards.filter((c) => !(c.name === name && c.artist === artist));
    writeCon(id, data);
    return data;
  });

  ipcMain.handle("remove-artist-from-convention", (event, { id, artist }) => {
    const data = readCon(id);
    if (!data) return null;
    data.cards = data.cards.filter((c) => c.artist !== artist);
    writeCon(id, data);
    return data;
  });

  ipcMain.handle("generate-checklist-qr", async (event, { id, baseUrl }) => {
    const data = readCon(id);
    if (!data) return null;
    // Minimize payload: only essential fields
    const minimal = { n: data.name, c: data.cards.map((c) => ({ a: c.artist, b: c.booth || "", n: c.name, s: c.signed })) };
    const json = JSON.stringify(minimal);
    const compressed = Buffer.from(pako.deflate(json)).toString("base64url");
    const url = `${baseUrl}#z=${compressed}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, errorCorrectionLevel: "L", color: { dark: "#e6edf3", light: "#0d1117" } });
    return qrDataUrl;
  });
}
