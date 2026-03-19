/**
 * Surgical Needles — categorized by geometry & use case.
 * Each category includes cross-brand equivalents for smart suggestions.
 */
export const SURGICAL_NEEDLES = [
  { 
    category: "Spatulated (Side-Cutting)", 
    description: "Flat geometry for planing through ocular tissue layers.",
    equivalents: "TG-140-8 ⟷ S-24",
    items: ["TG-140-8", "S-24", "S-28", "TG-160-6"] 
  },
  { 
    category: "Taper (Round Point)", 
    description: "Standard for internal soft tissue; minimizes trauma.",
    equivalents: "SH ⟷ V-20 | CT-1 ⟷ GS-21",
    items: ["SH", "CT-1", "CT-2", "CT-3", "MO-6", "UR-6"] 
  },
  { 
    category: "Reverse Cutting (Skin)", 
    description: "Edge on outer curve to prevent tissue cutout.",
    equivalents: "PS-2 ⟷ P-12 | FS-2 ⟷ C-13",
    items: ["PS-2", "PS-1", "P-3", "FS-2", "FS-1", "FSLX"] 
  },
  { 
    category: "Tapercut (High Penetration)", 
    description: "Cutting tip with a taper body for vascular/calcified tissue.",
    equivalents: "V-5 ⟷ CC",
    items: ["V-5", "CC", "KV-1"] 
  },
  { 
    category: "Conventional Cutting", 
    description: "Sharp inner curve for ligaments and tendons.",
    items: ["PC-1", "PC-3", "PC-5", "C-1"] 
  }
];

/**
 * Flat needle list for dropdown selectors.
 */
export const NEEDLE_LIST = SURGICAL_NEEDLES.flatMap(cat =>
  cat.items.map(name => ({ name, category: cat.category }))
);

/**
 * Find needles in the same category (for cross-brand suggestions).
 * @param {string} needleName - e.g. "CT-3"
 * @returns {{ category: string, equivalents?: string, alternatives: string[] }}
 */
export function getSimilarNeedles(needleName) {
  const cat = SURGICAL_NEEDLES.find(c => c.items.includes(needleName));
  if (!cat) return { category: '', alternatives: [] };
  return {
    category: cat.category,
    equivalents: cat.equivalents || '',
    alternatives: cat.items.filter(n => n !== needleName),
  };
}
