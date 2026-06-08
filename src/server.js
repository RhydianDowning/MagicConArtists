import http from "http";
import { exec } from "child_process";
import { platform } from "os";

function buildSections(artistCards, basicLandCards, artistBooths = {}) {
  const sorted = Object.entries(artistCards)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([artist, cards]) => [artist, [...cards].sort((a, b) => a.card.localeCompare(b.card))]);

  const allSorted = sorted.map(([artist, cards]) => {
    const landCards = (basicLandCards[artist] || []).sort((a, b) => a.card.localeCompare(b.card));
    return [artist, cards, landCards];
  });
  for (const [artist, lands] of Object.entries(basicLandCards).sort(([a], [b]) => a.localeCompare(b))) {
    if (!artistCards[artist]) allSorted.push([artist, [], lands.sort((a, b) => a.card.localeCompare(b.card))]);
  }
  allSorted.sort(([a], [b]) => a.localeCompare(b));

  function renderCard(c) {
    const boardClass = c.board !== "mainboard" ? ` ${c.board}` : "";
    const label = c.board === "sideboard" || c.board === "considering" ? `<span class="board-label">from ${c.board}</span>` : "";
    return `<div class="card${boardClass}"><a href="${c.url}" target="_blank"><img src="${c.image}" alt="${c.card}"></a><p>${c.card}<br><small>${c.set} #${c.num}</small></p>${label}</div>`;
  }

  return allSorted.map(([artist, cards, landCards]) => {
    const mainImgs = cards.map(renderCard).join("");
    const landImgs = (landCards || []).map(renderCard).join("");
    if (!cards.length && !landCards?.length) return "";
    const onlyLands = !cards.length && landCards?.length > 0;
    const hasLands = landCards && landCards.length > 0;
    const classes = [onlyLands ? "lands-only" : "", hasLands ? "has-lands" : ""].filter(Boolean).join(" ");
    const booth = artistBooths[artist] ? `<span class="booth">${artistBooths[artist]}</span>` : "";
    return `<details ${classes ? `class="${classes}"` : ""} open><summary><h2>${artist}${booth}</h2></summary><div class="grid">${mainImgs}${landImgs}</div></details>`;
  }).filter(Boolean).join("");
}

