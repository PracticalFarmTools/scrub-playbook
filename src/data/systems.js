import { COMPANIES, getCompany } from './companies';
import { linkDoors } from './productLink';
import { uid } from './schema';

/**
 * Named systems a room actually sets up. Add a row to grow the list.
 * Set productId only when products.js already has a page someone opened
 * and checked. A system with no productId still offers its company
 * instructions, labeled as instructions.
 *
 * Cards store the name as well as the catalog id, so a later rename or a
 * removed row cannot blank a card. A hospital can also name a system that
 * is not in this list yet: leave catalogId empty and keep the typed name.
 *
 * SYSTEMS_MAX is the room-scale cap for one surgeon and for one card.
 * Raise that constant when a unit needs more. The picker, the share, and
 * the case view already render the list they are given.
 *
 * @typedef {object} CatalogSystem
 * @property {string} id
 * @property {string} name
 * @property {Array<string>} aliases
 * @property {string} companyId
 * @property {string} specialty
 * @property {'implant' | 'robotics' | 'phaco' | 'energy' | 'power' | 'sports' | 'spine' | 'microscope'} kind
 * @property {string} [productId]
 *
 * @typedef {object} SystemUse A system on a surgeon or on one card.
 * @property {string} id
 * @property {string | null} catalogId
 * @property {string} name
 * @property {string | null} companyId
 * @property {string} catalogNumber
 * @property {string} overrideUrl Hospital item address. https only.
 * @property {boolean} repExpected
 */

/** How many systems one surgeon or one card keeps. */
export const SYSTEMS_MAX = 12;

/** @type {Array<CatalogSystem>} */
export const SYSTEMS = [
  { id: 'sys-attune', name: 'ATTUNE Knee System', aliases: ['ATTUNE', 'Attune'], companyId: 'depuy-synthes-j-and-j', specialty: 'ortho', kind: 'implant', productId: 'imp-attune' },
  { id: 'sys-sigma', name: 'SIGMA Knee System', aliases: ['SIGMA'], companyId: 'depuy-synthes-j-and-j', specialty: 'ortho', kind: 'implant' },
  { id: 'sys-triathlon', name: 'Triathlon Knee System', aliases: ['Triathlon'], companyId: 'stryker', specialty: 'ortho', kind: 'implant' },
  { id: 'sys-persona', name: 'Persona Knee System', aliases: ['Persona'], companyId: 'zimmer-biomet', specialty: 'ortho', kind: 'implant' },
  { id: 'sys-vanguard', name: 'Vanguard Knee System', aliases: ['Vanguard'], companyId: 'zimmer-biomet', specialty: 'ortho', kind: 'implant' },
  { id: 'sys-journey', name: 'Journey II Knee System', aliases: ['Journey', 'Journey II'], companyId: 'smith-and-nephew', specialty: 'ortho', kind: 'implant' },
  { id: 'sys-corail', name: 'Corail Hip System', aliases: ['Corail'], companyId: 'depuy-synthes-j-and-j', specialty: 'ortho', kind: 'implant' },
  { id: 'sys-accolade', name: 'Accolade II Hip System', aliases: ['Accolade'], companyId: 'stryker', specialty: 'ortho', kind: 'implant' },
  { id: 'sys-taperloc', name: 'Taperloc Hip System', aliases: ['Taperloc'], companyId: 'zimmer-biomet', specialty: 'ortho', kind: 'implant' },
  { id: 'sys-polarstem', name: 'Polarstem Hip System', aliases: ['Polarstem'], companyId: 'smith-and-nephew', specialty: 'ortho', kind: 'implant' },
  { id: 'sys-mako', name: 'Mako', aliases: ['Mako SmartRobotics'], companyId: 'stryker', specialty: 'ortho', kind: 'robotics' },
  { id: 'sys-rosa', name: 'ROSA Knee', aliases: ['ROSA'], companyId: 'zimmer-biomet', specialty: 'ortho', kind: 'robotics' },
  { id: 'sys-velys', name: 'VELYS Robotic-Assisted Solution', aliases: ['VELYS'], companyId: 'depuy-synthes-j-and-j', specialty: 'ortho', kind: 'robotics' },
  { id: 'sys-davinci', name: 'da Vinci', aliases: ['da Vinci Xi', 'da Vinci X'], companyId: 'intuitive-surgical', specialty: 'robotics', kind: 'robotics', productId: 'imp-davinci' },
  { id: 'sys-excelsius', name: 'ExcelsiusGPS', aliases: ['Excelsius'], companyId: 'globus-medical', specialty: 'spine', kind: 'robotics' },
  { id: 'sys-xlif', name: 'XLIF', aliases: ['Extreme Lateral Interbody Fusion'], companyId: 'nuvasive', specialty: 'spine', kind: 'spine' },
  { id: 'sys-centurion', name: 'Centurion Vision System', aliases: ['Centurion'], companyId: 'alcon', specialty: 'eye', kind: 'phaco' },
  { id: 'sys-lumera', name: 'OPMI Lumera', aliases: ['Lumera'], companyId: 'carl-zeiss-meditec', specialty: 'eye', kind: 'microscope' },
  { id: 'sys-harmonic', name: 'Harmonic', aliases: ['Harmonic ACE'], companyId: 'ethicon-j-and-j', specialty: 'general', kind: 'energy' },
  { id: 'sys-ligasure', name: 'LigaSure', aliases: ['Ligasure'], companyId: 'medtronic', specialty: 'general', kind: 'energy' },
  { id: 'sys-thunderbeat', name: 'THUNDERBEAT', aliases: ['Thunderbeat'], companyId: 'olympus', specialty: 'general', kind: 'energy' },
  { id: 'sys-system-8', name: 'System 8', aliases: ['Stryker System 8'], companyId: 'stryker', specialty: 'ortho', kind: 'power' },
  { id: 'sys-formula', name: 'Formula Shaver', aliases: ['Formula'], companyId: 'stryker', specialty: 'sports', kind: 'sports' },
  { id: 'sys-werewolf', name: 'Werewolf Coblation', aliases: ['Werewolf'], companyId: 'smith-and-nephew', specialty: 'sports', kind: 'energy' },
  { id: 'sys-tightrope', name: 'TightRope', aliases: [], companyId: 'arthrex', specialty: 'sports', kind: 'sports' },
  { id: 'sys-swivelock', name: 'SwiveLock', aliases: [], companyId: 'arthrex', specialty: 'sports', kind: 'sports' },
];

