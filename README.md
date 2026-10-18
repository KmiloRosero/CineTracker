# CineTracker

A desktop app to track, rate and get recommendations for the movies and series you watch. Your catalogue, ratings and watch history stay on your own computer; there is no server and no social feed.

Final project for Software Engineering at Universidad Cooperativa de Colombia (UCC), Pasto, by **Camilo Rosero**.

| Home | Title showcase |
|---|---|
| ![Home](docs/screenshots/home.png) | ![Title showcase](docs/screenshots/showcase.png) |
| **Catalog** | **Statistics** |
| ![Catalog](docs/screenshots/catalog.png) | ![Statistics](docs/screenshots/statistics.png) |

<sub>Captured with a test account and real TMDB titles.</sub>

---

## Features

**Browse as a guest, act with an account**
- Guests can browse Home with this week's trending titles from TMDB. Catalog, Lists, Statistics and Profile ask them to log in.
- Anything that changes data (add, edit, delete, rate, change status, lists) opens a login modal. After login, the original action continues on its own.
- Several accounts per installation; each account only sees its own titles, watch history and lists.

**Catalog**
- TMDB search with a 400 ms debounce, keyboard navigation, poster thumbnails, type and year badges, loading and error states, and manual entry when a title is not on TMDB.
- Choosing a result saves its poster, backdrop, synopsis, genres, runtime and top-billed cast locally. Posters are cached on disk, so the catalogue keeps working offline.
- Grid and list views, search, status chips with counts, genre filter and five sort orders. Your view and sort are remembered.

**Title showcase**
- A full-screen page per title: the poster tilted over a colour field sampled from the poster, a 1–10 score bug, status, "Mark as watched", watch history, cast and notes.
- Round side controls (and arrow keys) move to the previous or next title. Add-to-list, edit and delete are on the same rail.

**Recommendations**
- With a Google Gemini API key, Gemini picks up to 5 of your pending titles from what you rated and explains each pick in one sentence ("Why this?"). An Anthropic key (Claude) works too and is used when there is no Gemini key.
- Without a key, without internet, on an API error or with fewer than 3 rated titles, it falls back to a rule-based engine that ranks pending titles by your favourite genres and explains the match.

**Statistics**
- Key numbers with month-over-month changes, completed watches per month (last 12 months), titles by status, top-rated genres and titles per genre, each with a table view.

**Lists, profile and settings**
- Named lists you can rename, delete and fill from your catalogue.
- Edit name and photo, switch light/dark theme, change password, delete the account with all its data.

