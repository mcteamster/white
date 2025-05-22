import { Server, Origins } from 'boardgame.io/server';
import { BlankWhiteCards } from './Game';
import { customAlphabet, nanoid } from 'nanoid';

// Custom alphabet for room codes
const roomCodeGen = () => {
  let roomCode = customAlphabet('BCDFGHJKLMNPQRSTVWXZ', 3)()

  // Regional Partitioning
  if (process.env.AWS_REGION == 'ap-southeast-1') {
    roomCode += customAlphabet('BCDFG', 1)() // First quarter for Asia Pacific
  } else if (process.env.AWS_REGION == 'eu-central-1') {
    roomCode += customAlphabet('HJKLM', 1)() // Second quarter for Europe
  } else if (process.env.AWS_REGION == 'us-east-1') {
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

process.on('SIGTERM', () => {
  console.error("Exiting due to SIGTERM");
  process.exit(1);
})