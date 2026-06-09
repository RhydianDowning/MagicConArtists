import { ipcMain, dialog } from "electron";
import { jsPDF } from "jspdf";
import fs from "fs";

export function register() {
  ipcMain.handle("export-pdf-images", async (event, imageUrls) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: "card-images.pdf",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return null;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210 - 20; // A4 width minus margins
    const pageH = 297 - 20;
    const cols = 3;
    const rows = 3;
    const cardW = pageW / cols;
    const cardH = pageH / rows;

    let count = 0;
    for (const url of imageUrls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        const base64 = buf.toString("base64");
        const ext = url.includes(".png") ? "PNG" : "JPEG";

        if (count > 0 && count % 9 === 0) doc.addPage();
        const col = count % 3;
        const row = Math.floor((count % 9) / 3);
        const x = 10 + col * cardW;
        const y = 10 + row * cardH;
        doc.addImage(`data:image/${ext.toLowerCase()};base64,${base64}`, ext, x, y, cardW - 2, cardH - 2);
        count++;
      } catch {}
    }

    fs.writeFileSync(filePath, Buffer.from(doc.output("arraybuffer")));
    return filePath;
  });

  ipcMain.handle("export-pdf-checklist", async (event, cards) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: "card-checklist.pdf",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return null;

    // Group by artist
    const byArtist = {};
    cards.forEach((c) => {
      if (!byArtist[c.artist]) byArtist[c.artist] = [];
      byArtist[c.artist].push(c.name);
    });
    const sorted = Object.keys(byArtist).sort();

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let y = 15;

    doc.setFontSize(18);
    doc.text("Card Signing Checklist", 105, y, { align: "center" });
    y += 12;

    for (const artist of sorted) {
      if (y > 275) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.setTextColor(26, 138, 106);
      doc.text(artist, 10, y);
      y += 6;

      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      for (const name of byArtist[artist]) {
        if (y > 280) { doc.addPage(); y = 15; }
        doc.rect(10, y - 3, 3.5, 3.5);
        doc.text(name, 16, y);
        y += 5;
      }
      y += 3;
    }

    fs.writeFileSync(filePath, Buffer.from(doc.output("arraybuffer")));
    return filePath;
  });
}
