# Security answers for a hospital review

Short answers to the questions a hospital's information security, privacy, and clinical engineering teams usually ask. `docs/data-flow.md` has the detail behind each answer.

## Architecture

**What is it?** A progressive web app: static HTML, JavaScript, and CSS served over HTTPS. It runs in Safari or Chrome and can be added to the Home Screen. There is no native app, no backend service, no database, and no account.

**Where is data stored?** On each phone, in the browser's storage for this site (IndexedDB and localStorage). Nothing is stored on a server.

**Does it store or transmit PHI?** It is designed not to. There is no patient field. Free text is checked for patient identifiers before it is saved, shared, imported, handed off, published, flagged, or sent as a suggestion, and a file with a patient-type field is not imported (`phi.js`, `validate.js`). The check is pattern-based and can miss things, so training and unit policy still say not to type patient details (`docs/training.md`).

**Is a BAA needed?** The design intent is that no PHI is created, received, maintained, or transmitted by the app or its host. Whether the hospital still wants a BAA, or treats the app as out of scope, is a question for the hospital's privacy officer and counsel (`docs/counsel-questions.md`).

**Who hosts it?** Vercel serves the static files (`vercel.json`). The host sees ordinary request logs (IP address, time, path, browser) for those files and never sees the book. A hospital can host the same `dist/` folder on its own web server instead; the app needs no server code.

## Network and browser controls

Every response carries these headers (`vercel.json`; the local preview server sends the same set from `vite.config.js`):

| Header | Value and effect |
| --- | --- |
| Content-Security-Policy | `default-src 'self'`, scripts, styles, fonts, images, and connections only from the app's own origin; no plugins; no framing; forms post only to the app |
| Strict-Transport-Security | Two years, including subdomains |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `no-referrer`, so a manufacturer's site does not learn which page sent the visitor |
| Permissions-Policy | Camera and microphone for this origin only; geolocation, payment, and USB off |
| Cross-Origin-Opener-Policy | `same-origin` |

**Third-party scripts?** None. The font is self-hosted. There is no analytics, advertising, crash reporting, or tag manager. The Content-Security-Policy would block one if it were added by mistake.

**What permissions does it ask for?** Camera, only when the person taps Scan a code, and stopped as soon as a code is read. Microphone, only when the person taps the dictation button, and a unit can turn dictation off. The screen wake lock while a case view is open.

**Does dictation leave the phone?** Yes. The browser's speech recognition may send audio to Apple or Google. The button says so, and the unit rules can turn dictation off for every phone that has the unit book.

## Authentication and integrity

**How do users sign in?** They do not. Each phone's book belongs to the person holding the phone. A typed name labels confirmations and activity; it is not an identity check.

**How does a unit trust a shared unit book?** The publisher's phone makes an ECDSA P-256 key the first time it publishes a place, and signs every revision with it (SHA-256 over canonical JSON, `sign.js`). A staff phone remembers the publisher key from the first revision it accepts and refuses later files for that unit book that are unsigned, changed after signing, signed by a different key, or older than what it has (`unitBook.js`).

**Where is the signing key?** In the publisher's browser storage. It leaves the phone in two cases only:

- **Hand over publishing**: a file for the next publisher that contains the private key. The app tells the publisher to send it to that person only, and tells the recipient to delete it after taking over.
- **Backup**: the key is locked with a passphrase the publisher chooses (PBKDF2-SHA256 with 600,000 iterations and a random salt, then AES-256-GCM, `keyLock.js`), or publishing is left out of the backup. Restoring asks for the passphrase. A wrong passphrase fails the GCM check, and nothing is restored.

A phone that handed publishing over remembers it, so restoring one of its older backups does not make it a publisher again. Restoring a backup that makes a phone a publisher again warns that only one phone should publish each place.

**Two tabs on one phone?** Publishing, hand-over, and key replacement run under one Web Lock (`navigator.locks`) and read the stored key and revision at that moment, so a second tab continues the same unit book with the same key instead of starting another (`usePublishing.js`). Tested in `usePublishing.test.jsx` and `e2e/publishing.spec.js`.

**What if the phone cannot save?** A full store or private browsing can refuse a write. The next revision and key are saved before a unit book file leaves the phone; if that save is refused, nothing is sent and the publisher is told why, so staff never receive a file that the next one would repeat or sign with a different key. Replacing a key and taking over publishing are refused the same way. A hand-over that went out but could not be recorded tells the publisher not to publish that place from this phone again, and a restore whose publishing key could not be saved says publishing did not come back (`usePublishing.test.jsx`, `useBackup.test.jsx`).

