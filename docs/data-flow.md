# Data flow

What Scrub Playbook keeps, where it keeps it, and every way something leaves the phone. Each line here can be checked in the source; the file or function is named in parentheses.

## What the app holds

| Data | Example | Patient information? |
| --- | --- | --- |
| Surgeons | Name, specialty, facility, up to three first-case lines | No |
| Procedures | Setup, case flow, instruments, trays, sutures, implants by product name, nicknames, gloves, a pointer to the official card | No |
| People in the room | A PA's or resident's name, role, and glove size (`ProcedureEditor.jsx`, `PeopleEditor`) | No. This is workforce information. |
| Confirmations | The name a tech typed and the time they confirmed a card | No. This is workforce information. |
| Flags | The reason a tech gave, their name, and the time | No |
| The board | Time, room, surgeon, and procedure for today and tomorrow | No patient field exists. A room and time with a surgeon is schedule information. |
| Suggestions | What the official card said, what the tech saw, the change they suggested | No |
| Recent activity | Up to 100 entries: what changed, on which surgeon, by which typed name (`useAuditLog.js`) | No |
| Unit books this phone publishes | Place, revision, unit rules, the publisher's signing key (`unitBook.js`) | No |
| Earlier versions | The last 10 versions of each card, and cards deleted in the last 30 days (up to 50), each with when it was saved and what replaced it (`history.js`) | No |
| Signed changes | Part of each card: its last 10 saved changes, each with the name typed, the time, the kind of change, a hash of the card's content, and a signature with the public key of the phone that saved it (`editTrail.js`) | No. This is workforce information. |
| This phone's signing key | Made the first time the phone saves a card, and used only to sign card changes (`deviceKey`) | No |

The app has no field for a patient. Before a card is saved, shared, imported, handed off, published, flagged, or suggested, the text is checked for patient names with a title, "Pt Last, First", dates of birth, full dates, phone numbers, Social Security numbers, record, account, and visit numbers, long identifying numbers, lot and serial numbers, and medication doses (`phi.js`). A file that carries a field named `patient`, `mrn`, `dob`, `ssn`, `dose`, `lot`, `serial`, `photo`, or `price` pauses the same way and is not saved (`validate.js`). The check pauses the person and asks them to take the detail out. It is a check, not a guarantee.

## Where it is stored

Everything is stored in the browser on the phone, for this site only.

- **IndexedDB**, database `scrubplaybook`, store `kv`: the book (`store.js`), the earlier versions of its cards (`history.js`), and this phone's key for signing card changes, kept as a key the browser will not export (`editTrail.js`). If IndexedDB is unavailable, the book and the signing key fall back to `localStorage`, where the key is kept as text, and no earlier versions are kept, so they never take the room the book needs.
- **localStorage**, keys starting with `scrubplaybook_`: the typed name, the board, recent activity, suggestions, the pull checklist for today, unit books this phone publishes, places this phone handed over, sort order, the case view's dark mode, and backup reminders (`schema.js`, `pull.js`, `useAuditLog.js`). Every open tab sees the same values: a change applies to what is stored at that moment, and other tabs pick it up from the browser's storage event (`useStoredState.js`).
- The app asks the browser to keep this storage when space runs low (`storage.js`, `navigator.storage.persist`). On iPhone, data written by a site that is not on the Home Screen can be cleared by Safari after a period without use, which is why the app asks iPhone users to add it to the Home Screen.

The app does not encrypt this storage itself. It relies on the phone's passcode and device encryption. A unit book publisher's private signing key is stored here so the phone can sign the next revision.

## What the server sees

The app is static files. The host (Vercel, `vercel.json`) serves HTML, scripts, styles, the self-hosted font, and the service worker. The host keeps ordinary request logs for those files: IP address, time, path, and browser. No request carries the book. There is no API, no database, no account, and no analytics, crash reporting, or advertising code.

After the first visit, the service worker keeps the app on the phone so it opens with no signal. It checks the host for a new version and installs it only when no case view or editor is open (`pwa.js`).

## Every way something leaves the phone

Each of these happens only when the person taps it.

| Action | What goes | Where it goes | Confirmations included? |
| --- | --- | --- | --- |
| Share a card (`ShareCardModal.jsx`) | One procedure as readable text, the same card as JSON with its newest signed change (a typed name, a time, a signature), and a QR code when it fits. A code too small for the signed change leaves it out and says so. | Wherever the person sends it: Messages, email, AirDrop, or copy | No. Flags and confirmations are stripped (`slimProcedure`). |
| Suggest a card change (`CaseView.jsx`) | What the card says, what was seen, the suggested change, the typed name, the date | Wherever the person sends it | No |
| Hand off a place (`toPlacePack`) | A JSON file with that place's surgeons and procedures | Wherever the person sends it | No. Cards arrive unconfirmed. |
| Publish a unit book (`publishUnitBook`) | A signed JSON file with the place's surgeons, procedures, and unit rules, plus the publisher's public key | Wherever the publisher sends it | No |
| Hand over publishing (`handOverPublishing`) | A final signed revision and the publisher's **private signing key** | The next publisher only | No |
| Export a backup (`toBackup`) | The book, confirmations, the board, recent activity, suggestions, and published unit books. A signing key is locked with the publisher's passphrase (PBKDF2-SHA256, 600,000 iterations, AES-GCM) or left out (`keyLock.js`). | A file on the phone, or wherever the person saves it | Yes. A backup is meant for the same person. |
| Print a case or the day (`CaseView.jsx`, `PrintDay.jsx`) | The cards as printed pages | Printer or PDF | No |
| Dictate (`useSpeechToText.js`) | Microphone audio while the button is on | The browser's speech service. Depending on the phone and browser, Apple or Google may process the audio on their servers. | Not applicable |
| Tap a product or company link (`productLink.js`) | Nothing from the book. The browser opens the manufacturer's page with no referrer (`Referrer-Policy: no-referrer`). | The manufacturer's site | Not applicable |

Earlier versions never leave the phone. They are not in a shared card, a hand-off, a unit book, or a backup.

Signed changes are part of the card, so a hand-off, a unit book, and a backup carry each card's last 10, and a shared card carries the newest. They hold the names people typed when they saved the card. The phone's private signing key never leaves the phone.

A unit can turn dictation off in its unit rules. The rule travels in the signed unit book and turns dictation off on every phone that has it (`dictationOff`).

## What comes in

The import sheet reads a shared card, a hand-off file, a unit book, a hand-over file, or a backup, from pasted text, a file, or a QR code scanned with the camera. The camera stream is read on the phone (`qrReader.js`) and stopped as soon as a code is read. Every import shows a preview first and runs the patient-information check. Unit books and hand-over files must carry a valid signature from the key this phone already trusts for that unit book (`sign.js`, ECDSA P-256 with SHA-256).

## Deleting data

- One card or surgeon: Delete on the home list, with an undo for a few seconds. The card then stays in **Recently deleted** on this phone for 30 days, where **Remove for good** removes it and its earlier versions at once.
- Earlier versions of one card: **History**, then **Clear this card’s history**. A card's signed changes are part of the card and are deleted with it.
- One place: Places, then Delete for the active or the archived group. Nothing of that place's cards is kept in Recently deleted or in earlier versions.
- Everything: remove the app from the Home Screen and clear the site's data in the browser's settings. On a managed phone, removing the web clip or wiping the device removes it.

Files that left the phone (shared messages, hand-off files, backups, printouts) are outside the app and follow the place they were sent to.
