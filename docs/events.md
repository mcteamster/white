# System Events

System events are automatically appended to the chat log when certain game moves occur in multiplayer sessions (`ctx.numPlayers > 1`). They appear in the console as italic grey text with the player name prepended.

Player names are resolved client-side from `matchData` using `playerID`. Events without a `playerID` (e.g. `loadCards`) show text only.

## Current events

| Move | Message | Notes |
|------|---------|-------|
| `pickupCard` | `{name}` picked up a card | |
| `claimCard` | `{name}` ← `"{title}"` | Title always shown (pile is public) |
| `moveCard` | `{name}` → `{dest}`: `"{title}"` | See below |
| `submitCard` | `{name}` made a card | Name passed from client |
| `shuffleCards` | `{name}` shuffled — `{n}` in deck | |
| `loadCards` | `{n}` card/cards loaded — `{total}` in deck | No player attribution |
| `setScore` | `{delta}` pts for `{target}` *(by `{setter}` if different)* | Names passed from client |

## moveCard title visibility

Title is shown if **either the source or destination** is a public location. Only `pile` and `table` are public — `discard`, `hand`, and `deck` are private.

Note: all combinations are valid server-side. The UI restricts which moves are exposed, but the MCP or direct API calls can trigger any combination.

| → dest ↓ src | pile | table | hand | discard | deck |
|--------------|:----:|:-----:|:----:|:-------:|:----:|
| **pile**     | ✓    | ✓     | ✓    | ✓       | ✓    |
| **table**    | ✓    | ✓     | ✓    | ✓       | ✓    |
| **hand**     | ✓    | ✓     | ✗    | ✗       | ✗    |
| **discard**  | ✓    | ✓     | ✗    | ✗       | ✗    |
| **deck**     | ✓    | ✓     | ✗    | ✗       | ✗    |

## Not currently tracked

| Move | Notes |
|------|-------|
| `pickupCard` deduplication | Multiple pickups show separate events |
