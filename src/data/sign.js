export const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' };
export const SIGN = { name: 'ECDSA', hash: 'SHA-256' };

export function subtle() {
  const value = globalThis.crypto?.subtle;
  if (!value) throw new Error('no-crypto');
  return value;
}

/** JSON with sorted keys, so the publisher and the reader sign and check the same bytes. */
export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(item => (item === undefined ? 'null' : canonicalJson(item))).join(',')}]`;
  const keys = Object.keys(value).filter(key => value[key] !== undefined).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

export function toBase64Url(bytes) {
  let binary = '';
  new Uint8Array(bytes).forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text) {
  const padded = String(text || '').replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function publicPart(jwk) {
  return { crv: jwk?.crv, kty: jwk?.kty, x: jwk?.x, y: jwk?.y };
}

export async function generateSigningKey() {
  const pair = await subtle().generateKey(ALGORITHM, true, ['sign', 'verify']);
  const [publicKey, privateKey] = await Promise.all([
    subtle().exportKey('jwk', pair.publicKey),
    subtle().exportKey('jwk', pair.privateKey),
  ]);
  return { publicKey: publicPart(publicKey), privateKey };
}

/** Short, readable id of a publisher key, such as "3F2A-91C0-77DE-0B14". */
export async function keyFingerprint(publicJwk) {
  const digest = await subtle().digest('SHA-256', new TextEncoder().encode(canonicalJson(publicPart(publicJwk))));
  const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return (hex.slice(0, 16).match(/.{4}/g) || []).join('-');
}

function unsigned(file) {
  const copy = { ...file };
  delete copy.signature;
  return copy;
}

export async function signFile(file, privateJwk) {
  const key = await subtle().importKey('jwk', privateJwk, ALGORITHM, false, ['sign']);
  const signature = await subtle().sign(SIGN, key, new TextEncoder().encode(canonicalJson(unsigned(file))));
  return { ...file, signature: toBase64Url(signature) };
}

/** `{ ok: true, fingerprint }` when the file was signed by the key it carries and nothing changed since. */
export async function verifyFile(file) {
  try {
    if (!file?.publicKey || !file?.signature) return { ok: false, reason: 'unsigned' };
    const key = await subtle().importKey('jwk', publicPart(file.publicKey), ALGORITHM, false, ['verify']);
    const ok = await subtle().verify(SIGN, key, fromBase64Url(file.signature), new TextEncoder().encode(canonicalJson(unsigned(file))));
    if (!ok) return { ok: false, reason: 'changed' };
    return { ok: true, fingerprint: await keyFingerprint(file.publicKey) };
  } catch {
    return { ok: false, reason: 'changed' };
  }
}

/** True when the private key belongs to the public key, checked by signing and verifying a test message. */
export async function keysMatch(publicJwk, privateJwk) {
  try {
    const probe = await signFile({ probe: 'scrubplaybook', publicKey: publicPart(publicJwk) }, privateJwk);
    return (await verifyFile(probe)).ok;
  } catch {
    return false;
  }
}
