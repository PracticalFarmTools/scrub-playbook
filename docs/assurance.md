# Checking the app's claims

The app makes claims in its footer, its notices, and these documents. This page lists each claim, the check that would fail if the claim stopped being true, and what still needs someone outside the project. A check here proves the code behaves as described. It does not prove a card's content is right; people and the unit's card owner are responsible for that (`governance.md`).

## Checked on every change

GitHub Actions runs all of these on every push and pull request (`.github/workflows/ci.yml`). A failure blocks the change.

| Claim | Check |
| --- | --- |
| Nothing in the book is uploaded | A browser session edits a card, confirms it, opens the case view, the share sheet, and earlier versions, exports a backup, and reloads. Every request it makes must be a GET for the app's own files with no body (`e2e/claims.spec.js`). |
| No outside code, fonts, images, or connections | Every browser test fails on any Content Security Policy violation, in all three browser engines (`e2e/fixtures.js`). The production headers are checked on the first response (`e2e/app.spec.js`). |
| It works on iPhone, Android, and other browsers | Every browser test runs on WebKit as an iPhone 14, the engine inside every iPhone browser; on Chromium as a Pixel 7; and on Firefox at phone width (`playwright.config.js`). |
| Every screen meets WCAG 2.2 AA, as far as a scan can tell | An axe-core scan of the home list, an open card, the case view, the editor, Share, Earlier versions, Places, Import, Add surgeon, and Recently deleted, in all three engines (`e2e/claims.spec.js`). An automated scan finds about a third of accessibility problems; the rest need people (`accessibility.md`). |
| Patient details pause a save, share, or import | Unit tests of the pattern check and of every place it runs (`phi.test.js` and the component tests). |
| A unit book cannot be forged or rolled back | Signature, key, and revision tests (`sign.test.js`, `restore.test.js`, `e2e/publishing.spec.js`). |
| A mistake can be undone | Earlier versions and Recently deleted, in unit, component, and browser tests (`history.test.js`, `CardHistorySheet.test.jsx`, `e2e/history.spec.js`). |
| No known vulnerable runtime dependency | `npm audit --omit=dev` fails on a moderate or worse advisory. Dependabot proposes updates weekly. |
| What ships to the phone is listed | A CycloneDX software bill of materials is generated on every run and kept 90 days as the `sbom` artifact. The packages marked `required` are what ship. |
| The code does what its types say | Lint and a TypeScript check with null checks over all of `src`. |

## Needs someone outside the project

These cannot be done by the code or its tests. They are listed in the order a hospital usually asks for them.

1. **Counsel's review** of the privacy notice, the terms, and the open questions, including whether any part of the app is a device software function under FDA's guidance (`counsel-questions.md`).
2. **The hospital's security review.** `security.md` answers the usual questionnaire. A hospital may also ask for an independent penetration test of the hosted site; the app has no server code, so the test covers the static host, the headers, and the files a phone can import.
3. **An accessibility conformance report (VPAT / ACR)** from a reviewer who tests with VoiceOver, TalkBack, Voice Control, and large text on real phones. The open items are in `accessibility.md`.
4. **Real phones.** WebKit on Linux is close to iPhone Safari but is not the same: Home Screen install, storage eviction, the camera, the wake lock, and share sheets need a check on a current iPhone and Android phone before each pilot (`mdm.md`).
5. **Clinical review of the content.** A card owner and a sample of surgeons read the cards a unit publishes before staff rely on them (`governance.md`).
6. **A pilot with measures**, run by the unit, with a sponsor who can stop it (`pilot.md`).
7. **Insurance and a named operator.** Who operates the app, who answers [contact email], and what cover applies, settled with counsel (`terms.md`).
