export const SUTURE_LIBRARY = [
  // ═══════════════════════════════════════════════
  // ABSORBABLE — Braided
  // ═══════════════════════════════════════════════
  { name: "Vicryl", color: "#8E44AD", textColor: "white", alias: "Purple", type: "Absorbable", structure: "Braided" },
  { name: "Vicryl Rapide", color: "#D2B4DE", textColor: "black", alias: "Light Purple", type: "Absorbable", structure: "Braided" },
  { name: "Vicryl Plus", color: "#7D3C98", textColor: "white", alias: "Dark Purple (Antibacterial)", type: "Absorbable", structure: "Braided" },
  { name: "Polysorb", color: "#AF7AC5", textColor: "white", alias: "Violet", type: "Absorbable", structure: "Braided" },

  // ═══════════════════════════════════════════════
  // ABSORBABLE — Monofilament
  // ═══════════════════════════════════════════════
  { name: "Monocryl", color: "#F1948A", textColor: "black", alias: "Coral/Pink", type: "Absorbable", structure: "Monofilament" },
  { name: "Monocryl Plus", color: "#E74C3C", textColor: "white", alias: "Deep Pink (Antibacterial)", type: "Absorbable", structure: "Monofilament" },
  { name: "PDS II", color: "#ABB2B9", textColor: "black", alias: "Silver/Gray", type: "Absorbable", structure: "Monofilament" },
  { name: "PDS Plus", color: "#808B96", textColor: "white", alias: "Dark Gray (Antibacterial)", type: "Absorbable", structure: "Monofilament" },
  { name: "Caprosyn", color: "#F5CBA7", textColor: "black", alias: "Peach/Amber", type: "Absorbable", structure: "Monofilament" },
  { name: "Maxon", color: "#82E0AA", textColor: "black", alias: "Light Green", type: "Absorbable", structure: "Monofilament" },
  { name: "Biosyn", color: "#73C6B6", textColor: "black", alias: "Teal", type: "Absorbable", structure: "Monofilament" },

  // ═══════════════════════════════════════════════
  // ABSORBABLE — Natural
  // ═══════════════════════════════════════════════
  { name: "Chromic Gut", color: "#D4AC0D", textColor: "black", alias: "Gold/Tan", type: "Absorbable", structure: "Monofilament (Natural)" },
  { name: "Plain Gut", color: "#F9E79F", textColor: "black", alias: "Pale Yellow", type: "Absorbable", structure: "Monofilament (Natural)" },

  // ═══════════════════════════════════════════════
  // NON-ABSORBABLE — Monofilament
  // ═══════════════════════════════════════════════
  { name: "Prolene", color: "#3498DB", textColor: "white", alias: "Deep Blue", type: "Non-Absorbable", structure: "Monofilament" },
  { name: "Nylon/Ethilon", color: "#2ECC71", textColor: "white", alias: "Green", type: "Non-Absorbable", structure: "Monofilament" },
  { name: "Nurolon", color: "#1ABC9C", textColor: "white", alias: "Emerald", type: "Non-Absorbable", structure: "Braided" },
  { name: "Surgipro", color: "#2980B9", textColor: "white", alias: "Royal Blue", type: "Non-Absorbable", structure: "Monofilament" },
  { name: "Gore-Tex (CV)", color: "#ECF0F1", textColor: "black", alias: "White", type: "Non-Absorbable", structure: "Monofilament (ePTFE)" },

  // ═══════════════════════════════════════════════
  // NON-ABSORBABLE — Braided
  // ═══════════════════════════════════════════════
  { name: "Silk", color: "#34495E", textColor: "white", alias: "Black", type: "Non-Absorbable", structure: "Braided" },
  { name: "Ethibond", color: "#27AE60", textColor: "white", alias: "Forest Green", type: "Non-Absorbable", structure: "Braided" },
  { name: "Ti-Cron", color: "#5DADE2", textColor: "white", alias: "Sky Blue", type: "Non-Absorbable", structure: "Braided" },
  { name: "FiberWire", color: "#1F618D", textColor: "white", alias: "Blue/Black Braid", type: "Non-Absorbable", structure: "Braided (High Strength)" },

  // ═══════════════════════════════════════════════
  // BARBED SUTURES
  // ═══════════════════════════════════════════════
  { name: "V-Loc", color: "#48C9B0", textColor: "black", alias: "Seafoam Green", type: "Absorbable", structure: "Barbed" },
  { name: "Stratafix", color: "#5B2C6F", textColor: "white", alias: "Plum", type: "Absorbable", structure: "Barbed" },
  { name: "Quill", color: "#E59866", textColor: "black", alias: "Copper/Orange", type: "Absorbable", structure: "Barbed" },

  // ═══════════════════════════════════════════════
  // STEEL
  // ═══════════════════════════════════════════════
  { name: "Stainless Steel", color: "#BDC3C7", textColor: "black", alias: "Metallic Silver", type: "Non-Absorbable", structure: "Monofilament (Wire)" },
];

export const SUTURE_SIZES = [
  "11-0", "10-0", "9-0", "8-0", "7-0",
  "6-0", "5-0", "4-0", "3-0", "2-0",
  "0", "1", "2", "5"
];

export const NEEDLE_TYPES = [
  { code: "CT", description: "Circle Taper (General Closure)" },
  { code: "CT-1", description: "Circle Taper Large (Fascia)" },
  { code: "SH", description: "Small Half-Circle Taper" },
  { code: "RB-1", description: "Round Body Small (Bowel)" },
  { code: "FS", description: "For Skin (Reverse Cutting)" },
  { code: "FS-2", description: "For Skin Small (Face/Plastics)" },
  { code: "PS", description: "Plastic Skin (Premium Cutting)" },
  { code: "X-1", description: "Extra Small Taper (Eye/Micro)" },
  { code: "KS", description: "Keith Straight Needle" },
  { code: "UR-6", description: "Urology Taper" },
  { code: "CP", description: "Cutting Point (Tendon)" },
];
