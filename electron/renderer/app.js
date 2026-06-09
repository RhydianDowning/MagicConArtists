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
  if (data.rateLimited) {
    el.innerHTML = `<span style="color:#f0883e">⏳ Rate limited by Scryfall — waiting 30s...</span><div class="progress-bar"><div class="progress-bar-fill" style="width:${Math.round((data.current / data.fetching) * 100)}%;background:#f0883e"></div></div>`;
  } else if (data.current) {
    const pct = Math.round((data.current / data.fetching) * 100);
    el.innerHTML = `Fetching ${data.current}/${data.fetching}: ${data.card}<div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div><p class="fetch-hint">First fetch is ~1s per card due to rate limits. Subsequent searches will be instant.</p>`;
  } else {
    el.innerHTML = `${data.cached}/${data.total} cached. Fetching ${data.fetching} from Scryfall...`;
  }
});

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
