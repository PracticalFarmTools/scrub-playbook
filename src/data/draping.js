/** Draping Suite — constants and helpers */

export const DRAPE_TYPES = [
  'U-Drape',
  'Extremity',
  'Laparotomy',
  'Eye-Drape',
  'Split Sheet',
  'Craniotomy',
  'Lithotomy',
  'Hip Drape',
  'Shoulder Drape',
  'C-Section',
  'Towels Only',
  'Custom',
];

/** Common pre-built sequences per drape type (used as templates, editable per surgeon) */
export const DEFAULT_SEQUENCES = {
  'U-Drape':      ['Towels ×4', 'U-Drape', 'Ioban'],
  'Extremity':    ['Stockinette', 'Extremity Drape', 'Ioban'],
  'Laparotomy':   ['Towels ×4', 'Lap Sheet', 'Ioban'],
  'Eye-Drape':    ['Head Drape', 'Eye Drape / 3M Steri-Drape', 'Speculum'],
  'Split Sheet':  ['Towels ×4', 'Split Sheet'],
  'Craniotomy':   ['Towels ×4', 'Craniotomy Drape', 'Ioban'],
  'Lithotomy':    ['Leggings', 'Under-buttock drape', 'Lithotomy Sheet'],
  'Hip Drape':    ['Towels ×4', 'U-Drape', 'Impervious Stockinette', 'Hip Drape', 'Ioban'],
  'Shoulder Drape': ['Towels ×4', 'Shoulder Drape / Up-Drape', 'Ioban'],
  'C-Section':    ['Towels ×4', 'C-Section Drape'],
  'Towels Only':  ['Towels ×4'],
  'Custom':       [],
};

/** Returns a fresh draping object for a new procedure */
export function makeDefaultDraping(drapeType = '') {
  return {
    drapeType: drapeType || '',
    sequence: drapeType ? [...(DEFAULT_SEQUENCES[drapeType] || [])] : [],
    postDrapeGloveChange: false,
  };
}
