import { afterEach, describe, expect, it, vi } from 'vitest';
import { withLock } from './locks';

afterEach(() => {
  vi.unstubAllGlobals();
});

function fakeLocks() {
  const queues = new Map();
  return {
    request(name, callback) {
      const run = (queues.get(name) || Promise.resolve()).then(() => callback());
      queues.set(name, run.catch(() => {}));
      return run;
    },
  };
}

describe('withLock', () => {
  it('runs tasks for the same lock one after another', async () => {
    vi.stubGlobal('navigator', { locks: fakeLocks() });
    const order = [];
    const slow = withLock('l', async () => {
      order.push('slow start');
      await new Promise(resolve => setTimeout(resolve, 20));
      order.push('slow end');
      return 1;
    });
    const fast = withLock('l', () => {
      order.push('fast');
      return 2;
    });
    expect(await Promise.all([slow, fast])).toEqual([1, 2]);
    expect(order).toEqual(['slow start', 'slow end', 'fast']);
  });

  it('runs the task directly where the browser has no Web Locks', async () => {
    vi.stubGlobal('navigator', {});
    await expect(withLock('l', () => 'done')).resolves.toBe('done');
  });

  it('passes a failure through', async () => {
    vi.stubGlobal('navigator', { locks: fakeLocks() });
    await expect(withLock('l', () => { throw new Error('nope'); })).rejects.toThrow('nope');
    await expect(withLock('l', () => 'next')).resolves.toBe('next');
  });
});
