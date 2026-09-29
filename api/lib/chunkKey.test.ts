import { describe, it, expect } from 'vitest';
import { chunkKey } from './chunkKey.js';

describe('chunkKey', () => {
  it('returns "001" for index 0', () => {
    expect(chunkKey(0)).toBe('001');
  });

  it('returns "101" for index 1', () => {
    expect(chunkKey(1)).toBe('101');
  });

  it('returns "901" for index 9', () => {
    expect(chunkKey(9)).toBe('901');
  });

  it('returns "1001" for index 10 (no padding needed beyond 3 digits)', () => {
    expect(chunkKey(10)).toBe('1001');
  });
});
