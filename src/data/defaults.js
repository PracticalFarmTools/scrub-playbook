/**
 * Lincoln Hospital Surgeon Registry — Procedure-First architecture.
 * Each surgeon has procedures[]; each procedure owns its own
 * gloves, sutures, gown, equipment, tips, and nicknames.
 * Assists & vendorLinks remain at the surgeon level.
 */
export const DEMO_SURGEONS = [
  // ═══════════════════════════════════════════════
  // DR. REID FELLER — Ophthalmology (Full Map)
  // ═══════════════════════════════════════════════
  {
    id: 'lincoln-reid-feller',
    name: 'Dr. Reid Feller',
    specialty: 'Ophthalmology',
    addedBy: 'Kyle',
    vendorLinks: ['Alcon', 'Carl Zeiss Meditec', 'BVI'],
    createdAt: '2026-03-18T07:00:00.000Z',
    assists: [
      { name: 'PA Sarah', role: 'PA', gloveModel: 'Protexis PI', gloveBrand: 'Cardinal Health', gloveSize: '6.5', addedBy: 'Kyle', addedOn: '2026-03-18T07:00:00.000Z' },
    ],
    procedures: [
      {
        id: 'proc-rf-cataract',
        name: 'Cataract',
        status: 'OPEN',
        glove: { id: 'biogel-micro', model: 'Biogel Micro', brand: 'Mölnlycke', color: 'Straw/Tan', size: '7.0' },
        doubleGlove: false,
        underGlove: null,
        gown: { size: 'L', type: 'Standard' },
        sutures: [
          { name: 'Nylon/Ethilon', color: '#2ECC71', textColor: 'white', size: '10-0', needle: 'TG-140-8' },
          { name: 'Vicryl', color: '#8E44AD', textColor: 'white', size: '10-0', needle: 'TG-140-8' },
        ],
        equipment: 'Alcon Centurion on right side. BSS on field at all times. Phaco tip ready.',
        tips: 'Room lights OFF for the start. Surgeon calls the Phaco tip "The Needle". Centurion on his right side. Quiet OR.',
        nicknames: [
          { nickname: 'The Needle', actual: 'Phaco Tip / Phaco Needle' },
        ],
      },
      {
        id: 'proc-rf-glaucoma',
        name: 'Glaucoma',
        status: 'OPEN',
        glove: { id: 'biogel-micro', model: 'Biogel Micro', brand: 'Mölnlycke', color: 'Straw/Tan', size: '7.0' },
        doubleGlove: false,
        underGlove: null,
        gown: { size: 'L', type: 'Standard' },
        sutures: [
          { name: 'Nylon/Ethilon', color: '#2ECC71', textColor: 'white', size: '10-0', needle: 'TG-140-8' },
          { name: 'Vicryl', color: '#8E44AD', textColor: 'white', size: '8-0', needle: 'S-24' },
        ],
        equipment: 'Ahmed valve on standby. Mitomycin-C prepared per protocol.',
        tips: 'Wants Weck-Cel sponges NOT cotton-tips. Same Centurion setup as cataract.',
        nicknames: [
          { nickname: 'The Weck', actual: 'Weck-Cel Sponge' },
        ],
      },
      {
        id: 'proc-rf-retina',
        name: 'Retina',
        status: 'HOLD',
        glove: { id: 'biogel-micro', model: 'Biogel Micro', brand: 'Mölnlycke', color: 'Straw/Tan', size: '7.0' },
        doubleGlove: false,
        underGlove: null,
        gown: { size: 'L', type: 'Standard' },
        sutures: [
          { name: 'Nylon/Ethilon', color: '#2ECC71', textColor: 'white', size: '7-0', needle: 'S-24' },
        ],
        equipment: 'Vitrectomy setup. Chandelier light ready.',
        tips: 'Verify laser settings before draping. Keep silicone oil on standby.',
        nicknames: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // DR. STEVE KATZ — Orthopedics (Full Map)
  // ═══════════════════════════════════════════════
  {
    id: 'lincoln-steve-katz',
    name: 'Dr. Steve Katz',
    specialty: 'Orthopedics',
    addedBy: 'Kyle',
    vendorLinks: ['Stryker', 'Zimmer Biomet', 'Smith & Nephew'],
    createdAt: '2026-03-15T09:00:00.000Z',
    assists: [
      { name: 'Jake Rivera', role: 'PA', gloveModel: 'Protexis PI', gloveBrand: 'Cardinal Health', gloveSize: '8.0', addedBy: 'Kyle', addedOn: '2026-03-15T09:00:00.000Z' },
    ],
    procedures: [
      {
        id: 'proc-sk-tka',
        name: 'Total Knee',
        status: 'OPEN',
        glove: { id: 'biogel-eclipse', model: 'Biogel Eclipse', brand: 'Mölnlycke', color: 'Green', size: '7.5' },
        doubleGlove: true,
        underGlove: { id: 'biogel-indicator', model: 'Biogel Indicator', brand: 'Mölnlycke', color: 'Green', size: '8.0' },
        gown: { size: 'XL', type: 'Reinforced' },
        sutures: [
          { name: 'Vicryl', color: '#8E44AD', textColor: 'white', size: '2-0', needle: 'CT-1' },
          { name: 'Monocryl', color: '#F1948A', textColor: 'black', size: '3-0', needle: 'PS-2' },
          { name: 'Nylon/Ethilon', color: '#2ECC71', textColor: 'white', size: '4-0', needle: 'FS-2' },
        ],
        equipment: 'Zimmer Persona system. Tourniquet at 275mmHg. Pulse lavage ready.',
        tips: 'Bovie at 35/35. Prefers Army-Navy over Richardsons. Always wants a damp lap on the field. Announce tourniquet time every 30 min.',
        nicknames: [
          { nickname: 'The Cobb', actual: 'Cobb Elevator' },
          { nickname: 'Pickups', actual: 'DeBakey Forceps' },
        ],
      },
      {
        id: 'proc-sk-tha',
        name: 'Total Hip',
        status: 'OPEN',
        glove: { id: 'biogel-eclipse', model: 'Biogel Eclipse', brand: 'Mölnlycke', color: 'Green', size: '7.5' },
        doubleGlove: true,
        underGlove: { id: 'biogel-indicator', model: 'Biogel Indicator', brand: 'Mölnlycke', color: 'Green', size: '8.0' },
        gown: { size: 'XL', type: 'Reinforced' },
        sutures: [
          { name: 'Vicryl', color: '#8E44AD', textColor: 'white', size: '1', needle: 'CT-1' },
          { name: 'Vicryl', color: '#8E44AD', textColor: 'white', size: '2-0', needle: 'CT-1' },
          { name: 'Monocryl', color: '#F1948A', textColor: 'black', size: '3-0', needle: 'PS-2' },
        ],
        equipment: 'Stryker Mako system. Lateral position. Bean bag. Cell saver on standby.',
        tips: 'Posterior approach. #10 blade for skin, #15 for capsule. Same Bovie settings as knee.',
        nicknames: [
          { nickname: 'The Cobb', actual: 'Cobb Elevator' },
          { nickname: 'Bone Hook', actual: 'Single-Prong Retractor' },
        ],
      },
      {
        id: 'proc-sk-shoulder',
        name: 'Shoulder Scope',
        status: 'OPEN',
        glove: { id: 'biogel-eclipse', model: 'Biogel Eclipse', brand: 'Mölnlycke', color: 'Green', size: '7.5' },
        doubleGlove: false,
        underGlove: null,
        gown: { size: 'XL', type: 'Impervious' },
        sutures: [
          { name: 'FiberWire', color: '#1F618D', textColor: 'white', size: '2', needle: '' },
          { name: 'Nylon/Ethilon', color: '#2ECC71', textColor: 'white', size: '4-0', needle: 'FS-2' },
        ],
        equipment: 'Arthrex tower. Beach chair position. Spider limb positioner.',
        tips: 'Wants pump pressure at 40mmHg. Shaver blade ready before scope insertion.',
        nicknames: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // LINCOLN REGISTRY — Placeholder Surgeons
  // ═══════════════════════════════════════════════
  {
    id: 'lincoln-mainella', name: 'Dr. Mainella', specialty: 'General Surgery', addedBy: 'Kyle',
    vendorLinks: [], createdAt: '2026-03-18T12:00:00.000Z', assists: [],
    procedures: [{ id: 'proc-mainella-gen', name: 'General', status: 'HOLD', glove: { id: '', model: '', brand: '', color: '', size: '7.0' }, doubleGlove: false, underGlove: null, gown: { size: 'L', type: 'Standard' }, sutures: [], equipment: '', tips: 'Awaiting preference data.', nicknames: [] }],
  },
  {
    id: 'lincoln-hasan', name: 'Dr. Hasan', specialty: 'General Surgery', addedBy: 'Kyle',
    vendorLinks: [], createdAt: '2026-03-18T12:00:00.000Z', assists: [],
    procedures: [{ id: 'proc-hasan-gen', name: 'General', status: 'HOLD', glove: { id: '', model: '', brand: '', color: '', size: '7.0' }, doubleGlove: false, underGlove: null, gown: { size: 'L', type: 'Standard' }, sutures: [], equipment: '', tips: 'Awaiting preference data.', nicknames: [] }],
  },
  {
    id: 'lincoln-kirby', name: 'Dr. Kirby', specialty: 'General Surgery', addedBy: 'Kyle',
    vendorLinks: [], createdAt: '2026-03-18T12:00:00.000Z', assists: [],
    procedures: [{ id: 'proc-kirby-gen', name: 'General', status: 'HOLD', glove: { id: '', model: '', brand: '', color: '', size: '7.0' }, doubleGlove: false, underGlove: null, gown: { size: 'L', type: 'Standard' }, sutures: [], equipment: '', tips: 'Awaiting preference data.', nicknames: [] }],
  },
  {
    id: 'lincoln-zaidi', name: 'Dr. Zaidi', specialty: 'General Surgery', addedBy: 'Kyle',
    vendorLinks: [], createdAt: '2026-03-18T12:00:00.000Z', assists: [],
    procedures: [{ id: 'proc-zaidi-gen', name: 'General', status: 'HOLD', glove: { id: '', model: '', brand: '', color: '', size: '7.0' }, doubleGlove: false, underGlove: null, gown: { size: 'L', type: 'Standard' }, sutures: [], equipment: '', tips: 'Awaiting preference data.', nicknames: [] }],
  },
  {
    id: 'lincoln-ross-feller', name: 'Dr. Ross Feller', specialty: 'General Surgery', addedBy: 'Kyle',
    vendorLinks: [], createdAt: '2026-03-18T12:00:00.000Z', assists: [],
    procedures: [{ id: 'proc-rossfeller-gen', name: 'General', status: 'HOLD', glove: { id: '', model: '', brand: '', color: '', size: '7.0' }, doubleGlove: false, underGlove: null, gown: { size: 'L', type: 'Standard' }, sutures: [], equipment: '', tips: 'Awaiting preference data.', nicknames: [] }],
  },
  {
    id: 'lincoln-swall', name: 'Dr. Swall', specialty: 'General Surgery', addedBy: 'Kyle',
    vendorLinks: [], createdAt: '2026-03-18T12:00:00.000Z', assists: [],
    procedures: [{ id: 'proc-swall-gen', name: 'General', status: 'HOLD', glove: { id: '', model: '', brand: '', color: '', size: '7.0' }, doubleGlove: false, underGlove: null, gown: { size: 'L', type: 'Standard' }, sutures: [], equipment: '', tips: 'Awaiting preference data.', nicknames: [] }],
  },
  {
    id: 'lincoln-nolan', name: 'Dr. Nolan', specialty: 'General Surgery', addedBy: 'Kyle',
    vendorLinks: [], createdAt: '2026-03-18T12:00:00.000Z', assists: [],
    procedures: [{ id: 'proc-nolan-gen', name: 'General', status: 'HOLD', glove: { id: '', model: '', brand: '', color: '', size: '7.0' }, doubleGlove: false, underGlove: null, gown: { size: 'L', type: 'Standard' }, sutures: [], equipment: '', tips: 'Awaiting preference data.', nicknames: [] }],
  },
  {
    id: 'lincoln-eisenburg', name: 'Dr. Eisenburg', specialty: 'General Surgery', addedBy: 'Kyle',
    vendorLinks: [], createdAt: '2026-03-18T12:00:00.000Z', assists: [],
    procedures: [{ id: 'proc-eisenburg-gen', name: 'General', status: 'HOLD', glove: { id: '', model: '', brand: '', color: '', size: '7.0' }, doubleGlove: false, underGlove: null, gown: { size: 'L', type: 'Standard' }, sutures: [], equipment: '', tips: 'Awaiting preference data.', nicknames: [] }],
  },
];

/**
 * Migrate old flat-format surgeon data into the procedure-first format.
 */
export function migrateSurgeonData(surgeons) {
  return surgeons.map(s => {
    if (s.procedures) return s;
    const procedure = {
      id: crypto.randomUUID(), name: 'General', status: 'HOLD',
      glove: { id: '', model: s.gloveModel || '', brand: s.gloveBrand || '', color: s.gloveColor || '', size: s.gloveSize || '7.0' },
      doubleGlove: false, underGlove: null, gown: { size: 'L', type: 'Standard' },
      sutures: (s.sutures || []).map(su => ({ ...su, needle: su.needle || '' })),
      equipment: '', tips: s.tips || '', nicknames: s.nicknames || [],
    };
    const { gloveModel, gloveBrand, gloveColor, gloveSize, sutures, tips, nicknames, ...rest } = s;
    return { ...rest, procedures: [procedure], assists: s.assists || [] };
  });
}
