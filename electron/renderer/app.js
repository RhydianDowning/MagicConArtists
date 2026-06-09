// App orchestrator: initialisation, progress listener, match trigger

// Populate UI on load
(async () => {
  const decks = await window.api.getDecklists();
  const artists = await window.api.getArtistLists();
  renderDeckList(decks);
  renderArtistList(artists);
})();

// Progress listener
window.api.onProgress((data) => {
  const el = document.getElementById("progress");
  const cancelBtn = `<button class="cancel-btn" onclick="cancelMatch()">Cancel</button>`;
  if (data.rateLimited) {
    el.innerHTML = `<span style="color:#f0883e">⏳ Rate limited by Scryfall — waiting 30s...</span><div class="progress-bar"><div class="progress-bar-fill" style="width:${Math.round((data.current / data.fetching) * 100)}%;background:#f0883e"></div></div>${cancelBtn}`;
  } else if (data.current) {
    const pct = Math.round((data.current / data.fetching) * 100);
    el.innerHTML = `Fetching ${data.current}/${data.fetching}: ${data.card}<div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div><p class="fetch-hint">First fetch is ~1s per card due to rate limits. Subsequent searches will be instant.</p>${cancelBtn}`;
  } else {
    el.innerHTML = `${data.cached}/${data.total} cached. Fetching ${data.fetching} from Scryfall...`;
  }
});

// Cancel
async function cancelMatch() {
  await window.api.cancelMatch();
  document.getElementById("progress").innerHTML = `<span class="fetch-hint">Cancelled.</span>`;
  document.getElementById("run-btn").disabled = false;
}
window.cancelMatch = cancelMatch;

// Main match trigger
async function runMatch() {
  const deckFiles = [...document.querySelectorAll('input[name="deck"]:checked')].map(el => el.value);
  const artistRadio = document.querySelector('input[name="artist"]:checked');
  const artistFile = artistRadio ? artistRadio.value : null;
  const artistSource = artistRadio ? artistRadio.dataset.source : null;
  if (!deckFiles.length || !artistFile) {
    const msg = !deckFiles.length ? "Please select at least one decklist." : "Please select an artist list.";
    document.getElementById("progress").innerHTML = `<span class="fetch-hint">${msg}</span>`;
    const target = !deckFiles.length ? "decks" : "artists";
    const el = document.getElementById(target);
    el.classList.add("highlight");
    setTimeout(() => el.classList.remove("highlight"), 2000);
    return;
  }

  document.getElementById("run-btn").disabled = true;
  document.getElementById("progress").textContent = "Starting...";

  try {
    const result = await window.api.runMatch({ deckFiles, artistFile, artistSource });
    if (!result) return; // cancelled
    document.getElementById("setup").style.display = "none";
    renderResults(result);
  } catch (err) {
    document.getElementById("progress").innerHTML = `<span style="color:#f85149">Error: ${err.message}</span>`;
    document.getElementById("run-btn").disabled = false;
  }
}

window.runMatch = runMatch;

async function resetCache() {
  if (!confirm("Clear all cached card data? Next search will re-fetch from Scryfall.")) return;
  const count = await window.api.resetCache();
  document.getElementById("settings-menu").classList.add("hidden");
  alert(`Cache cleared (${count} cards removed).`);
}
window.resetCache = resetCache;

// Find in page
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "f") {
    e.preventDefault();
    const bar = document.getElementById("find-bar");
    bar.classList.remove("hidden");
    document.getElementById("find-input").focus();
  }
  if (e.key === "Escape") closeFindBar();
});

let findTimeout = null;
function findInPage(direction) {
  clearTimeout(findTimeout);
  findTimeout = setTimeout(() => doFind(direction), 50);
}

let findMatches = [];
let findIndex = -1;

function doFind(direction) {
  const text = document.getElementById("find-input").value.toLowerCase();
  // Clear previous highlights
  document.querySelectorAll(".find-highlight").forEach((el) => {
    el.outerHTML = el.textContent;
  });
  findMatches = [];
  findIndex = -1;

  if (!text) { document.getElementById("find-count").textContent = ""; return; }

  const walker = document.createTreeWalker(document.getElementById("results"), NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const idx = node.textContent.toLowerCase().indexOf(text);
    if (idx === -1) continue;
    const span = document.createElement("span");
    span.className = "find-highlight";
    const range = document.createRange();
    range.setStart(node, idx);
    range.setEnd(node, idx + text.length);
    range.surroundContents(span);
    findMatches.push(span);
  }

  if (findMatches.length) {
    findIndex = direction === "back" ? findMatches.length - 1 : 0;
    scrollToMatch();
  }
  document.getElementById("find-count").textContent = findMatches.length ? `${findIndex + 1}/${findMatches.length}` : "No results";
}

function scrollToMatch() {
  document.querySelectorAll(".find-highlight-active").forEach((el) => el.classList.remove("find-highlight-active"));
  if (findMatches[findIndex]) {
    findMatches[findIndex].classList.add("find-highlight-active");
    findMatches[findIndex].scrollIntoView({ block: "center" });
  }
}

function findNext() {
  if (!findMatches.length) return;
  findIndex = (findIndex + 1) % findMatches.length;
  scrollToMatch();
  document.getElementById("find-count").textContent = `${findIndex + 1}/${findMatches.length}`;
}

function findPrev() {
  if (!findMatches.length) return;
  findIndex = (findIndex - 1 + findMatches.length) % findMatches.length;
  scrollToMatch();
  document.getElementById("find-count").textContent = `${findIndex + 1}/${findMatches.length}`;
}

window.findInPage = findInPage;
window.findNext = findNext;
window.findPrev = findPrev;

function closeFindBar() {
  document.getElementById("find-bar").classList.add("hidden");
  document.getElementById("find-input").value = "";
  document.getElementById("find-count").textContent = "";
  document.querySelectorAll(".find-highlight").forEach((el) => el.outerHTML = el.textContent);
  findMatches = [];
  findIndex = -1;
}

window.findInPage = findInPage;
window.findNext = findNext;
window.findPrev = findPrev;
window.closeFindBar = closeFindBar;
