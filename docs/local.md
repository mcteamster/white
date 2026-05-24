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

[Optional] If you'd like to host across your local network, modify the LAN IP Address and/or PORT in `server/.env.development`:
```
NODE_ENV=development
PORT=<PORT>
ORIGIN=http://<YOUR_LAN_IP_ADDRESS>:<PORT>
```

And update `app/.env.development`:
```
VITE_ORIGIN='http://<YOUR_LAN_IP_ADDRESS>:5173'
VITE_COMPRESS_IMAGES='true'
VITE_MULTI_REGION='false'
VITE_DEFAULT_SERVER='http://<YOUR_LAN_IP_ADDRESS>:<PORT>'
```

### 3. Start hosting the Client
Open a new terminal and run:
```
npm run dev
```
This will run a `vite` dev server at http://localhost:5173

Or for a production-like preview:
```
npm run build
npm run preview -w app
```

Congratulations! You can now start playing or extending `Blank White Cards` to your heart's content!

### 4. [OPTIONAL] Production Builds
This section assumes you have web servers set up and properly configured for production network traffic [see sample architecture](./cloud.md)

Update `app/.env.production` with the details of your hosting setup:
```
VITE_ORIGIN='<WEBSITE>'
VITE_COMPRESS_IMAGES='true'
VITE_MULTI_REGION='false'
VITE_API_SERVER='<COMMON_API>'
VITE_CARD_API='<CARD_API_ENDPOINT>'
VITE_DEFAULT_SERVER='<GAME_SERVER>'
```

Update `server/.env.production`:
```
NODE_ENV=production
PORT=80
ORIGIN=<WEBSITE>
```

Build the client:
```
npm run build
```
Copy the contents of `app/dist` to your web server. Set the default document to `index.html`.

Run the game server:
```
npm run serve
```

### 5. [OPTIONAL] MCP Server
The MCP server lets AI agents play Blank White Cards via the [Model Context Protocol](https://modelcontextprotocol.io/).

**Stdio mode** add to your `mcp.json`:
```json
{
  "mcpServers": {
    "blank-white-cards": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "@mcteamster/white-mcp"
      ],
      "env": {}
    }
  }
}
```

**HTTP mode** (for remote clients):
```
npm run serve:mcp
```
This starts a Streamable HTTP server on port 8000.

Add to your MCP client config:
```json
{
  "mcpServers": {
    "blank-white-cards": {
      "url": "http://{YOUR_SERVER_URL}:8000/mcp",
      "headers": {}
    }
  }
}
```

### 6. Project Structure
```
white/
├── core/       ← Shared game logic (Game.ts, Cards.ts)
├── app/        ← React frontend (Vite)
├── server/     ← boardgame.io game server
├── api/        ← AWS CDK / Lambda backend
├── mcp/        ← MCP server (AI agent tools)
└── docs/       ← Documentation
```
