/*
 * Copyright 2018 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import PluginPlayer, { getHostPlayerID } from './plugin-player';
import { Client } from '../client/client';

describe('default values', () => {
  test('playerState is not passed', () => {
    const plugin = PluginPlayer();
    const game = {
      plugins: [plugin],
    };
    const client = Client({ game });
    expect(client.getState().plugins[plugin.name].data).toEqual({
      players: { '0': {}, '1': {} },
      connectedPlayers: [],
      kickedPlayers: [],
    });
  });

  test('playerState is passed', () => {
    const plugin = PluginPlayer({ setup: () => ({ A: 1 }) });
    const game = {
      plugins: [plugin],
    };
    const client = Client({ game });
    expect(client.getState().plugins[plugin.name].data).toEqual({
      players: { '0': { A: 1 }, '1': { A: 1 } },
      connectedPlayers: [],
      kickedPlayers: [],
    });
  });
});

describe('2 player game', () => {
  let client;

  beforeAll(() => {
    const game = {
      moves: {
        A: ({ player }) => {
          player.set({ field: 'A1' });
          player.opponent.set({ field: 'A2' });
        },

        B: ({ G, player }) => {
          G.playerValue = player.get().field;
          G.opponentValue = player.opponent.get().field;
        },
      },

      plugins: [PluginPlayer()],
    };

    client = Client({ game });
  });

  test('player 0 turn', () => {
    client.moves.A();
    expect(client.getState().plugins[PluginPlayer().name].data).toEqual({
      players: {
        '0': { field: 'A1' },
        '1': { field: 'A2' },
      },
      connectedPlayers: [],
      kickedPlayers: [],
    });
  });

  test('player 1 turn', () => {
    client.events.endTurn();
    client.moves.A();
    expect(client.getState().plugins[PluginPlayer().name].data).toEqual({
      players: {
        '0': { field: 'A2' },
        '1': { field: 'A1' },
      },
      connectedPlayers: [],
      kickedPlayers: [],
    });
  });

  test('player 1 makes move B', () => {
    client.moves.B();
    expect(client.getState().G).toEqual({
      playerValue: 'A1',
      opponentValue: 'A2',
    });
  });
});

describe('3 player game', () => {
  let client;

  beforeAll(() => {
    const game = {
      moves: {
        A: ({ player }) => {
          player.set({ field: 'A' });
        },
      },

      plugins: [PluginPlayer()],
    };

    client = Client({ game, numPlayers: 3 });
  });

  test('G.opponent is not created', () => {
    client.moves.A();
    expect(client.getState().plugins[PluginPlayer().name].data).toEqual({
      players: {
        '0': { field: 'A' },
        '1': {},
        '2': {},
      },
      connectedPlayers: [],
      kickedPlayers: [],
    });
  });
});

describe('game with phases', () => {
  let client;

  beforeAll(() => {
    const game = {
      plugins: [PluginPlayer({ setup: (id) => ({ id }) })],
      phases: {
        phase: {},
      },
    };

    client = Client({ game });
  });

  test('includes playerSetup state', () => {
    expect(client.getState().plugins[PluginPlayer().name].data).toEqual({
      players: {
        0: {
          id: '0',
        },
        1: {
          id: '1',
        },
      },
      connectedPlayers: [],
      kickedPlayers: [],
    });
  });
});

describe('with playerView', () => {
  const plugin = PluginPlayer({
    setup: (id) => ({ id }),
    playerView: (players, playerID) => ({
      [playerID]: players[playerID],
    }),
  });
  const game = {
    plugins: [plugin],
  };

  test('spectator doesn't see player state', () => {
    const spectator = Client({ game });
    expect(spectator.getState().plugins[plugin.name].data).toEqual({
      players: {},
      connectedPlayers: [],
      kickedPlayers: [],
    });
  });

  test('player only sees own state', () => {
    const client = Client({ game, playerID: '0' });
    expect(client.getState().plugins[plugin.name].data).toEqual({
      players: { '0': { id: '0' } },
      connectedPlayers: [],
      kickedPlayers: [],
    });
  });
});

describe('derived host election', () => {
  test('falls back to player 0 when there are no connected players', () => {
    expect(getHostPlayerID([])).toBe('0');
  });

  test('elects the lowest connected non-kicked player', () => {
    expect(getHostPlayerID(['2', '0', '5'], ['0'])).toBe('2');
  });

  test('uses numeric ordering for player IDs above 9', () => {
    expect(getHostPlayerID(['10', '2', '1'])).toBe('1');
  });

  test('falls back to player 0 when every connected player is kicked', () => {
    expect(getHostPlayerID(['0', '1'], ['0', '1'])).toBe('0');
  });
});

describe('client connection sync', () => {
  test('ignores client-submitted syncPlayers lists', () => {
    const plugin = PluginPlayer();
    const client = Client({ game: { plugins: [plugin] } });

    client.plugins.player({ action: 'syncPlayers', connectedPlayers: ['0', '2'] });

    expect(client.getState().plugins[plugin.name].data.connectedPlayers).toEqual([]);
  });
});
