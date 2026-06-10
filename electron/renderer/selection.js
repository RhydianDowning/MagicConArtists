// Card selection: toggle, select/deselect all, open in Scryfall

function showExportLoading(show) {
  let overlay = document.getElementById("export-overlay");
  if (show) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "export-overlay";
      overlay.className = "export-overlay";
      overlay.innerHTML = `<span class="export-text"></span>`;
      document.body.appendChild(overlay);
    }
    overlay.classList.remove("hidden");
  } else if (overlay) {
    overlay.classList.add("hidden");
  }
}

function toggleCardSelect(el) {
  el.classList.toggle("selected");
  updateActionBar();
}

function updateActionBar() {
  const count = document.querySelectorAll(".card.selected").length;
  const bar = document.getElementById("action-bar");
  if (count > 0) {
    bar.classList.remove("hidden");
    document.getElementById("selected-count").textContent = `${count} card${count !== 1 ? "s" : ""} selected`;
  } else {
    bar.classList.add("hidden");
  }
}

function selectAllCards() {
  document.querySelectorAll(".card:not(.hidden):not(.basicland)").forEach((el) => el.classList.add("selected"));
  updateActionBar();
}

function deselectAllCards() {
  document.querySelectorAll(".card.selected").forEach((el) => el.classList.remove("selected"));
  updateActionBar();
}

function openSelectedScryfall() {
  const selected = [...document.querySelectorAll(".card.selected")];
  if (!selected.length) return;
  const parts = selected.map((el) => {
    const url = el.dataset.url || "";
    const match = url.match(/\/card\/([^/]+)\/([^/]+)/);
    if (match) return `(e:${match[1]} cn:${match[2]})`;
    return null;
  }).filter(Boolean);
  if (!parts.length) return;

  const pages = Math.ceil(parts.length / 20);
  if (pages > 1 && !confirm(`This will open ${pages} tabs (${parts.length} cards, 20 per page). Continue?`)) return;

  const urls = [];
  for (let i = 0; i < parts.length; i += 20) {
    const query = parts.slice(i, i + 20).join(" OR ");
    urls.push(`https://scryfall.com/search?q=${encodeURIComponent(query)}&unique=prints`);
  }
  window.api.openUrls(urls);
}

window.toggleCardSelect = toggleCardSelect;
window.selectAllCards = selectAllCards;
window.deselectAllCards = deselectAllCards;
window.openSelectedScryfall = openSelectedScryfall;

// Export menu
function toggleExportMenu() {
  document.getElementById("export-menu").classList.toggle("hidden");
}

async function exportPdfChecklist() {
  document.getElementById("export-menu").classList.add("hidden");
  const selected = [...document.querySelectorAll(".card.selected")];
  if (!selected.length) return;
  const cards = selected.map((el) => {
    const h2 = el.closest("details")?.querySelector("h2");
    const artist = h2?.firstChild?.textContent?.trim() || "Unknown";
    const booth = h2?.querySelector(".booth")?.textContent?.trim() || "";
    const name = el.querySelector("p")?.firstChild?.textContent?.trim() || "";
    return { artist, booth, name };
  }).filter((c) => c.name);
  showExportLoading(true);
  const filePath = await window.api.exportPdfChecklist(cards);
  showExportLoading(false);
  if (filePath && confirm("PDF saved. Open it now?")) window.api.openFile(filePath);
}

async function exportPdfImages() {
  document.getElementById("export-menu").classList.add("hidden");
  const images = [...document.querySelectorAll(".card.selected img")].map((img) => img.src).filter(Boolean);
  if (!images.length) return;
  showExportLoading(true);
  const filePath = await window.api.exportPdfImages(images);
  showExportLoading(false);
  if (filePath && confirm("PDF saved. Open it now?")) window.api.openFile(filePath);
}

async function exportMoxfield() {
  document.getElementById("export-menu").classList.add("hidden");
  const selected = [...document.querySelectorAll(".card.selected")];
  if (!selected.length) return;
  const lines = selected.map((el) => {
    const p = el.querySelector("p");
    const name = p?.firstChild?.textContent?.trim() || "";
    const small = p?.querySelector("small")?.textContent || "";
    const match = small.match(/^(\S+)\s+#(.+)$/);
    if (match) return `1 ${name} (${match[1]}) ${match[2]}`;
    return `1 ${name}`;
  }).filter(Boolean);

  const text = lines.join("\n");
  await navigator.clipboard.writeText(text);
  alert(`Copied ${lines.length} cards to clipboard in Moxfield format.\n\nPaste into Moxfield's import.`);
}

window.toggleExportMenu = toggleExportMenu;
window.exportPdfChecklist = exportPdfChecklist;
window.exportPdfImages = exportPdfImages;
window.exportMoxfield = exportMoxfield;

async function exportPhoneChecklist() {
  document.getElementById("export-menu").classList.add("hidden");
  // Reuse convention picker but override the add behavior to also navigate + share
  window._phoneChecklistMode = true;
  showConventionPicker();
}
window.exportPhoneChecklist = exportPhoneChecklist;
