# PADIMI Mac Quick Action

The project now includes a macOS Service for quick text cleanup.

## What it does

1. Select text in almost any Mac app.
2. Run **PADIMI — Natural** from Services.
3. PADIMI sends the selected text to the PADIMI API.
4. The refined text is returned to the selected-text workflow.

The service keeps the same meaning and uses the Natural mode.

## Install

From the project folder:

```bash
./mac/install.sh
```

Then open **System Settings → Keyboard → Keyboard Shortcuts → Services** and assign a shortcut to **PADIMI — Natural**.

## Fallback

If the API is unavailable, the service returns the original selected text instead of replacing it with an error.
