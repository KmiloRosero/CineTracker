# CineTracker

Desktop app to track and rate movies and TV series. Built with Electron, React (Vite), and SQLite.

## Development

```bash
cd frontend
npm install
npm run dev
```

The app opens at `http://localhost:5173` inside an Electron window with DevTools enabled.

## TMDB API Key

Create a `.env` file inside `frontend/` with your TMDB API key:

```
VITE_TMDB_API_KEY=your_api_key_here
```

Get a free key at https://www.themoviedb.org/settings/api

## Building Installers

### Prerequisites

- Place icon files in `frontend/icons/` before building:
  - `icon.png` — 512x512 px (Linux)
  - `icon.ico` — Windows
  - `icon.icns` — macOS

  To generate `.ico` and `.icns` from a single PNG:
  ```bash
  npx electron-icon-maker --input=icons/icon.png --output=icons
  ```

### Build for the current platform

```bash
cd frontend
npm run dist
```

Runs `vite build` to compile the React app, then `electron-builder` to package everything.

### Build for a specific platform

```bash
npm run dist:win    # Windows — NSIS installer (.exe)
npm run dist:mac    # macOS  — Disk image (.dmg)
npm run dist:linux  # Linux  — AppImage (.AppImage)
```

> Note: building for macOS requires running on a Mac. Building for Windows and Linux can be done cross-platform.

### Output

Installers are generated in:

```
frontend/release/
```

| Platform | File |
|----------|------|
| Windows  | `release/CineTracker Setup x.x.x.exe` |
| macOS    | `release/CineTracker-x.x.x.dmg` |
| Linux    | `release/CineTracker-x.x.x.AppImage` |

## Project Structure

```
CineTracker/
├── backend/
│   └── db/
│       ├── database.js    # SQLite logic (better-sqlite3)
│       └── schema.sql     # Table definitions
└── frontend/
    ├── electron/
    │   ├── main.js        # Electron main process + IPC handlers
    │   └── preload.js     # Secure bridge to renderer
    ├── src/
    │   ├── pages/         # Home, Catalog, TitleDetail, Statistics
    │   ├── components/    # TitleCard, RatingStars, StatsChart, ThemeToggle
    │   └── services/      # tmdbApi.js, recommendationEngine.js
    ├── icons/             # App icons for packaging
    └── electron-builder.json
```
