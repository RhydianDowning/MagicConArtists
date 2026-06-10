#!/bin/bash
# Migrate from SignatureHunter to Painter's Servant

OLD_APP="/Applications/SignatureHunter.app"
NEW_APP="/Applications/Painters Servant.app"
OLD_DATA="$HOME/Library/Application Support/SignatureHunter/localStorage"
NEW_DATA="$HOME/Library/Application Support/Painters Servant/localStorage"

echo "=== Painter's Servant Migration ==="

# 1. Clear quarantine on new app
if [ -d "$NEW_APP" ]; then
  xattr -cr "$NEW_APP"
  echo "✓ Cleared quarantine on Painters Servant"
else
  echo "✗ Painters Servant.app not found in /Applications"
  exit 1
fi

# 2. Copy data from old app (without overwriting new folders)
if [ -d "$OLD_DATA" ]; then
  mkdir -p "$NEW_DATA"
  for dir in Decklists CardArtists ArtistLists; do
    if [ -d "$OLD_DATA/$dir" ]; then
      mkdir -p "$NEW_DATA/$dir"
      cp -n "$OLD_DATA/$dir"/* "$NEW_DATA/$dir/" 2>/dev/null
      echo "✓ Copied $dir"
    fi
  done
else
  echo "⚠ No SignatureHunter data found — skipping"
fi

# 3. Uninstall SignatureHunter
if [ -d "$OLD_APP" ]; then
  rm -rf "$OLD_APP"
  echo "✓ Removed SignatureHunter.app"
else
  echo "⚠ SignatureHunter.app not found — skipping"
fi

echo "=== Done! ==="
