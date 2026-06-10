// Painter's Servant PWA - Event Checklist

let checklist = null;

function init() {
  // Load from localStorage if available
  const saved = localStorage.getItem("checklist");
  if (saved) checklist = JSON.parse(saved);
  render();
  showInstallHint();
}

function showInstallHint() {
  // Only show if not already installed as PWA
  if (window.matchMedia("(display-mode: standalone)").matches) return;
  const prompt = document.getElementById("install-prompt");
  const text = prompt.querySelector(".install-text");
  const isIOS = /iphone|ipad/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  if (isIOS) {
    text.textContent = 'Tap the Share button (⬆️) then "Add to Home Screen" to install this app.';
  } else if (isAndroid) {
    text.textContent = 'Tap the menu (⋮) then "Install app" or "Add to Home Screen".';
  } else {
    return; // Desktop, don't show
  }
  prompt.classList.remove("hidden");
}

function dismissInstall() {
  document.getElementById("install-prompt").classList.add("hidden");
}

function loadFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      checklist = JSON.parse(e.target.result);
      localStorage.setItem("checklist", JSON.stringify(checklist));
      render();
    } catch { alert("Invalid checklist file."); }
  };
  reader.readAsText(file);
}

function render() {
  const el = document.getElementById("checklist");
  const empty = document.getElementById("empty");
  const loadSection = document.getElementById("load-section");
  if (!checklist || !checklist.cards.length) {
    el.innerHTML = "";
    empty.style.display = "";
    loadSection.style.display = "";
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

  // Keep load button visible for switching checklists
  html += `<div style="margin-top:2rem;text-align:center;"><label class="file-btn">Load Different Checklist<input type="file" accept=".json" onchange="loadFile(event)" hidden></label></div>`;

  el.innerHTML = html;
  loadSection.style.display = "none";
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

window.toggle = toggle;
window.loadFile = loadFile;
window.dismissInstall = dismissInstall;

init();
