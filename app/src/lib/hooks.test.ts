import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlayerData, useWindowDimensions } from './hooks';

// ── usePlayerData ─────────────────────────────────────────────────────────────

describe('usePlayerData', () => {
  function pluginsFor(connectedPlayers: string[], kickedPlayers: string[] = []) {
    return { player: { data: { connectedPlayers, kickedPlayers } } };
  }

  it('returns hostPlayerID as the lowest-numbered connected non-kicked player', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor(['2', '0', '1']))
    );
    expect(result.current.hostPlayerID).toBe('0');
  });

  it('skips kicked players when computing hostPlayerID', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor(['0', '1', '2'], ['0']))
    );
    expect(result.current.hostPlayerID).toBe('1');
  });

  it('returns all connected players', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor(['0', '1', '2']))
    );
    expect(result.current.connectedPlayers).toEqual(['0', '1', '2']);
  });

  it('returns kicked players list', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor(['0', '1', '2'], ['1']))
    );
    expect(result.current.kickedPlayers).toEqual(['1']);
  });

  it('defaults to hostPlayerID "0" when no connected players', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor([]))
    );
    expect(result.current.hostPlayerID).toBe('0');
  });

  it('handles null/undefined plugins gracefully', () => {
    const { result } = renderHook(() => usePlayerData(null));
    expect(result.current.hostPlayerID).toBe('0');
    expect(result.current.connectedPlayers).toEqual([]);
    expect(result.current.kickedPlayers).toEqual([]);
  });

  it('returns sorted eligible players when all are connected', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor(['3', '1', '2', '0']))
    );
    // eligible is sorted numerically; host is the first (lowest)
    expect(result.current.hostPlayerID).toBe('0');
  });

  it('handles all players being kicked', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor(['0', '1'], ['0', '1']))
    );
    // No eligible players → default '0'
    expect(result.current.hostPlayerID).toBe('0');
  });
});

// ── useWindowDimensions ───────────────────────────────────────────────────────

describe('useWindowDimensions', () => {
  beforeEach(() => {
    // jsdom defaults: innerWidth=1024, innerHeight=768
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the current window width and height', () => {
    const { result } = renderHook(() => useWindowDimensions());
    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
  });

  it('returns upright=false when width > height (landscape)', () => {
    const { result } = renderHook(() => useWindowDimensions());
    // 1024/768 ≈ 1.33 which is ≥ 1, so upright should be false
    expect(result.current.upright).toBe(false);
  });

  it('returns upright=true when width < height (portrait)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });

    const { result } = renderHook(() => useWindowDimensions());
    expect(result.current.upright).toBe(true);
  });
});
