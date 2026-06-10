// Painter's Servant PWA - Event Checklist

let checklists = JSON.parse(localStorage.getItem("checklists") || "[]");
let activeIndex = null;

function init() {
  if (checklists.length) {
    activeIndex = 0;
  }
  render();
}

function save() {
  localStorage.setItem("checklists", JSON.stringify(checklists));
}

function loadFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.name || !data.cards) { alert("Invalid checklist file."); return; }
      // Replace if same name exists
      const existing = checklists.findIndex((c) => c.name === data.name);
      if (existing >= 0) checklists[existing] = data;
      else checklists.push(data);
      activeIndex = existing >= 0 ? existing : checklists.length - 1;
      save();
      render();
    } catch { alert("Invalid checklist file."); }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function render() {
  const app = document.getElementById("app");
  const isIOS = /iphone|ipad/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);

  let html = `<h1>CON-SIGN</h1><p class="subtitle">to memory</p>`;

  // Show instructions if no checklists loaded
  if (!checklists.length) {
    let installTip = "";
    if (isIOS) installTip = `<li><strong>Install the app:</strong> Tap Share (⬆️) → "Add to Home Screen"</li>`;
    else if (isAndroid) installTip = `<li><strong>Install the app:</strong> Tap menu (⋮) → "Install app"</li>`;
    html += `<div class="instructions">
      <h3>Getting Started</h3>
      <ol>
        ${installTip}
        <li><strong>Export a checklist</strong> from Painter's Servant using "Share to Phone" → "Export to ConSign"</li>
        <li><strong>Send the file</strong> to this device (AirDrop, email, WhatsApp, etc.)</li>
        <li><strong>Tap "Load Checklist"</strong> below and select the file</li>
      </ol>
      <p class="note">Once loaded, this app works offline from your home screen — no internet needed at the event.</p>
    </div>`;
    html += `<label class="file-btn">Load Checklist<input type="file" accept=".json" onchange="loadFile(event)" hidden></label>`;
    html += `<p class="app-credit">Application by Painter's Servant</p>`;
    app.innerHTML = html;
    return;
  }

  // Checklist tabs
  html += `<div class="tabs">`;
  checklists.forEach((c, i) => {
    const cls = i === activeIndex ? "tab active" : "tab";
    html += `<button class="${cls}" onclick="switchTab(${i})">${c.name}</button>`;
  });
  html += `<label class="tab add-tab">+<input type="file" accept=".json" onchange="loadFile(event)" hidden></label>`;
  html += `</div>`;

  // Active checklist
  const checklist = checklists[activeIndex];
  const byArtist = {};
  checklist.cards.forEach((c) => {
    if (!byArtist[c.artist]) byArtist[c.artist] = { booth: c.booth, cards: [] };
    byArtist[c.artist].cards.push(c);
  });
  const sorted = Object.keys(byArtist).sort();
  const total = checklist.cards.length;
  const signed = checklist.cards.filter((c) => c.signed).length;

  html += `<p class="progress"><strong>${signed}</strong> / ${total} signed</p>`;

  for (const artist of sorted) {
    const { booth, cards } = byArtist[artist];
    const boothLabel = booth ? `<span class="booth">(${booth})</span>` : "";
    html += `<div class="artist"><div class="artist-header"><h2>${artist}</h2>${boothLabel}</div>`;
    for (const c of cards) {
      const checked = c.signed ? "checked" : "";
      const cls = c.signed ? "card-item signed" : "card-item";
      html += `<div class="${cls}" onclick="toggle('${c.artist.replace(/'/g, "\\'")}','${c.name.replace(/'/g, "\\'")}')">`;
      html += `<input type="checkbox" ${checked} tabindex="-1">`;
      html += `<span class="name">${c.name}</span>`;
      if (c.set) html += `<span class="set-info">${c.set} #${c.num}</span>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  html += `<button class="delete-btn" onclick="deleteChecklist()">Delete This Checklist</button>`;
  app.innerHTML = html;
}

function switchTab(i) {
  activeIndex = i;
  render();
}

function toggle(artist, name) {
  const card = checklists[activeIndex].cards.find((c) => c.artist === artist && c.name === name);
  if (card) card.signed = !card.signed;
  save();
  render();
}

function deleteChecklist() {
  const name = checklists[activeIndex].name;
  if (!confirm(`Delete "${name}"?`)) return;
  checklists.splice(activeIndex, 1);
  activeIndex = checklists.length ? 0 : null;
  save();
  render();
}

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

window.toggle = toggle;
window.loadFile = loadFile;
window.switchTab = switchTab;
window.deleteChecklist = deleteChecklist;

init();
