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
4. The company page from `vendors.js`, labeled as the company page, never as the product.

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

`vendors.js` lists each company's name, a short description, and its public page, often its instructions-for-use portal. The weekly check does not cover these. Review them once a year.
