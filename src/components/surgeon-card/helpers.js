import { SURGICAL_GLOVES } from '../../data/gloves';
import { SUTURE_LIBRARY } from '../../data/sutures';
import { GLOVE_COLORS } from '../../data/constants';

// ── Static option lists ──
export const ALL_GLOVE_OPTIONS = SURGICAL_GLOVES.map(g => ({
  id: g.id, value: g.id, label: `${g.brand} – ${g.model}`, model: g.model, brand: g.brand, color: g.color,
  sublabel: `${g.type} · ${g.alias}`, type: g.type,
}));

/** Detect if a glove type string contains "latex" (but not "latex-free" or "non-latex") */
export function isLatexType(type) {
  if (!type) return false;
  const t = type.toLowerCase();
  return t.includes('latex') && !t.includes('latex-free') && !t.includes('non-latex');
}

/** Get glove options — when latexFree is on, marks latex gloves with `isLatex: true` instead of hiding them */
export function getGloveOptions(latexFree) {
  if (!latexFree) return ALL_GLOVE_OPTIONS;
  return ALL_GLOVE_OPTIONS.map(g => ({
    ...g,
    isLatex: isLatexType(g.type),
  }));
}

export const SUTURE_OPTIONS = SUTURE_LIBRARY.map(s => ({
  value: s.name, label: s.name,
  sublabel: `${s.type} · ${s.structure} · ${s.alias}`,
  color: s.color,
}));

export const EMPTY_ASSIST = { name: '', role: 'PA', gloveId: SURGICAL_GLOVES[0]?.id, gloveSize: '7.0' };

export const INPUT_CLASS = "w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50 transition-all placeholder-slate-400";

export { GLOVE_COLORS };
