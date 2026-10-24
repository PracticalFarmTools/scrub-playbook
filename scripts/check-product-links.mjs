import { PRODUCTS } from '../src/data/products.js';
import { LINK_FRESH_DAYS } from '../src/data/schema.js';

const TIMEOUT_MS = 15000;
const PARALLEL = 6;
const pages = PRODUCTS.filter(product => product.linkKind === 'product-page' && product.url);
const missing = [];
const unreachable = [];

async function check(product) {
  try {
    const response = await fetch(product.url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'ScrubPlaybook link check' },
    });
    if (response.status === 404 || response.status === 410) {
      missing.push(product);
      console.error(`${response.status} ${product.name} ${product.url}`);
    } else {
      console.log(`${response.status} ${product.name}`);
    }
    await response.body?.cancel();
  } catch (error) {
    unreachable.push(product);
    console.warn(`unreachable ${product.name}: ${error.message}`);
  }
}

let next = 0;
await Promise.all(Array.from({ length: Math.min(PARALLEL, pages.length) }, async () => {
  while (next < pages.length) await check(pages[next++]);
}));

console.log(`\n${pages.length} product pages: ${missing.length} gone, ${unreachable.length} unreachable.`);

// The app stops offering a product page LINK_FRESH_DAYS after checkedAt and falls back to the company page.
const WARN_DAYS = 30;
const oldest = pages.map(product => product.checkedAt).filter(Boolean).sort()[0];
let expiring = false;
if (oldest) {
  const lapses = new Date(Date.parse(oldest) + LINK_FRESH_DAYS * 86400000);
  const left = Math.floor((lapses.getTime() - Date.now()) / 86400000);
  console.log(`Oldest check ${oldest}; product links fall back to company pages on ${lapses.toISOString().slice(0, 10)} (${left} days).`);
  if (left <= WARN_DAYS) {
    expiring = true;
    console.error('Re-check the product pages, then update checkedAt in src/data/products.js. See docs/catalog-upkeep.md.');
  }
}

// A page that is gone means a stored link is wrong; a page that timed out or blocked the checker is only reported.
if (missing.length > 0 || expiring) process.exit(1);
