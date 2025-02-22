import { Server, Origins } from 'boardgame.io/server';
import { BlankWhiteCards } from './Game';
import { customAlphabet, nanoid } from 'nanoid';
const roomCodeGen = customAlphabet('BCDFGHJKLMNPQRSTVWXZ', 4);

// Initialise Server
const server = Server({
  games: [BlankWhiteCards],
  origins: [Origins.LOCALHOST_IN_DEVELOPMENT, 'https://white.mcteamster.com'],
  uuid: roomCodeGen,
  generateCredentials: () => nanoid(),
});

server.run(80);

process.on('SIGTERM', () => {
  console.error("Exiting due to SIGTERM");
  process.exit(1);
})