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
const opponentTableCard = { id: 5, location: 'table', owner: '1', timestamp: 50, content: { title: 'Opponent table', description: '' } };
const cardsWithOpponentTable = [...cards, opponentTableCard];

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
  gameCards = cards,
}: {
  initialFocus: FocusType;
  onHotkeysReady: (setter: Dispatch<SetStateAction<HotkeysType>>) => void;
  gameCards?: typeof cards;
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
        <BlankWhiteCardsBoard {...boardProps} G={{ ...boardProps.G, cards: gameCards }} />
      </HotkeysContext.Provider>
    </FocusContext.Provider>
  );
}

const outsideFocusCases: Array<{
  origin: string;
  focus: FocusType;
  shiftTab: boolean;
  expectedID: number;
  gameCards: typeof cards;
}> = [
  { origin: 'unfocused state', focus: {}, shiftTab: false, expectedID: 1, gameCards: cards },
  { origin: 'unfocused state', focus: {}, shiftTab: true, expectedID: 3, gameCards: cards },
  { origin: 'Discard', focus: { id: 4, zone: 'discard' }, shiftTab: false, expectedID: 1, gameCards: cards },
  { origin: 'Discard', focus: { id: 4, zone: 'discard' }, shiftTab: true, expectedID: 3, gameCards: cards },
  { origin: "another player's Table", focus: { id: 5 }, shiftTab: false, expectedID: 1, gameCards: cardsWithOpponentTable },
  { origin: "another player's Table", focus: { id: 5 }, shiftTab: true, expectedID: 3, gameCards: cardsWithOpponentTable },
  { origin: 'Discard with an empty Hand', focus: { id: 4, zone: 'discard' }, shiftTab: false, expectedID: 2, gameCards: cards.filter(card => card.id !== 1) },
  { origin: "another player's Table with an empty Pile", focus: { id: 5 }, shiftTab: true, expectedID: 2, gameCards: cardsWithOpponentTable.filter(card => card.id !== 3) },
];

describe('Tab focus cycle', () => {
  it.each(outsideFocusCases)('enters the cycle from $origin (shiftTab: $shiftTab)', async ({ focus, shiftTab, expectedID, gameCards }) => {
    let setHotkeys: Dispatch<SetStateAction<HotkeysType>> = () => {};
    render(<BoardHarness initialFocus={focus} gameCards={gameCards} onHotkeysReady={(setter) => { setHotkeys = setter; }} />);

    act(() => setHotkeys(shiftTab ? { tab: true, shiftTab: true } : { tab: true }));

    await waitFor(() => expect(screen.getByTestId('focused-card').textContent).toBe(String(expectedID)));
  });

  it.each([
    { focus: { id: 2 }, shiftTab: false, expectedID: 3 },
    { focus: { id: 2 }, shiftTab: true, expectedID: 1 },
    { focus: { id: 1 }, shiftTab: true, expectedID: 3 },
    { focus: { id: 3 }, shiftTab: false, expectedID: 1 },
  ] as Array<{ focus: FocusType; shiftTab: boolean; expectedID: number }>)('cycles within the local zones (shiftTab: $shiftTab)', async ({ focus, shiftTab, expectedID }) => {
    let setHotkeys: Dispatch<SetStateAction<HotkeysType>> = () => {};
    render(<BoardHarness initialFocus={focus} onHotkeysReady={(setter) => { setHotkeys = setter; }} />);

    act(() => setHotkeys(shiftTab ? { tab: true, shiftTab: true } : { tab: true }));

    await waitFor(() => expect(screen.getByTestId('focused-card').textContent).toBe(String(expectedID)));
  });

  it.each([false, true])('keeps external focus when every cycle zone is empty (shiftTab: %s)', async (shiftTab) => {
    let setHotkeys: Dispatch<SetStateAction<HotkeysType>> = () => {};
    render(<BoardHarness initialFocus={{ id: 4, zone: 'discard' }} gameCards={cards.filter(card => card.id === 4)} onHotkeysReady={(setter) => { setHotkeys = setter; }} />);

    act(() => setHotkeys(shiftTab ? { tab: true, shiftTab: true } : { tab: true }));

    expect(screen.getByTestId('focused-card').textContent).toBe('4');
  });
});
