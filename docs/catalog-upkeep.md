# Catalog upkeep

The app ships a small list of gloves, sutures, and implants (`src/data/products.js`) and a list of companies (`src/data/vendors.js`). A product name can link to the company's own page for that product. The app never stores the company's documents, instructions for use, or technique guides; it only links to them.

## Fields

Each product in `products.js` has:

| Field | Meaning |
| --- | --- |
| `id` | Stable id. Cards refer to it, so never reuse or renumber one. |
| `kind` | `glove`, `suture`, or `implant` |
| `vendor` | The company, matching a name in `vendors.js` |
| `name` | The product name as it appears on the package |
| `linkKind` | `product-page`, `catalog-code`, or `none` |
| `url` | For `product-page`: the company's page for this product, over HTTPS |
| `urlTemplate` | For `catalog-code`: an address with `{code}` where a card's catalog number goes |
| `checkedAt` | The day someone confirmed the address. Most entries use `LINK_CHECKED_AT`. |

## How a link is chosen

`resolveProductLink` in `src/data/productLink.js`, in this order:

1. A hospital link the card stores, if it starts with `https://`.
2. A `catalog-code` template, only when the card stores a catalog number.
3. A `product-page` address, only while `checkedAt` is less than `LINK_FRESH_DAYS` (180, in `src/data/schema.js`) old.
4. The company instructions page from `vendors.js`, labeled as instructions, never as the product.

So an address nobody has re-checked in 180 days quietly falls back to the company page instead of pointing at a page that may have moved.

## The weekly check

CI runs `npm run check:links` every Monday at 11:00 UTC and on demand (`.github/workflows/ci.yml`, job "Company product pages"). It requests every `product-page` address with a 15-second timeout and fails when:

- a page answers 404 or 410, or
- the oldest `checkedAt` is within 30 days of falling back to the company page.

A page that times out or blocks the checker is reported but does not fail the job, because some company sites refuse automated requests.

## When the check fails

**A page is gone.** Find the product's current page on the company's site. If there is one, update `url`. If not, set `linkKind: 'none'` and remove `url`; the app then shows the company page.

**Links are about to lapse.** Open each `product-page` address in a browser and check that it is still the page for that product. Fix any that moved, then set `LINK_CHECKED_AT` to today. If you checked only some, give those entries their own `checkedAt`.

**A catalog template.** Try it with one real catalog number from a package. Update `checkedAt` once it works.

Then run `npm test` and `npm run check:links`, and open a pull request.

## Adding a product

- Use the company's own product page only. No distributor pages, search results, or copied PDFs.
- Give it a new `id`, set `checkedAt` to the day you checked it, and add it to the right group in the file.
- If there is no product page, add it with `linkKind: 'none'`.
- Run `npm test` and `npm run check:links`.

## Companies

`vendors.js` lists each company's name, a short description, and its public page, often its instructions-for-use portal. `companies.js` gives each one a stable id, exact aliases, and a specialty for the directory. The weekly check does not cover these pages. Review them once a year.

An alias has to be the whole other name. "Ethicon" is an alias of Ethicon. "S" and "PI" are not aliases of anything, so a short search cannot attach the wrong company.

A company can exist with an empty `url`. The directory then says no page is stored. Add a url only after opening that page.

## Systems

`systems.js` is the list of systems a room sets up: a knee system, a robot, a phaco machine, an energy device. Each row has a stable `id`, the company id, aliases, and, only when `products.js` already has a checked page, a `productId`.

A surgeon stores up to 12 of these (`preferredSystems`). A card stores up to 12 for that case (`blocks.systems`), and a tray can point at one of them. The case view shows the card's systems, then any surgeon system the card does not already list. The Systems and companies panel browses companies by specialty, and its search also opens a matching system. Each one can open three different doors:

- **Product page**, when `productId` points at a fresh `product-page`.
- **This catalog code**, when the card stored a code and the product has a template. The code still shows as text, and travels in a shared message, when no template is stored yet.
- **Hospital item**, when the card stored an `https://` address.
- **Company instructions**, the company's own page, labeled with the word instructions.

A typed name with no catalog id is kept. That is how a hospital names a system before it is in `systems.js`. Raise `SYSTEMS_MAX` when a unit needs more than 12 on one surgeon or one card. The screens already render the list they are given.

To add a system: add a row with a new id and a `companyId` from `companies.js`. Set `productId` only after you have opened that product's page and added it to `products.js` with `checkedAt` set to that day. Run `npm test` and `npm run check:links`.
