import { describe, it, expect, beforeEach } from 'vitest';
import { dbManager } from './indexedDB';

// fake-indexeddb is installed globally via setup.ts
// Each test uses a fresh dbManager instance — the module-level singleton is
// fine because fake-indexeddb creates a fresh in-memory store per process.

describe('IndexedDBManager', () => {
  describe('set and get', () => {
    it('stores and retrieves a string value', async () => {
      await dbManager.set('key1', 'hello');
      const result = await dbManager.get('key1');
      expect(result).toBe('hello');
    });

    it('stores and retrieves a number', async () => {
      await dbManager.set('num', 42);
      const result = await dbManager.get('num');
      expect(result).toBe(42);
    });

    it('stores and retrieves a plain object', async () => {
      const obj = { cards: [{ id: 1, title: 'T' }] };
      await dbManager.set('deck', obj);
      const result = await dbManager.get('deck');
      expect(result).toEqual(obj);
    });

    it('overwrites an existing value', async () => {
      await dbManager.set('overwrite', 'first');
      await dbManager.set('overwrite', 'second');
      const result = await dbManager.get('overwrite');
      expect(result).toBe('second');
    });

    it('stores null', async () => {
      await dbManager.set('nullkey', null);
      const result = await dbManager.get('nullkey');
      expect(result).toBeNull();
    });
  });

  describe('get for missing key', () => {
    it('returns null for a key that was never set', async () => {
      const result = await dbManager.get('nonexistent_key_xyz');
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('removes a key so get returns null', async () => {
      await dbManager.set('toDelete', 'bye');
      await dbManager.remove('toDelete');
      const result = await dbManager.get('toDelete');
      expect(result).toBeNull();
    });

    it('does not throw when removing a non-existent key', async () => {
      await expect(dbManager.remove('does_not_exist_abc')).resolves.not.toThrow();
    });
  });
});
