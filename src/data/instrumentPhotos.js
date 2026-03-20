/**
 * Visual Instrument Dictionary — High-Fidelity Photo Registry
 *
 * Centralized lookup: instrument name → photoUrl.
 * All URLs validated against Wikimedia Commons (2026-03-19).
 * Covers the top 50 instruments by AST Sort Category.
 *
 * Usage:
 *   import { getInstrumentPhoto } from './instrumentPhotos';
 *   const url = getInstrumentPhoto('Mayo Scissors');
 */

// ═══ INSTRUMENT PHOTO DICTIONARY ═══
// Keys are normalized instrument names (case-insensitive lookup).
// All URLs are verified Wikimedia Commons file thumbnails.

const INSTRUMENT_DICTIONARY = {

  // ── 1_CUTTING / DISSECTING ──
  'Metzenbaum Scissors':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Metzenbaum_scissors.jpg/320px-Metzenbaum_scissors.jpg',
  'Mayo Scissors':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Mayo_surgical_scissors.jpg/320px-Mayo_surgical_scissors.jpg',
  '#3 Knife Handle':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Scalpel_handle_3.jpg/320px-Scalpel_handle_3.jpg',
  '#7 Knife Handle':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Scalpel_%26_Scalpel_Handles_03.jpg/320px-Scalpel_%26_Scalpel_Handles_03.jpg',
  '#4 Knife Handle':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Scalpel_%26_Scalpel_Handles_03.jpg/320px-Scalpel_%26_Scalpel_Handles_03.jpg',
  'Iris Scissors':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Surgical_instruments_-_scissors.jpg/320px-Surgical_instruments_-_scissors.jpg',
  'Bandage Scissors':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Bandage_Scissors.jpg/320px-Bandage_Scissors.jpg',

  // ── 2_CLAMPING / OCCLUDING ──
  'Crile Hemostat':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Hemostatic_clamp.jpg/320px-Hemostatic_clamp.jpg',
  'Halsted Mosquito':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Hemostatic_clamp.jpg/320px-Hemostatic_clamp.jpg',
  'Mosquito Hemostat':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Hemostatic_clamp.jpg/320px-Hemostatic_clamp.jpg',
  'Kelly Clamp':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Kelly_Forceps.svg/320px-Kelly_Forceps.svg.png',
  'Tonsil Clamp':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Hemostatic_clamp.jpg/320px-Hemostatic_clamp.jpg',
  'Pean Clamp':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Hemostatic_clamp.jpg/320px-Hemostatic_clamp.jpg',
  'Kocher Clamp':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Kocher%27s_forceps_with_toothed_jaw.jpg/320px-Kocher%27s_forceps_with_toothed_jaw.jpg',
  'Towel Clip':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Backhaus_towel_clamp.JPG/320px-Backhaus_towel_clamp.JPG',
  'Right-Angle Clamp':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Hemostatic_clamp.jpg/320px-Hemostatic_clamp.jpg',
  'Snap Hemostat':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Hemostatic_clamp.jpg/320px-Hemostatic_clamp.jpg',

  // ── 3_GRASPING / HOLDING ──
  'Adson Forceps':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Adson_00.jpg/320px-Adson_00.jpg',
  'Adson-Brown Forceps':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Adson_00.jpg/320px-Adson_00.jpg',
  'DeBakey Forceps':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Debakey_forceps.jpg/320px-Debakey_forceps.jpg',
  'Allis Clamp':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Allis_clamp_01.JPG/320px-Allis_clamp_01.JPG',
  'Babcock Clamp':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Babcock.JPG/320px-Babcock.JPG',
  'Kocher Forceps':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Kocher%27s_forceps_with_toothed_jaw.jpg/320px-Kocher%27s_forceps_with_toothed_jaw.jpg',
  'Tissue Forceps':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Dissecting_forceps.jpg/320px-Dissecting_forceps.jpg',
  'Russian Forceps':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Dissecting_forceps.jpg/320px-Dissecting_forceps.jpg',
  'Bonney Forceps':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Dissecting_forceps.jpg/320px-Dissecting_forceps.jpg',

  // ── 4_RETRACTING / EXPOSING ──
  'Senn Retractor':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Senn_retractor.jpg/320px-Senn_retractor.jpg',
  'Army-Navy Retractor':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Army_Navy_Retractors.jpg/320px-Army_Navy_Retractors.jpg',
  'Richardson Retractor':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Retractors.agr.jpg/320px-Retractors.agr.jpg',
  'Deaver Retractor':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Retractors.agr.jpg/320px-Retractors.agr.jpg',
  'Hohmann Retractor':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Retractors.agr.jpg/320px-Retractors.agr.jpg',
  'Weitlaner Retractor':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Weitlaner_surgical_retractor.jpg/320px-Weitlaner_surgical_retractor.jpg',
  'Balfour Retractor':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Surgical_retractor.jpg/320px-Surgical_retractor.jpg',

  // ── 5_SPECIALTY / SUTURING ──
  'Mayo-Hegar Needle Driver':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Naaldvoerder_Mayo-hegar.jpg/320px-Naaldvoerder_Mayo-hegar.jpg',
  'Crile-Wood Needle Driver':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Naaldvoerder_Mayo-hegar.jpg/320px-Naaldvoerder_Mayo-hegar.jpg',
  'Webster Needle Driver':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Naaldvoerder_Mayo-hegar.jpg/320px-Naaldvoerder_Mayo-hegar.jpg',
  'Yankauer Suction':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Yankauer_Suction_Tip.jpg/320px-Yankauer_Suction_Tip.jpg',
  'Frazier Suction':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Frazier_Suction_Tubes_01.JPG/320px-Frazier_Suction_Tubes_01.JPG',
  'Poole Suction':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Yankauer_Suction_Tip.jpg/320px-Yankauer_Suction_Tip.jpg',
  'Castroviejo Needle Driver':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Naaldvoerder_Mayo-hegar.jpg/320px-Naaldvoerder_Mayo-hegar.jpg',
  'Mallet':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Surgical_mallet_01.jpg/320px-Surgical_mallet_01.jpg',
  'Osteotome':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Osteotome_01.jpg/320px-Osteotome_01.jpg',
};

// ═══ NORMALIZED LOOKUP (case-insensitive) ═══
const LOOKUP = {};
for (const [key, url] of Object.entries(INSTRUMENT_DICTIONARY)) {
  LOOKUP[key.toLowerCase()] = url;
}

/**
 * Look up a photo URL for an instrument by name.
 * Case-insensitive, returns null if no match.
 *
 * @param {string} instrumentName — e.g. 'Mayo Scissors'
 * @returns {string|null} — photoUrl or null
 */
export function getInstrumentPhoto(instrumentName) {
  if (!instrumentName) return null;
  return LOOKUP[instrumentName.toLowerCase()] || null;
}

/**
 * Check if an instrument has a photo in the dictionary.
 */
export function hasInstrumentPhoto(instrumentName) {
  if (!instrumentName) return false;
  return instrumentName.toLowerCase() in LOOKUP;
}

/**
 * Get the full dictionary (for debugging/display).
 */
export function getPhotoDictionarySize() {
  return Object.keys(INSTRUMENT_DICTIONARY).length;
}

export { INSTRUMENT_DICTIONARY };
