import http from "http";
import { exec } from "child_process";
import { platform } from "os";

function generateHTML(artistCards) {
  const sections = Object.entries(artistCards).map(([artist, cards]) => {
    const imgs = cards.map((c) =>
      `<div class="card"><a href="${c.url}" target="_blank"><img src="${c.image}" alt="${c.card}"></a><p>${c.card}<br><small>${c.set} #${c.num}</small></p></div>`
    ).join("");
    return `<section><h2>${artist}</h2><div class="grid">${imgs}</div></section>`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SignatureHunter Results</title>
<style>
  body { font-family: system-ui; background: #1a1a2e; color: #eee; padding: 2rem; }
  h1 { color: #0ff; text-align: center; }
  h2 { color: #6fffe9; border-bottom: 1px solid #333; padding-bottom: .5rem; }
  .grid { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; }
  .card { text-align: center; }
  .card img { width: 200px; border-radius: 8px; }
  .card p { margin: .5rem 0; font-size: .85rem; }
  small { color: #888; }
</style></head><body>
<h1>SignatureHunter</h1>${sections}</body></html>`;
}

export function serve(artistCards, port = 3000) {
  const html = generateHTML(artistCards);
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    const cmd = platform() === "darwin" ? "open" : platform() === "win32" ? "start" : "xdg-open";
    exec(`${cmd} ${url}`);
  });

  return server;
}
