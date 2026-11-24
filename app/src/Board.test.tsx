import { act, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps, Dispatch, SetStateAction } from 'react';
import { useCallback, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BlankWhiteCardsBoard } from './Board';
import { FocusContext, HotkeysContext } from './lib/contexts';
import type { FocusType, HotkeysType } from './lib/contexts';

vi.mock('wired-elements', () => ({}));
vi.mock('./Components/ActionSpace.tsx', () => ({ ActionSpace: () => null }));
vi.mock('./Components/CommonSpace.tsx', () => ({ CommonSpace: () => null }));
vi.mock('./Components/PlayerSpace.tsx', () => ({ PlayerSpace: () => null }));
vi.mock('./Components/Console.tsx', () => ({ Console: () => null }));
vi.mock('./Components/Calculator.tsx', () => ({ Calculator: () => null }));

const cards = [
  { id: 1, location: 'hand', owner: '0', timestamp: 10, content: { title: 'Hand', description: '' } },
  { id: 2, location: 'table', owner: '0', timestamp: 20, content: { title: 'Table', description: '' } },
  { id: 3, location: 'pile', timestamp: 30, content: { title: 'Pile', description: '' } },
  { id: 4, location: 'discard', timestamp: 40, content: { title: 'Discard', description: '' } },
];

const boardProps = {
  G: { cards },
  playerID: '0',
  matchID: 'TEST',
  isMultiplayer: true,
  matchData: [],
  plugins: { player: { data: { players: { '0': { score: 0 } }, connectedPlayers: ['0'], kickedPlayers: [] } } },
  moves: {},
  ctx: {},
} as unknown as ComponentProps<typeof BlankWhiteCardsBoard>;

function BoardHarness({
  initialFocus,
  onHotkeysReady,
}: {
  initialFocus: FocusType;
  onHotkeysReady: (setter: Dispatch<SetStateAction<HotkeysType>>) => void;
}) {
  const [focus, setFocusState] = useState(initialFocus);
  const [hotkeys, setHotkeys] = useState<HotkeysType>({});
  onHotkeysReady(setHotkeys);
  const setFocus = useCallback<Dispatch<SetStateAction<FocusType>>>((next) => {
    setFocusState(next);
    setHotkeys({});
  }, []);

  return (
    <FocusContext.Provider value={{ focus, setFocus }}>
      <HotkeysContext.Provider value={{ hotkeys, setHotkeys }}>
        <output data-testid="focused-card">{focus.id ?? 'none'}</output>
        <BlankWhiteCardsBoard {...boardProps} />
      </HotkeysContext.Provider>
    </FocusContext.Provider>
  );
}

describe('Discard and the Tab focus cycle', () => {
  it.each([
    { shiftTab: false, expectedID: 3 },
    { shiftTab: true, expectedID: 1 },
  ])('cycles from Table with Tab (shiftTab: $shiftTab) without including Discard', async ({ shiftTab, expectedID }) => {
    let setHotkeys: Dispatch<SetStateAction<HotkeysType>> = () => {};
    render(<BoardHarness initialFocus={{ id: 2 }} onHotkeysReady={(setter) => { setHotkeys = setter; }} />);

    act(() => setHotkeys(shiftTab ? { tab: true, shiftTab: true } : { tab: true }));

    await waitFor(() => expect(screen.getByTestId('focused-card').textContent).toBe(String(expectedID)));
  });
});
