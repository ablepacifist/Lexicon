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

If you are hosting this frontend behind a Playit tunnel, use these steps:

1) Create and run a tunnel to your local dev server:

```bash
playit tunnel tcp 3001
```

2) Set `.env` with your tunnel URL and API base:

```env
REACT_APP_LEXICON_API_URL=https://your-backend-tunnel-url.ply.gg/api
REACT_APP_API_URL=https://your-backend-tunnel-url.ply.gg/api
PORT=3001
REACT_APP_FRONTEND_URL=https://your-frontend-tunnel-url.ply.gg
```

3) Ensure the backend CORS config allows your frontend tunnel URL.

## Environment Variables

Create a `.env` file in this folder if you need to override API URLs:

```env
REACT_APP_LEXICON_API_URL=http://localhost:8080
REACT_APP_API_URL=http://localhost:8080
```

Notes:
- `REACT_APP_LEXICON_API_URL` is preferred for session/auth checks.
- `REACT_APP_API_URL` is used as a fallback.
- `PORT` sets the local dev server port.
- `REACT_APP_FRONTEND_URL` is optional, but useful for CORS and linking.

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
