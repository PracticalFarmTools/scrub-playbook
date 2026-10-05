import { getSupabaseClient } from './supabaseClient';
import { emptyBlocks } from '../data/schema';
import { validateProcedure } from '../data/validate';

export function cacheKey(facilityId) {
  return `scrubplaybook_facility_cache_${facilityId}`;
}

export function rowToSurgeon(row) {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    facility: '',
    demo: false,
    createdAt: row.created_at,
    addedBy: '',
  };
}

export function rowToProcedure(row) {
  const body = row.body || {};
  return {
    id: row.id,
    surgeonId: row.surgeon_id,
    name: row.name,
    demo: false,
    disputed: Boolean(row.disputed),
    reported: Boolean(row.reported),
    reportNote: row.report_note || '',
    lastConfirmedAt: row.last_confirmed_at,
    confirmations: row.confirmations || [],
    official: {
      label: row.official_label || '',
      reviewedAt: row.official_reviewed_at,
      note: row.official_note || '',
    },
    updatedAt: row.updated_at,
    baseUpdatedAt: row.updated_at,
    dirty: false,
    blocks: body.blocks || emptyBlocks(),
  };
}

export function procedureToRow(procedure, facilityId) {
  const problems = validateProcedure({ ...procedure, dirty: undefined });
  if (problems.length) {
    const error = new Error(problems[0]);
    error.problems = problems;
    throw error;
  }
  return {
    id: procedure.id,
    facility_id: facilityId,
    surgeon_id: procedure.surgeonId,
    name: procedure.name,
    body: { blocks: procedure.blocks },
    confirmations: procedure.confirmations || [],
    last_confirmed_at: procedure.lastConfirmedAt,
    disputed: Boolean(procedure.disputed),
    reported: Boolean(procedure.reported),
    report_note: procedure.reportNote || null,
    official_label: procedure.official?.label || null,
    official_reviewed_at: procedure.official?.reviewedAt || null,
    official_note: procedure.official?.note || null,
  };
}

export async function client() {
  return getSupabaseClient();
}

export async function signInWithEmail(email) {
  const supabase = await client();
  return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
}

export async function signOut() {
  const supabase = await client();
  return supabase.auth.signOut();
}

export function readCache(facilityId) {
  try {
    const raw = localStorage.getItem(cacheKey(facilityId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeCache(facilityId, snapshot) {
  localStorage.setItem(cacheKey(facilityId), JSON.stringify(snapshot));
}
