# Welcome to Painter's Servant

Find which artists from an event have illustrated cards in your MTG decklists — with card art, set codes, and booth numbers. Make your Checklist before you arrive, and export it to PDF to print, or to your phone for offline use.

## Download

Head to the [Releases page](https://github.com/RhydianDowning/MagicConArtists/releases) and download the latest version for your platform:

- **macOS** — `.dmg` file (Apple Silicon & Intel)
- **Windows** — `.exe` installer
- **Linux** — `.AppImage` (portable, no install needed)

> **macOS users:** The app is unsigned. After installing, right-click → Open, or run:
> ```bash
> xattr -cr /Applications/Painters\ Servant.app
> ```

## How to Use

### 1. Import Your Decklists

- **Moxfield** (recommended) — paste a Moxfield deck URL and click Import
- **Manual paste** — click "or paste a decklist manually" and paste in any common format

### 2. Select an Artist List

Choose a pre-loaded event artist list, or create your own with booth/location info.

### 3. Fetch & Match

Click **Find Matches**. The app checks Scryfall for every printing of each card and matches artists. First fetch is ~1s per card (rate limited), subsequent runs are instant from cache.

### 4. Browse Results

Results show card art grouped by artist with booth numbers and card counts. Use the filter buttons to toggle sideboard, considering, basic lands, and specific printings. Sort by A–Z or card count.

### 5. Select & Export Cards

**Click cards to select them** (teal outline appears on the image). A floating action bar appears with:

- **Select All / Deselect All** — bulk selection (skips basic lands)
- **Open in Scryfall** — opens selected cards in your browser (batched into pages of 20)
- **Export** — choose from:
  - *PDF Images* — card images at real MTG size (63×88mm), 9 per A4 page
  - *PDF Checklist* — two-column printable signing checklist sorted by artist with checkboxes
  - *Moxfield Decklist* — copies to clipboard in Moxfield import format
  - *Phone Checklist* — add to a convention checklist and share to your phone
- **Add to Checklist** — save selected cards to a convention checklist for use at the event

### 6. Convention Checklists

Create checklists for specific events. Track which cards you've had signed — check them off in-app. Share to your phone via the companion PWA ([ConSign to Memory](https://rhydiandowning.github.io/MagicConArtists/pwa/)) for use at the venue.

## Features

- **Moxfield Import** — paste a URL to import a deck
- **Manual Decklist Import** — paste a card list in any common format (handles foil markers, split cards, section headers)
- **Artist List Management** — create custom artist lists with booth/location info, or mass-import names
- **Filters** — toggle sideboard, considering, basic land mode, and specific printings
- **Sort** — alphabetical or by card count per artist
- **Card count per artist** — shown in results header
- **Multi-deck support** — see which cards appear across multiple decklists
- **Scryfall Caching** — first fetch is rate-limited, subsequent runs are instant
- **PDF Export** — card images at print size, or a signing checklist
- **Convention Checklists** — persistent, shareable to phone
- **ConSign to Memory (PWA)** — offline mobile checklist companion

## For Developers

```bash
git clone https://github.com/RhydianDowning/MagicConArtists.git
cd MagicConArtists
npm install
npm run dev     # dev mode with hot reload
npm test        # run tests (bare minumim test suite...)
npm run build:mac
npm run build:win
npm run build:linux
```

### Requirements

- Node.js 18+

### Project Structure

```
├── electron/
│   ├── main.js           # App lifecycle
│   ├── paths.js          # Path resolution
│   ├── preload.js        # Context bridge
│   ├── ipc/              # IPC handlers (decklists, artists, match, export, conventions, moxfield)
│   └── renderer/         # UI (html, css, js modules)
├── src/
│   ├── config.js         # Paths & constants
│   ├── cache.js          # Local file cache
│   ├── parser.js         # Deck parsing (testable)
│   ├── scryfall.js       # Scryfall API + rate limiting
│   └── matcher.js        # Artist/card matching logic
├── pwa/                  # ConSign to Memory mobile companion
├── data/                 # Pre-fetched basic land data
├── artistLists/          # Bundled artist lists
├── tests/                # Test suite
└── scripts/              # Utility scripts
```

## TODO

- [ ] Light/dark mode toggle
- [ ] Cache reset notification (new cards on Scryfall)
- [ ] Fix Ctrl-F Functionality in Results Page
