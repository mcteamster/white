# Blank White Cards MCP Server

An MCP (Model Context Protocol) server that lets AI agents play Blank White Cards — a creative, freeform card game where players write and play their own rules.

## Requirements

- Node.js 20+
- ffmpeg/ffprobe (optional, only needed for card images)

## MCP Client Config

### Stdio (recommended)

```json
{
  "mcpServers": {
    "blank-white-cards": {
      "type": "stdio",
      "command": "npx",
      "args": ["@mcteamster/white-mcp"]
    }
  }
}
```

### HTTP (remote clients)

Point your MCP client at a running HTTP instance:

```json
{
  "mcpServers": {
    "blank-white-cards": {
      "url": "https://ap.blankwhite.cards/mcp"
    }
  }
}
```

Public HTTP endpoints: `ap.blankwhite.cards/mcp`, `eu.blankwhite.cards/mcp`, `na.blankwhite.cards/mcp`

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `GAME_SERVER_URL` | *(auto-detect)* | Override server URL for all connections. If unset, resolved from room code or timezone. |
| `MCP_HTTP_PORT` | *(stdio)* | Set to run as an HTTP server (e.g. `8000`) |
| `MCP_MIN_REACT_SECONDS` | `5` | Seconds to wait before returning watch events (pacing) |
| `MCP_MAX_WATCH_SECONDS` | `30` | Seconds before watch times out with no event |

### Server resolution

When `GAME_SERVER_URL` is not set:
- **Joining a match** — server derived from the room code's last character (AP/EU/NA regions)
- **Creating a match** — auto-detects closest region from timezone, or accepts a `region` parameter
- **Unrecognised room codes** — falls back to `http://localhost:3000`

## Running locally

```bash
# Game server (boardgame.io)
npm run local

# MCP server pointing at local game server
npm run local:mcp
```

## Tools

### Match management
- `create_match` — Create a new match and join as player 0
- `join_match` — Join an existing match (omit `playerID` to auto-assign a seat)
- `leave_match` — Leave a match

### Game state
- `get_state` — Get current game state (hand, pile, deck size, scores, etc.)
- `get_card` — Get a single card by ID
- `search_cards` — Full-text search over card titles and descriptions
- `export_deck` — Export all cards in a match as JSON

### Actions
- `pickup_card` — Pick up a card from the deck. If the deck is empty, reshuffles the pile and discard first.
- `move_card` — Move a card to a different location
- `claim_card` — Claim a card from the pile into your hand
- `submit_card` — Write a new card (optionally with an image)
- `like_card` — Like a card
- `shuffle_cards` — Reset and shuffle all cards (host only)
- `load_cards` — Bulk load cards into a match (host only)

### Scoring
- `get_scores` — Get current scores for all players
- `get_leaderboard` — Get players ranked by score
- `set_score` — Set a player's score
- `get_play_hint` — Get a suggested next action based on game state and score position

### Observation
- `watch` — Block until a game event occurs, returns structured diff of what changed plus a session watch counter

## Card Images

Cards can optionally have images. Pass a square PNG file path as `image_path` in `submit_card`. The server:

1. Validates the image is square (via ffprobe)
2. Resizes to 500x500
3. Converts to 1-bit black and white
4. Attaches as a PNG data URI

Use a white background with bold black line art for best results. Requires ffmpeg and ffprobe on PATH.

## Role Tools

The server provides role tools that return instructions for how an agent should use the other tools. Call one at the start of a session to enter a role:

| Tool | Description | Parameters |
|------|-------------|------------|
| `autoplay` | Autonomously play the game in a loop | `tone`, `themes`, `aggression` |
| `referee` | Moderate and enforce rules | `rules` |
| `spectate` | Watch and comment only | — |

These replace the former MCP prompts (`list_prompts` / `get_prompt`). Tools are universally supported across MCP clients; prompts require explicit client-side injection which many runtimes do not perform reliably.

## Pacing

- When `watch` detects an event, it waits `MCP_MIN_REACT_SECONDS` before returning — giving human players time to read new cards
- When `watch` times out, the response nudges the agent to act and re-watch
