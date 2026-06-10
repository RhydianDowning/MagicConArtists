// Convention checklist: picker, view, toggle signed

let currentConventionId = null;

async function showConventionPicker() {
  const conventions = await window.api.getConventions();
  const modal = document.getElementById("convention-picker");
  const content = modal.querySelector(".modal-content");
  const listHtml = conventions.length
    ? conventions.map((c) => `<button onclick="addToExistingConvention('${c.id}')">${c.name}</button>`).join("")
    : `<p class="empty-state">No conventions yet. Create one below.</p>`;
  content.innerHTML = `
    <h3>Add to Convention Checklist</h3>
    <div id="convention-list">${listHtml}</div>
    <div class="modal-new">
      <input type="text" id="new-convention-name" placeholder="New convention name...">
      <button onclick="createAndAddConvention()">Create</button>
    </div>
    <button class="modal-close" onclick="hideConventionPicker()">Cancel</button>
  `;
  modal.classList.remove("hidden");
}

function hideConventionPicker() {
  document.getElementById("convention-picker").classList.add("hidden");
  document.getElementById("new-convention-name").value = "";
}

function getSelectedCardData() {
  return [...document.querySelectorAll(".card.selected")].map((el) => {
    const h2 = el.closest("details")?.querySelector("h2");
    const artist = h2?.firstChild?.textContent?.trim() || "Unknown";
    const booth = h2?.querySelector(".booth")?.textContent?.trim() || "";
    const p = el.querySelector("p");
    const name = p?.firstChild?.textContent?.trim() || "";
    const small = p?.querySelector("small")?.textContent || "";
    const match = small.match(/^(\S+)\s+#(.+)$/);
    return { artist, booth, name, set: match?.[1] || "", num: match?.[2] || "" };
  }).filter((c) => c.name);
}

async function addToExistingConvention(id) {
  const cards = getSelectedCardData();
  if (!cards.length) return;
  await window.api.addToConvention({ id, cards });
  hideConventionPicker();
  if (confirm(`Added ${cards.length} card(s) to checklist. View it now?`)) {
    deselectAllCards();
    showChecklistView(id);
  }
}

async function createAndAddConvention() {
  const name = document.getElementById("new-convention-name").value.trim();
  if (!name) return;
  const { id } = await window.api.createConvention(name);
  await addToExistingConvention(id);
}

// Checklist view
async function showChecklistView(id) {
  currentConventionId = id;
  const data = await window.api.getConvention(id);
  if (!data) return;

  document.getElementById("setup").style.display = "none";
  document.getElementById("results").style.display = "none";
  const view = document.getElementById("checklist-view");
  view.classList.remove("hidden");

  renderChecklist(data);
}

function renderChecklist(data) {
  const byArtist = {};
  data.cards.forEach((c) => {
    if (!byArtist[c.artist]) byArtist[c.artist] = { booth: c.booth, cards: [] };
    byArtist[c.artist].cards.push(c);
  });
  const sorted = Object.keys(byArtist).sort();

  let html = `<h2 class="checklist-title">${data.name}</h2>`;
  const total = data.cards.length;
  const signed = data.cards.filter((c) => c.signed).length;
  html += `<p class="checklist-progress">${signed}/${total} signed</p>`;
  html += `<button class="delete-checklist-btn" onclick="confirmDeleteChecklist()">Delete Checklist</button>`;
  html += `<button class="share-checklist-btn" onclick="shareChecklist()">Share to Phone</button>`;
  html += `<button class="share-checklist-btn" onclick="shareChecklist()">Share to Phone</button>`;

  for (const artist of sorted) {
    const { booth, cards } = byArtist[artist];
    const boothLabel = booth ? ` <span class="booth">(${booth})</span>` : "";
    const escapedArtist = artist.replace(/'/g, "\\'");
    html += `<div class="checklist-artist"><h3>${artist}${boothLabel}<span class="remove-artist" onclick="removeArtist('${escapedArtist}')">✕ Remove all</span></h3>`;
    for (const c of cards) {
      const checked = c.signed ? "checked" : "";
      const cls = c.signed ? "checklist-card signed" : "checklist-card";
      const escapedName = c.name.replace(/'/g, "\\'");
      html += `<label class="${cls}"><input type="checkbox" ${checked} onchange="toggleSignedCard('${escapedArtist}', '${escapedName}')"><span>${c.name}</span><small>${c.set} #${c.num}</small><span class="remove-card" onclick="event.preventDefault();removeCard('${escapedArtist}', '${escapedName}')">✕</span></label>`;
    }
    html += `</div>`;
  }

  document.getElementById("checklist-content").innerHTML = html;
}

async function toggleSignedCard(artist, name) {
  const data = await window.api.toggleSigned({ id: currentConventionId, artist, name });
  if (data) renderChecklist(data);
}

async function removeCard(artist, name) {
  const data = await window.api.removeFromConvention({ id: currentConventionId, artist, name });
  if (data) renderChecklist(data);
}

async function removeArtist(artist) {
  if (!confirm(`Remove all cards by ${artist}?`)) return;
  const data = await window.api.removeArtistFromConvention({ id: currentConventionId, artist });
  if (data) renderChecklist(data);
}

function hideChecklistView() {
  document.getElementById("checklist-view").classList.add("hidden");
  document.getElementById("setup").style.display = "";
  document.getElementById("progress").textContent = "";
  document.getElementById("run-btn").disabled = false;
  currentConventionId = null;
  showConventionList();
}

async function confirmDeleteChecklist() {
  const data = await window.api.getConvention(currentConventionId);
  if (!data) return;
  // Show inline confirm modal
  const modal = document.getElementById("convention-picker");
  const content = modal.querySelector(".modal-content");
  content.innerHTML = `
    <h3>Delete "${data.name}"?</h3>
    <p style="color:#8b949e;font-size:0.85rem;margin-bottom:1rem;">Type the checklist name to confirm:</p>
    <input type="text" id="delete-confirm-input" placeholder="${data.name}" style="width:100%;padding:0.5rem;background:#0d1117;border:1px solid #30363d;color:#e6edf3;border-radius:6px;font-size:0.85rem;">
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button onclick="executeDeleteChecklist('${data.name.replace(/'/g, "\\'")}')" style="background:#da3633;border:none;color:#fff;flex:1;border-radius:6px;padding:0.5rem;cursor:pointer;">Delete</button>
      <button onclick="cancelDeleteChecklist()" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;flex:1;border-radius:6px;padding:0.5rem;cursor:pointer;">Cancel</button>
    </div>
  `;
  modal.classList.remove("hidden");
}

function executeDeleteChecklist(name) {
  const input = document.getElementById("delete-confirm-input").value.trim();
  if (input !== name) {
    document.getElementById("delete-confirm-input").style.borderColor = "#f85149";
    return;
  }
  document.getElementById("convention-picker").classList.add("hidden");
  window.api.deleteConvention(currentConventionId);
  hideChecklistView();
}

function cancelDeleteChecklist() {
  document.getElementById("convention-picker").classList.add("hidden");
}

// Convention list on home page
async function showConventionList() {
  const conventions = await window.api.getConventions();
  const section = document.getElementById("checklists-section");
  const el = document.getElementById("convention-links");
  if (!conventions.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  el.innerHTML = conventions.map((c) =>
    `<button class="convention-link" onclick="showChecklistView('${c.id}')">${c.name}</button>`
  ).join("");
}

window.showConventionPicker = showConventionPicker;
window.hideConventionPicker = hideConventionPicker;
window.addToExistingConvention = addToExistingConvention;
window.createAndAddConvention = createAndAddConvention;
window.showChecklistView = showChecklistView;
window.toggleSignedCard = toggleSignedCard;
window.removeCard = removeCard;
window.removeArtist = removeArtist;
window.hideChecklistView = hideChecklistView;
window.confirmDeleteChecklist = confirmDeleteChecklist;
window.executeDeleteChecklist = executeDeleteChecklist;
window.cancelDeleteChecklist = cancelDeleteChecklist;

async function shareChecklist() {
  const baseUrl = "https://rhydiandowning.github.io/MagicConArtists/pwa/";
  const qrDataUrl = await window.api.generateChecklistQR({ id: currentConventionId, baseUrl });
  if (!qrDataUrl) return;
  const modal = document.getElementById("convention-picker");
  modal.querySelector(".modal-content").innerHTML = `
    <h3>Share to Phone</h3>
    <p style="color:#8b949e;font-size:0.8rem;margin-bottom:0.75rem;">1. Scan the QR code to install the app on your phone</p>
    <img src="${qrDataUrl}" style="display:block;margin:0 auto 1rem;width:180px;height:180px;border-radius:8px;">
    <p style="color:#8b949e;font-size:0.8rem;margin-bottom:0.75rem;">2. Export your checklist and send it to your phone (AirDrop, email, etc.)</p>
    <button onclick="exportChecklistFile()" style="background:#238636;border:none;color:#fff;width:100%;border-radius:6px;padding:0.5rem;cursor:pointer;margin-bottom:0.5rem;">Export Checklist File</button>
    <p style="color:#8b949e;font-size:0.7rem;margin-bottom:1rem;">3. Open the file in the app on your phone to load it</p>
    <button class="modal-close" onclick="document.getElementById('convention-picker').classList.add('hidden')">Close</button>
  `;
  modal.classList.remove("hidden");
}

async function exportChecklistFile() {
  await window.api.exportChecklistFile(currentConventionId);
}
window.shareChecklist = shareChecklist;
window.exportChecklistFile = exportChecklistFile;
window.showConventionList = showConventionList;
