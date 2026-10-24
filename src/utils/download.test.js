import { describe, expect, it } from 'vitest';
import { dayStamp, slugify } from './download';

describe('slugify', () => {
  it('joins lowercase letters and digits with dashes', () => {
    expect(slugify('St. Mary’s — Main OR 2')).toBe('st-mary-s-main-or-2');
    expect(slugify('  --Ortho--  ')).toBe('ortho');
  });

  it('falls back when nothing is left', () => {
    expect(slugify('—')).toBe('place');
    expect(slugify('', 'file')).toBe('file');
    expect(slugify(null)).toBe('place');
  });
});

describe('dayStamp', () => {
  it('gives the UTC date', () => {
    expect(dayStamp(new Date('2026-10-24T23:30:00Z'))).toBe('2026-10-24');
  });
});
