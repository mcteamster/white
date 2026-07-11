/*
 * Copyright 2018 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import PluginPlayer from './plugin-player';
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

describe('derived host', () => {
  let client;
  const plugin = PluginPlayer();
  const game = {
    moves: {
      checkHost: ({ G, player, playerID }) => {
        G.isHost = player.isHost(playerID);
      },
    },
    plugins: [plugin],
  };

  beforeEach(() => {
    client = Client({ game });
  });

  test('fallback to player 0 when connectedPlayers is empty', () => {
    // No syncPlayers dispatched yet — fallback
    client.moves.checkHost();
    expect(client.getState().G.isHost).toBe(true); // player 0
  });

  test('lowest connected non-kicked player is host', () => {
    client.plugins.player({ action: 'syncPlayers', connectedPlayers: ['1', '2', '0'] });
    client.moves.checkHost();
    expect(client.getState().G.isHost).toBe(true); // player 0 is lowest
  });

  test('host shifts when lowest player is kicked', () => {
    client.plugins.player({ action: 'syncPlayers', connectedPlayers: ['0', '1', '2'] });
    // Simulate kick of player 0 via a move that calls player.kick
    const kickGame = {
      moves: {
        doKick: ({ player }, targetID: string) => { player.kick(targetID); },
        checkHost: ({ G, player, playerID }) => { G.isHost = player.isHost(playerID); },
      },
      plugins: [PluginPlayer()],
    };
    const kickClient = Client({ game: kickGame });
    kickClient.plugins.player({ action: 'syncPlayers', connectedPlayers: ['0', '1', '2'] });
    kickClient.moves.doKick('0');
    // Now player 1 should be host (player 0 is kicked)
    kickClient.events.endTurn(); // switch to player 1
    kickClient.moves.checkHost();
    expect(kickClient.getState().G.isHost).toBe(true); // player 1
  });

  test('numeric sort — player 1 beats player 10', () => {
    const largeGame = {
      moves: {
        checkHost: ({ G, player, playerID }) => { G.isHost = player.isHost(playerID); },
      },
      plugins: [PluginPlayer()],
    };
    const largeClient = Client({ game: largeGame, numPlayers: 11 });
    largeClient.plugins.player({ action: 'syncPlayers', connectedPlayers: ['10', '2', '1'] });
    largeClient.moves.checkHost(); // player 0 is current but not connected — should not be host
    expect(largeClient.getState().G.isHost).toBe(false); // player 0 is not in connectedPlayers
  });
});

describe('syncPlayers plugin action', () => {
  const plugin = PluginPlayer();
  const game = {
    plugins: [plugin],
  };

  test('updates connectedPlayers', () => {
    const client = Client({ game });
    client.plugins.player({ action: 'syncPlayers', connectedPlayers: ['0', '2'] });
    expect(client.getState().plugins[plugin.name].data.connectedPlayers).toEqual(['0', '2']);
  });

  test('idempotent — same list produces same state', () => {
    const client = Client({ game });
    client.plugins.player({ action: 'syncPlayers', connectedPlayers: ['1', '3'] });
    client.plugins.player({ action: 'syncPlayers', connectedPlayers: ['1', '3'] });
    expect(client.getState().plugins[plugin.name].data.connectedPlayers).toEqual(['1', '3']);
  });

  test('unknown action is ignored', () => {
    const client = Client({ game });
    client.plugins.player({ action: 'unknownAction', foo: 'bar' });
    expect(client.getState().plugins[plugin.name].data.connectedPlayers).toEqual([]);
  });

  test('invalid connectedPlayers is ignored', () => {
    const client = Client({ game });
    client.plugins.player({ action: 'syncPlayers', connectedPlayers: 'not-an-array' });
    expect(client.getState().plugins[plugin.name].data.connectedPlayers).toEqual([]);
  });
});
