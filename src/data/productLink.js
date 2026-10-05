import { SURGICAL_VENDORS } from './vendors';
import { getProduct } from './products';
import { LINK_FRESH_DAYS } from './schema';
import { daysSince } from './trust';

function isHttps(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url.trim());
}

function isCatalogCode(code) {
  return typeof code === 'string' && /^[A-Za-z0-9][A-Za-z0-9-]{1,40}$/.test(code.trim());
}

function fold(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function findVendor(name) {
  if (!name) return null;
  const q = fold(name);
  return SURGICAL_VENDORS.find(v => fold(v.name) === q)
    || SURGICAL_VENDORS.find(v => fold(v.name).includes(q) || q.includes(fold(v.name)))
    || null;
}

/**
 * Product-page and hospital links may replace the product name.
 * A company page or a search is never presented as the product page.
 * Catalog links exist only when the card stored a code.
 */
export function resolveProductLink({ productId, catalogNumber, overrideUrl, vendorName, now = Date.now() } = {}) {
  if (isHttps(overrideUrl)) {
    return { href: overrideUrl.trim(), kind: 'hospital', label: 'Hospital link' };
  }

  const product = getProduct(productId);
  const vendor = findVendor(vendorName || product?.vendor);

  if (product?.urlTemplate && isCatalogCode(catalogNumber)) {
    return {
      href: product.urlTemplate.replace('{code}', encodeURIComponent(catalogNumber.trim())),
      kind: 'catalog-code',
      label: product.name,
    };
  }

  if (product?.linkKind === 'product-page' && isHttps(product.url) && daysSince(product.checkedAt, now) <= LINK_FRESH_DAYS) {
    return { href: product.url, kind: 'product-page', label: product.name };
  }

  if (vendor?.url && isHttps(vendor.url)) {
    return { href: vendor.url, kind: 'company', label: `${vendor.name} page` };
  }

  return null;
}
