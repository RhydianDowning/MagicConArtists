# SignatureHunter

Find which artists from an event have illustrated cards in your MTG decklists — with card art, set codes, and booth numbers.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/RhydianDowning/MagicConArtists.git
cd ScryfallArtists

# Install dependencies
npm install

# Link the commands globally
npm link

# Run it
signatureHunter
```

## Requirements

- **Node.js 18+** (for built-in fetch)
- **Google Chrome** (only needed for Moxfield import)

## Commands

| Command | Description |
|---------|-------------|
| `signatureHunter` | Main tool — select a decklist & artist list, view matching card arts |
| `DecklistImport` | Import a deck from Moxfield URL |

## How It Works

1. Select a decklist (or import one from Moxfield, or choose all)
2. Select an artist list (e.g. MagicCon Amsterdam 2026)
3. The tool checks Scryfall for every printing of each card
4. It matches card artists against your event artist list
5. View results in terminal or browser with card art images

## Adding Your Own Data

**Decklists:** Add `.txt` files to `localStorage/Decklists/` — one card name per line.

**Artist lists:** Add `.txt` files to `artistLists/` — format is `Artist Name|Booth Number` (booth is optional).

## First Run

The first run will fetch card data from Scryfall (cached locally after that). Expect ~1 request per second due to rate limits. Subsequent runs are instant for cached cards.

## Project Structure

```
├── index.js              # Main entry point (TUI)
├── import.js             # Moxfield deck importer
├── src/
│   ├── config.js         # Paths & constants
│   ├── cache.js          # Local file cache
│   ├── scryfall.js       # Scryfall API + rate limiting
│   ├── matcher.js        # Artist/card matching logic
│   ├── display.js        # Terminal output formatting
│   ├── server.js         # HTML page generation & local server
│   └── moxfield.js       # Moxfield deck fetcher (puppeteer)
├── data/                 # Pre-fetched basic land data (committed)
├── artistLists/          # Event artist lists (committed)
├── localStorage/         # User data - decklists & cache (gitignored)
│   ├── Decklists/
│   └── CardArtists/
└── scripts/              # Utility scripts
```
