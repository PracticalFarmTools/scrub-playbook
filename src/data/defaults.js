import { migrateBook } from './migrate';

/**
 * Legacy sample cards. The app does not load these until someone asks
 * for a preview. migrateBook() turns them into the versioned book.
 */
export const DEMO_SURGEONS = [
  // ─── DR. MILLER — Tomorrow's Shift ───
  {
    id: 'demo-miller',
    name: 'Dr. Miller',
    specialty: 'Ophthalmology',
    facility: 'Riverside Surgical Center',
    status: 'verified',
    lastVerifiedBy: 'Kyle',
    lastVerifiedAt: '2026-09-20T07:00:00.000Z',
    addedBy: 'Kyle',
    gloveModel: 'Biogel Micro',
    gloveBrand: 'Mölnlycke',
    gloveColor: 'Straw/Tan',
    gloveSize: '7.0',
    sutures: [
      { name: 'Nylon/Ethilon', color: '#2ECC71', textColor: 'white', size: '10-0' },
      { name: 'Vicryl', color: '#8E44AD', textColor: 'white', size: '10-0' },
    ],
    nicknames: [
      { nickname: 'The Needle', actual: 'Phaco Tip / Phaco Needle' },
    ],
    assists: [
      { name: 'PA Sarah', role: 'PA', gloveModel: 'Protexis PI', gloveSize: '6.5' },
    ],
    tips: 'Room lights OFF for the start. Surgeon calls the Phaco tip "The Needle". He prefers the Alcon Centurion on his right side.',
    vendorLinks: ['Alcon', 'Carl Zeiss Meditec'],
    createdAt: '2026-03-18T07:00:00.000Z',
  },
  // ─── DR. CHEN — Ortho ───
  {
    id: 'demo-1',
    name: 'Dr. Marcus Chen',
    specialty: 'Orthopedics',
    facility: 'Main Hospital OR',
    status: 'unconfirmed',
    lastVerifiedBy: null,
    lastVerifiedAt: null,
    addedBy: 'Kyle',
    gloveModel: 'Biogel Eclipse',
    gloveBrand: 'Mölnlycke',
    gloveColor: 'Green',
    gloveSize: '7.5',
    sutures: [
      { name: 'Vicryl', color: '#8E44AD', textColor: 'white', size: '2-0' },
      { name: 'Monocryl', color: '#F1948A', textColor: 'black', size: '3-0' },
      { name: 'Nylon/Ethilon', color: '#2ECC71', textColor: 'white', size: '4-0' },
    ],
    nicknames: [
      { nickname: 'The Cobb', actual: 'Cobb Elevator' },
      { nickname: 'Pickups', actual: 'DeBakey Forceps' },
    ],
    assists: [
      { name: 'Jake Rivera', role: 'PA', gloveModel: 'Protexis PI', gloveSize: '8.0' },
    ],
    tips: 'Likes Bovie at 35/35. Prefers the Army-Navy over Richardsons. Always wants a damp lap on the field.',
    vendorLinks: ['Stryker', 'Zimmer Biomet'],
    createdAt: '2026-03-15T09:00:00.000Z',
  },
  // ─── DR. OKAFOR — Ophthalmology ───
  {
    id: 'demo-2',
    name: 'Dr. Sarah Okafor',
    specialty: 'Ophthalmology',
    facility: 'Riverside Surgical Center',
    status: 'verified',
    lastVerifiedBy: 'Kyle',
    lastVerifiedAt: '2026-09-28T14:30:00.000Z',
    addedBy: 'Kyle',
    gloveModel: 'Biogel Micro',
    gloveBrand: 'Mölnlycke',
    gloveColor: 'Straw/Tan',
    gloveSize: '6.0',
    sutures: [
      { name: 'Prolene', color: '#3498DB', textColor: 'white', size: '10-0' },
      { name: 'Vicryl', color: '#8E44AD', textColor: 'white', size: '8-0' },
    ],
    nicknames: [
      { nickname: 'The Weck', actual: 'Weck-Cel Sponge' },
    ],
    assists: [],
    tips: 'Very quiet OR. Wants BSS on the field at all times. Prefers Alcon Centurion for phaco.',
    vendorLinks: ['Alcon', 'Carl Zeiss Meditec', 'BVI'],
    createdAt: '2026-03-16T14:30:00.000Z',
  },
];

const SAMPLE_FIRST_CASE = {
  'demo-1': [
    'Calls the Cobb elevator “The Cobb.”',
    'Bovie at 35/35.',
    'Jake Rivera usually assists.',
  ],
  'demo-miller': [
    'Room lights off for the start.',
    'Calls the phaco tip “The Needle.”',
    'Alcon Centurion on his right side.',
  ],
};

const DAY_MS = 86400000;

/** Sample matches keep their spacing but end a day before `now`, so a sample never reads as stale. */
function recentConfirmations(procedures, now) {
  const times = procedures.map(procedure => procedure.lastConfirmedAt).filter(Boolean).map(at => new Date(at).getTime());
  if (!times.length) return procedures;
  const shift = (now - DAY_MS) - Math.max(...times);
  const moved = (at) => new Date(new Date(at).getTime() + shift).toISOString();
  return procedures.map(procedure => (procedure.lastConfirmedAt ? {
    ...procedure,
    lastConfirmedAt: moved(procedure.lastConfirmedAt),
    confirmations: (procedure.confirmations || []).map(confirmation => ({ ...confirmation, at: moved(confirmation.at) })),
  } : procedure));
}

export function buildSampleBook({ now = Date.now() } = {}) {
  const book = migrateBook(DEMO_SURGEONS);
  return {
    ...book,
    surgeons: book.surgeons.map(surgeon => (
      SAMPLE_FIRST_CASE[surgeon.id]
        ? { ...surgeon, firstCase: SAMPLE_FIRST_CASE[surgeon.id], firstCaseAt: surgeon.createdAt, firstCaseBy: surgeon.addedBy || '' }
        : surgeon
    )),
    procedures: recentConfirmations(book.procedures, now).map(procedure => ({ ...procedure, name: 'Sample setup' })),
  };
}

/** Samples cannot be edited in place, so a stored copy can be rebuilt from the current samples. */
export function refreshSamples(book, { now = Date.now() } = {}) {
  const stored = new Set((book?.surgeons || []).filter(surgeon => surgeon.demo).map(surgeon => surgeon.id));
  if (!stored.size) return book;
  const fresh = buildSampleBook({ now });
  const freshIds = new Set(fresh.surgeons.filter(surgeon => stored.has(surgeon.id)).map(surgeon => surgeon.id));
  if (!freshIds.size) return book;
  return {
    ...book,
    surgeons: book.surgeons.map(surgeon => (
      freshIds.has(surgeon.id) ? fresh.surgeons.find(item => item.id === surgeon.id) : surgeon
    )),
    procedures: [
      ...book.procedures.filter(procedure => !(procedure.demo && freshIds.has(procedure.surgeonId))),
      ...fresh.procedures.filter(procedure => freshIds.has(procedure.surgeonId)),
    ],
  };
}
