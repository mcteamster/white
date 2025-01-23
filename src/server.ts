import { Server, Origins } from 'boardgame.io/server';
import { BlankWhiteCards } from './Game';

const server = Server({
  games: [BlankWhiteCards],
  origins: [Origins.LOCALHOST],
});

server.run(8000);