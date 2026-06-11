# UI Layer Stack (z-index)

wired-dialog renders at `z-index: 100` (via `--wired-dialog-z-index`). Anything that must appear above it needs `> 100`.

| z-index | Element | File |
|---------|---------|------|
| 10 | Pile like count badge (absolute, inside pile card) | CommonSpace |
| 10 | Focus prev/next browse icons (absolute, inside focus overlay) | Focus |
| 20 | QR code share popup | CommonSpace |
| 20 | Share button/card | CommonSpace |
| 20 | DeckEditor toolbar item | DeckEditor |
| 30 | Finalise panel (card create overlay) | Finalise |
| 40 | Console toggle + panel | Console |
| 40 | Score editing overlay | CommonSpace |
| 45 | `#create` canvas overlay | index.css |
| 50 | Header (top fixed bar) | CommonSpace |
| 50 | Gallery bottom bar | Gallery |
| 56 | DeckEditor toolbars | DeckEditor |
| 55 | Toolbar (bottom fixed action bar) | ActionSpace |
| 55 | Sketch mode draw tools row | ActionSpace |
| 55 | CardEditor toolbar | CardEditor |
| 60 | DeckEditor modals / image picker | DeckEditor |
| 60 | CardEditor modal | CardEditor |
| 110 | Focus overlay (fullscreen card focus, beats wired-dialog) | Focus |
