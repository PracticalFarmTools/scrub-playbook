const PROCEDURE_KEYS = new Set([
  'id', 'surgeonId', 'name', 'approach', 'demo', 'disputed', 'reported', 'reportNote',
  'lastConfirmedAt', 'confirmations', 'official', 'updatedAt', 'baseUpdatedAt',
  'dirty', 'blocks', 'unitBook', 'copiedFrom', 'aliases', 'disputedAt', 'disputedBy', 'trail',
]);

const FORBIDDEN_KEY = /^(patient|patients|patientname|mrn|dob|ssn|dose|doses|lot|lotnumber|serial|serialnumber|photo|photos|price|pricing)$/i;

function walkKeys(value, found, depth) {
  if (!value || typeof value !== 'object' || depth > 8) return;
  if (Array.isArray(value)) {
    value.forEach(item => walkKeys(item, found, depth + 1));
    return;
  }
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEY.test(key.replace(/[_\s-]/g, ''))) found.push(key);
    walkKeys(value[key], found, depth + 1);
  }
}

/** Keys anywhere in a record that would hold a patient detail, a dose, a lot, or a price. */
export function forbiddenFields(record) {
  const found = [];
  walkKeys(record, found, 0);
  return [...new Set(found)];
}

/** Refuses a procedure that grew a patient, dose, lot, or price slot. */
export function validateProcedure(procedure) {
  const problems = [];
  if (!procedure || typeof procedure !== 'object') {
    return ['Procedure is missing.'];
  }
  for (const key of Object.keys(procedure)) {
    if (!PROCEDURE_KEYS.has(key)) problems.push(`Unexpected field “${key}”.`);
  }
  forbiddenFields(procedure).forEach(key => problems.push(`“${key}” cannot be stored.`));
  if (!procedure.surgeonId) problems.push('Procedure needs a surgeon.');
  if (!String(procedure.name || '').trim()) problems.push('Procedure needs a name.');
  return problems;
}
