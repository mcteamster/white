/*
 * Copyright 2018 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import type { Plugin, PlayerID } from '../types';

interface PlayerData<PlayerState extends any = any> {
  players: Record<PlayerID, PlayerState>;
  hostPlayerID: string;
  kickedPlayers: string[];
}

export interface PlayerAPI<PlayerState extends any = any> {
  state: Record<PlayerID, PlayerState>;
  get(): PlayerState;
  set(value: PlayerState): PlayerState;
  opponent?: {
    get(): PlayerState;
    set(value: PlayerState): PlayerState;
  };
  hostPlayerID: string;
  kickedPlayers: string[];
  isHost(playerID: string): boolean;
  isKicked(playerID: string): boolean;
  setHost(playerID: string): void;
  kick(playerID: string): void;
}

interface PluginPlayerOpts<PlayerState extends any = any> {
  setup?: (playerID: string) => PlayerState;
  playerView?: (
    players: Record<PlayerID, PlayerState>,
    playerID?: string | null
  ) => any;
}

export interface PlayerPlugin<PlayerState extends any = any> {
  player: PlayerAPI<PlayerState>;
}

/**
 * Plugin that maintains state for each player in G.players.
 * During a turn, G.player will contain the object for the current player.
 * In two player games, G.opponent will contain the object for the other player.
 *
 * @param {function} initPlayerState - Function of type (playerID) => playerState.
 */
const PlayerPlugin = <PlayerState extends any = any>({
  setup,
  playerView,
}: PluginPlayerOpts<PlayerState> = {}): Plugin<
  PlayerAPI<PlayerState>,
  PlayerData<PlayerState>
> => ({
  name: 'player',

  flush: ({ api, data }) => {
    // Player scores come from api.state (mutated via api.set/state assignment in moves),
    // but hostPlayerID/kickedPlayers are mutated directly on `data` by setHost()/kick()
    // since they're session-level concerns shared across all players, not per-player state.
    return {
      players: api.state,
      hostPlayerID: data.hostPlayerID ?? '0',
      kickedPlayers: data.kickedPlayers ?? [],
    };
  },

  api: ({ ctx, data }): PlayerAPI => {
    const state = data.players;

    const get = () => {
      return data.players[ctx.currentPlayer];
    };

    const set = (value: PlayerState) => {
      return (state[ctx.currentPlayer] = value);
    };

    const isHost = (playerID: string) => playerID === data.hostPlayerID;
    const isKicked = (playerID: string) => (data.kickedPlayers ?? []).includes(playerID);
    const setHost = (playerID: string) => { data.hostPlayerID = playerID; };
    const kick = (playerID: string) => {
      if (!data.kickedPlayers) data.kickedPlayers = [];
      data.kickedPlayers.push(playerID);
    };

    const result: PlayerAPI = {
      state,
      get,
      set,
      get hostPlayerID() { return data.hostPlayerID ?? '0'; },
      get kickedPlayers() { return data.kickedPlayers ?? []; },
      isHost,
      isKicked,
      setHost,
      kick,
    };

    if (ctx.numPlayers === 2) {
      const other = ctx.currentPlayer === '0' ? '1' : '0';
      const get = () => {
        return data.players[other];
      };
      const set = (value: PlayerState) => {
        return (state[other] = value);
      };
      result.opponent = { get, set };
    }

    return result;
  },

  setup: ({ ctx }) => {
    const players: Record<PlayerID, any> = {};
    for (let i = 0; i < ctx.numPlayers; i++) {
      let playerState: any = {};
      if (setup !== undefined) {
        playerState = setup(i + '');
      }
      players[i + ''] = playerState;
    }
    return { players, hostPlayerID: '0', kickedPlayers: [] };
  },

  playerView: ({ data, playerID }) => {
    if (playerView) {
      return {
        players: playerView(data.players, playerID),
        hostPlayerID: data.hostPlayerID ?? '0',
        kickedPlayers: data.kickedPlayers ?? [],
      };
    }
    return data;
  },
});

export default PlayerPlugin;
