import { ALGORITHM, SIGN, canonicalJson, fromBase64Url, keyFingerprint, subtle, toBase64Url } from './sign';
import { normalizeBlocks } from './schema';
import { cleanAliases } from './boardMatch';
import { readValue, storageWhere, writeValue } from './store';
import { withLock } from '../utils/locks';

export const TRAIL_MAX = 10;
export const DEVICE_KEY = 'scrubplaybook_device_key';
const DEVICE_LOCK = 'scrubplaybook-device-key';
const NAME_MAX = 80;

/**
 * @typedef {'created' | 'edited' | 'copied' | 'earlier-version'} EditAction
 * @typedef {object} SignedEdit One saved change to a card, signed by the phone that saved it.
 * @property {1} v
 * @property {string} at When it was saved.
 * @property {string} by The name typed by whoever saved it. Not checked against anything.
 * @property {EditAction} action
 * @property {string} content SHA-256 of the card's content after this change.
 * @property {string | null} prev SHA-256 of the record before this one, so none can be taken out of the middle.
 * @property {{ x: string, y: string }} key The public key of the phone that signed it.
 * @property {string} sig
 * @typedef {{ entry: SignedEdit, ok: boolean, fingerprint: string, mine: boolean }} CheckedEdit
 * @typedef {{ status: 'unsigned' | 'broken' | 'changed' | 'signed', entries: CheckedEdit[], trimmed: boolean }} TrailCheck
 */

/** Drops what sharing drops, so a card reads the same before and after it travels. */
function compact(value) {
  if (Array.isArray(value)) {
    const list = value.map(compact).filter(item => item !== undefined);
    return list.length ? list : undefined;
  }
  if (value && typeof value === 'object') {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, raw] of Object.entries(value)) {
      if (key === 'source' && raw === 'observed') continue;
      const next = compact(raw);
      if (next !== undefined) out[key] = next;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (value === '' || value === null || value === undefined || value === false) return undefined;
  return value;
}

/** What a signature vouches for: the card as someone reads it, not who confirmed it or when. */
export function signedContent(procedure) {
  return canonicalJson(compact({
    name: procedure?.name,
    approach: procedure?.approach,
    aliases: cleanAliases(procedure?.aliases),
    blocks: normalizeBlocks(procedure?.blocks),
    official: { label: procedure?.official?.label, note: procedure?.official?.note },
  }) ?? {});
}

async function sha256(text) {
  return toBase64Url(await subtle().digest('SHA-256', new TextEncoder().encode(text)));
}

export function contentHash(procedure) {
  return sha256(signedContent(procedure));
}

function publicJwk(key) {
  return { kty: 'EC', crv: 'P-256', x: key?.x, y: key?.y };
}

function body(entry) {
  const copy = { ...entry };
  delete copy.sig;
  return copy;
}

function entryHash(entry) {
  return sha256(canonicalJson(entry));
}

let devicePromise = null;

export function resetDeviceKeyForTests() {
  devicePromise = null;
}

async function readDeviceKey() {
  const stored = await readValue(DEVICE_KEY);
  if (!stored?.publicKey?.x || !stored.fingerprint) return null;
  if (stored.privateKey && typeof stored.privateKey === 'object' && stored.privateKey.type === 'private') {
    return { privateKey: stored.privateKey, publicKey: stored.publicKey, fingerprint: stored.fingerprint };
  }
  if (stored.privateJwk) {
    const privateKey = await subtle().importKey('jwk', stored.privateJwk, ALGORITHM, false, ['sign']);
    return { privateKey, publicKey: stored.publicKey, fingerprint: stored.fingerprint };
  }
  return null;
}

async function makeDeviceKey(extractable) {
  const pair = await subtle().generateKey(ALGORITHM, extractable, ['sign', 'verify']);
  const jwk = await subtle().exportKey('jwk', pair.publicKey);
  const publicKey = { x: jwk.x, y: jwk.y };
  const fingerprint = await keyFingerprint(publicJwk(publicKey));
  const record = extractable
    ? { v: 1, privateJwk: await subtle().exportKey('jwk', pair.privateKey), publicKey, fingerprint, createdAt: new Date().toISOString() }
    : { v: 1, privateKey: pair.privateKey, publicKey, fingerprint, createdAt: new Date().toISOString() };
  const saved = await writeValue(DEVICE_KEY, record);
  return saved.ok ? { privateKey: pair.privateKey, publicKey, fingerprint } : null;
}

/**
 * This phone's signing key, made the first time a card is saved. In IndexedDB the private key is
 * kept as a key the browser will not export; where only localStorage works it is kept as text.
 * It is never put in a backup, a shared card, or a unit book.
 */
