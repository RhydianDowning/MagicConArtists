import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseDeckLine, parseDeckList, artistMatches } from "../src/parser.js";

describe("parseDeckLine", () => {
  it("parses basic card name", () => {
    assert.deepEqual(parseDeckLine("Lightning Bolt"), { name: "Lightning Bolt", set: "", num: "" });
  });

  it("parses quantity + name", () => {
    assert.deepEqual(parseDeckLine("4 Lightning Bolt"), { name: "Lightning Bolt", set: "", num: "" });
  });

  it("parses quantity with x", () => {
    assert.deepEqual(parseDeckLine("4x Dark Ritual"), { name: "Dark Ritual", set: "", num: "" });
  });

  it("parses name (SET) NUM format", () => {
    assert.deepEqual(parseDeckLine("1 Lightning Bolt (LEB) 162"), { name: "Lightning Bolt", set: "LEB", num: "162" });
  });

  it("strips *F* foil marker", () => {
    assert.deepEqual(parseDeckLine("1 Aragorn, King of Gondor (LTC) 5 *F*"), { name: "Aragorn, King of Gondor", set: "LTC", num: "5" });
  });

  it("strips *f* lowercase foil marker", () => {
    assert.deepEqual(parseDeckLine("1 Solitude (SPG) 44 *f*"), { name: "Solitude", set: "SPG", num: "44" });
  });

  it("parses pipe-separated format", () => {
    assert.deepEqual(parseDeckLine("Lightning Bolt|CLB|401"), { name: "Lightning Bolt", set: "CLB", num: "401" });
  });

  it("parses pipe format with board field (ignored)", () => {
    assert.deepEqual(parseDeckLine("Lightning Bolt|CLB|401|mainboard"), { name: "Lightning Bolt", set: "CLB", num: "401" });
  });

  it("normalizes single / to // for split cards", () => {
    assert.deepEqual(parseDeckLine("1 Brazen Borrower / Petty Theft (ELD) 39"), { name: "Brazen Borrower // Petty Theft", set: "ELD", num: "39" });
  });

  it("leaves existing // unchanged", () => {
    assert.deepEqual(parseDeckLine("Brazen Borrower // Petty Theft|ELD|39"), { name: "Brazen Borrower // Petty Theft", set: "ELD", num: "39" });
  });

  it("handles promo collector numbers", () => {
    assert.deepEqual(parseDeckLine("1 Flooded Strand (PMH3) 220s *F*"), { name: "Flooded Strand", set: "PMH3", num: "220s" });
  });

  it("handles PLST set with hyphenated num", () => {
    assert.deepEqual(parseDeckLine("1 Cryptic Command (PLST) IMA-48"), { name: "Cryptic Command", set: "PLST", num: "IMA-48" });
  });

  it("returns null for empty input", () => {
    assert.equal(parseDeckLine(""), null);
  });
});

describe("parseDeckList", () => {
  it("parses simple list", () => {
    const cards = parseDeckList("Lightning Bolt\nDark Ritual");
    assert.equal(cards.length, 2);
    assert.equal(cards[0].board, "mainboard");
  });

  it("handles SIDEBOARD section", () => {
    const cards = parseDeckList("Lightning Bolt\nSIDEBOARD:\nThought Scour");
    assert.equal(cards[1].name, "Thought Scour");
    assert.equal(cards[1].board, "sideboard");
  });

  it("deduplicates by name", () => {
    const cards = parseDeckList("Lightning Bolt\n1 Lightning Bolt (LEB) 162");
    assert.equal(cards.length, 1);
  });

  it("skips empty lines", () => {
    const cards = parseDeckList("Lightning Bolt\n\n\nDark Ritual");
    assert.equal(cards.length, 2);
  });
});

describe("artistMatches", () => {
  it("matches exact name", () => {
    assert.equal(artistMatches("Chris Rallis", ["Chris Rallis"]), true);
  });

  it("matches case-insensitively", () => {
    assert.equal(artistMatches("chris rallis", ["Chris Rallis"]), true);
  });

  it("matches partial (substring)", () => {
    assert.equal(artistMatches("Ken Meyer Jr.", ["Ken Meyer"]), true);
  });

  it("does not match unrelated names", () => {
    assert.equal(artistMatches("Chris Rallis", ["Gabor Szikszai"]), false);
  });

  it("matches when artist list has substring of card artist", () => {
    assert.equal(artistMatches("Zoltan & Gabor", ["Gabor"]), true);
  });
});
