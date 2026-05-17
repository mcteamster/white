# Blank White Cards MCP Server

An MCP (Model Context Protocol) server that lets AI agents play Blank White Cards — a creative, freeform card game where players write and play their own rules.

## Requirements

- Node.js 20+
- A running Blank White Cards game server (boardgame.io)
- ffmpeg/ffprobe (optional, only needed for card images)

## Running

```bash
npx tsx mcp/index.ts
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `GAME_SERVER_URL` | *(auto-detect)* | Override server URL for all connections. If unset, the server is resolved from the room code or timezone. |
| `MCP_MIN_REACT_SECONDS` | `5` | Seconds to wait before returning watch events (pacing) |
| `MCP_MAX_WATCH_SECONDS` | `30` | Seconds before watch times out with no event |

### Server resolution

When `GAME_SERVER_URL` is not set:
- **Joining a match** — the server is derived from the room code's last character (AP/EU/NA regions)
- **Creating a match** — auto-detects the closest region from your timezone, or accepts a `region` parameter
- **Unrecognised room codes** — falls back to `http://localhost:3000` (local development)

## MCP Client Config

```json
{
  "blank-white-cards": {
    "type": "stdio",
    "command": "npx",
    "args": ["--prefix", "/path/to/white", "tsx", "/path/to/white/mcp/index.ts"],
    "env": {
      "GAME_SERVER_URL": "http://localhost:3000"
    }
  }
}
```

## Tools

### Match management
- `list_matches` — List active matches
- `create_match` — Create a new match and join as player 0
- `join_match` — Join an existing match
- `leave_match` — Leave a match

### Game state
- `get_state` — Get current game state (hand, pile, deck size, etc.)
- `get_card` — Get a single card by ID
- `search_cards` — Full-text search over card titles and descriptions
- `export_deck` — Export all cards in a match as JSON

### Actions
- `pickup_card` — Draw from the deck into your hand
- `move_card` — Move a card to a different location
- `claim_card` — Claim a card from the pile into your hand
- `submit_card` — Write a new card (optionally with an image)
- `like_card` — Like a card
- `shuffle_cards` — Reset and shuffle all cards (host only)
- `load_cards` — Bulk load cards into a match (host only)

### Observation
- `watch` — Block until a game event occurs, returns structured diff of what changed

## Card Images

Cards can optionally have images. The agent saves a square PNG to disk and passes the file path as `image_path` in `submit_card`. The server:

1. Validates the image is square (via ffprobe)
2. Resizes to 500x500
3. Converts to black and white (threshold at 128)
4. Attaches as a PNG data URI

Requires ffmpeg and ffprobe on the system PATH.

## Prompts

The server provides role prompts that shape how an agent uses the tools:

| Prompt | Description | Parameters |
|--------|-------------|------------|
| `autonomous_player` | Play the game in a loop | `tone`, `themes`, `aggression` |
| `referee` | Moderate and enforce rules | `rules` |
| `spectator` | Watch and comment only | — |
| `deck_builder` | Create and curate card decks | `theme`, `card_count` |

## Pacing

The server enforces pacing to prevent agents from acting too fast:

- When `watch` detects an event, it waits `MCP_MIN_REACT_SECONDS` before returning — giving human players time to read new cards
- When `watch` times out, the response nudges the agent to take action and re-watch
