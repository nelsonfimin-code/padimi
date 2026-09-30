# PADIMI iPhone app + keyboard

This is the native iOS shell and custom keyboard for PADIMI. The keyboard sends text to the existing production PADIMI API and inserts the refined result back into the current app.

## User setup after installation
1. Install PADIMI.
2. Open PADIMI once.
3. Go to **Settings → General → Keyboard → Keyboards → Add New Keyboard → PADIMI**.
4. Open **PADIMI** and enable **Allow Full Access**. Full Access is required because the keyboard calls the PADIMI refinement server.
5. In any text field, hold the globe/keyboard key and choose **PADIMI**.

The web app remains available at the production URL. The iOS keyboard uses the same backend, so there is one refinement engine.

## Build requirement
The connected Mac currently has only Command Line Tools active and the downloaded `Xcode_14.2.xip` is only 81 KB and fails Apple's `xip` integrity check. The native keyboard therefore cannot truthfully be called compiled/installed yet. Use a complete Xcode installation with an iOS SDK on a compatible Mac/build runner, then open the Xcode project and sign both targets with the same Apple Developer team.
