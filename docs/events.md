# System Events

System events are automatically appended to the chat log when certain game moves occur in multiplayer sessions (`ctx.numPlayers > 1`). They appear in the console as italic grey text with the player name prepended.

Player names are resolved client-side from `matchData` using `playerID`. Events without a `playerID` (e.g. `loadCards`) show text only.

## Current events

| Move | Message | Notes |
|------|---------|-------|
| `pickupCard` | `{name}` picked up a card | |
| `claimCard` | `{name}` ← `"{title}"` | Includes the claimed title (up to 30 characters) for Pile and Discard claims; the source zone is not recorded |
| `moveCard` | `{name}` → `{dest}`: `"{title}"` | See below |
| `submitCard` | `{name}` made a card | Name passed from client |
| `shuffleCards` | `{name}` shuffled — `{n}` in deck | |
| `loadCards` | `{n}` card/cards loaded — `{total}` in deck | No player attribution |
| `setScore` | `{delta}` pts for `{target}` *(by `{setter}` if different)* | Names passed from client |

## moveCard title visibility

For `moveCard` events, the title is shown if either the source or destination is `pile` or `table`. `discard`, `hand`, and `deck` do not show the title by themselves.

Note: all combinations are valid server-side. The UI restricts which moves are exposed, but the MCP or direct API calls can trigger any combination.

This title visibility rule applies to `moveCard` events. `claimCard` events always include the claimed title, including when a card is Yoinked from Discard; the event does not distinguish Pile from Discard as its source.

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
