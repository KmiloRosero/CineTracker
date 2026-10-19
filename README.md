# CineTracker

A desktop app to track, rate and get recommendations for the movies and series you watch. Your catalogue, ratings and watch history stay on your own computer; there is no server and no social feed. The interface is in Spanish.

Final project for Software Engineering at Universidad Cooperativa de Colombia (UCC), Pasto, by **Camilo Rosero**.

| Home | Title showcase |
|---|---|
| ![Home](docs/screenshots/home.png) | ![Title showcase](docs/screenshots/showcase.png) |
| **Catalog** | **Statistics** |
| ![Catalog](docs/screenshots/catalog.png) | ![Statistics](docs/screenshots/statistics.png) |

<sub>Captured with a test account and real TMDB titles.</sub>

## Documentación

- [Manual de usuario](docs/MANUAL_DE_USUARIO.md): instalación, uso de cada pantalla, tráilers, claves de API y problemas frecuentes.
- [Informe técnico](docs/INFORME_TECNICO.md): arquitectura, modelo de datos, integraciones (TMDB, YouTube, Gemini), seguridad, pruebas y decisiones.

---



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

---

## Scripts

Run from `frontend/`:

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server and Electron with hot reload |
| `npm test` | All tests: backend and interface (Vitest under Electron's Node) |
| `npm run test:watch` | Tests in watch mode |
| `npm run typecheck` | TypeScript check of `src` (the `.tsx` components in `src/components/ui`) |
| `npm run build` | Production build of the interface into `frontend/dist` |
| `npm run dist:win` | Windows installer (NSIS) and portable `.exe`, with the keys in `backend/.env` |
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
