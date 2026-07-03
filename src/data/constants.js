export const SPECIALTIES = [
  "General Surgery", "Orthopedics", "Neurosurgery", "Cardiothoracic",
  "Vascular", "Ophthalmology", "ENT", "Urology", "GYN / OB",
  "Plastics / Reconstructive", "Oral / Maxillofacial", "Spine",
  "Trauma", "Colorectal", "Bariatric", "Transplant", "Pediatric",
  "Podiatry", "Robotics", "Cardiac", "Other"
];

export const ASSIST_ROLES = ["PA", "Resident", "Fellow", "NP", "RNFA"];

export const STORAGE_KEY = 'scrubplaybook_surgeons';

// Verification status — the "is this still true?" trust layer.
export const CARD_STATUS = {
  VERIFIED: 'verified',
  UNCONFIRMED: 'unconfirmed',
  DISPUTED: 'disputed',
};
