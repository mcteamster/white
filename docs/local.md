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
npm run local
```
This will run a `boardgame.io` server at http://localhost:3000

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

### 4. Remote Play (Self-Hosting for Friends)

Want friends on other networks to join your game? Use `cloudflared` to expose your local server:

**Install cloudflared:**
- macOS: `brew install cloudflared`
- Linux: [Download from GitHub](https://github.com/cloudflare/cloudflared/releases)
- Windows: [Download from GitHub](https://github.com/cloudflare/cloudflared/releases)

**Start the server with a tunnel:**
```
npm run tunnel
```

This starts the game server (using the port from `server/.env.development`) and creates a public tunnel. Look for a URL like:
```
https://random-word-here.trycloudflare.com
```

**Share with friends:**
1. Send them the tunnel URL
2. They go to https://blankwhite.cards
3. Create or join a game → select **Custom** server → paste your tunnel URL
4. Play!

**Notes:**
- No account needed — quick tunnels are free and anonymous
- The URL changes each time you restart (fine for game sessions)
- WebSocket/real-time gameplay works through the tunnel
- Limit: 200 concurrent requests (more than enough for 2-10 players)

### 5. [OPTIONAL] LAN Play

For same-network play without a tunnel, other devices can connect to your machine's LAN IP directly. Modify `server/.env.development`:
```
NODE_ENV=development
PORT=3000
ORIGIN=
```

Players on the same network go to https://blankwhite.cards, select **Custom** server, and enter `http://<YOUR_LAN_IP>:<PORT>` (default port is 3000, configurable in `server/.env.development`).

### 6. [OPTIONAL] Production Builds
This section assumes you have web servers set up and properly configured for production network traffic [see sample architecture](./cloud.md)

Update `app/.env.production` with the details of your hosting setup:
```
VITE_ORIGIN='<WEBSITE>'
VITE_COMPRESS_IMAGES='true'
VITE_MULTI_REGION='false'
VITE_API_SERVER='<COMMON_API>'
VITE_CARD_API='<CARD_API_ENDPOINT>'
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

### 7. [OPTIONAL] MCP Server
The MCP server lets AI agents play Blank White Cards via the [Model Context Protocol](https://modelcontextprotocol.io/).

By default, the MCP server connects to the public game servers (ap/eu/na.blankwhite.cards) based on the room code. To point it at your own server instead, set the `GAME_SERVER_URL` environment variable:

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
      "env": {
        "GAME_SERVER_URL": "<YOUR_GAME_SERVER>"
      }
    }
  }
}
```

**HTTP mode** (for remote clients):
```
npm run serve:mcp
```
This starts a Streamable HTTP server on port 8000 (overridable via `MCP_HTTP_PORT`), connecting to the public game servers.

To run against your local game server instead:
```
npm run local:mcp
```
This defaults `GAME_SERVER_URL` to `http://localhost:3000`. You can override it:
```
GAME_SERVER_URL=http://192.168.1.10:3000 npm run local:mcp
```

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

### 8. Project Structure
```
white/
├── core/       ← Shared game logic (Game.ts, Cards.ts)
├── app/        ← React frontend (Vite)
├── server/     ← boardgame.io game server
├── api/        ← AWS CDK / Lambda backend
├── mcp/        ← MCP server (AI agent tools)
└── docs/       ← Documentation
```
