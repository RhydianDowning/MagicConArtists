// Find-in-page: custom JS search with highlighting

let findTimeout = null;
let findMatches = [];
let findIndex = -1;

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "f") {
    e.preventDefault();
    document.getElementById("find-bar").classList.remove("hidden");
    document.getElementById("find-input").focus();
  }
  if (e.key === "Escape") closeFindBar();
});

function findInPage() {
  clearTimeout(findTimeout);
  findTimeout = setTimeout(() => doFind(), 50);
}

function doFind() {
  const text = document.getElementById("find-input").value.toLowerCase();
  document.querySelectorAll(".find-highlight").forEach((el) => { el.outerHTML = el.textContent; });
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
    findIndex = 0;
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

function closeFindBar() {
  document.getElementById("find-bar").classList.add("hidden");
  document.getElementById("find-input").value = "";
  document.getElementById("find-count").textContent = "";
  document.querySelectorAll(".find-highlight").forEach((el) => { el.outerHTML = el.textContent; });
  findMatches = [];
  findIndex = -1;
}

window.findInPage = findInPage;
window.findNext = findNext;
window.findPrev = findPrev;
window.closeFindBar = closeFindBar;
