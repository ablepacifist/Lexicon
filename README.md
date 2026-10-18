# Lexicon Frontend

Personal web app and media portal for the Lexicon + Alchemy ecosystem. This React app serves as the public landing site and the UI for authenticated app features.

## What is this?

- Personal website (About, Career, Recipes, Blog, Projects, D&D)
- Entry point to Lexicon media features and Alchemy game dashboards
- Links to related microservices (example: https://voice.alex-dyakin.com)

## Quick Start

```bash
npm install
npm start
```

The app runs at http://localhost:3000 by default.

## Prerequisites

- Node.js 16+ (18+ recommended)
- npm or yarn
- Access to the Lexicon/Alchemy backend APIs

## Hosting Setup (Playit Tunnel)

Playit hosting is already covered by the destinations doc below (`PLAYIT_HOST`,
`PLAYIT_LEXICON_PORT`, `PLAYIT_ALCHEMY_PORT`, `PLAYIT_POKEMON_PORT`), so there
is nothing to set per tunnel. Point a Playit TCP tunnel at this app's port
(`FRONTEND_PORT`, default 3001) and, if the tunnel host/ports ever change,
update the root registry (see below) rather than this app.

## Destinations (API URLs)

This app does **not** read `REACT_APP_*_URL` env vars - the backend
destinations (Lexicon, Alchemy, Pokemon, Voice Bridge) are compiled into the
build from a flat, secret-free registry instead:

- `src/config/destinations.defaults.json` - committed standalone defaults, so
  this app builds correctly even cloned by itself.
- `scripts/sync-destinations.js` - runs automatically before `npm start` and
  `npm run build` (via `prestart`/`prebuild`). It overlays the defaults with
  the whitelisted keys from the monorepo's root `.env` (found via
  `MASTER_ENV_FILE` or by walking up from this folder), then with matching
  real environment variables, and writes the merged result to the
  git-ignored `src/config/destinations.json` and `public/destinations.json`.
- `src/utils/apiUrls.js` imports `src/config/destinations.json` and composes
  the actual URLs used at runtime (LAN / public HTTPS / Playit / native, by
  hostname), based on `LAN_HOST`, `*_PORT`, `PUBLIC_*_URL` and `PLAYIT_*` keys.

To override a destination locally, either set `MASTER_ENV_FILE` to point at a
root `.env`, or export the specific key (e.g. `LAN_HOST=192.168.1.50 npm start`).

`.env` / `.env.development` in this folder now hold only non-destination
settings (`PORT`, `REACT_APP_ENV`) - they are still git-tracked since they
carry no secrets.

## Scripts

- `npm start` - Run the dev server
- `npm run build` - Production build
- `npm test` - Run tests

## Pages

Public:
- Landing (About Me)
- Career
- Recipes
- Blog
- Projects
- D&D Campaigns

Authenticated:
- Alchemy Dashboard
- Lexicon Dashboard
- Media Upload/Player/Stream
- Audiobooks, Playlists, Knowledge Book

## Assets

Photos are stored in:

- `src/assets/images/extra_photos/`

## Tech Stack

- React (CRA)
- React Router
- CSS
