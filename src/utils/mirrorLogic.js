/**
 * Mirror Logic Engine — Scout Sheet Orientation Module
 *
 * Resolves {{OP_SIDE}} and {{NON_OP}} tokens in free-text fields
 * based on the selected operative side (RIGHT or LEFT).
 *
 * Usage:
 *   resolveTokens('Bovie on {{OP_SIDE}} side', 'RIGHT')
 *   → 'Bovie on Right side'
 *
 *   resolveTokens('Nurse stands {{NON_OP}}', 'RIGHT')
 *   → 'Nurse stands Left'
 */

const MIRROR_MAP = {
  RIGHT: { OP_SIDE: 'Right', NON_OP: 'Left' },
  LEFT:  { OP_SIDE: 'Left',  NON_OP: 'Right' },
};

/**
 * Replace {{OP_SIDE}} and {{NON_OP}} tokens in text.
 *
 * @param {string} text — raw text that may contain tokens
 * @param {string|null} opSide — 'RIGHT', 'LEFT', or null/undefined
 * @returns {string} — resolved text (tokens replaced with values)
 *
 * When opSide is null/undefined, returns raw text unchanged.
 * Token matching is case-insensitive: {{op_side}}, {{OP_SIDE}}, {{Op_Side}} all work.
 */
export function resolveTokens(text, opSide) {
  if (!text || typeof text !== 'string') return text || '';
  if (!opSide || !MIRROR_MAP[opSide]) return text;

  const map = MIRROR_MAP[opSide];
  return text
    .replace(/\{\{OP_SIDE\}\}/gi, map.OP_SIDE)
    .replace(/\{\{NON_OP\}\}/gi, map.NON_OP);
}

/**
 * Check if text contains any mirror tokens.
 * Useful for showing a hint that tokens are available.
 */
export function hasTokens(text) {
  if (!text) return false;
  return /\{\{(OP_SIDE|NON_OP)\}\}/i.test(text);
}

/** Valid operative side values */
export const OP_SIDES = ['RIGHT', 'LEFT'];