**Can a wrong edit be undone?** Each phone keeps the last 10 versions of every card and the cards deleted in the last 30 days, up to 50, in IndexedDB (`history.js`). A version records when it was saved, when it was replaced, and by what: an edit, a unit book revision, a restored backup, an import, or bringing back an earlier version. Confirming or flagging a card is not a new version. A person can read any earlier version, and bring one of their own cards back; the card comes back unconfirmed, and the version it replaced is kept, so bringing back is itself reversible. A unit book card's versions can be read but not brought back, because only the publisher changes it. Earlier versions are never shared, published, or put in a backup. Deleting a place keeps none of its cards (`history.test.js`, `e2e/history.spec.js`).

**What if a signing key leaks?** The publisher uses **Replace the publishing key**, which drops the key and unit book id on that phone and keeps the unit rules (`replacePublishingKey`). The next publish starts a new unit book under a new key. A staff phone that imports it is told its surgeons come from an earlier unit book, shown the new key to compare with the one the publisher announced, and asked before it switches. Switching removes the cards and surgeons only the earlier unit book had, and keeps the person's own copies as editable notes. After the switch it refuses every file from the old unit book (`isRetiredUnitBook`). The publisher's phone remembers the retired unit book, so restoring an older backup cannot bring the old key back, and restore never swaps the unit book a phone publishes for a different one (`restoreExtras`). Until a staff phone switches, it still trusts the old key. The full steps are playbook 3 in `docs/incident-response.md`.

**How does a staff phone know the first key is right?** It trusts the key on the first file it accepts for a unit book. The import sheet says so on that first file and shows the key. The publisher announces the key fingerprint in person or on the unit's board, and staff compare it before adding the unit book (`docs/governance.md`).

## Data protection

**Encryption at rest?** The app relies on the phone's passcode and device encryption (iOS Data Protection, Android file-based encryption). It does not add its own encryption to the browser storage. Managed phones should require a passcode (`docs/mdm.md`).

**Encryption in transit?** The app is served over HTTPS with HSTS. Cards move between people over whatever channel they choose (Messages, email, AirDrop, a file). Unit books and hand-over files are signed, not encrypted; they hold no patient information.

**Retention and deletion?** Data stays until the person deletes it, removes the app, or clears the site's data. Earlier versions keep the last 10 per card; a deleted card is kept 30 days unless the person removes it for good, and nothing is kept of a deleted place. Recent activity keeps the newest 100 entries. Suggestions keep the newest 200. The board drops past days when it loads. Unit policy should say when a departing tech exports or deletes their book (`docs/governance.md`).

**Backups?** The person exports a JSON file; the app reminds them weekly or after 20 changes. Where that file goes (Files, iCloud Drive, a managed drive) is a device and unit policy decision.

**Audit trail?** Each phone keeps its own recent activity: cards saved, deleted, flagged, flags cleared, suggestions sent and closed, places handed off, unit books published, handed over, and taken over, backups restored, earlier versions and deleted cards brought back or cleared, and whether a publisher's backup locked the key or left it out. There is no central log because there is no central system.

## Software supply chain

**Dependencies?** What ships to the phone: React, the self-hosted Inter font, lucide icons, `qrcode.react` to draw codes, `jsqr` to read them on phones without a built-in QR reader, and the Workbox service worker generated by `vite-plugin-pwa`. Build and test tools (Vite, Tailwind CSS, ESLint, TypeScript, Vitest, jsdom, Playwright) do not ship. Exact versions are pinned in `package-lock.json`. Dependabot proposes updates weekly, and CI fails on a moderate or worse advisory in a runtime dependency (`npm audit --omit=dev`).

**Build and test?** GitHub Actions runs lint, a type check, the unit and component tests, and the production build on every push and pull request, and checks that the QR reader is in the offline cache. A second job runs Playwright browser tests against the production build served with the real security headers, and fails on any Content Security Policy violation (`.github/workflows/ci.yml`). A weekly job checks every stored manufacturer link.

**Which version is a phone running?** The footer shows the version and build date, and each backup records the version that wrote it (`appVersion`).

**Updates on phones?** The service worker installs a new version only when no case view or editor is open, so a release never interrupts a case.

## Availability

**Does it need a network?** Only for the first visit and for updates. After that it opens and works with no signal, including scanning and sharing.

**What if the host is down?** Phones that already have the app keep working. New installs wait until the host is back.

## Accessibility

See `docs/accessibility.md`.
