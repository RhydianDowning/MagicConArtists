// Load checklist from URL hash or localStorage
let checklist = null;

function init() {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith("data=")) {
    try {
      checklist = JSON.parse(atob(decodeURIComponent(hash.slice(5))));
      localStorage.setItem("checklist", JSON.stringify(checklist));
      window.location.hash = "";
    } catch {}
  }
  if (!checklist) {
    const saved = localStorage.getItem("checklist");
    if (saved) checklist = JSON.parse(saved);
  }
  render();
}

function render() {
  const el = document.getElementById("checklist");
  const empty = document.getElementById("empty");
  if (!checklist || !checklist.cards.length) {
    el.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";

  // Group by artist
  const byArtist = {};
  checklist.cards.forEach((c) => {
    if (!byArtist[c.artist]) byArtist[c.artist] = { booth: c.booth, cards: [] };
    byArtist[c.artist].cards.push(c);
  });
  const sorted = Object.keys(byArtist).sort();

  const total = checklist.cards.length;
  const signed = checklist.cards.filter((c) => c.signed).length;

  let html = `<h2 class="checklist-name">${checklist.name}</h2>`;
  html += `<p class="progress"><strong>${signed}</strong> / ${total} signed</p>`;

  for (const artist of sorted) {
    const { booth, cards } = byArtist[artist];
    const boothLabel = booth ? `<span class="booth">(${booth})</span>` : "";
    html += `<div class="artist"><div class="artist-header"><h2>${artist}</h2>${boothLabel}</div>`;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const checked = c.signed ? "checked" : "";
      const cls = c.signed ? "card-item signed" : "card-item";
      html += `<div class="${cls}" onclick="toggle('${c.artist.replace(/'/g, "\\'")}','${c.name.replace(/'/g, "\\'")}')">`;
      html += `<input type="checkbox" ${checked} tabindex="-1">`;
      html += `<span class="name">${c.name}</span>`;
      html += `<span class="set-info">${c.set} #${c.num}</span>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  el.innerHTML = html;
}

function toggle(artist, name) {
  const card = checklist.cards.find((c) => c.artist === artist && c.name === name);
  if (card) card.signed = !card.signed;
  localStorage.setItem("checklist", JSON.stringify(checklist));
  render();
}

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

init();
