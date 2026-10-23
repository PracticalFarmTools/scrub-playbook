import { PRODUCTS } from '../src/data/products.js';

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
// A page that is gone means a stored link is wrong; a page that timed out or blocked the checker is only reported.
if (missing.length > 0) process.exit(1);
