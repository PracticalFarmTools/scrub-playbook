/**
 * Verified public product pages only.
 * checkedAt is the day the address was confirmed.
 * linkKind "none" means there is no stored product page; the company page is the fallback.
 * catalog-code links are built only when a card stores a code and the template was verified.
 */
export const LINK_CHECKED_AT = '2026-10-05';

export const PRODUCTS = [
  // Mölnlycke — pages that returned HTTP 200
  { id: 'g1', kind: 'glove', vendor: 'Mölnlycke', name: 'Biogel Eclipse', linkKind: 'product-page', url: 'https://www.molnlycke.com/en-us/products/gloves/surgical-gloves/biogel-natural-rubber-gloves/biogel-eclipse/', checkedAt: LINK_CHECKED_AT },
  { id: 'g3', kind: 'glove', vendor: 'Mölnlycke', name: 'Biogel Skinsense', linkKind: 'product-page', url: 'https://www.molnlycke.com/en-us/products/gloves/surgical-gloves/biogel-synthetic-gloves/biogel-skinsense/', checkedAt: LINK_CHECKED_AT },
  { id: 'g4', kind: 'glove', vendor: 'Mölnlycke', name: 'Biogel Surgeons', linkKind: 'product-page', url: 'https://www.molnlycke.com/en-us/products/gloves/surgical-gloves/biogel-natural-rubber-gloves/biogel-surgeons/', checkedAt: LINK_CHECKED_AT },
  { id: 'g6', kind: 'glove', vendor: 'Mölnlycke', name: 'Biogel PI UltraTouch', linkKind: 'product-page', url: 'https://www.molnlycke.com/en-us/products/gloves/surgical-gloves/biogel-synthetic-gloves/biogel-pi-ultratouch/', checkedAt: LINK_CHECKED_AT },
  { id: 'g2', kind: 'glove', vendor: 'Mölnlycke', name: 'Biogel Micro', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'g5', kind: 'glove', vendor: 'Mölnlycke', name: 'Biogel PI Ortho', linkKind: 'none', checkedAt: LINK_CHECKED_AT },

  // Cardinal — Protexis PI page confirmed from the manufacturer's published product page
  { id: 'g7', kind: 'glove', vendor: 'Cardinal Health', name: 'Protexis PI', linkKind: 'product-page', url: 'https://www.cardinalhealth.com/en/product-solutions/medical/gloves/surgical-gloves/non-latex-surgical-gloves/protexis-pi-surgical-gloves.html', checkedAt: LINK_CHECKED_AT },
  { id: 'g8', kind: 'glove', vendor: 'Cardinal Health', name: 'Protexis PI Micro', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'g9', kind: 'glove', vendor: 'Cardinal Health', name: 'Protexis PI Classic', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'g10', kind: 'glove', vendor: 'Cardinal Health', name: 'Protexis Latex', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'g11', kind: 'glove', vendor: 'Cardinal Health', name: 'Protexis PI Ortho', linkKind: 'none', checkedAt: LINK_CHECKED_AT },

  // Ansell — Non-Latex PI page confirmed. Sibling models are not guessed.
  { id: 'g14', kind: 'glove', vendor: 'Ansell', name: 'Gammex Non-Latex PI', linkKind: 'product-page', url: 'https://www.ansell.com/us/en/products/gammex-non-latex-pi', checkedAt: LINK_CHECKED_AT },
  { id: 'g12', kind: 'glove', vendor: 'Ansell', name: 'Gammex PI', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'g13', kind: 'glove', vendor: 'Ansell', name: 'Gammex PI Ortho', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'g15', kind: 'glove', vendor: 'Ansell', name: 'Encore Latex', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'g16', kind: 'glove', vendor: 'Ansell', name: 'Gammex PI Micro', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'g20', kind: 'glove', vendor: 'Ansell', name: 'Radiation Attenuation Gloves', linkKind: 'none', checkedAt: LINK_CHECKED_AT },

  { id: 'g17', kind: 'glove', vendor: 'Medline', name: 'Signature Latex', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'g18', kind: 'glove', vendor: 'Medline', name: 'SensiCare PI', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'g19', kind: 'glove', vendor: 'Medline', name: 'SensiCare PI Ortho', linkKind: 'none', checkedAt: LINK_CHECKED_AT },

  // Ethicon family pages confirmed by the manufacturer's product titles.
  // Catalog links use the verified /na/epc/code/{code} pattern only when a code is stored.
  { id: 'suture-vicryl-plus', kind: 'suture', sutureName: 'Vicryl Plus', vendor: 'Ethicon (J&J)', name: 'Vicryl Plus', linkKind: 'product-page', url: 'https://www.jnjmedtech.com/en-US/product/coated-vicryl-polyglactin-910-suture', urlTemplate: 'https://www.ethicon.com/na/epc/code/{code}', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-monocryl-plus', kind: 'suture', sutureName: 'Monocryl Plus', vendor: 'Ethicon (J&J)', name: 'Monocryl Plus', linkKind: 'product-page', url: 'https://www.jnjmedtech.com/en-US/product/monocryl-poliglecaprone-25-suture', urlTemplate: 'https://www.ethicon.com/na/epc/code/{code}', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-ethilon', kind: 'suture', sutureName: 'Nylon/Ethilon', vendor: 'Ethicon (J&J)', name: 'Ethilon', linkKind: 'product-page', url: 'https://www.jnjmedtech.com/en-US/product/ethilon-nylon-suture', urlTemplate: 'https://www.ethicon.com/na/epc/code/{code}', checkedAt: LINK_CHECKED_AT },

  { id: 'suture-vicryl', kind: 'suture', sutureName: 'Vicryl', vendor: 'Ethicon (J&J)', name: 'Vicryl', linkKind: 'catalog-code', urlTemplate: 'https://www.ethicon.com/na/epc/code/{code}', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-vicryl-rapide', kind: 'suture', sutureName: 'Vicryl Rapide', vendor: 'Ethicon (J&J)', name: 'Vicryl Rapide', linkKind: 'catalog-code', urlTemplate: 'https://www.ethicon.com/na/epc/code/{code}', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-monocryl', kind: 'suture', sutureName: 'Monocryl', vendor: 'Ethicon (J&J)', name: 'Monocryl', linkKind: 'catalog-code', urlTemplate: 'https://www.ethicon.com/na/epc/code/{code}', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-pds', kind: 'suture', sutureName: 'PDS II', vendor: 'Ethicon (J&J)', name: 'PDS II', linkKind: 'catalog-code', urlTemplate: 'https://www.ethicon.com/na/epc/code/{code}', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-pds-plus', kind: 'suture', sutureName: 'PDS Plus', vendor: 'Ethicon (J&J)', name: 'PDS Plus', linkKind: 'catalog-code', urlTemplate: 'https://www.ethicon.com/na/epc/code/{code}', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-prolene', kind: 'suture', sutureName: 'Prolene', vendor: 'Ethicon (J&J)', name: 'Prolene', linkKind: 'catalog-code', urlTemplate: 'https://www.ethicon.com/na/epc/code/{code}', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-nurolon', kind: 'suture', sutureName: 'Nurolon', vendor: 'Ethicon (J&J)', name: 'Nurolon', linkKind: 'catalog-code', urlTemplate: 'https://www.ethicon.com/na/epc/code/{code}', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-ethibond', kind: 'suture', sutureName: 'Ethibond', vendor: 'Ethicon (J&J)', name: 'Ethibond', linkKind: 'catalog-code', urlTemplate: 'https://www.ethicon.com/na/epc/code/{code}', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-stratafix', kind: 'suture', sutureName: 'Stratafix', vendor: 'Ethicon (J&J)', name: 'Stratafix', linkKind: 'catalog-code', urlTemplate: 'https://www.ethicon.com/na/epc/code/{code}', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-silk', kind: 'suture', sutureName: 'Silk', vendor: 'Ethicon (J&J)', name: 'Silk', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-gut-chromic', kind: 'suture', sutureName: 'Chromic Gut', vendor: 'Ethicon (J&J)', name: 'Chromic Gut', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-gut-plain', kind: 'suture', sutureName: 'Plain Gut', vendor: 'Ethicon (J&J)', name: 'Plain Gut', linkKind: 'none', checkedAt: LINK_CHECKED_AT },

  { id: 'suture-vloc', kind: 'suture', sutureName: 'V-Loc', vendor: 'Medtronic', name: 'V-Loc', linkKind: 'product-page', url: 'https://www.medtronic.com/us-en/healthcare-professionals/products/wound-closure/v-loc-wound-closure-device.html', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-polysorb', kind: 'suture', sutureName: 'Polysorb', vendor: 'Medtronic', name: 'Polysorb', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-caprosyn', kind: 'suture', sutureName: 'Caprosyn', vendor: 'Medtronic', name: 'Caprosyn', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-maxon', kind: 'suture', sutureName: 'Maxon', vendor: 'Medtronic', name: 'Maxon', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-biosyn', kind: 'suture', sutureName: 'Biosyn', vendor: 'Medtronic', name: 'Biosyn', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-surgipro', kind: 'suture', sutureName: 'Surgipro', vendor: 'Medtronic', name: 'Surgipro', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-ticron', kind: 'suture', sutureName: 'Ti-Cron', vendor: 'Medtronic', name: 'Ti-Cron', linkKind: 'none', checkedAt: LINK_CHECKED_AT },

  { id: 'suture-fiberwire', kind: 'suture', sutureName: 'FiberWire', vendor: 'Arthrex', name: 'FiberWire', linkKind: 'catalog-code', urlTemplate: 'https://www.arthrex.com/products/{code}', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-quill', kind: 'suture', sutureName: 'Quill', vendor: 'Surgical Specialties', name: 'Quill', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-gore', kind: 'suture', sutureName: 'Gore-Tex (CV)', vendor: 'Gore Medical', name: 'Gore-Tex', linkKind: 'none', checkedAt: LINK_CHECKED_AT },
  { id: 'suture-steel', kind: 'suture', sutureName: 'Stainless Steel', vendor: 'Ethicon (J&J)', name: 'Stainless Steel', linkKind: 'none', checkedAt: LINK_CHECKED_AT },

  { id: 'imp-attune', kind: 'implant', vendor: 'DePuy Synthes (J&J)', name: 'ATTUNE Knee System', linkKind: 'product-page', url: 'https://www.jnjmedtech.com/en-US/product/attune-knee-system', checkedAt: LINK_CHECKED_AT },
  { id: 'imp-davinci', kind: 'implant', vendor: 'Intuitive Surgical', name: 'da Vinci', linkKind: 'product-page', url: 'https://www.intuitive.com/en-us/products-and-services/da-vinci', checkedAt: LINK_CHECKED_AT },
];

const byId = new Map(PRODUCTS.map(p => [p.id, p]));
const sutureByName = new Map(PRODUCTS.filter(p => p.sutureName).map(p => [p.sutureName, p]));

export function getProduct(id) {
  return id ? byId.get(id) || null : null;
}

export function productIdForSuture(name) {
  return sutureByName.get(name)?.id || null;
}

export function productsByKind(kind) {
  return PRODUCTS.filter(p => p.kind === kind);
}
