// Results: rendering, filters, toggles

let resultData = null;
const filters = { sideboard: true, considering: false };
let specific = false;

function renderResults(data) {
  resultData = data;
  const { allArtistCards, allBasicLandCards, specificArtistCards, specificBasicLandCards, artistBooths, notFound, noMatch } = data;
  const container = document.getElementById("results");
  container.style.display = "block";

  let html = "";
  if (notFound && notFound.length) {
    html += `<div class="not-found-box"><strong>Cards not found on Scryfall:</strong> ${notFound.join(", ")}</div>`;
  }

  const hasSideboard = Object.values(allArtistCards).some(cards => cards.some(c => c.board === "sideboard"));
  const hasConsidering = Object.values(allArtistCards).some(cards => cards.some(c => c.board === "considering"));
  const hasSpecific = specificArtistCards !== null;

  html += `<button class="back-btn" onclick="location.reload()">← Back</button>`;
  html += `<div class="filters">`;
  html += `<button id="btn-sideboard" class="active" onclick="toggleFilter('sideboard')" ${hasSideboard ? "" : "disabled"}>Show Sideboard</button>`;
  html += `<button id="btn-considering" class="" onclick="toggleFilter('considering')" ${hasConsidering ? "" : "disabled"}>Show Considering</button>`;
  html += `<button id="btn-landmode" onclick="toggleLandMode()">Basic Land Mode</button>`;
  if (hasSpecific) html += `<button id="btn-specific" onclick="toggleSpecific()">Specific Printings</button>`;
  html += `</div>`;
  html += `<div id="card-sections"></div>`;
  if (noMatch && noMatch.length) {
    html += `<details class="no-match-section"><summary>Cards with no artist match (${noMatch.length})</summary><ul>${noMatch.map((c) => `<li>${c}</li>`).join("")}</ul></details>`;
  }
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
      const cls = c.board !== "mainboard" ? ` ${c.board}${c.board === "considering" ? " hidden" : ""}` : "";
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

function toggleFilter(type) {
  filters[type] = !filters[type];
  document.getElementById("btn-" + type).classList.toggle("active", filters[type]);
  document.querySelectorAll(".card." + type).forEach(el => el.classList.toggle("hidden", !filters[type]));
}

function toggleLandMode() {
  document.body.classList.toggle("land-mode");
  document.getElementById("btn-landmode").classList.toggle("active");
}

function toggleSpecific() {
  specific = !specific;
  document.getElementById("btn-specific").classList.toggle("active", specific);
  const { specificArtistCards, specificBasicLandCards, allArtistCards, allBasicLandCards, artistBooths } = resultData;
  renderSections(specific ? specificArtistCards : allArtistCards, specific ? specificBasicLandCards : allBasicLandCards, artistBooths);
}

// Expose globally
window.renderResults = renderResults;
window.toggleFilter = toggleFilter;
window.toggleLandMode = toggleLandMode;
window.toggleSpecific = toggleSpecific;
