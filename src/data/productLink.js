import { findCompany, getCompany } from './companies';
import { getProduct } from './products';
import { LINK_FRESH_DAYS } from './schema';
import { daysSince } from './trust';

/** @returns {url is string} */
function isHttps(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url.trim());
}

/** @returns {code is string} */
export function isCatalogCode(code) {
  return typeof code === 'string' && /^[A-Za-z0-9][A-Za-z0-9-]{1,40}$/.test(code.trim());
}

/**
 * Exact company name or exact alias. A fragment such as "S" or "PI" matches nothing.
 * @param {string} [name]
 */
export function findVendor(name) {
  const company = findCompany(name);
  if (!company) return null;
  return { name: company.name, url: company.url, blurb: company.blurb };
}

/**
 * Separate doors, so a company instructions page is never the product page.
 * A hospital link and a catalog code can sit beside a product page.
 * @param {{ productId?: string, catalogNumber?: string, overrideUrl?: string, vendorName?: string, companyId?: string, now?: number }} [link]
 */
export function linkDoors({ productId, catalogNumber, overrideUrl, vendorName, companyId, now = Date.now() } = {}) {
  const product = getProduct(productId);
  const company = (companyId && getCompany(companyId)) || findCompany(vendorName || product?.vendor);
  return {
    hospital: isHttps(overrideUrl) ? { href: overrideUrl.trim(), label: 'Hospital item' } : null,
    product: product?.linkKind === 'product-page' && isHttps(product.url) && daysSince(product.checkedAt, now) <= LINK_FRESH_DAYS
      ? { href: product.url, label: product.name }
      : null,
    catalog: product?.urlTemplate && isCatalogCode(catalogNumber)
      ? { href: product.urlTemplate.replace('{code}', encodeURIComponent(catalogNumber.trim())), label: 'This catalog code' }
      : null,
    instructions: company?.url && isHttps(company.url)
      ? { href: company.url, label: `${company.name} instructions` }
      : null,
  };
}

/**
 * The single best link, for a glove or suture name.
 * Order: hospital address, catalog code, fresh product page, then instructions.
 * The instructions result uses kind "company" so callers can keep it off the product name.
 * @param {{ productId?: string, catalogNumber?: string, overrideUrl?: string, vendorName?: string, now?: number }} [link]
 */
export function resolveProductLink({ productId, catalogNumber, overrideUrl, vendorName, now = Date.now() } = {}) {
  const doors = linkDoors({ productId, catalogNumber, overrideUrl, vendorName, now });
  if (doors.hospital) return { href: doors.hospital.href, kind: 'hospital', label: 'Hospital link' };
  if (doors.catalog) {
    const product = getProduct(productId);
    return { href: doors.catalog.href, kind: 'catalog-code', label: product?.name || 'Catalog code' };
  }
  if (doors.product) return { href: doors.product.href, kind: 'product-page', label: doors.product.label };
  if (doors.instructions) return { href: doors.instructions.href, kind: 'company', label: doors.instructions.label };
  return null;
}