const byId = new Map(SYSTEMS.map(system => [system.id, system]));

export function getSystem(id) {
  return id ? byId.get(id) || null : null;
}

/** Exact catalog name or alias. A fragment such as "knee" matches nothing. */
export function findSystemByName(name) {
  const q = fold(name);
  if (!q) return null;
  return SYSTEMS.find(system => fold(system.name) === q || system.aliases.some(alias => fold(alias) === q)) || null;
}

export function sameSystemName(a, b) {
  const left = fold(a);
  return Boolean(left) && left === fold(b);
}

function fold(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isHttps(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url.trim());
}

/**
 * Home search. Three characters, names and aliases only, so one letter
 * cannot list the directory. Company blurbs are not searched.
 * @param {string} query
 * @param {{ limit?: number }} [options]
 */
export function searchCatalog(query, { limit = 8 } = {}) {
  const q = fold(query);
  if (q.length < 3) return { systems: [], companies: [] };
  const systems = SYSTEMS.filter(system => {
    const company = getCompany(system.companyId);
    return fold(system.name).includes(q)
      || system.aliases.some(alias => fold(alias).includes(q))
      || (company && (fold(company.name).includes(q) || company.aliases.some(alias => fold(alias).includes(q))));
  }).slice(0, limit);
  const companies = COMPANIES.filter(company => (
    fold(company.name).includes(q) || company.aliases.some(alias => fold(alias).includes(q))
  )).slice(0, limit);
  return { systems, companies };
}

/**
 * @param {Array<Partial<SystemUse>>} [list]
 * @returns {Array<SystemUse>}
 */
export function cleanSystemUses(list = []) {
  const kept = [];
  for (const item of list || []) {
    const catalog = getSystem(item?.catalogId);
    const name = String(item?.name || catalog?.name || '').trim().slice(0, 80);
    if (!name) continue;
    const company = getCompany(item?.companyId) || (catalog ? getCompany(catalog.companyId) : null);
    const override = String(item?.overrideUrl || '').trim();
    kept.push({
      id: item?.id || uid(),
      catalogId: catalog?.id || null,
      name,
      companyId: company?.id || null,
      catalogNumber: String(item?.catalogNumber || '').trim().slice(0, 40),
      overrideUrl: isHttps(override) ? override.slice(0, 300) : '',
      repExpected: Boolean(item?.repExpected),
    });
    if (kept.length >= SYSTEMS_MAX) break;
  }
  return kept;
}

/**
 * The card's systems after the same rules as a save: twelve, https hospital
 * links, and a tray only points at a system that is still on the card.
 * @param {{ systems?: Array<object>, trays?: Array<object> }} [blocks]
 */
export function blocksWithCleanSystems(blocks = {}) {
  const systems = cleanSystemUses(blocks.systems);
  const ids = new Set(systems.map(item => item.id));
  return {
    ...blocks,
    systems,
    trays: (blocks.trays || []).map(tray => {
      if (!tray?.systemId || ids.has(tray.systemId)) return tray;
      const copy = { ...tray };
      delete copy.systemId;
      return copy;
    }),
  };
}

/** Doors for a system stored on a surgeon or a card. */
export function doorsFor(use, now = Date.now()) {
  const catalog = getSystem(use?.catalogId);
  return linkDoors({
    productId: catalog?.productId,
    catalogNumber: use?.catalogNumber,
    overrideUrl: use?.overrideUrl,
    companyId: use?.companyId || catalog?.companyId,
    now,
  });
}

/**
 * The card's own systems, then surgeon systems that are not already on the card.
 * @param {{ preferredSystems?: Array<object> } | null | undefined} surgeon
 * @param {{ systems?: Array<object> } | null | undefined} blocks
 */
export function systemsForCase(surgeon, blocks) {
  const onCard = cleanSystemUses(blocks?.systems);
  const seenId = new Set(onCard.map(item => item.catalogId).filter(Boolean));
  const seenName = new Set(onCard.map(item => fold(item.name)));
  const fromSurgeon = cleanSystemUses(surgeon?.preferredSystems).filter(item => (
    !(item.catalogId && seenId.has(item.catalogId)) && !seenName.has(fold(item.name))
  ));
  return { onCard, fromSurgeon };
}

/** Plain-text line for a shared message, with the real addresses a tap can open. */
export function systemShareLine(use) {
  const company = getCompany(use?.companyId);
  const doors = doorsFor(use);
  const head = [use?.name, company?.name, use?.repExpected ? 'Rep expected' : ''].filter(Boolean).join(' · ');
  const links = [
    doors.product && `Product page: ${doors.product.href}`,
    doors.catalog && `Catalog code: ${doors.catalog.href}`,
    !doors.catalog && use?.catalogNumber && `Catalog code: ${use.catalogNumber}`,
    doors.hospital && `Hospital item: ${doors.hospital.href}`,
    doors.instructions && `Instructions: ${doors.instructions.href}`,
  ].filter(Boolean);
  return [head, ...links].join('\n');
}
