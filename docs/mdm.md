# Managed phones

How to put Scrub Playbook on phones the hospital manages. The app is a web app served from one host. It installs to the home screen, works offline after the first open, and keeps everything in that phone's browser storage. There is nothing to sign in to and no data to sync, so there is no server-side setup.

Check each step with your MDM vendor's documentation; menu names differ between products and versions.

## Before rollout

- **Host.** Note the exact address the hospital will use, for example `https://playbook.example-hospital.org`. Every phone must open the same address: browser storage belongs to that address, and moving to a new one starts each phone with an empty book. If the address must change, have staff export a backup first and restore it on the new address.
- **Allowlist.** Allow that host through any web filter or proxy. The app's content security policy lets it connect only to its own host (`vercel.json`). A company or product link opens the company's own site in the browser. Dictation, if the unit allows it, uses the phone's speech service, which may send audio to the phone or browser maker (`docs/privacy.md`).
- **Passcode and encryption.** Require a device passcode. The book is protected by the phone's passcode and device encryption; the app does not add its own (`docs/security.md`).
- **Browser.** Safari on iPhone and iPad; Chrome on Android. Other browsers may work but are not tested.

## iPhone and iPad

- **Install.** Push a Web Clip payload with the host address, a label such as "Scrub Playbook", and full screen on. Staff can also open the address in Safari and use Share, then Add to Home Screen.
- **Open it from the home screen.** Safari may delete a site's storage after about seven days without a visit when it is used only in a browser tab. A web app opened from the home screen is not subject to that limit. Tell staff to always open the app from its icon.
- **Storage.** The app asks the browser to keep its storage. Staff should still export a backup regularly; the header reminds them.
- **Camera.** Scanning a share code asks for the camera the first time. If a phone has blocked it, staff can paste the text instead, or allow the camera for the site in Settings, Safari, Camera.
- **Files.** Backups and hand-off files are saved through the share sheet. If managed open-in restrictions apply, make sure staff can save to and open from a managed location such as Files.

## Android

- **Install.** In managed Google Play, add the host as a web app, or have staff open it in Chrome and choose Install app. Both put an icon on the home screen that opens in its own window.
- **Storage.** The app asks Chrome to keep its storage. Once Chrome agrees, which it usually does for an installed web app, the storage stays until the person clears site data or uninstalls the app. Otherwise Chrome may clear it when the phone runs very low on space. Staff should still export backups.
- **Camera.** Allow the camera for the host through Chrome's managed policy for camera access, or let staff allow it on first scan.
- **Files.** Backups go to Downloads or wherever the share target saves them.

## Updates

The app checks for a new version when it opens and asks before reloading. It does not reload while a case view or editor is open. There is nothing to push through MDM. A rollback is done on the host (`docs/incident-response.md`, playbook 6).

## Personal phones

If the unit allows personal phones, the same steps apply without MDM. The unit policy says whether personal phones may hold the app (`docs/governance.md`).

## Retiring a phone

Before a phone is wiped or reassigned, its owner exports a backup (locked, if the phone publishes a unit book) and restores it on the new phone. Then delete the app's data from the old phone, or wipe it.
