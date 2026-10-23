import { describe, expect, it } from 'vitest';
import { generateSigningKey, keysMatch } from './sign';
import { keyPlaces, leaveKeysOut, lockKey, lockPublished, lockedPlaces, unlockKey, unlockPublished } from './keyLock';

const fast = { iterations: 1000 };

async function publishedWithKey() {
  const pair = await generateSigningKey();
  return {
    pair,
    published: {
      Main: { unitBookId: 'u1', revision: 3, publicKey: pair.publicKey, privateKey: pair.privateKey, fingerprint: 'AAAA' },
      West: { settings: { staleDays: 60, dictation: true, twoPerson: false } },
    },
  };
}

describe('locking the publishing key in a backup', () => {
  it('unlocks with the same passphrase and not with another', async () => {
    const { pair } = await publishedWithKey();
    const locked = await lockKey(pair.privateKey, 'blue heron 42', fast);
    expect(JSON.stringify(locked)).not.toContain(pair.privateKey.d);
    expect(locked).toMatchObject({ v: 1, kdf: 'PBKDF2-SHA256', cipher: 'AES-GCM', iterations: 1000 });
    expect(await unlockKey(locked, 'blue heron 42')).toEqual(pair.privateKey);
    expect(await unlockKey(locked, 'blue heron 43')).toBeNull();
    expect(await unlockKey({ ...locked, data: `${locked.data.slice(0, -2)}AA` }, 'blue heron 42')).toBeNull();
  });

  it('uses a fresh salt each time', async () => {
    const { pair } = await publishedWithKey();
    const one = await lockKey(pair.privateKey, 'same words here', fast);
    const two = await lockKey(pair.privateKey, 'same words here', fast);
    expect(one.salt).not.toBe(two.salt);
    expect(one.data).not.toBe(two.data);
  });

  it('locks every place that has a key and leaves the rest as they are', async () => {
    const { pair, published } = await publishedWithKey();
    expect(keyPlaces(published)).toEqual(['Main']);
    const locked = await lockPublished(published, 'blue heron 42', fast);
    expect(locked.Main.privateKey).toBeUndefined();
    expect(locked.Main.lockedKey).toBeTruthy();
    expect(locked.Main.publicKey).toEqual(pair.publicKey);
    expect(locked.West).toEqual(published.West);
    expect(lockedPlaces(locked)).toEqual(['Main']);
    expect(keyPlaces(locked)).toEqual([]);

    const back = await unlockPublished(locked, 'blue heron 42');
    expect(back.published.Main.lockedKey).toBeUndefined();
    expect(await keysMatch(back.published.Main.publicKey, back.published.Main.privateKey)).toBe(true);
    expect(await unlockPublished(locked, 'wrong words')).toEqual({ error: 'wrong-passphrase', place: 'Main' });
  });

  it('refuses a locked key that belongs to a different public key', async () => {
    const { published } = await publishedWithKey();
    const other = await generateSigningKey();
    const locked = await lockPublished(published, 'blue heron 42', fast);
    locked.Main.publicKey = other.publicKey;
    expect((await unlockPublished(locked, 'blue heron 42')).error).toBe('wrong-passphrase');
  });

  it('leaves out every place that needs a key', async () => {
    const { published } = await publishedWithKey();
    expect(leaveKeysOut(published)).toEqual({ West: published.West });
    expect(leaveKeysOut(await lockPublished(published, 'blue heron 42', fast))).toEqual({ West: published.West });
  });
});
