// Deck import: Moxfield import, manual paste, parsing, deletion

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

function toggleNewDeckForm() {
  document.getElementById("new-deck-form").classList.toggle("hidden");
}

function parseDeckLine(line) {
  // Strip foil marker before parsing
  line = line.replace(/\s*\*[Ff]\*$/, "");
  // Handle pipe-separated format: "Card Name|SET|NUM" or "Card Name|SET|NUM|board"
  if (line.includes("|")) {
    const [name, set, num] = line.split("|");
    if (!name) return null;
    let cleanName = name.trim().replace(/(?<!\/)\/(?!\/)/g, "//");
    return { name: cleanName, set: (set || "").toUpperCase(), num: num || "" };
  }
  // Handles: "1 Lightning Bolt (LEB) 162", "Lightning Bolt (LEB) 162", "Lightning Bolt", "4x Dark Ritual"
  const m = line.match(/^(?:\d+x?\s+)?(.+?)(?:\s+\(([A-Za-z0-9]{3,5})\)(?:\s+(\S+))?)?$/);
  if (!m) return null;
  let name = m[1].trim();
  name = name.replace(/(?<!\/)\/(?!\/)/g, "//");
  return { name, set: (m[2] || "").toUpperCase(), num: m[3] || "" };
}

async function saveDeck() {
  const name = document.getElementById("deck-name").value.trim();
  const status = document.getElementById("deck-save-status");
  if (!name) { status.textContent = "Please enter a deck name"; return; }
  const text = document.getElementById("deck-bulk").value.trim();
  if (!text) { status.textContent = "Paste a decklist"; return; }
  const seen = new Set();
  let board = "mainboard";
  const cards = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const sectionMatch = line.match(/^(SIDEBOARD|CONSIDERING|MAYBEBOARD)\s*:?\s*$/i);
    if (sectionMatch) {
      board = sectionMatch[1].toLowerCase() === "maybeboard" ? "considering" : sectionMatch[1].toLowerCase();
      continue;
    }
    const c = parseDeckLine(line);
    if (!c || seen.has(c.name)) continue;
    seen.add(c.name);
    c.board = board;
    cards.push(c);
  }
  if (!cards.length) { status.textContent = "No valid cards found"; return; }
  const { filename, count } = await window.api.saveDeck({ name, cards });
  status.textContent = `✓ Saved ${count} cards to ${filename}`;
  document.getElementById("deck-bulk").value = "";
  document.getElementById("deck-name").value = "";
  await refreshDeckList();
  document.getElementById("new-deck-form").classList.add("hidden");
}

async function deleteDeck(event, filename) {
  event.preventDefault();
  event.stopPropagation();
  if (!confirm(`Delete "${filename.replace(/\.txt$/, "")}"?`)) return;
  await window.api.deleteDeck(filename);
  await refreshDeckList();
}

// Expose globally
window.renderDeckList = renderDeckList;
window.refreshDeckList = refreshDeckList;
window.importMoxfield = importMoxfield;
window.toggleNewDeckForm = toggleNewDeckForm;
window.saveDeck = saveDeck;
window.deleteDeck = deleteDeck;