function generateHTML(specificArtistCards, specificBasicLandCards, allArtistCards, allBasicLandCards, artistBooths = {}) {
  const hasSpecificData = specificArtistCards !== null;
  const defaultArtistCards = hasSpecificData ? specificArtistCards : allArtistCards;
  const defaultBasicLandCards = hasSpecificData ? specificBasicLandCards : allBasicLandCards;
  const specificSections = buildSections(defaultArtistCards, defaultBasicLandCards, artistBooths);
  const allSections = hasSpecificData ? buildSections(allArtistCards, allBasicLandCards, artistBooths) : "";

  const checkCards = allArtistCards || defaultArtistCards;
  const hasSideboard = Object.values(checkCards).some(cards => cards.some(c => c.board === "sideboard"));
  const hasConsidering = Object.values(checkCards).some(cards => cards.some(c => c.board === "considering"));

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SignatureHunter Results</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #e6edf3; padding: 2rem; max-width: 1200px; margin: 0 auto; }
  h1 { color: #e6edf3; text-align: center; font-size: 2.2rem; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 0.5rem; }
  .subtitle { text-align: center; color: #6fffe9; font-size: 0.85rem; letter-spacing: 0.3em; text-transform: uppercase; margin-bottom: 1.5rem; opacity: 0.7; }
  .filters { text-align: center; margin-bottom: 2rem; }
  .filters button { background: #161b22; border: 1px solid #30363d; color: #e6edf3; padding: 0.5rem 1.2rem; border-radius: 6px; cursor: pointer; margin: 0 0.3rem; font-size: 0.85rem; transition: all 0.2s; }
  .filters button:hover:not(:disabled) { background: #1c2330; }
  .filters button.active { background: #1c2330; border-color: #6fffe9; color: #6fffe9; }
  .filters button:disabled { opacity: 0.3; cursor: not-allowed; }
  details { margin-bottom: 1rem; border-radius: 10px; overflow: hidden; }
  summary { cursor: pointer; list-style: none; background: #161b22; padding: 1.2rem 1.5rem; display: flex; align-items: center; justify-content: center; position: relative; border-radius: 10px; transition: background 0.2s; }
  summary:hover { background: #1c2330; }
  summary::-webkit-details-marker { display: none; }
  summary h2 { margin: 0; font-size: 1.3rem; font-weight: 500; color: #6fffe9; letter-spacing: 0.05em; }
  .booth { font-size: 0.75rem; font-weight: 400; color: #8b949e; margin-left: 0.75rem; opacity: 0.8; }
  summary::after { content: "▼"; color: #6fffe9; font-size: 1.1rem; position: absolute; right: 1.5rem; transition: transform 0.2s; opacity: 0.8; }
  details:not([open]) summary::after { transform: rotate(-90deg); }
  details:not([open]) summary { border-radius: 10px; }
  details[open] summary { border-radius: 10px 10px 0 0; border-bottom: 1px solid #21262d; }
  .grid { display: flex; flex-wrap: wrap; gap: 1rem; padding: 1.5rem; background: #0d1117; border-radius: 0 0 10px 10px; border: 1px solid #21262d; border-top: none; }
  .card { text-align: center; width: 200px; }
  .card img { width: 200px; border-radius: 8px; transition: transform 0.2s, box-shadow 0.2s; }
  .card img:hover { transform: scale(1.05); box-shadow: 0 4px 20px rgba(111,255,233,0.15); }
  .card p { margin: .5rem 0; font-size: .85rem; word-wrap: break-word; }
  .card.sideboard, .card.considering { opacity: 0.4; }
  .card.sideboard:hover, .card.considering:hover { opacity: 0.7; }
  .board-label { display: block; font-size: 0.7rem; color: #8b949e; font-style: italic; margin-top: 0.25rem; }
  small { color: #7d8590; }
  .hidden { display: none !important; }
  .card.basicland { display: none; }
  .lands-only { display: none; }
  body.land-mode .lands-only { display: block; }
  body.land-mode details:not(.lands-only):not(.has-lands) { display: none; }
  body.land-mode .card:not(.basicland) { display: none !important; }
  body.land-mode .card.basicland { display: block !important; }
  #view-all { display: none; }
</style></head><body>
<h1>Signature Hunter</h1>
<p class="subtitle">Plan &bull; Your &bull; Meet</p>
<div class="filters">
  <button id="btn-sideboard" class="active" onclick="toggleFilter('sideboard')" ${hasSideboard ? '' : 'disabled'}>Show Sideboard</button>
  <button id="btn-considering" class="active" onclick="toggleFilter('considering')" ${hasConsidering ? '' : 'disabled'}>Show Considering</button>
  <button id="btn-landmode" onclick="toggleLandMode()">Basic Land Mode</button>
  ${hasSpecificData ? '<button id="btn-specific" class="active" onclick="toggleSpecific()">Specific Printings</button>' : ''}
</div>
<div id="view-specific">${specificSections}</div>
${hasSpecificData ? `<div id="view-all">${allSections}</div>` : ''}
<script>
const filters = { sideboard: true, considering: true };
function toggleFilter(type) {
  filters[type] = !filters[type];
  document.getElementById('btn-' + type).classList.toggle('active', filters[type]);
  document.querySelectorAll('.card.' + type).forEach(el => el.classList.toggle('hidden', !filters[type]));
}
function toggleLandMode() {
  document.body.classList.toggle('land-mode');
  document.getElementById('btn-landmode').classList.toggle('active');
}
${hasSpecificData ? `
let specific = true;
function toggleSpecific() {
  specific = !specific;
  document.getElementById('btn-specific').classList.toggle('active', specific);
  document.getElementById('view-specific').style.display = specific ? '' : 'none';
  document.getElementById('view-all').style.display = specific ? 'none' : 'block';
}` : ''}
</script>
</body></html>`;
}

export function serve(specificArtistCards, port = 3000, specificBasicLandCards = null, allArtistCards = {}, allBasicLandCards = {}, artistBooths = {}) {
  const html = generateHTML(specificArtistCards, specificBasicLandCards, allArtistCards, allBasicLandCards, artistBooths);
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
