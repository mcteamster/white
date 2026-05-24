#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const GLOBAL_FILE = './public/decks/global.json';
const OUTPUT_DIR = './public/decks';
const CHUNK_SIZE = 100;

if (!fs.existsSync(GLOBAL_FILE)) {
    console.error(`Error: ${GLOBAL_FILE} not found`);
    process.exit(1);
}

console.log(`Chunking ${GLOBAL_FILE} into files of ${CHUNK_SIZE} cards each...`);

const data = JSON.parse(fs.readFileSync(GLOBAL_FILE, 'utf8'));
const cards = data.cards;
console.log(`Total cards: ${cards.length}`);

for (let i = 0; i < cards.length; i += CHUNK_SIZE) {
    const chunk = cards.slice(i, i + CHUNK_SIZE);
    const chunkNumber = String(i + 1).padStart(3, '0');
    const filename = path.join(OUTPUT_DIR, `global_${chunkNumber}.json`);
    
    fs.writeFileSync(filename, JSON.stringify({cards: chunk}));
    console.log(`Created ${filename} with ${chunk.length} cards (${i+1} to ${Math.min(i+CHUNK_SIZE, cards.length)})`);
}

const manifest = {
    chunks: Math.ceil(cards.length / CHUNK_SIZE),
    totalCards: cards.length
};
const manifestPath = path.join(OUTPUT_DIR, 'global_manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest));
console.log(`Created ${manifestPath} with ${manifest.chunks} chunks and ${manifest.totalCards} total cards`);

console.log('Chunking complete!');
