export const SPECIALTIES = [
  "General Surgery", "Orthopedics", "Neurosurgery", "Cardiothoracic",
  "Vascular", "Ophthalmology", "ENT", "Urology", "GYN / OB",
  "Plastics / Reconstructive", "Oral / Maxillofacial", "Spine",
  "Trauma", "Colorectal", "Bariatric", "Transplant", "Pediatric",
  "Podiatry", "Robotics", "Cardiac", "Other"
];

export const ASSIST_ROLES = ["PA", "Resident", "Fellow", "NP", "RNFA"];

export const GOWN_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
export const GOWN_TYPES = ['Standard', 'Breathable', 'Reinforced', 'Impervious'];

export const STORAGE_KEY = 'scrubplaybook_surgeons';

/** Per-hospital storage key for surgeon data */
export function makeStorageKey(hospitalId) {
  return hospitalId ? `scrubplaybook_surgeons_${hospitalId}` : STORAGE_KEY;
}

/** Per-hospital audit log key */
export function makeAuditKey(hospitalId) {
  return hospitalId ? `scrubplaybook_audit_${hospitalId}` : 'scrubplaybook_audit';
}

/** Per-hospital card order key */
export function makeOrderKey(hospitalId) {
  return hospitalId ? `scrubplaybook_cardorder_${hospitalId}` : 'scrubplaybook_cardorder';
}

/** Per-hospital latex-free key */
export function makeLatexKey(hospitalId) {
  return hospitalId ? `scrubplaybook_latexfree_${hospitalId}` : 'scrubplaybook_latexfree';
}

/** Per-hospital tray collection key */
export function makeTrayKey(hospitalId) {
  return hospitalId ? `scrubplaybook_trays_${hospitalId}` : 'scrubplaybook_trays';
}

export const GLOVE_COLORS = {
  'Green': '#22c55e', 'Blue': '#3b82f6', 'White': '#e2e8f0',
  'Straw/Tan': '#d4a574', 'Straw': '#d4a574', 'Ivory': '#f5f0e8',
  'Brown/Green': '#6b7a3d', 'Dark Brown': '#5c3a1e', 'Cream': '#f5e6c8',
  'Brown': '#8B4513',
};
