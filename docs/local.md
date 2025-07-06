# Running Locally
You are welcome to run the game yourself for playing or development. Follow this guide:

### 1. Download and Install the Game
```
mkdir blank-white-cards
git clone https://github.com/mcteamster/white.git ./blank-white-cards
cd blank-white-cards
npm ci
```
[Optional] If you'd like to fetch the latest Global Deck, run:
```
npm run pull:global
```

### 2. Start the local Lobby & Game server
```
npm run serve:local
```
This will run a `boardgame.io` server at http://localhost:3000

[Optional] If you'd like to host across your local network, modify the LAN IP Address and/or PORT in `.env.development`:
```
# Game Info
VITE_ORIGIN='http://<YOUR_LAN_IP_ADDRESS>:5173'
VITE_COMPRESS_IMAGES='true' # Compressing image improves network performance at the cost of decompression lag
VITE_MULTI_REGION='false' # Distribute traffic to multiple servers in different regions to lower latency

# Client Side Environment
VITE_DEFAULT_SERVER='http://<YOUR_LAN_IP_ADDRESS>:<PORT>'

# Server Side Environment
NODE_ENV=development
PORT=<PORT>
```

### 3. Start hosting the Client
Open a new terminal and run:
```
npm run host
```
This will run a hosted `vite` preview site at http://localhost:4173 and [http://<YOUR_LAN_IP_ADDRESS>:4173](http://127.0.0.1:4173)

Congratulations! You can now start playing or extending `Blank White Cards` to your heart's content!

### 4. [OPTIONAL] Production Builds
This section assumes you have web servers set up and properly configured for production network traffic [see sample architecture](./cloud.md)

Update `.env.production` with the details of your hosting setup:
```
# Game Info
VITE_ORIGIN='<WEBSITE>' # Website where this game is served from
VITE_COMPRESS_IMAGES='false' # Compressing image improves network performance at the cost of decompression lag
VITE_MULTI_REGION='false' # Distribute traffic to multiple servers in different regions to lower latency

# Client Side Environment
VITE_API_SERVER='' # For Global Deck Cards - leave this empty
VITE_DEFAULT_SERVER='<GAME_SERVER>' # Boardgame.io Lobby & Game Server

# Server Side Environment
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