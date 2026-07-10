import type { BoardProps } from '@mcteamster/white-engine/react';
import type { GameState } from '@mcteamster/white-core'
import type { Properties } from 'csstype';
import { getCardsByLocation, getCardsByOwner } from '@mcteamster/white-core';
import { ActionSpace } from './Components/ActionSpace.tsx';
import { CommonSpace } from './Components/CommonSpace.tsx';
import { PlayerSpace } from './Components/PlayerSpace.tsx';
import { Console } from './Components/Console.tsx';
import { Calculator } from './Components/Calculator.tsx';
import { useWindowDimensions } from './lib/hooks.ts';
import { discordSdk } from './lib/discord.ts';

// Web Components from https://wiredjs.com/
import 'wired-elements';
import { useCallback, useContext, useEffect, useReducer, useState } from 'react';
import { FocusContext, HotkeysContext, ImageCacheContext, ImageCacheType } from './lib/contexts.ts';
declare global {
  namespace React.JSX {
    interface IntrinsicElements {
      'wired-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number }, HTMLElement>;
      'wired-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number }, HTMLElement>;
      'wired-dialog': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number, open?: boolean }, HTMLElement>;
      'wired-image': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number, src?: string }, HTMLElement>;
      'wired-input': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number, placeholder?: string, minlength?: number, maxlength?: number, value?: string }, HTMLElement>;
      'wired-radio': React.DetailedHTMLProps<React.HTMLAttributes<HTMLInputElement> & { elevation?: number, value?: string, name?: string }, HTMLInputElement>;
      'wired-textarea': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number }, HTMLElement>;
    }
  }
}

