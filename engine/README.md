# @mcteamster/white-engine

A trimmed-down fork of [boardgame.io](https://github.com/boardgameio/boardgame.io) maintained as the `/engine` workspace in the [white](https://github.com/mcteamster/white) monorepo.

## About

The upstream boardgame.io project is in maintenance mode. This fork gives full control over the game engine dependency — allowing targeted patches, dependency upgrades, and removal of unused features without waiting on upstream.

Forked from upstream tag `v0.50.2`.

## Changes from upstream

- Renamed package to `@mcteamster/white-engine`
- Removed debug panel and Svelte dependency
- Removed examples, docs, benchmark, integration tests, and upstream tooling
- Replaced rollup/babel build pipeline — resolves directly from source, no dist required
- Upgraded TypeScript from 3.8 to 5.6 (shared with monorepo root)
- Added `package.json` `exports` field for sub-path resolution

## License

MIT — see [LICENSE](./LICENSE). Copyright (c) 2017 The boardgame.io Authors.
