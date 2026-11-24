import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlayerData, useWindowDimensions } from './hooks';

// ── usePlayerData ─────────────────────────────────────────────────────────────

describe('usePlayerData', () => {
  function pluginsFor(kickedPlayers: string[] = [], connectedPlayers = ['0']) {
    return { player: { data: { connectedPlayers, kickedPlayers } } };
  }

  function matchDataFor(connectedPlayers: string[], allPlayers = connectedPlayers) {
    return allPlayers.map((id) => ({
      id: Number(id),
      name: `Player ${id}`,
      isConnected: connectedPlayers.includes(id),
    }));
  }

  it('returns the lowest-numbered connected non-kicked player', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor(), matchDataFor(['2', '0', '1']))
    );
    expect(result.current.hostPlayerID).toBe('0');
  });

  it('skips kicked players when computing hostPlayerID', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor(['0']), matchDataFor(['0', '1', '2']))
    );
    expect(result.current.hostPlayerID).toBe('1');
  });

  it('returns connected players from server match data', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor([], ['0']), matchDataFor(['0', '2'], ['0', '1', '2']))
    );
    expect(result.current.connectedPlayers).toEqual(['0', '2']);
  });

  it('ignores stale plugin connection data', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor([], ['0']), matchDataFor(['1'], ['0', '1']))
    );
    expect(result.current.hostPlayerID).toBe('1');
    expect(result.current.connectedPlayers).toEqual(['1']);
  });

  it('does not elect a joined but disconnected player', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor(), matchDataFor([], ['0']))
    );
    expect(result.current.hostPlayerID).toBe('0');
  });

  it('returns kicked players from plugin state', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor(['1']), matchDataFor(['0', '1']))
    );
    expect(result.current.kickedPlayers).toEqual(['1']);
  });

  it('defaults to hostPlayerID "0" when no connected players', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor(), [])
    );
    expect(result.current.hostPlayerID).toBe('0');
  });

  it('handles null/undefined plugins gracefully', () => {
    const { result } = renderHook(() => usePlayerData(null, null));
    expect(result.current.hostPlayerID).toBe('0');
    expect(result.current.connectedPlayers).toEqual([]);
    expect(result.current.kickedPlayers).toEqual([]);
  });

  it('uses numeric ordering for player IDs above 9', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor(), matchDataFor(['10', '2', '1']))
    );
    expect(result.current.hostPlayerID).toBe('1');
  });

  it('updates host election when players disconnect and reconnect', () => {
    const { result, rerender } = renderHook(
      ({ matchData }) => usePlayerData(pluginsFor(), matchData),
      { initialProps: { matchData: matchDataFor(['0', '1']) } }
    );
    expect(result.current.hostPlayerID).toBe('0');

    rerender({ matchData: matchDataFor(['1'], ['0', '1']) });
    expect(result.current.hostPlayerID).toBe('1');

    rerender({ matchData: matchDataFor(['0', '1']) });
    expect(result.current.hostPlayerID).toBe('0');
  });

  it('falls back to player 0 when all connected players are kicked', () => {
    const { result } = renderHook(() =>
      usePlayerData(pluginsFor(['0', '1']), matchDataFor(['0', '1']))
    );
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
