// Artist list: rendering, creation, deletion

function renderArtistList(artists) {
  const artistsEl = document.getElementById("artists");
  artistsEl.innerHTML = "";
  artists.forEach((a, i) => {
    const del = a.source === "user" ? `<span class="delete-btn" onclick="deleteArtistList(event, '${a.file}')">✕</span>` : "";
    const checked = i === 0 ? "checked" : "";
    artistsEl.innerHTML += `<label><input type="radio" name="artist" value="${a.file}" data-source="${a.source}" ${checked}> ${a.file.replace(/\.txt$/, "")}${del}</label>`;
  });
}

function toggleNewArtistForm() {
  document.getElementById("new-artist-form").classList.toggle("hidden");
}

function createArtistRow(name = "") {
  const div = document.createElement("div");
  div.className = "artist-entry";
  div.innerHTML = `<input type="text" placeholder="Artist Name" class="artist-name" value="${name}"><input type="text" placeholder="Booth/Location (optional)" class="artist-info"><span class="delete-btn" onclick="this.parentElement.remove()">✕</span>`;
  return div;
}

function addArtistRow() {
  document.getElementById("artist-entries").appendChild(createArtistRow());
}

function bulkImportArtists() {
  const textarea = document.getElementById("artist-bulk");
  const text = textarea.value.trim();
  if (!text) return;
  const names = text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  const entries = document.getElementById("artist-entries");
  names.forEach((name) => entries.appendChild(createArtistRow(name)));
  textarea.value = "";
}

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
  renderArtistList(await window.api.getArtistLists());
  document.getElementById("new-artist-form").classList.add("hidden");
  document.getElementById("artist-list-name").value = "";
  document.getElementById("artist-entries").innerHTML = "";
}

async function deleteArtistList(event, filename) {
  event.preventDefault();
  event.stopPropagation();
  if (!confirm(`Delete "${filename.replace(/\.txt$/, "")}"?`)) return;
  await window.api.deleteArtistList(filename);
  renderArtistList(await window.api.getArtistLists());
}

// Expose globally
window.renderArtistList = renderArtistList;
window.toggleNewArtistForm = toggleNewArtistForm;
window.addArtistRow = addArtistRow;
window.bulkImportArtists = bulkImportArtists;
window.saveArtistList = saveArtistList;
window.deleteArtistList = deleteArtistList;
