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

Want friends on other networks to join your game? You can use `cloudflared` to expose your local server via a temporary public URL.

First, install cloudflared:
- macOS: `brew install cloudflared`
- Linux/Windows: [Download from GitHub](https://github.com/cloudflare/cloudflared/releases)

Then run:
```
npm run tunnel
```

This starts the game server and opens a tunnel. You'll see a URL like:
```
https://random-word-here.trycloudflare.com
```

Send that URL to your friends. They go to https://blankwhite.cards, create or join a game, select **Custom** server, and paste your URL. That's it!

The URL changes each time you restart — that's fine for game sessions. No Cloudflare account needed. WebSockets work through the tunnel.

> ⚠️ **Heads up:** This exposes your game server to the internet. The server only handles ephemeral card game state — no files, no credentials, nothing persistent — but you should still only share the URL with people you trust, and stop the tunnel (`Ctrl+C`) when you're done. Quick tunnels are subject to [Cloudflare's Terms of Service](https://www.cloudflare.com/website-terms/).

Note: Custom servers don't work from inside the Discord Activity — players there can only connect to the official servers. Friends will need to use the browser client at https://blankwhite.cards to join your tunnel.

### 5. [OPTIONAL] LAN Play

If everyone's on the same network, you don't need a tunnel. Just leave `ORIGIN` empty in `server/.env.development`:
```
NODE_ENV=development
PORT=3000
ORIGIN=
```

Other players go to https://blankwhite.cards, select **Custom** server, and enter your machine's LAN IP (e.g. `http://192.168.1.42:3000`).

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
