# Scrub Playbook

Staff notes for how a case actually runs. A surgeon has procedures. A procedure has the setup, the trays, the sutures, and the nicknames. The hospital’s official preference card still wins.

## Personal book

```bash
npm install
npm run dev
```

Notes stay in this browser. Nothing is uploaded. Sample cards are opt-in and are left out of backups and sharing. Export a JSON backup from the header; an imported card arrives unconfirmed.

A product name links to that product’s page on the company’s site when the address has been checked. Otherwise the app offers the company page, and it does not pretend the company page is the product. Manufacturer documents are not copied into the app.

## Sharing a case

There is no account and no server. A card moves when you share it: a QR code when the text is short, or a copied file when it is not. The other person’s copy arrives unconfirmed. A JSON backup from the header is the way to keep the whole book. See `docs/pilot.md`.

## Scripts

```bash
npm test
npm run check:links
npm run lint
```

`check:links` requests each stored product page and fails on a 404.
