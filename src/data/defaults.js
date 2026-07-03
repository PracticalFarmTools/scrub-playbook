/**
 * Default surgeon cards so the app isn't empty on first launch.
 * These are loaded when localStorage has no saved data.
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
    lastVerifiedAt: '2026-06-20T07:00:00.000Z',
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
    lastVerifiedAt: '2026-06-28T14:30:00.000Z',
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