// Board
export function BlankWhiteCardsBoard(props: BoardProps<GameState>) {
  const dimensions = useWindowDimensions();

  const boardStyle: Properties<string | number> = {
    minHeight: 'calc(90vh - 70px)',
    width: '97vw',
    display: 'grid',
    gridTemplateColumns: 'auto auto auto auto auto auto auto auto auto',
    gridTemplateRows: `${ (discordSdk && dimensions.upright) ? '6em' : '5vh'} auto auto auto auto auto auto auto 7em`,
  };

  // Image Cache
  const [imageCache, dispatchImage] = useReducer((cache: ImageCacheType, image: { id: number, value: string }) => {
    cache[image.id] = image.value;
    return cache
  }, {})

  // Mutual exclusion on mobile: chat and players tray can't both be open
  const [playersMode, setPlayersMode] = useState<'hidden' | 'collapsed' | 'expanded'>(dimensions.upright ? 'hidden' : 'expanded');
  const showPlayers = playersMode !== 'hidden';
  const allExpanded = playersMode === 'expanded';
  const [chatOpen, setChatOpen] = useState(false);

  const isMobile = dimensions.width < 600;

  const handleSetShowPlayers = useCallback<React.Dispatch<React.SetStateAction<boolean>>>((value) => {
    setPlayersMode(prev => {
      const wasVisible = prev !== 'hidden';
      const next = typeof value === 'function' ? value(wasVisible) : value;
      if (next && isMobile) setChatOpen(false);
      return next ? 'collapsed' : 'hidden';
    });
  }, [isMobile]);

  const handleSetChatOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>((value) => {
    setChatOpen(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      if (next && isMobile) setPlayersMode('hidden');
      return next;
    });
  }, [isMobile]);

  // Hotkey consumers for board-level actions
  const { hotkeys } = useContext(HotkeysContext);
  const { focus, setFocus } = useContext(FocusContext);

  // 5.3 Number key focus logic: focus Nth other player's first table card
  useEffect(() => {
    if (focus?.id) return; // 5.4: no effect when a card is already focused
    const numberKeys = [hotkeys.n1, hotkeys.n2, hotkeys.n3, hotkeys.n4, hotkeys.n5, hotkeys.n6, hotkeys.n7, hotkeys.n8, hotkeys.n9, hotkeys.n0];
    const pressedIndex = numberKeys.findIndex(k => k === true);
    if (pressedIndex === -1) return;

    // Get other players sorted by join order (matchData order), excluding local player
    const otherPlayers = props.matchData?.filter(p => p.isConnected && p.name && p.id !== Number(props.playerID)) ?? [];
    if (pressedIndex >= otherPlayers.length) return; // 5.5: no effect if fewer players than number pressed

    const targetPlayer = otherPlayers[pressedIndex];
    const tableCards = getCardsByLocation(getCardsByOwner(props.G.cards, String(targetPlayer.id)), 'table')
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // Oldest to Newest

    if (tableCards.length === 0) return; // 5.5: no effect if target has no table cards
    setFocus({ id: tableCards[tableCards.length - 1].id });
  }, [hotkeys.n1, hotkeys.n2, hotkeys.n3, hotkeys.n4, hotkeys.n5, hotkeys.n6, hotkeys.n7, hotkeys.n8, hotkeys.n9, hotkeys.n0, focus?.id, props.matchData, props.playerID, props.G.cards, setFocus]);

  // 6.3-6.6 Panel toggle hotkeys
  useEffect(() => {
    if (hotkeys.backtick) {
      handleSetChatOpen(prev => !prev);
    }
  }, [hotkeys.backtick, handleSetChatOpen]);

  // Equals key opens/closes score calculator for local player
  const [scoreCalcOpen, setScoreCalcOpen] = useState(false);
  useEffect(() => {
    if (hotkeys.equals) {
      setScoreCalcOpen(prev => !prev);
    }
  }, [hotkeys.equals]);

  useEffect(() => {
    if (hotkeys.p) {
      setPlayersMode(prev => {
        if (isMobile) setChatOpen(false);
        if (prev === 'hidden') return 'collapsed';
        if (prev === 'collapsed') return 'expanded';
        return 'hidden';
      });
    }
  }, [hotkeys.p, isMobile]);

  // 7.2-7.5 Tab zone cycling
  useEffect(() => {
    if (!hotkeys.tab) return;

    // Determine zone order: Hand → Table → Pile
    const myHand = getCardsByLocation(getCardsByOwner(props.G.cards, props.playerID || '0'), 'hand')
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const myTable = getCardsByLocation(getCardsByOwner(props.G.cards, props.playerID || '0'), 'table')
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const pile = getCardsByLocation(props.G.cards, 'pile')
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Newest to Oldest

    const zones = [
      { name: 'hand', cards: myHand },
      { name: 'table', cards: myTable },
      { name: 'pile', cards: pile },
    ].filter(z => z.cards.length > 0);

    if (zones.length === 0) return;

    // Determine current zone from focused card
    let currentZoneIndex = -1;
    if (focus?.id) {
      const focusedCard = props.G.cards.find(c => c.id === focus.id);
      if (focusedCard) {
        currentZoneIndex = zones.findIndex(z => z.name === focusedCard.location);
      }
    }

    // Shift+Tab cycles backwards, Tab cycles forward
    const direction = hotkeys.shiftTab ? -1 : 1;
    const nextIndex = (currentZoneIndex + direction + zones.length) % zones.length;
    const targetZone = zones[nextIndex];
    if (targetZone.cards.length > 0) {
      // Newest card: last item for hand/table (sorted oldest-first), first item for pile (sorted newest-first)
      const newestCard = targetZone.name === 'pile' ? targetZone.cards[0] : targetZone.cards[targetZone.cards.length - 1];
      setFocus({ id: newestCard.id });
    }
  }, [hotkeys.tab, hotkeys.shiftTab, focus?.id, props.G.cards, props.playerID, setFocus]);

  // Helper to read local player's score
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myScore: number = (props.plugins as any)?.player?.data?.players?.[props.playerID || '0']?.score ?? 0;
  const playerName = props.matchData?.find(p => p.id === Number(props.playerID))?.name;

  // Host transfer detection: when current host disconnects, elect new host
  useEffect(() => {
    if (!props.isMultiplayer || !props.matchData) return;
    const playerData = (props.plugins as any)?.player?.data;
    const hostID = playerData?.hostPlayerID ?? '0';
    const kickedPlayers: string[] = playerData?.kickedPlayers ?? [];
    const hostPlayer = props.matchData.find(p => p.id === Number(hostID));
    // Only trigger if host is disconnected (or left entirely)
    if (hostPlayer?.isConnected) return;

    // Compute lowest eligible player: connected, named, not kicked
    const eligible = props.matchData
      .filter(p => p.isConnected && p.name && !kickedPlayers.includes(String(p.id)))
      .sort((a, b) => a.id - b.id);

    if (eligible.length === 0) return;
    const newHostID = String(eligible[0].id);
    // Don't fire if already the host (no-op) or if we'd target current host
    if (newHostID === hostID) return;

    props.moves.transferHost(newHostID);
  }, [props.isMultiplayer, props.matchData, (props.plugins as any)?.player?.data?.hostPlayerID, (props.plugins as any)?.player?.data?.kickedPlayers, props.moves]);

  // Kick detection: if local player is kicked, disconnect and navigate away
  const [kicked, setKicked] = useState(false);
  useEffect(() => {
    if (!props.isMultiplayer || !props.playerID) return;
    const kickedPlayers: string[] = (props.plugins as any)?.player?.data?.kickedPlayers ?? [];
    if (kickedPlayers.includes(props.playerID)) {
      setKicked(true);
    }
  }, [props.isMultiplayer, props.playerID, (props.plugins as any)?.player?.data?.kickedPlayers]);

  useEffect(() => {
    if (kicked) {
      // Navigate to lobby — use window.location since we don't have router access here
      alert('You were removed by the host.');
      window.location.href = '/';
    }
  }, [kicked]);

  return (
    <ImageCacheContext.Provider value={{ imageCache, dispatchImage }}>
      <div style={boardStyle}>
        <ActionSpace {...props} />
        <CommonSpace {...props} showPlayers={showPlayers} setShowPlayers={handleSetShowPlayers} allExpanded={allExpanded} />
        <PlayerSpace {...props} />
      </div>
      {props.isMultiplayer && <Console {...props} playerName={playerName} open={chatOpen} setOpen={handleSetChatOpen} />}
      {scoreCalcOpen && (
        <Calculator
          initialValue={myScore}
          label={playerName}
          onConfirm={(val) => { if (val !== myScore) props.moves.setScore(props.playerID || '0', val, playerName, playerName); setScoreCalcOpen(false); }}
          onCancel={() => setScoreCalcOpen(false)}
        />
      )}
    </ImageCacheContext.Provider>
  );
}

