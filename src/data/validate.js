const PROCEDURE_KEYS = new Set([
  'id', 'surgeonId', 'name', 'demo', 'disputed', 'reported', 'reportNote',
  'lastConfirmedAt', 'confirmations', 'official', 'updatedAt', 'baseUpdatedAt',
  'dirty', 'blocks',
]);

const FORBIDDEN_KEY = /^(patient|patients|mrn|dob|ssn|dose|doses|lot|serial|photo|photos|price|pricing)$/i;

function walkKeys(value, found, depth) {
  if (!value || typeof value !== 'object' || depth > 8) return;
  if (Array.isArray(value)) {
    value.forEach(item => walkKeys(item, found, depth + 1));
    return;
  }
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEY.test(key)) found.push(key);
    walkKeys(value[key], found, depth + 1);
  }
}

/** Facility writes refuse a procedure that grew a patient, dose, lot, or price slot. */
export function validateProcedure(procedure) {
  const problems = [];
  if (!procedure || typeof procedure !== 'object') {
    return ['Procedure is missing.'];
  }
  for (const key of Object.keys(procedure)) {
    if (!PROCEDURE_KEYS.has(key)) problems.push(`Unexpected field “${key}”.`);
  }
  const forbidden = [];
  walkKeys(procedure, forbidden, 0);
  forbidden.forEach(key => problems.push(`“${key}” cannot be stored.`));
  if (!procedure.surgeonId) problems.push('Procedure needs a surgeon.');
  if (!String(procedure.name || '').trim()) problems.push('Procedure needs a name.');
  return problems;
}
