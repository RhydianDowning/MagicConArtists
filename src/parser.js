// Deck line parsing - pure functions, no DOM dependencies

export function parseDeckLine(line) {
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

export function parseDeckList(text) {
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
  return cards;
}

export function artistMatches(artist, myArtists) {
  return myArtists.some((a) => artist.toLowerCase().includes(a.toLowerCase()));
}
