# SignatureHunter

Find which artists from an event have illustrated cards in your MTG decklists — with card art, set codes, and booth numbers.

## Quick Start

```bash

git clone https://github.com/RhydianDowning/MagicConArtists.git
cd ScryfallArtists
npm install
npm start
```

## Requirements

- **Node.js 18+**

## How It Works

1. Select one or more decklists (or import from Moxfield / paste manually)
2. Select an artist list (or create your own)
3. The app checks Scryfall for every printing of each card
4. It matches card artists against your event artist list
5. View results with card art images, set codes, and booth numbers

## Features

- **Moxfield Import** — paste a Moxfield URL to import a deck (uses Electron's built-in Chromium, no Chrome needed)
- **Manual Decklist Import** — paste a card list in any common format
- **Artist List Management** — create custom artist lists with booth/location info, or mass-import names
- **Filters** — toggle sideboard, considering, basic land mode, and specific printings
- **Scryfall Caching** — first fetch is ~1 req/sec due to rate limits, subsequent runs are instant

## Adding Data

**Decklists:** Import via the app (Moxfield or manual paste), or add `.txt` files to `localStorage/Decklists/`.

**Artist lists:** Create via the app, or add `.txt` files to `localStorage/ArtistLists/` — format is `Artist Name|Booth Number` (booth is optional).

## Project Structure

```
├── electron/
│   ├── main.js           # Electron main process + IPC handlers
│   ├── preload.js        # Context bridge
│   └── renderer/
│       ├── index.html    # UI
│       └── app.js        # Frontend logic
├── src/
│   ├── config.js         # Paths & constants
│   ├── cache.js          # Local file cache
│   ├── scryfall.js       # Scryfall API + rate limiting
│   └── matcher.js        # Artist/card matching logic
├── data/                 # Pre-fetched basic land data
├── artistLists/          # Bundled artist lists (shipped with app)
├── localStorage/         # User data (gitignored)
│   ├── Decklists/
│   ├── ArtistLists/
│   └── CardArtists/
└── scripts/              # Utility scripts
```

## TODO

- [x] Remove `*F*` from manual import so foils aren't excluded
- [x] Log each card not found on Scryfall in a visible list
- [x] Solution for updating/invalidating cache
- [x] Ctrl-F / find function within the results page
- [ ] Card count per artist in results header
- [x] Option to sort artists by card count (mainboard) instead of alphabetical
- [ ] Show number of decks a card appears in
- [ ] Export results (PDF/image for use at event)
- [ ] Light/dark mode toggle
- [ ] Cache Reset Notification? (New cards on scryfall)
