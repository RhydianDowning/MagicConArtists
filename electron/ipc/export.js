import { ipcMain, dialog, BrowserWindow } from "electron";
import { jsPDF } from "jspdf";
import fs from "fs";

export function register() {
  ipcMain.handle("export-pdf-images", async (event, imageUrls) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: "card-images.pdf",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return null;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    // MTG card size: 63mm x 88mm, 3x3 grid centered on A4
    const cardW = 63;
    const cardH = 88;
    const cols = 3;
    const rows = 3;
    const marginX = (210 - cols * cardW) / 2;
    const marginY = (297 - rows * cardH) / 2;

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
        const x = marginX + col * cardW;
        const y = marginY + row * cardH;
        doc.addImage(`data:image/${ext.toLowerCase()};base64,${base64}`, ext, x, y, cardW - 0.5, cardH - 0.5);
        count++;
      } catch {}
    }

    fs.writeFileSync(filePath, Buffer.from(doc.output("arraybuffer")));
    return filePath;
  });

  ipcMain.handle("export-pdf-checklist", async (event, cards) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: "card-checklist.pdf",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return null;

    // Group by artist
    const byArtist = {};
    const artistBooth = {};
    cards.forEach((c) => {
      if (!byArtist[c.artist]) byArtist[c.artist] = [];
      byArtist[c.artist].push(c.name);
      if (c.booth) artistBooth[c.artist] = c.booth;
    });
    const sorted = Object.keys(byArtist).sort();

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const margin = 15;
    const colW = (pageW - margin * 2 - 10) / 2; // 10mm gutter
    const colX = [margin, margin + colW + 10];
    const maxY = 280;
    let col = 0;
    let y = margin;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 30, 30);
    doc.text("Painter's Servant", pageW / 2, y, { align: "center" });
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text("CARD SIGNING CHECKLIST", pageW / 2, y, { align: "center" });
    y += 4;
    // Thin rule
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    const startY = y;
    let colY = [startY, startY];

    function nextPage() {
      doc.addPage();
      colY = [margin + 5, margin + 5];
      col = 0;
    }

    for (const artist of sorted) {
      // Estimate space needed: artist header + at least 1 card
      const needed = 7 + 5;
      if (colY[col] + needed > maxY) {
        col++;
        if (col > 1) nextPage();
      }

      const x = colX[col];
      let cy = colY[col];

      // Artist name - bold with subtle underline
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      const label = artistBooth[artist] ? `${artist} - (${artistBooth[artist]})` : artist;
      doc.text(label, x, cy);
      cy += 1;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(x, cy, x + colW, cy);
      cy += 4;

      // Cards
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      for (const name of byArtist[artist]) {
        if (cy + 4 > maxY) {
          colY[col] = cy;
          col++;
          if (col > 1) nextPage();
          cy = colY[col];
        }
        const cx = colX[col];
        // Checkbox
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        doc.roundedRect(cx, cy - 2.8, 3, 3, 0.5, 0.5);
        doc.text(name, cx + 4.5, cy);
        cy += 4.5;
      }
      cy += 3;
      colY[col] = cy;
    }

    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text(`Page ${i} of ${pageCount}`, pageW / 2, 292, { align: "center" });
    }

    fs.writeFileSync(filePath, Buffer.from(doc.output("arraybuffer")));
    return filePath;
  });
}
