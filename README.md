# CineTracker

A desktop app to track, rate and get recommendations for the movies and series you watch. Your catalogue, ratings and watch history stay on your own computer; there is no server and no social feed. The interface is in Spanish.

Final project for Software Engineering at Universidad Cooperativa de Colombia (UCC), Pasto, by **Camilo Rosero**.

[![CI](https://github.com/KmiloRosero/CineTracker/actions/workflows/ci.yml/badge.svg)](https://github.com/KmiloRosero/CineTracker/actions/workflows/ci.yml) — tests, build and a smoke run of the app on Windows, macOS and Linux on every push.

## What it does

- **Catalog and title pages:** TMDB search, status, 1–10 ratings, watch history, notes, lists, trailers, where to watch in Colombia, saga order and similar titles.
- **Descubrir:** AI lists built from your styles (say, slow-burn horror) with a reason for every pick, *¿Qué veo esta noche?* from your mood and the time you have, and finding a title from a loose description. Every suggestion is a real TMDB title; the AI only chooses and explains.
- **Your taste in words:** a cinephile profile on Statistics, a year in review with awards, and *¿Te va a gustar?* with a predicted score on every title.
- **Series and releases:** episode-by-episode progress, a new-episodes rail, and upcoming releases from the people and genres you follow.
- **Habits and data:** a yearly challenge, weekly streaks, your streaming platforms as a filter, import from Letterboxd and IMDb, export to CSV or to Letterboxd.

AI features use Google Gemini (or Anthropic Claude when only its key is set). Without a key, each one falls back to rules and says so.

| Home | Title showcase |
|---|---|
| ![Home](docs/screenshots/home.png) | ![Title showcase](docs/screenshots/showcase.png) |
| **¿Qué veo esta noche?** | **Descubrir** |
| ![Tonight: what was understood, picks with reasons, where to watch and trailers](docs/screenshots/tonight.png) | ![Descubrir: a list built from your taste](docs/screenshots/discover.png) |
| **Statistics** | |
| ![Statistics with the cinephile profile](docs/screenshots/statistics.png) | |
| **Estrenos** | **Tu año en cine** |
| ![Upcoming releases](docs/screenshots/upcoming.png) | ![Year in review](docs/screenshots/year.png) |
| **Catalog** | |
| ![Catalog](docs/screenshots/catalog.png) | |





## Scripts

Run from `frontend/`:

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server and Electron with hot reload |
| `npm test` | All tests: backend and interface (Vitest under Electron's Node) |
| `npm run test:watch` | Tests in watch mode |
| `npm run smoke` | Starts the real app with a throwaway profile and exits 0 when the database opened and the interface rendered without errors (what CI runs on each system) |
| `npm run typecheck` | TypeScript check of `src` (the `.tsx` components in `src/components/ui`) |
| `npm run build` | Production build of the interface into `frontend/dist` |
| `npm run dist:win:public` | The installer and portable `.exe` published on GitHub, with only the TMDB key so it works right after installing |
| `npm run dist:win` | The same with every key in `backend/.env` (`-con-gemini`), for your own use |
| `npm run dist:win:nokeys` | The same, without any API keys (`-sin-claves`), safe to share |
| `npm run dist:mac` / `npm run dist:linux` | macOS DMG / Linux AppImage |

Packages are written to `C:/CineTracker-release` (see `frontend/electron-builder.json`).

---


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

## License

MIT © 2026 Camilo Rosero
