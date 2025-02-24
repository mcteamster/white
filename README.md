# Blank White Cards
### Play Now: https://white.mcteamster.com

## About
This is [1000 Blank White Cards](https://en.wikipedia.org/wiki/1000_Blank_White_Cards) online. A social party game where you make the rules. Best played with friends around a table or on video call.

Connect to the same Multiplayer Room to draw cards together using a common DECK.
Put your cards on the PILE for everyone to see in real-time!
Or maybe keep them hidden in your HAND, or even displayed on the TABLE in front of you.

Browse the Global Deck in Singleplayer mode for a local pass-and-play experience.
Create and submit cards there for the whole world to see!

### History
Version `1.x` of this game was originally made in late 2019 and enjoyed at house parties - hotseat style - before the pandemic. Online multiplayer was added in 2020. With lots of time on their hands, players from around the world published hundreds of cards to the Global Deck (and made many more in custom games)!

The first version was written MVC style with a HTML `jQuery` based frontend, `express` REST API on `nodejs12.x`, and `mongodb`. Full-stack development has come a long way since then and the game needed a well-deserved refresh.

It's honestly amazing that so many people have contributed so far, and even more impressive that the quality of content remains high. Over time some themes in the cards emerged like:
- Gaining Points
- Drinking Shots
- Annoying Your Friends
- Making Weird Noises

### What's New
Some meta-actions which were previously bound by the technical limitations of the game are now in version `2.x` with features like:
- Hand: Picking Up and Discarding
- Table: Placing cards in front of you (e.g. for long-lived/dormant/persistent actions/buffs/debuffs)
- Card creation on demand: Blanks no longer show up randomly. New cards go into your hand.

Other quality of life improvements include:
- The Deck draws without replacement (can be reshuffled)
- Improved RNG: card popularity no longer affects chance of appearance
- Browse the main Pile's history (and general browsing UI)
- A separate Discard Pile (hidden from view)
- Card ownership: and the ability to transfer between locations

Other noteworthy features:
- [Card Gallery](https://white.mcteamster.com/card): now with search!
- New Save / Load format: with backwards compatibility for decks made in `1.x`!
- A new Multiplayer Lobby experience: share and join links with QR codes
- Session memory and persistence
- Overall performance improvements

This new version is made in React TypeScript and uses [`boardgame.io`](https://boardgame.io/) as the game engine and networking framework. Writing [your own multiplayer networking code](https://github.com/mcteamster/twinge?tab=readme-ov-file#twinge-service) is tricky, and `bgio` made it a breeze.

## Self-Hosting
The internet can be too big and scary of a place to send your precious creations. You're welcome to run your own instance of `Blank White Cards` locally if you wish. Here's how to get the local server set up:

### 1. Download and Install the Game
```
mkdir blank-white-cards
git clone https://github.com/mcteamster/white.git ./blank-white-cards
cd blank-white-cards
npm ci
```
[Optional] Whenever you'd like to fetch the latest Global Deck, run:
```
npm run update
```

### 2. Start the local Lobby & Game server
```
npm run serve:local
```
This will run a `boardgame.io` server at http://localhost:3000

The `PORT` can be changed by updating all references in `.env.development`

### 3. Start hosting the Client
Open a new terminal and run:
```
npm run host
```
This will run a hosted `vite` preview site at http://localhost:4173 and [http://<YOUR_LAN_IP_ADDRESSES>:4173](http://127.0.0.1:4173)

Congratulations! You can now start playing or extending `Blank White Cards` to your heart's content!

### 4. [OPTIONAL] Production Builds
This section assumes you have web servers set up and properly configured for production network traffic (see sample architecture below)

Update `.env.production` with the details of your hosting setup:
```
# Client Side Environment
VITE_API_SERVER='' # For Global Deck Cards - leave this empty
VITE_LOBBY_SERVER='<LOBBY_SERVER>' # Boardgame.io Lobby
VITE_GAME_SERVER='<GAME_SERVER>' # Boardgame.io Game Server (can be the same as the Lobby)

# Server Side Environment
ORIGIN='<WEBSITE>' # Website where this game is served from
NODE_ENV=production
PORT=80
```
```
npm run build
```
Build and copy the contents of the `dist` folder to your web server. Set the default document to `index.html`

Copy the game files onto your Lobby and Game Server(s) and run:
```
npm run serve
```

## Hosting Architecture
The game is hosted on AWS using the following services:
- CloudFront for the Web App
- EC2 for the `boardgame.io` Lobby
- EC2/ECS Fargate for the `boardgame.io` Server
- API Gateway & Lambda for the Global Card Creation API

![AWS Hosting Architecture](./docs/aws.svg)

## License
Blank White Cards game software code freely available under [MIT License](./LICENSE.md)

Cards submitted to the Global Deck published under [Creative Commons CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Credits
Package | Source | License | Attribution
--- | --- | --- | ---
[Boardgame.io](https://boardgame.io/) | https://github.com/boardgameio/boardgame.io | MIT | Copyright (c) 2017 The boardgame.io Authors.
[Wired Elements](https://wiredjs.com/) | https://github.com/rough-stuff/wired-elements | MIT | Copyright (c) 2021 Preet Shihn
[Atrament](https://www.fiala.space/atrament/) | https://github.com/jakubfiala/atrament | MIT | Copyright 2024 Jakub Fiala
[Patrick Hand SC](https://fonts.google.com/specimen/Patrick+Hand+SC/license) | - | SIL Open Font License | Copyright (c) 2010-2012 Patrick Wagesreiter