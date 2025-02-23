# Blank White Cards
### Play Now: https://white.mcteamster.com

## About

## Self-Hosting
The internet is a big scary place to send your precious creations. You're welcome to run your own instance of `Blank White Cards` locally if you wish. Here's how to get the local server set up:

### 1. Download the Game
```
mkdir blank-white-cards
git clone https://github.com/mcteamster/white.git ./blank-white-cards
cd blank-white-cards
```
Optionally, if you'd like to fetch the latest Global Deck, run:
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
This section assumes you have web servers set up and properly configured for production network traffic.

Update `.env.production` with the details of your hosting setup:
```
# Client Side Envrionment
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

## Credits
Package | Source | License | Attribution
--- | --- | --- | ---
[Boardgame.io](https://boardgame.io/) | https://github.com/boardgameio/boardgame.io | MIT | Copyright (c) 2017 The boardgame.io Authors.
[Wired Elements](https://wiredjs.com/) | https://github.com/rough-stuff/wired-elements | MIT | Copyright (c) 2021 Preet Shihn
[Atrament](https://www.fiala.space/atrament/) | https://github.com/jakubfiala/atrament | MIT | Copyright 2024 Jakub Fiala
[Patrick Hand SC](https://fonts.google.com/specimen/Patrick+Hand+SC/license) | - | SIL Open Font License | Copyright (c) 2010-2012 Patrick Wagesreiter