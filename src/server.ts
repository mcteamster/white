import { Server, Origins } from 'boardgame.io/server';
import { BlankWhiteCards } from './Game';
import { customAlphabet, nanoid } from 'nanoid';

// Custom alphabet for room codes
const roomCodeGen = () => {
  let roomCode = customAlphabet('BCDFGHJKLMNPQRSTVWXZ', 3)()

  // Regional Partitioning
  if (process.env.AWS_REGION == 'ap-southeast-2') {
    roomCode += customAlphabet('BCDFGHJKLM', 1)() // First Half for Asia Pacific
  } else if (process.env.AWS_REGION == 'us-east-1') {
    roomCode += customAlphabet('NPQRSTVWXZ', 1)() // Last Half for North America
  } else {
    roomCode += customAlphabet('BCDFGHJKLMNPQRSTVWXZ', 1)()
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

process.on('SIGTERM', () => {
  console.error("Exiting due to SIGTERM");
  process.exit(1);
})