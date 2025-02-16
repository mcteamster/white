import { Server, Origins, /*FlatFile*/ } from 'boardgame.io/server';
// import { StorageCache } from '@boardgame.io/storage-cache';
import { BlankWhiteCards } from './Game';
import { customAlphabet, nanoid } from 'nanoid';
const roomCodeGen = customAlphabet('BCDFGHJKLMNPQRSTVWXZ', 4);

// Database
// const db = new FlatFile({
//   dir: './db',
//   logging: false,
//   ttl: true,
// });
// const dbWithCaching = new StorageCache(db, { cacheSize: 200 });

const server = Server({
  games: [BlankWhiteCards],
  // db: dbWithCaching,
  origins: [Origins.LOCALHOST_IN_DEVELOPMENT, 'https://white.mcteamster.com'],
  uuid: roomCodeGen,
  generateCredentials: () => nanoid(),
});

server.run(80);

process.on('SIGTERM', () => {
  console.error("Exiting due to SIGTERM");
  process.exit(1);
})