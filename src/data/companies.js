import { SURGICAL_VENDORS } from './vendors';

/**
 * Companies are a directory, not a product catalog.
 * Add a company by adding a row to vendors.js. Give it an `id` once if the
 * display name might change later; otherwise the id is derived from the name
 * the day the row is added and must not be regenerated.
 * `url` is an instructions or support page. It is never presented as a product.
 * An empty url means the company is real and no page is stored yet.
 *
 * @typedef {object} Company
 * @property {string} id
 * @property {string} name
 * @property {Array<string>} aliases Exact other names. No fragments.
 * @property {string} blurb
 * @property {string} url
 * @property {Array<string>} specialties First entry is the group in the directory.
 */

/** @type {Record<string, { aliases?: Array<string>, specialties: Array<string> }>} */
const META = {
  Stryker: { specialties: ['ortho', 'sports'] },
  'DePuy Synthes (J&J)': { aliases: ['DePuy', 'DePuy Synthes'], specialties: ['ortho'] },
  'Zimmer Biomet': { specialties: ['ortho'] },
  Medtronic: { specialties: ['general', 'spine'] },
  'Smith & Nephew': { aliases: ['Smith Nephew'], specialties: ['ortho', 'sports'] },
  Arthrex: { specialties: ['sports'] },
  'B. Braun': { specialties: ['general'] },
  'Aesculap (B. Braun)': { aliases: ['Aesculap'], specialties: ['sterile'] },
  'Symmetry Surgical': { specialties: ['general'] },
  Alcon: { specialties: ['eye'] },
  'BVI (Beaver-Visitec)': { aliases: ['BVI', 'Beaver-Visitec'], specialties: ['eye'] },
  'Carl Zeiss Meditec': { aliases: ['Zeiss', 'Carl Zeiss'], specialties: ['eye'] },
  'Intuitive Surgical': { aliases: ['Intuitive'], specialties: ['robotics'] },
  'Karl Storz': { specialties: ['general'] },
  Olympus: { specialties: ['general'] },
  'Ethicon (J&J)': { aliases: ['Ethicon'], specialties: ['general'] },
  Teleflex: { specialties: ['general'] },
  'Applied Medical': { specialties: ['general'] },
  ConMed: { specialties: ['general'] },
  'Integra LifeSciences': { aliases: ['Integra'], specialties: ['neuro'] },
  NuVasive: { specialties: ['spine'] },
  'Globus Medical': { aliases: ['Globus'], specialties: ['spine'] },
  'Alphatec Spine': { aliases: ['Alphatec'], specialties: ['spine'] },
  Brainlab: { specialties: ['neuro'] },
  Penumbra: { specialties: ['neuro'] },
  'Edwards Lifesciences': { aliases: ['Edwards'], specialties: ['cardiac'] },
  Abbott: { specialties: ['cardiac'] },
  'Boston Scientific': { specialties: ['cardiac'] },
  'Gore Medical': { aliases: ['Gore'], specialties: ['vascular'] },
  'Getinge / Maquet': { specialties: ['cardiac'] },
  LivaNova: { specialties: ['cardiac'] },
  AtriCure: { specialties: ['cardiac'] },
  'Cook Medical': { aliases: ['Cook'], specialties: ['vascular'] },
  Terumo: { specialties: ['cardiac'] },
  'Merit Medical': { aliases: ['Merit'], specialties: ['vascular'] },
  'BD (Becton Dickinson)': { aliases: ['BD', 'Becton Dickinson'], specialties: ['general'] },
  Medline: { specialties: ['gloves'] },
  'KCI (3M/Solventum)': { aliases: ['KCI', 'Solventum'], specialties: ['general'] },
  Molnlycke: { aliases: ['Mölnlycke'], specialties: ['gloves'] },
  'Cardinal Health': { aliases: ['Cardinal'], specialties: ['gloves'] },
  Baxter: { specialties: ['general'] },
  'Avanos Medical': { aliases: ['Avanos'], specialties: ['general'] },
  DeRoyal: { specialties: ['general'] },
  'Bien-Air': { specialties: ['ent'] },
  Medartis: { specialties: ['ent'] },
  'Stryker CMF': { specialties: ['ent'] },
  'Acclarent (J&J)': { aliases: ['Acclarent'], specialties: ['ent'] },
  'Mentor (J&J)': { aliases: ['Mentor'], specialties: ['general'] },
  Steris: { specialties: ['sterile'] },
  'Getinge (Sterilization)': { specialties: ['sterile'] },
  'Advanced Sterilization (ASP)': { aliases: ['ASP'], specialties: ['sterile'] },
  'Healthmark Industries': { aliases: ['Healthmark'], specialties: ['sterile'] },
  Coloplast: { specialties: ['gyn'] },
  Hologic: { specialties: ['gyn'] },
  CooperSurgical: { specialties: ['gyn'] },
  'Richard Wolf': { specialties: ['gyn'] },
  'Zimmer (Tourniquets)': { specialties: ['equipment'] },
  'Allen Medical (Hill-Rom)': { aliases: ['Allen', 'Hill-Rom'], specialties: ['equipment'] },
  Skytron: { specialties: ['equipment'] },
};

/** Companies with no stored instructions page yet. A page is added only after someone opens it. */
const EXTRAS = [
  { name: 'Ansell', blurb: 'Surgical gloves', url: '', aliases: [], specialties: ['gloves'] },
  { name: 'Surgical Specialties', blurb: 'Barbed suture', url: '', aliases: [], specialties: ['general'] },
];

export const SPECIALTIES = [
  ['ortho', 'Orthopedics'],
  ['sports', 'Sports medicine'],
  ['spine', 'Spine'],
  ['neuro', 'Neuro'],
  ['eye', 'Eyes'],
  ['robotics', 'Robotics'],
  ['cardiac', 'Cardiac'],
  ['vascular', 'Vascular'],
  ['general', 'General and soft tissue'],
  ['ent', 'ENT and plastics'],
  ['gyn', 'GYN and urology'],
  ['gloves', 'Gloves and packs'],
  ['sterile', 'Sterile processing'],
  ['equipment', 'Room equipment'],
];

/** Stable id from the name a company had when it was added. Do not re-run this after a rename. */
export function companyIdFor(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function fold(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** @type {Array<Company>} */
export const COMPANIES = [
  ...SURGICAL_VENDORS.map(vendor => {
    const meta = META[vendor.name] || { specialties: ['general'] };
    return {
      id: vendor.id || companyIdFor(vendor.name),
      name: vendor.name,
      aliases: meta.aliases || [],
      blurb: vendor.blurb,
      url: vendor.url || '',
      specialties: meta.specialties,
    };
  }),
  ...EXTRAS.map(extra => ({
    id: companyIdFor(extra.name),
    name: extra.name,
    aliases: extra.aliases,
    blurb: extra.blurb,
    url: extra.url,
    specialties: extra.specialties,
  })),
];

const byId = new Map(COMPANIES.map(company => [company.id, company]));

export function getCompany(id) {
  return id ? byId.get(id) || null : null;
}

/** Exact name or exact alias. A fragment such as "S" or "PI" matches nothing. */
export function findCompany(name) {
  const q = fold(name);
  if (!q) return null;
  return COMPANIES.find(company => fold(company.name) === q || company.aliases.some(alias => fold(alias) === q)) || null;
}

export function specialtyLabel(id) {
  return SPECIALTIES.find(([key]) => key === id)?.[1] || 'Other';
}
