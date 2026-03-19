/**
 * Default surgeon cards — Procedure-First architecture.
 * Each surgeon has a procedures[] array; each procedure owns its own
 * gloves, sutures, gown, equipment, tips, and nicknames.
 * Assists & vendorLinks remain at the surgeon level.
 */
export const DEMO_SURGEONS = [
  // ─── DR. MILLER — Ophthalmology ───
  {
    id: 'demo-miller',
    name: 'Dr. Miller',
    specialty: 'Ophthalmology',
    addedBy: 'Kyle',
    vendorLinks: ['Alcon', 'Carl Zeiss Meditec'],
    createdAt: '2026-03-18T07:00:00.000Z',
    assists: [
      { name: 'PA Sarah', role: 'PA', gloveModel: 'Protexis PI', gloveBrand: 'Cardinal Health', gloveSize: '6.5', addedBy: 'Kyle', addedOn: '2026-03-18T07:00:00.000Z' },
    ],
    procedures: [
      {
        id: 'proc-miller-cataract',
        name: 'Cataract',
        glove: { id: 'biogel-micro', model: 'Biogel Micro', brand: 'Mölnlycke', color: 'Straw/Tan', size: '7.0' },
        doubleGlove: false,
        underGlove: null,
        gown: { size: 'L', type: 'Standard' },
        sutures: [
          { name: 'Nylon/Ethilon', color: '#2ECC71', textColor: 'white', size: '10-0', needle: 'X-1' },
          { name: 'Vicryl', color: '#8E44AD', textColor: 'white', size: '10-0', needle: 'TG-140-8' },
        ],
        equipment: 'Alcon Centurion on right side. BSS on the field at all times.',
        tips: 'Room lights OFF for the start. Surgeon calls the Phaco tip "The Needle". He prefers the Alcon Centurion on his right side.',
        nicknames: [
          { nickname: 'The Needle', actual: 'Phaco Tip / Phaco Needle' },
        ],
      },
      {
        id: 'proc-miller-glaucoma',
        name: 'Glaucoma',
        glove: { id: 'biogel-micro', model: 'Biogel Micro', brand: 'Mölnlycke', color: 'Straw/Tan', size: '7.0' },
        doubleGlove: false,
        underGlove: null,
        gown: { size: 'L', type: 'Standard' },
        sutures: [
          { name: 'Nylon/Ethilon', color: '#2ECC71', textColor: 'white', size: '10-0', needle: 'X-1' },
          { name: 'Vicryl', color: '#8E44AD', textColor: 'white', size: '8-0', needle: 'SH' },
        ],
        equipment: 'Ahmed valve on standby. Mitomycin-C prepared per protocol.',
        tips: 'Wants Weck-Cel sponges NOT cotton-tips. Same Centurion setup as cataract.',
        nicknames: [
          { nickname: 'The Weck', actual: 'Weck-Cel Sponge' },
        ],
      },
    ],
  },

  // ─── DR. CHEN — Orthopedics ───
  {
    id: 'demo-1',
    name: 'Dr. Marcus Chen',
    specialty: 'Orthopedics',
    addedBy: 'Kyle',
    vendorLinks: ['Stryker', 'Zimmer Biomet'],
    createdAt: '2026-03-15T09:00:00.000Z',
    assists: [
      { name: 'Jake Rivera', role: 'PA', gloveModel: 'Protexis PI', gloveBrand: 'Cardinal Health', gloveSize: '8.0', addedBy: 'Kyle', addedOn: '2026-03-15T09:00:00.000Z' },
    ],
    procedures: [
      {
        id: 'proc-chen-tka',
        name: 'Total Knee',
        glove: { id: 'biogel-eclipse', model: 'Biogel Eclipse', brand: 'Mölnlycke', color: 'Green', size: '7.5' },
        doubleGlove: true,
        underGlove: { id: 'biogel-indicator', model: 'Biogel Indicator', brand: 'Mölnlycke', color: 'Green', size: '8.0' },
        gown: { size: 'XL', type: 'Reinforced' },
        sutures: [
          { name: 'Vicryl', color: '#8E44AD', textColor: 'white', size: '2-0', needle: 'CT-1' },
          { name: 'Monocryl', color: '#F1948A', textColor: 'black', size: '3-0', needle: 'PS' },
          { name: 'Nylon/Ethilon', color: '#2ECC71', textColor: 'white', size: '4-0', needle: 'FS-2' },
        ],
        equipment: 'Zimmer Persona system. Tourniquet at 275mmHg.',
        tips: 'Likes Bovie at 35/35. Prefers Army-Navy over Richardsons. Always wants a damp lap on the field.',
        nicknames: [
          { nickname: 'The Cobb', actual: 'Cobb Elevator' },
          { nickname: 'Pickups', actual: 'DeBakey Forceps' },
        ],
      },
      {
        id: 'proc-chen-tha',
        name: 'Total Hip',
        glove: { id: 'biogel-eclipse', model: 'Biogel Eclipse', brand: 'Mölnlycke', color: 'Green', size: '7.5' },
        doubleGlove: true,
        underGlove: { id: 'biogel-indicator', model: 'Biogel Indicator', brand: 'Mölnlycke', color: 'Green', size: '8.0' },
        gown: { size: 'XL', type: 'Reinforced' },
        sutures: [
          { name: 'Vicryl', color: '#8E44AD', textColor: 'white', size: '1', needle: 'CT-1' },
          { name: 'Vicryl', color: '#8E44AD', textColor: 'white', size: '2-0', needle: 'CT' },
          { name: 'Monocryl', color: '#F1948A', textColor: 'black', size: '3-0', needle: 'PS' },
        ],
        equipment: 'Stryker Mako system. Lateral position. Bean bag.',
        tips: 'Posterior approach. Wants #10 blade for skin, #15 for capsule. Same Bovie settings as knee.',
        nicknames: [
          { nickname: 'The Cobb', actual: 'Cobb Elevator' },
          { nickname: 'Bone Hook', actual: 'Single-Prong Retractor' },
        ],
      },
    ],
  },

  // ─── DR. OKAFOR — Ophthalmology ───
  {
    id: 'demo-2',
    name: 'Dr. Sarah Okafor',
    specialty: 'Ophthalmology',
    addedBy: 'Kyle',
    vendorLinks: ['Alcon', 'Carl Zeiss Meditec', 'BVI'],
    createdAt: '2026-03-16T14:30:00.000Z',
    assists: [],
    procedures: [
      {
        id: 'proc-okafor-cataract',
        name: 'Cataract',
        glove: { id: 'biogel-micro', model: 'Biogel Micro', brand: 'Mölnlycke', color: 'Straw/Tan', size: '6.0' },
        doubleGlove: false,
        underGlove: null,
        gown: { size: 'M', type: 'Standard' },
        sutures: [
          { name: 'Prolene', color: '#3498DB', textColor: 'white', size: '10-0', needle: 'X-1' },
          { name: 'Vicryl', color: '#8E44AD', textColor: 'white', size: '8-0', needle: 'SH' },
        ],
        equipment: 'Alcon Centurion for phaco. BSS on the field at all times.',
        tips: 'Very quiet OR. Wants BSS on the field at all times. Prefers Alcon Centurion for phaco.',
        nicknames: [
          { nickname: 'The Weck', actual: 'Weck-Cel Sponge' },
        ],
      },
    ],
  },
];

/**
 * Migrate old flat-format surgeon data into the procedure-first format.
 * Detects legacy shape (no `procedures` array) and wraps into a single "General" procedure.
 */
export function migrateSurgeonData(surgeons) {
  return surgeons.map(s => {
    if (s.procedures) return s; // already migrated

    // Build a single "General" procedure from the flat properties
    const procedure = {
      id: crypto.randomUUID(),
      name: 'General',
      glove: {
        id: '', model: s.gloveModel || '', brand: s.gloveBrand || '',
        color: s.gloveColor || '', size: s.gloveSize || '7.0',
      },
      doubleGlove: false,
      underGlove: null,
      gown: { size: 'L', type: 'Standard' },
      sutures: (s.sutures || []).map(su => ({ ...su, needle: su.needle || '' })),
      equipment: '',
      tips: s.tips || '',
      nicknames: s.nicknames || [],
    };

    // Return new shape, removing flat properties
    const { gloveModel, gloveBrand, gloveColor, gloveSize, sutures, tips, nicknames, ...rest } = s;
    return { ...rest, procedures: [procedure], assists: s.assists || [] };
  });
}
