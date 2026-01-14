import { Server, Origins } from 'boardgame.io/server';
import { BlankWhiteCards } from './Game';
import { customAlphabet, nanoid } from 'nanoid';

// Custom alphabet for room codes
const roomCodeGen = () => {
  let roomCode = customAlphabet('BCDFGHJKLMNPQRSTVWXZ', 3)()

  // Regional Partitioning
  if (process.env.REGION == 'AP') {
    roomCode += customAlphabet('BCDFG', 1)() // First quarter for Asia Pacific
  } else if (process.env.REGION == 'EU') {
    roomCode += customAlphabet('HJKLM', 1)() // Second quarter for Europe
  } else if (process.env.REGION == 'NA') {
    roomCode += customAlphabet('NPQRS', 1)() // Third quarter for North America
  } else { 
    roomCode += customAlphabet('TVWXZ', 1)() // Last quarter reserved for fallback and local development
  }

  return roomCode
};

// Initialise Server
const server = Server({
  games: [BlankWhiteCards],
  origins: [process.env.VITE_ORIGIN || '', Origins.LOCALHOST],
  uuid: roomCodeGen,
  generateCredentials: () => nanoid(),
});

server.run(Number(process.env.PORT));

// Cleanup rooms older than 12 hours
setInterval(async () => {
  const matches = await server.db.listMatches({ gameName: 'blank-white-cards' });
  const now = Date.now();
  const maxAge = 12 * 60 * 60 * 1000;

  for (const matchID of matches) {
    const { metadata } = await server.db.fetch(matchID, { metadata: true });
    const created = new Date(metadata.createdAt).getTime();
    
    if (now - created > maxAge) {
      await server.db.wipe(matchID);
      console.log(`Cleaned up room: ${matchID}`);
    }
  }
}, 60 * 60 * 1000); // Run every hour

process.on('SIGTERM', () => {
  console.error("Exiting due to SIGTERM");
  process.exit(1);
})