#!/bin/zsh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$HOME/Library/Services/PADIMI — Natural.workflow"
rm -rf "$TARGET"
cp -R "$ROOT/mac/PADIMI — Natural.workflow" "$TARGET"
killall pbs 2>/dev/null || true
echo "PADIMI — Natural installed."
echo "Assign a keyboard shortcut in System Settings → Keyboard → Keyboard Shortcuts → Services."
