import { CARD_STATUS, STALE_AFTER_DAYS } from './schema';

export function daysSince(iso, now = Date.now()) {
  if (!iso) return Infinity;
  return (now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Personal mode: one named person plus a clock.
 * Facility mode: two different accounts before the card reads as confirmed.
 * Stale is computed, never stored.
 */
export function trustState(procedure, { mode = 'personal', staleDays = STALE_AFTER_DAYS, now = Date.now() } = {}) {
  if (!procedure || procedure.disputed) {
    return { status: CARD_STATUS.DISPUTED, names: [], at: null };
  }
  const confs = procedure.confirmations || [];
  const names = confs.map(c => c.name).filter(Boolean);
  if (!confs.length || !procedure.lastConfirmedAt) {
    return { status: CARD_STATUS.UNCONFIRMED, names: [], at: null };
  }
  if (daysSince(procedure.lastConfirmedAt, now) > staleDays) {
    return { status: CARD_STATUS.STALE, names, at: procedure.lastConfirmedAt };
  }
  if (mode === 'facility') {
    const ids = [...new Set(confs.map(c => c.userId).filter(Boolean))];
    if (ids.length >= 2) {
      return { status: CARD_STATUS.CONFIRMED, names, at: procedure.lastConfirmedAt, people: ids.length };
    }
    return { status: CARD_STATUS.NOTED, names, at: procedure.lastConfirmedAt, people: ids.length };
  }
  return { status: CARD_STATUS.CONFIRMED, names, at: procedure.lastConfirmedAt };
}

export function withConfirmation(procedure, { name, userId = null, at = new Date().toISOString(), mode = 'personal' } = {}) {
  if (mode === 'facility' && userId) {
    const confs = [...(procedure.confirmations || [])];
    const existing = confs.findIndex(c => c.userId === userId);
    if (existing >= 0) confs[existing] = { ...confs[existing], name, at };
    else confs.push({ name, userId, at });
    return { ...procedure, disputed: false, confirmations: confs, lastConfirmedAt: at, updatedAt: at };
  }
  return {
    ...procedure,
    disputed: false,
    confirmations: [{ name, userId: null, at }],
    lastConfirmedAt: at,
    updatedAt: at,
  };
}

export function clearConfirmation(procedure, at = new Date().toISOString()) {
  return {
    ...procedure,
    confirmations: [],
    lastConfirmedAt: null,
    disputed: false,
    updatedAt: at,
  };
}

function contentKey(procedure) {
  return JSON.stringify({
    name: procedure?.name || '',
    blocks: procedure?.blocks || {},
    official: procedure?.official || {},
  });
}

/** A real edit no longer matches the case that was confirmed. */
export function applySave(previous, next, at = new Date().toISOString()) {
  const saved = { ...next, updatedAt: at };
  if (previous && contentKey(previous) === contentKey(next)) {
    return {
      ...saved,
      confirmations: previous.confirmations || [],
      lastConfirmedAt: previous.lastConfirmedAt || null,
      disputed: Boolean(previous.disputed),
    };
  }
  return stripConfirmation(saved);
}

export function stripConfirmation(procedure) {
  return {
    ...procedure,
    confirmations: [],
    lastConfirmedAt: null,
    disputed: false,
    reported: false,
    reportNote: '',
  };
}

export function worklistItems(procedures, { staleDays = STALE_AFTER_DAYS, now = Date.now() } = {}) {
  return (procedures || []).filter(procedure => {
    if (procedure.reported) return true;
    if (trustState(procedure, { mode: 'facility', staleDays, now }).status === 'stale') return true;
    if (procedure.official?.reviewedAt && procedure.updatedAt) {
      return new Date(procedure.updatedAt).getTime() > new Date(procedure.official.reviewedAt).getTime();
    }
    return false;
  });
}

/** Server row moved after this device last read it. */
export function detectConflict(localProc, remoteUpdatedAt) {
  if (!localProc?.dirty) return false;
  if (!remoteUpdatedAt || !localProc.baseUpdatedAt) return false;
  return remoteUpdatedAt !== localProc.baseUpdatedAt;
}
