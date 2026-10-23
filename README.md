# Scrub Playbook

Staff notes for how a case actually runs. A surgeon has procedures. A procedure has the setup, the case flow, the instruments, the trays, the sutures, and the nicknames. The hospital’s official preference card still wins.

## Personal book

```bash
npm install
npm run dev
```

Notes stay in this browser. Nothing is uploaded. The app asks the browser to keep its storage, and the header reminds you to export a JSON backup. Sample cards are opt-in, are labeled as samples everywhere they appear, and are left out of backups and sharing. An imported card arrives unconfirmed.

Each surgeon can carry three first-case lines for someone who has never worked with them. Every procedure opens in a case view: large type, a dark mode, a print layout, a pull checklist for gloves, instruments, trays, sutures, and implants, and a request to keep the screen on.

A product name links to that product’s page on the company’s site when the address has been checked. Otherwise the app offers the company page, and it does not pretend the company page is the product. Manufacturer documents are not copied into the app.

Anything that looks like a patient detail, a lot number, or a serial number pauses the save, the share, the import, and the suggestion. The pause is a check, not a promise that nothing slips through.

## The board

Today and Tomorrow hold the lines from the board: time, room, surgeon, procedure. A tap opens the matching card in the case view, or starts the surgeon or procedure that is missing. The board stays on this phone and is not part of a backup.

## Sharing a case

There is no account and no server. Share sends the procedure the way it reads on the card. The other phone shows that glance before saving it, and the copy arrives unconfirmed. A short card can also include a code. A JSON backup from the header is the way to keep the whole book. See `docs/pilot.md`.

From the case view, Suggest a card change writes a short note for the owner of the official card: what the card says, what you saw in the room, and the change you suggest. The surgeon and the card owner decide.

## Places

Places groups surgeons by facility. For each place you can:

- Hand off the notes to the next tech as one file.
- Publish the place as a unit book. Each publish is a new revision. Staff who import it get the unit’s version, keep their match on any card that did not change, and see how many cards were added, changed, or removed. Unit surgeons are read-only on staff phones. Copy to my notes makes one editable copy under the same surgeon.
- Archive a place you have left, restore it, or delete it. Each action covers only the active or the archived group you chose.

A staff phone that already holds a surgeon from a hand-off is asked before the unit book takes that surgeon over. A publisher who imports their own file is told it is already theirs.

## Scripts

```bash
npm test
npm run check:links
npm run lint
npm run build
```

`npm test` runs the data tests in Node and the component tests in jsdom. `check:links` requests each stored product page and fails on a 404.
