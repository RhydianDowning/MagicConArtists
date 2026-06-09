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
}