**Interface**
- A "match-night broadcast" visual system: black and pitch green (#018751), Anton headlines, condensed numerals, lower-thirds and score bugs. Light and dark themes.
- Page transitions, staggered grids and animated charts that respect the system's reduced-motion setting.
- Keyboard focus states, labelled controls, 44 px targets for primary actions, AA contrast in both themes.

---

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 29, packaged with electron-builder |
| Interface | React 18, Vite 5, React Router 6, framer-motion, Recharts; plain CSS with custom properties (`frontend/src/styles/theme.css`) |
| Fonts | Anton, Barlow, Barlow Condensed (self-hosted through Fontsource) |
| Backend | Runs in Electron's main process: services and repositories over SQLite (better-sqlite3), bcryptjs for passwords |
| External APIs | TMDB (metadata, posters, trending); Google Gemini (REST `generateContent`, JSON schema output) for AI recommendations, with Anthropic Claude (`@anthropic-ai/sdk`) as an alternative |
| Tests | Vitest, run with Electron's Node so the native SQLite module matches |

---

## Architecture

```
┌──────────────────────────── Renderer (Chromium, sandboxed) ────────────────────────────┐
│  React pages ─▶ components ─▶ window.electronAPI.*        <img src="ctimg://w342/..."> │
└───────────────────────────────────────┬───────────────────────────────┬────────────────┘
                    contextBridge (preload.js), IPC invoke              │ custom protocol
┌───────────────────────────────────────▼───────────────────────────────▼────────────────┐
│ Main process                                                                           │
│  ipc/handlers.js   session check (guest / logged in), error mapping                    │
│        │                                                                               │
│  services/         validation and business rules                                       │
│   auth · title · record · list · statistics · recommendation · aiRecommendation ·      │
│   tmdb · imageCache                                                                    │
│        │                                         │                       │             │
│  repositories/     SQL only, scoped by user      │  TMDB API (key in     │  disk cache │
│        │                                         │  backend/.env)        │  of images  │
│  db/  SQLite (better-sqlite3) + versioned        │  Gemini / Claude API  │             │
│       migrations, one-time backup before each    │  (optional)           │             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- The renderer never touches SQL, Node or API keys (`contextIsolation`, `sandbox`, no `nodeIntegration`). Everything goes through the methods exposed in `frontend/electron/preload.js`.
- Every IPC handler resolves the logged-in user from the in-memory session. Read channels return empty results to guests; channels that change data reject them.
- Services validate input and throw readable messages. Database and programming errors are logged in the main process and reach the interface only as a generic message.
- The database lives in Electron's `userData` folder. Schema changes are versioned migrations (`backend/db/migrations.js`) that run once, in a transaction, after copying the database file.

---

## Getting started

Requirements: Node.js 20+ and npm, on Windows, macOS or Linux.

```bash
git clone https://github.com/KmiloRosero/CineTracker.git
cd CineTracker/frontend
npm install        # also rebuilds better-sqlite3 for Electron
```

Create `backend/.env` from the example and add your keys:

```bash
cp ../backend/.env.example ../backend/.env
```

Then start the app:

```bash
npm run dev
```

Vite serves the interface on `http://localhost:5173` and Electron opens it (DevTools opens in its own window in development).

> If `npm run dev` fails with `Cannot read properties of undefined (reading 'whenReady')`, your shell has `ELECTRON_RUN_AS_NODE=1` set (some editor terminals set it). Clear it and run again.

### Environment variables (`backend/.env`)

| Variable | Required | Purpose |
|---|---|---|
| `TMDB_API_KEY` | Yes, for search and trending | TMDB API key (v3). Get one at <https://www.themoviedb.org/settings/api>. Titles already in your catalogue keep working without it. |
| `GEMINI_API_KEY` | No | Enables AI recommendations with Google Gemini. Get one at <https://aistudio.google.com/apikey>. Without an AI key, recommendations use the rule-based engine. |
| `GEMINI_MODEL` | No | Gemini model to call. Defaults to `gemini-3.8-flash`. |
| `ANTHROPIC_API_KEY` | No | Uses Claude for AI recommendations instead, only when `GEMINI_API_KEY` is empty. Get one at <https://console.anthropic.com>. |

`backend/.env` is gitignored. Never commit real keys.

---

## Scripts

Run from `frontend/`:

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server and Electron with hot reload |
| `npm test` | Backend test suite (Vitest under Electron's Node) |
| `npm run test:watch` | Tests in watch mode |
| `npm run build` | Production build of the interface into `frontend/dist` |
| `npm run dist:win` | Windows installer (NSIS) and portable `.exe` |
| `npm run dist:mac` / `npm run dist:linux` | macOS DMG / Linux AppImage |

Packages are written to `C:/CineTracker-release` (see `frontend/electron-builder.json`).

---

## Tests

`npm test` runs 105 tests in `backend/tests/` against temporary SQLite files:

- **Migrations**: fresh databases, upgrades of databases from before accounts existed, backups and idempotency.
- **Auth and profile**: registration, login, password change, avatars, account deletion with cascading data.
- **Catalogue**: title, watch-record and list rules, validation messages, and isolation between users.
- **Statistics**: totals, completion rate, hours, monthly activity, month-over-month trends, merged movie/series genres.
- **Recommendations**: the rule-based engine and every AI fallback path. These tests use a fake Gemini `fetch` and a fake Claude client, and the test config blanks the real keys, so they make no paid calls.
- **TMDB and image cache**: normalisation and error messages (with mocked `fetch`), path safety, and offline reuse of cached images.
- **IPC**: guest restrictions, session handling and hiding internal errors.

---

## Project structure

```
CineTracker/
├── backend/                     runs inside Electron's main process
│   ├── db/                      database.js, schema.sql (baseline), migrations.js
│   ├── ipc/handlers.js          IPC channels → services
│   ├── models/                  JSDoc types for Title, Record, List, User
│   ├── repositories/            SQL for titles, records, lists, users
│   ├── services/                auth, title, record, list, statistics, recommendation,
│   │                            aiRecommendation, tmdb, imageCache
│   ├── tests/                   Vitest suites
│   ├── utils/                   env, genres, session, validators
│   └── .env.example
├── frontend/
│   ├── electron/                main.js (window, security, ctimg protocol), preload.js
│   ├── src/
│   │   ├── pages/               Home, Catalog, TitleDetail, Lists, ListDetail,
│   │   │                        Statistics, Profile, Login
│   │   ├── components/          FixtureCard, ScoreBug, Ticker, Modal, AuthForm, ...
│   │   ├── context/             AuthContext
│   │   ├── hooks/               useRequireAuth, useTheme, useCountUp, ...
│   │   ├── services/tmdbApi.js  renderer wrappers for the TMDB IPC channels
│   │   ├── styles/theme.css     design tokens and all styles
│   │   └── utils/
│   ├── electron-builder.json
│   └── package.json
├── DESIGN.md                    visual system (tokens, components, rules)
└── PRODUCT.md                   product context
```

---

## Security notes

- Passwords are hashed with bcrypt; the session lives only in memory, so you log in again after restarting the app.
- The renderer is sandboxed, cannot navigate away from the app or open new windows, and every permission request (camera, location…) is denied.
- A Content Security Policy allows scripts only from the app itself. Images come from the app, the local `ctimg://` cache or `image.tmdb.org`.
- All IPC input is validated in the services. SQL is parameterised, and the columns that can be updated are whitelisted.
- **API keys and packaged builds:** `npm run dist:*` copies `backend/.env` into the installer so the app works out of the box. Anyone who has your installer can extract those keys, so only share builds with people you trust, or build without your keys.

---

## Credits

Movie and series information and images come from [TMDB](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB.

AI recommendations use [Gemini](https://ai.google.dev) by Google, or [Claude](https://www.anthropic.com) by Anthropic.

## License

MIT © 2026 Camilo Rosero
