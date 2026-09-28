import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We import after env manipulation, so we re-import inside tests via vi.resetModules().
// For the override-env tests we use a fresh module import inside a nested scope.

describe('getRegionFromMatchID', () => {
  // Import the pure function directly — it has no module-level side effects on env.
  let getRegionFromMatchID: (matchID: string) => string | undefined;

  beforeEach(async () => {
    const mod = await import('./regions.js');
    getRegionFromMatchID = mod.getRegionFromMatchID;
  });

  it('returns AP for valid match IDs ending in BCDFG', () => {
    // Valid consonant-only 4-char codes ending in each AP letter
    expect(getRegionFromMatchID('BCDB')).toBe('AP');
    expect(getRegionFromMatchID('BCDC')).toBe('AP');
    expect(getRegionFromMatchID('BCDD')).toBe('AP');
    expect(getRegionFromMatchID('BCDF')).toBe('AP');
    expect(getRegionFromMatchID('BCDG')).toBe('AP');
  });

  it('returns EU for valid match IDs ending in HJKLM', () => {
    expect(getRegionFromMatchID('BCDH')).toBe('EU');
    expect(getRegionFromMatchID('BCDJ')).toBe('EU');
    expect(getRegionFromMatchID('BCDK')).toBe('EU');
    expect(getRegionFromMatchID('BCDL')).toBe('EU');
    expect(getRegionFromMatchID('BCDM')).toBe('EU');
  });

  it('returns NA for valid match IDs ending in NPQRS', () => {
    expect(getRegionFromMatchID('BCDN')).toBe('NA');
    expect(getRegionFromMatchID('BCDP')).toBe('NA');
    expect(getRegionFromMatchID('BCDQ')).toBe('NA');
    expect(getRegionFromMatchID('BCDR')).toBe('NA');
    expect(getRegionFromMatchID('BCDS')).toBe('NA');
  });

  it('returns undefined for match IDs ending in TVWXZ (unassigned region letters)', () => {
    expect(getRegionFromMatchID('BCDT')).toBeUndefined();
    expect(getRegionFromMatchID('BCDV')).toBeUndefined();
    expect(getRegionFromMatchID('BCDW')).toBeUndefined();
    expect(getRegionFromMatchID('BCDX')).toBeUndefined();
    expect(getRegionFromMatchID('BCDZ')).toBeUndefined();
  });

  it('returns undefined for invalid match IDs', () => {
    // Too short
    expect(getRegionFromMatchID('BCD')).toBeUndefined();
    // Too long
    expect(getRegionFromMatchID('BCDFG')).toBeUndefined();
    // Contains vowels
    expect(getRegionFromMatchID('ABCD')).toBeUndefined();
    // Empty string
    expect(getRegionFromMatchID('')).toBeUndefined();
    // Lowercase
    expect(getRegionFromMatchID('bcdb')).toBeUndefined();
  });
});

describe('getServerForMatch', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the AP server for an AP match ID', async () => {
    vi.unstubAllEnvs(); // ensure no GAME_SERVER_URL
    delete process.env.GAME_SERVER_URL;
    vi.resetModules();
    const { getServerForMatch } = await import('./regions.js');
    expect(getServerForMatch('BCDB')).toBe('https://ap.blankwhite.cards');
  });

  it('returns the EU server for an EU match ID', async () => {
    delete process.env.GAME_SERVER_URL;
    vi.resetModules();
    const { getServerForMatch } = await import('./regions.js');
    expect(getServerForMatch('BCDH')).toBe('https://eu.blankwhite.cards');
  });

  it('returns the NA server for an NA match ID', async () => {
    delete process.env.GAME_SERVER_URL;
    vi.resetModules();
    const { getServerForMatch } = await import('./regions.js');
    expect(getServerForMatch('BCDN')).toBe('https://na.blankwhite.cards');
  });

  it('falls back to localhost for an unrecognised match ID', async () => {
    delete process.env.GAME_SERVER_URL;
    vi.resetModules();
    const { getServerForMatch } = await import('./regions.js');
    expect(getServerForMatch('BCDT')).toBe('http://localhost:3000');
    expect(getServerForMatch('INVALID')).toBe('http://localhost:3000');
  });

  it('returns GAME_SERVER_URL override regardless of match ID', async () => {
    vi.stubEnv('GAME_SERVER_URL', 'http://my-override.example.com');
    vi.resetModules();
    const { getServerForMatch } = await import('./regions.js');
    expect(getServerForMatch('BCDB')).toBe('http://my-override.example.com');
    expect(getServerForMatch('BCDH')).toBe('http://my-override.example.com');
    expect(getServerForMatch('BCDT')).toBe('http://my-override.example.com');
  });
});

describe('getServerForCreate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the server for an explicit region argument (case-insensitive)', async () => {
    delete process.env.GAME_SERVER_URL;
    vi.resetModules();
    const { getServerForCreate } = await import('./regions.js');
    expect(getServerForCreate('AP')).toBe('https://ap.blankwhite.cards');
    expect(getServerForCreate('ap')).toBe('https://ap.blankwhite.cards');
    expect(getServerForCreate('EU')).toBe('https://eu.blankwhite.cards');
    expect(getServerForCreate('eu')).toBe('https://eu.blankwhite.cards');
    expect(getServerForCreate('NA')).toBe('https://na.blankwhite.cards');
    expect(getServerForCreate('na')).toBe('https://na.blankwhite.cards');
  });

  it('returns GAME_SERVER_URL override regardless of region argument', async () => {
    vi.stubEnv('GAME_SERVER_URL', 'http://my-override.example.com');
    vi.resetModules();
    const { getServerForCreate } = await import('./regions.js');
    expect(getServerForCreate('AP')).toBe('http://my-override.example.com');
    expect(getServerForCreate('EU')).toBe('http://my-override.example.com');
    expect(getServerForCreate(undefined)).toBe('http://my-override.example.com');
  });

  it('falls back to auto-detection (returns a known server URL) when no region or override given', async () => {
    delete process.env.GAME_SERVER_URL;
    vi.resetModules();
    const { getServerForCreate, SERVERS } = await import('./regions.js');
    const result = getServerForCreate(undefined);
    expect(Object.values(SERVERS)).toContain(result);
  });
});
