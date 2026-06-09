// Populate checkbox/radio groups on load
(async () => {
  const decks = await window.api.getDecklists();
  const artists = await window.api.getArtistLists();
  const decksEl = document.getElementById("decks");
  const artistsEl = document.getElementById("artists");
  decks.forEach((f) => {
    decksEl.innerHTML += `<label><input type="checkbox" name="deck" value="${f}"> ${f.replace(/\.txt$/, "")}<span class="delete-btn" onclick="deleteDeck(event, '${f}')">✕</span></label>`;
  });
  artists.forEach((f) => {
    artistsEl.innerHTML += `<label><input type="radio" name="artist" value="${f}"> ${f.replace(/\.txt$/, "")}</label>`;
  });
})();

// Progress listener
window.api.onProgress((data) => {
  const el = document.getElementById("progress");
  if (data.current) {
    const pct = Math.round((data.current / data.fetching) * 100);
    el.innerHTML = `Fetching ${data.current}/${data.fetching}: ${data.card}<div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>`;
  } else {
    el.textContent = `${data.cached}/${data.total} cached. Fetching ${data.fetching} from Scryfall...`;
  }
});

async function runMatch() {
  const deckFiles = [...document.querySelectorAll('input[name="deck"]:checked')].map(el => el.value);
  const artistRadio = document.querySelector('input[name="artist"]:checked');
  const artistFile = artistRadio ? artistRadio.value : null;
  if (!deckFiles.length || !artistFile) return;

  document.getElementById("run-btn").disabled = true;
  document.getElementById("progress").textContent = "Starting...";

  const result = await window.api.runMatch({ deckFiles, artistFile });

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
  status.textContent = "Opening Chrome to fetch deck...";
  try {
    const { filename, count } = await window.api.importMoxfield(url);
    status.textContent = `✓ Saved ${count} cards to ${filename}`;
    urlInput.value = "";
    // Refresh decklist checkboxes
    const decks = await window.api.getDecklists();
    const decksEl = document.getElementById("decks");
    decksEl.innerHTML = "";
    decks.forEach((f) => {
      decksEl.innerHTML += `<label><input type="checkbox" name="deck" value="${f}"> ${f.replace(/\.txt$/, "")}<span class="delete-btn" onclick="deleteDeck(event, '${f}')">✕</span></label>`;
    });
  } catch (e) {
    status.style.color = "#f85149";
    status.textContent = `✗ ${e.message}`;
  }
  document.getElementById("import-btn").disabled = false;
}
window.importMoxfield = importMoxfield;

async function deleteDeck(event, filename) {
  event.preventDefault();
  event.stopPropagation();
  await window.api.deleteDeck(filename);
  const decks = await window.api.getDecklists();
  const decksEl = document.getElementById("decks");
  decksEl.innerHTML = "";
  decks.forEach((f) => {
    decksEl.innerHTML += `<label><input type="checkbox" name="deck" value="${f}"> ${f.replace(/\.txt$/, "")}<span class="delete-btn" onclick="deleteDeck(event, '${f}')">✕</span></label>`;
  });
}
window.deleteDeck = deleteDeck;
