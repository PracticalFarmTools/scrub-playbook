import { keysMatch } from './sign';

/**
 * A publishing key leaves the phone only inside a backup, locked with a passphrase the publisher chose.
 * PBKDF2-SHA256 stretches the passphrase into an AES-GCM key; a wrong passphrase fails the GCM check.
 */
export const MIN_PASSPHRASE = 8;
const ITERATIONS = 600000;

function subtle() {
  const value = globalThis.crypto?.subtle;
  if (!value) throw new Error('no-crypto');
  return value;
}

function toBase64Url(bytes) {
  let binary = '';
  new Uint8Array(bytes).forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const padded = String(text || '').replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function passphraseKey(passphrase, salt, iterations) {
  const base = await subtle().importKey('raw', new TextEncoder().encode(String(passphrase).normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function lockKey(privateJwk, passphrase, { iterations = ITERATIONS } = {}) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await passphraseKey(passphrase, salt, iterations);
  const data = await subtle().encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(privateJwk)));
  return { v: 1, kdf: 'PBKDF2-SHA256', cipher: 'AES-GCM', iterations, salt: toBase64Url(salt), iv: toBase64Url(iv), data: toBase64Url(data) };
}

/** The private key, or null when the passphrase is wrong or the locked key was changed. */
export async function unlockKey(locked, passphrase) {
  try {
    const iterations = Number(locked?.iterations);
    if (locked?.v !== 1 || !Number.isInteger(iterations) || iterations < 1) return null;
    const key = await passphraseKey(passphrase, fromBase64Url(locked.salt), iterations);
    const plain = await subtle().decrypt({ name: 'AES-GCM', iv: fromBase64Url(locked.iv) }, key, fromBase64Url(locked.data));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}

/** Places this phone can publish, because it holds their private key. */
export function keyPlaces(published) {
  return Object.entries(published || {}).filter(([, entry]) => entry?.privateKey).map(([place]) => place);
}

/** Places in a backup whose publishing key is locked. */
export function lockedPlaces(published) {
  return Object.entries(published || {}).filter(([, entry]) => entry?.lockedKey && !entry.privateKey).map(([place]) => place);
}

export async function lockPublished(published, passphrase, options) {
  const out = {};
  for (const [place, entry] of Object.entries(published || {})) {
    if (!entry?.privateKey) {
      out[place] = entry;
      continue;
    }
    const rest = { ...entry };
    delete rest.privateKey;
    out[place] = { ...rest, lockedKey: await lockKey(entry.privateKey, passphrase, options) };
  }
  return out;
}

/** Drops every place that needs a key, so a restored phone never publishes with a key it does not have. */
export function leaveKeysOut(published) {
  return Object.fromEntries(Object.entries(published || {}).filter(([, entry]) => !entry?.privateKey && !entry?.lockedKey));
}

export async function unlockPublished(published, passphrase) {
  const out = {};
  for (const [place, entry] of Object.entries(published || {})) {
    if (!entry?.lockedKey || entry.privateKey) {
      out[place] = entry;
      continue;
    }
    const privateKey = await unlockKey(entry.lockedKey, passphrase);
    if (!privateKey || !(await keysMatch(entry.publicKey, privateKey))) return { error: 'wrong-passphrase', place };
    const rest = { ...entry };
    delete rest.lockedKey;
    out[place] = { ...rest, privateKey };
  }
  return { published: out };
}
