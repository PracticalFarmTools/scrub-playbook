# Scrub Playbook

Staff notes for how a case actually runs. A surgeon has procedures. A procedure has the setup, the trays, the sutures, and the nicknames. The hospital’s official preference card still wins.

## Personal book

```bash
npm install
npm run dev
```

Notes stay in this browser. Nothing is uploaded. Sample cards are opt-in and are left out of backups and sharing. Export a JSON backup from the header; an imported card arrives unconfirmed.

A product name links to that product’s page on the company’s site when the address has been checked. Otherwise the app offers the company page, and it does not pretend the company page is the product. Manufacturer documents are not copied into the app.

## Facility book

Facility mode is a separate tenant. It needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, the schema in `supabase/schema.sql`, and a business associate agreement on that project. See `docs/pilot.md`.

Access is a signed-in membership. A one-time invite token is not a standing password. Row access is enforced in the database. The anon key alone cannot read cards. Travelers expire. An educator can export the book and can close the facility.

Personal notes are never uploaded into the facility book.

## Scripts

```bash
npm test
npm run check:links
npm run lint
```

`check:links` requests each stored product page and fails on a 404.
