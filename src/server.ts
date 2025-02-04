import { Server, Origins, FlatFile } from 'boardgame.io/server';
import { BlankWhiteCards } from './Game';
import { customAlphabet, nanoid } from 'nanoid';
const roomCodeGen = customAlphabet('BCDFGHJKLMNPQRSTVWXYZ', 4);

const server = Server({
  games: [BlankWhiteCards],
  db: new FlatFile({
    dir: './db',
    logging: false,
    ttl: true,
  }),
  origins: [Origins.LOCALHOST_IN_DEVELOPMENT, 'https://white.mcteamster.com'],
  uuid: roomCodeGen,
  generateCredentials: () => nanoid(),
});

server.run(8000);