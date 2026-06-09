// Helper to render decklist checkboxes
function renderDeckList(decks) {
  const decksEl = document.getElementById("decks");
  decksEl.innerHTML = "";
  if (decks.length === 0) {
    decksEl.innerHTML = `<p class="empty-state">Import a deck from Moxfield below to get started.</p>`;
    return;
  }
  decks.forEach((f) => {
    const escaped = f.replace(/'/g, "\\'");
    decksEl.innerHTML += `<label><input type="checkbox" name="deck" value="${f}"> ${f.replace(/\.txt$/, "")}<span class="delete-btn" onclick="deleteDeck(event, '${escaped}')">✕</span></label>`;
  });
}

async function refreshDeckList() {
  renderDeckList(await window.api.getDecklists());
}

// Populate checkbox/radio groups on load
(async () => {
  const decks = await window.api.getDecklists();
  const artists = await window.api.getArtistLists();
  renderDeckList(decks);
  const artistsEl = document.getElementById("artists");
  artists.forEach((a) => {
    const del = a.source === "user" ? `<span class="delete-btn" onclick="deleteArtistList(event, '${a.file}')">✕</span>` : "";
    artistsEl.innerHTML += `<label><input type="radio" name="artist" value="${a.file}" data-source="${a.source}"> ${a.file.replace(/\.txt$/, "")}${del}</label>`;
  });
})();

// Progress listener
window.api.onProgress((data) => {
  const el = document.getElementById("progress");
  if (data.rateLimited) {
    el.innerHTML = `<span style="color:#f0883e">⏳ Rate limited by Scryfall — waiting 30s...</span><div class="progress-bar"><div class="progress-bar-fill" style="width:${Math.round((data.current / data.fetching) * 100)}%;background:#f0883e"></div></div>`;
  } else if (data.current) {
    const pct = Math.round((data.current / data.fetching) * 100);
    el.innerHTML = `Fetching ${data.current}/${data.fetching}: ${data.card}<div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div><p class="fetch-hint">First fetch is ~1s per card due to rate limits. Subsequent searches will be instant.</p>`;
  } else {
    el.innerHTML = `${data.cached}/${data.total} cached. Fetching ${data.fetching} from Scryfall...`;
  }
});

async function runMatch() {
  const deckFiles = [...document.querySelectorAll('input[name="deck"]:checked')].map(el => el.value);
  const artistRadio = document.querySelector('input[name="artist"]:checked');
  const artistFile = artistRadio ? artistRadio.value : null;
  const artistSource = artistRadio ? artistRadio.dataset.source : null;
  if (!deckFiles.length || !artistFile) return;

  document.getElementById("run-btn").disabled = true;
  document.getElementById("progress").textContent = "Starting...";

  const result = await window.api.runMatch({ deckFiles, artistFile, artistSource });

  document.getElementById("setup").style.display = "none";
  renderResults(result);
}

let resultData = null;

function renderResults(data) {
  resultData = data;
  const { allArtistCards, allBasicLandCards, specificArtistCards, specificBasicLandCards, artistBooths } = data;
  const container = document.getElementById("results");
  container.style.display = "block";

  const hasSideboard = Object.values(allArtistCards).some(cards => cards.some(c => c.board === "sideboard"));
  const hasConsidering = Object.values(allArtistCards).some(cards => cards.some(c => c.board === "considering"));
  const hasSpecific = specificArtistCards !== null;

  let html = `<button class="back-btn" onclick="location.reload()">← Back</button>`;
  html += `<div class="filters">`;
  html += `<button id="btn-sideboard" class="active" onclick="toggleFilter('sideboard')" ${hasSideboard ? "" : "disabled"}>Show Sideboard</button>`;
  html += `<button id="btn-considering" class="active" onclick="toggleFilter('considering')" ${hasConsidering ? "" : "disabled"}>Show Considering</button>`;
  html += `<button id="btn-landmode" onclick="toggleLandMode()">Basic Land Mode</button>`;
  if (hasSpecific) html += `<button id="btn-specific" onclick="toggleSpecific()">Specific Printings</button>`;
  html += `</div>`;
  html += `<div id="card-sections"></div>`;
  container.innerHTML = html;

  renderSections(allArtistCards, allBasicLandCards, artistBooths);
}

function renderSections(artistCards, basicLandCards, artistBooths) {
  const allArtists = new Set([...Object.keys(artistCards), ...Object.keys(basicLandCards)]);
  const sorted = [...allArtists].sort();
  let html = "";
  for (const artist of sorted) {
    const cards = artistCards[artist] || [];
    const lands = basicLandCards[artist] || [];
    if (!cards.length && !lands.length) continue;
    const onlyLands = !cards.length && lands.length > 0;
    const hasLands = lands.length > 0;
    const classes = [onlyLands ? "lands-only" : "", hasLands ? "has-lands" : ""].filter(Boolean).join(" ");
    const booth = artistBooths[artist] ? `<span class="booth">${artistBooths[artist]}</span>` : "";
    html += `<details ${classes ? `class="${classes}"` : ""} open><summary><h2>${artist}${booth}</h2></summary><div class="grid">`;
    for (const c of cards) {
      const cls = c.board !== "mainboard" ? ` ${c.board}` : "";
      const boardLabel = (c.board === "sideboard" || c.board === "considering") ? `<span class="board-label">from ${c.board}</span>` : "";
      html += `<div class="card${cls}"><a href="${c.url}" target="_blank"><img src="${c.image}" loading="lazy" alt="${c.card}"></a><p>${c.card}<br><small>${c.set} #${c.num}</small></p>${boardLabel}</div>`;
    }
    for (const c of lands) {
      html += `<div class="card basicland"><a href="${c.url}" target="_blank"><img src="${c.image}" loading="lazy" alt="${c.card}"></a><p>${c.card}<br><small>${c.set} #${c.num}</small></p></div>`;
    }
    html += `</div></details>`;
  }
  document.getElementById("card-sections").innerHTML = html;
}

const filters = { sideboard: true, considering: true };

function toggleFilter(type) {
  filters[type] = !filters[type];
  document.getElementById("btn-" + type).classList.toggle("active", filters[type]);
  document.querySelectorAll(".card." + type).forEach(el => el.classList.toggle("hidden", !filters[type]));
}

function toggleLandMode() {
  document.body.classList.toggle("land-mode");
  document.getElementById("btn-landmode").classList.toggle("active");
}

let specific = false;
function toggleSpecific() {
  specific = !specific;
  document.getElementById("btn-specific").classList.toggle("active", specific);
  const { specificArtistCards, specificBasicLandCards, allArtistCards, allBasicLandCards, artistBooths } = resultData;
  renderSections(specific ? specificArtistCards : allArtistCards, specific ? specificBasicLandCards : allBasicLandCards, artistBooths);
}

// Expose to onclick handlers
window.toggleFilter = toggleFilter;
window.toggleLandMode = toggleLandMode;
window.toggleSpecific = toggleSpecific;
window.runMatch = runMatch;

async function importMoxfield() {
  const urlInput = document.getElementById("moxfield-url");
  const status = document.getElementById("import-status");
  const url = urlInput.value.trim();
  if (!url) return;
  document.getElementById("import-btn").disabled = true;
  status.textContent = "Fetching deck from moxfield...";
  try {
    const { filename, count } = await window.api.importMoxfield(url);
    status.textContent = `✓ Saved ${count} cards to ${filename}`;
    urlInput.value = "";
    await refreshDeckList();
  } catch (e) {
    status.style.color = "#f85149";
    status.textContent = `✗ ${e.message}`;
  }
  document.getElementById("import-btn").disabled = false;
}
window.importMoxfield = importMoxfield;

function toggleNewDeckForm() {
  document.getElementById("new-deck-form").classList.toggle("hidden");
}
window.toggleNewDeckForm = toggleNewDeckForm;

function parseDeckLine(line) {
  // Handles: "1 Lightning Bolt (LEB) 162", "Lightning Bolt (LEB) 162", "Lightning Bolt", "4x Dark Ritual"
  const m = line.match(/^(?:\d+x?\s+)?(.+?)(?:\s+\(([A-Za-z0-9]{3,5})\)(?:\s+(\S+))?)?$/);
  if (!m) return null;
  return { name: m[1].trim(), set: (m[2] || "").toUpperCase(), num: m[3] || "" };
}

async function saveDeck() {
  const name = document.getElementById("deck-name").value.trim();
  const status = document.getElementById("deck-save-status");
  if (!name) { status.textContent = "Please enter a deck name"; return; }
  const text = document.getElementById("deck-bulk").value.trim();
  if (!text) { status.textContent = "Paste a decklist"; return; }
  const seen = new Set();
  const cards = text.split("\n").map((l) => l.trim()).filter(Boolean).map(parseDeckLine).filter((c) => {
    if (!c || seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
  if (!cards.length) { status.textContent = "No valid cards found"; return; }
  const { filename, count } = await window.api.saveDeck({ name, cards });
  status.textContent = `✓ Saved ${count} cards to ${filename}`;
  document.getElementById("deck-bulk").value = "";
  document.getElementById("deck-name").value = "";
  await refreshDeckList();
  document.getElementById("new-deck-form").classList.add("hidden");
}
window.saveDeck = saveDeck;

async function deleteDeck(event, filename) {
  event.preventDefault();
  event.stopPropagation();
  if (!confirm(`Delete "${filename.replace(/\.txt$/, "")}"?`)) return;
  await window.api.deleteDeck(filename);
  await refreshDeckList();
}
window.deleteDeck = deleteDeck;

function toggleNewArtistForm() {
  document.getElementById("new-artist-form").classList.toggle("hidden");
}
window.toggleNewArtistForm = toggleNewArtistForm;

function createArtistRow(name = "") {
  const div = document.createElement("div");
  div.className = "artist-entry";
  div.innerHTML = `<input type="text" placeholder="Artist Name" class="artist-name" value="${name}"><input type="text" placeholder="Booth/Location (optional)" class="artist-info"><span class="delete-btn" onclick="this.parentElement.remove()">✕</span>`;
  return div;
}

function addArtistRow() {
  document.getElementById("artist-entries").appendChild(createArtistRow());
}
window.addArtistRow = addArtistRow;

function bulkImportArtists() {
  const textarea = document.getElementById("artist-bulk");
  const text = textarea.value.trim();
  if (!text) return;
  const names = text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  const entries = document.getElementById("artist-entries");
  names.forEach((name) => entries.appendChild(createArtistRow(name)));
  textarea.value = "";
}
window.bulkImportArtists = bulkImportArtists;

async function saveArtistList() {
  const name = document.getElementById("artist-list-name").value.trim();
  const status = document.getElementById("artist-list-status");
  if (!name) { status.textContent = "Please enter a list name"; return; }
  const rows = document.querySelectorAll(".artist-entry");
  const artists = [...rows].map((r) => ({
    name: r.querySelector(".artist-name").value.trim(),
    info: r.querySelector(".artist-info").value.trim(),
  })).filter((a) => a.name);
  if (!artists.length) { status.textContent = "Add at least one artist"; return; }
  const filename = await window.api.saveArtistList({ name, artists });
  status.textContent = `✓ Saved ${filename}`;
  // Refresh artist list
  const artistFiles = await window.api.getArtistLists();
  const artistsEl = document.getElementById("artists");
  artistsEl.innerHTML = "";
  artistFiles.forEach((a) => {
    const del = a.source === "user" ? `<span class="delete-btn" onclick="deleteArtistList(event, '${a.file}')">✕</span>` : "";
    artistsEl.innerHTML += `<label><input type="radio" name="artist" value="${a.file}" data-source="${a.source}"> ${a.file.replace(/\.txt$/, "")}${del}</label>`;
  });
  document.getElementById("new-artist-form").classList.add("hidden");
  document.getElementById("artist-list-name").value = "";
  document.getElementById("artist-entries").innerHTML = "";
}
window.saveArtistList = saveArtistList;

async function deleteArtistList(event, filename) {
  event.preventDefault();
  event.stopPropagation();
  if (!confirm(`Delete "${filename.replace(/\.txt$/, "")}"?`)) return;
  await window.api.deleteArtistList(filename);
  const artistFiles = await window.api.getArtistLists();
  const artistsEl = document.getElementById("artists");
  artistsEl.innerHTML = "";
  artistFiles.forEach((a) => {
    const del = a.source === "user" ? `<span class="delete-btn" onclick="deleteArtistList(event, '${a.file}')">✕</span>` : "";
    artistsEl.innerHTML += `<label><input type="radio" name="artist" value="${a.file}" data-source="${a.source}"> ${a.file.replace(/\.txt$/, "")}${del}</label>`;
  });
}
window.deleteArtistList = deleteArtistList;
