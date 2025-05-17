import { Server, Origins } from 'boardgame.io/server';
import { BlankWhiteCards } from './Game';
import { customAlphabet, nanoid } from 'nanoid';
const roomCodeGen = customAlphabet('BCDFGHJKLMNPQRSTVWXZ', 4);

// Initialise Server
const server = Server({
  games: [BlankWhiteCards],
  origins: [process.env.VITE_ORIGIN || '', Origins.LOCALHOST],
  uuid: roomCodeGen,
  generateCredentials: () => nanoid(),
});

server.run(Number(process.env.PORT));

process.on('SIGTERM', () => {
  console.error("Exiting due to SIGTERM");
  process.exit(1);
})