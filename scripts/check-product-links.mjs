import { PRODUCTS } from '../src/data/products.js';

const pages = PRODUCTS.filter(product => product.linkKind === 'product-page' && product.url);
let missing = 0;

for (const product of pages) {
  try {
    const response = await fetch(product.url, { method: 'GET', redirect: 'follow' });
    if (response.status === 404) {
      missing += 1;
      console.error(`404 ${product.name} ${product.url}`);
    } else {
      console.log(`${response.status} ${product.name}`);
    }
  } catch (error) {
    console.warn(`unreachable ${product.name}: ${error.message}`);
  }
}

if (missing > 0) process.exit(1);
