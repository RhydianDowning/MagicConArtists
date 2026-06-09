import { ipcMain, dialog } from "electron";
import PDFDocument from "pdfkit";
import fs from "fs";

export function register() {
  ipcMain.handle("export-pdf-images", async (event, imageUrls) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: "card-images.pdf",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return null;

    // Download all images
    const images = [];
    for (const url of imageUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) images.push(Buffer.from(await res.arrayBuffer()));
      } catch {}
    }

    // Build PDF: 9 images per A4 page (3x3 grid)
    const doc = new PDFDocument({ size: "A4", margin: 20 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageW = doc.page.width - 40;
    const pageH = doc.page.height - 40;
    const cols = 3;
    const rows = 3;
    const cardW = pageW / cols;
    const cardH = pageH / rows;

    images.forEach((img, i) => {
      if (i > 0 && i % 9 === 0) doc.addPage();
      const col = i % 3;
      const row = Math.floor((i % 9) / 3);
      const x = 20 + col * cardW;
      const y = 20 + row * cardH;
      doc.image(img, x, y, { fit: [cardW - 5, cardH - 5], align: "center", valign: "center" });
    });

    doc.end();
    await new Promise((resolve) => stream.on("finish", resolve));
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

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(18).text("Card Signing Checklist", { align: "center" });
    doc.moveDown(1);

    for (const artist of sorted) {
      if (doc.y > doc.page.height - 80) doc.addPage();
      doc.fontSize(12).fillColor("#1a8a6a").text(artist);
      doc.moveDown(0.3);
      for (const name of byArtist[artist]) {
        if (doc.y > doc.page.height - 50) doc.addPage();
        doc.fontSize(10).fillColor("#333333");
        const y = doc.y;
        doc.rect(40, y + 2, 10, 10).stroke();
        doc.text(name, 58, y);
        doc.moveDown(0.2);
      }
      doc.moveDown(0.5);
    }

    doc.end();
    await new Promise((resolve) => stream.on("finish", resolve));
    return filePath;
  });
}