export function deviceKey() {
  if (!devicePromise) {
    devicePromise = withLock(DEVICE_LOCK, async () => {
      const found = await readDeviceKey();
      if (found) return found;
      const lasting = (await storageWhere()) === 'indexeddb';
      const made = (lasting ? await makeDeviceKey(false).catch(() => null) : null) || await makeDeviceKey(true);
      if (!made) throw new Error('no-key-storage');
      return made;
    }).catch(error => {
      devicePromise = null;
      throw error;
    });
  }
  return devicePromise;
}

/** This phone's fingerprint, or null before it has signed anything. Never makes a key. */
export async function thisPhoneFingerprint() {
  if (devicePromise) return (await devicePromise.catch(() => null))?.fingerprint || null;
  try {
    return (await readValue(DEVICE_KEY))?.fingerprint || null;
  } catch {
    return null;
  }
}

function cleanTrail(trail) {
  return (Array.isArray(trail) ? trail : []).filter(entry => entry && typeof entry === 'object').slice(-TRAIL_MAX);
}

/**
 * The card's trail with one more signed record for its current content.
 * @param {import('./types').Procedure} procedure
 * @param {{ by?: string, action: EditAction, at?: string }} edit
 * @returns {Promise<SignedEdit[]>}
 */
export async function addSignedEdit(procedure, { by = '', action, at = new Date().toISOString() }) {
  const key = await deviceKey();
  const trail = cleanTrail(procedure.trail);
  const last = trail.at(-1);
  const unsigned = {
    v: 1,
    at,
    by: String(by || '').trim().slice(0, NAME_MAX),
    action,
    content: await contentHash(procedure),
    prev: last ? await entryHash(last) : null,
    key: { x: key.publicKey.x, y: key.publicKey.y },
  };
  const sig = await subtle().sign(SIGN, key.privateKey, new TextEncoder().encode(canonicalJson(unsigned)));
  return [...trail, /** @type {SignedEdit} */ ({ ...unsigned, sig: toBase64Url(sig) })].slice(-TRAIL_MAX);
}

async function verifyEntry(entry) {
  try {
    if (entry?.v !== 1 || typeof entry.sig !== 'string' || !entry.key?.x || !entry.key?.y) return false;
    const key = await subtle().importKey('jwk', publicJwk(entry.key), ALGORITHM, false, ['verify']);
    return await subtle().verify(SIGN, key, fromBase64Url(entry.sig), new TextEncoder().encode(canonicalJson(body(entry))));
  } catch {
    return false;
  }
}

/** @type {WeakMap<object, Promise<TrailCheck>>} */
const checked = new WeakMap();

/** @returns {Promise<TrailCheck>} */
async function runCheck(procedure) {
  const trail = Array.isArray(procedure?.trail) ? procedure.trail : [];
  if (!trail.length) return { status: 'unsigned', entries: [], trimmed: false };
  const mine = await thisPhoneFingerprint();
  /** @type {CheckedEdit[]} */
  const entries = [];
  for (let index = 0; index < trail.length; index += 1) {
    const entry = trail[index];
    const signed = await verifyEntry(entry);
    const chained = index === 0 || entry?.prev === await entryHash(trail[index - 1]);
    const fingerprint = signed ? await keyFingerprint(publicJwk(entry.key)) : '';
    entries.push({ entry, ok: signed && chained, fingerprint, mine: Boolean(mine) && fingerprint === mine });
  }
  const intact = entries.every(item => item.ok);
  const current = trail.at(-1)?.content === await contentHash(procedure);
  return {
    status: !intact ? 'broken' : current ? 'signed' : 'changed',
    entries: entries.reverse(),
    trimmed: Boolean(trail[0]?.prev),
  };
}

/**
 * Checks every record on the card: each signature, each link to the record before it, and whether
 * the card still has the content the newest record signed.
 * @returns {Promise<TrailCheck>}
 */
export function checkTrail(procedure) {
  if (!procedure || typeof procedure !== 'object') return runCheck(procedure);
  const found = checked.get(procedure);
  if (found) return found;
  /** @type {Promise<TrailCheck>} */
  const running = runCheck(procedure).catch(() => ({ status: 'broken', entries: [], trimmed: false }));
  checked.set(procedure, running);
  return running;
}

export function actionText(action) {
  switch (action) {
    case 'created': return 'Made the card';
    case 'copied': return 'Copied it into their notes';
    case 'earlier-version': return 'Brought back an earlier version';
    case 'edited': return 'Edited the card';
    default: return 'Changed the card';
  }
}
