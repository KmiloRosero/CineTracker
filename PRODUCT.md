# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Electron 29 + React 18 + Vite 5 + better-sqlite3. Renderer is a Chromium web view; all IPC goes through `window.electronAPI` (contextBridge). CSS lives in a single `theme.css` with CSS custom properties for light/dark. Framer Motion for animation. Recharts for data visualisation.

## Users

General consumers in Colombia — people who watch movies and series on streaming platforms (Netflix, Max, Disney+, etc.) who want a private, offline-first place to track what they've watched, what they're watching, and what they want to watch next. No technical background required. Single-user desktop app; one account per installation.

## Product Purpose

CineTracker is a personal desktop journal for tracking movies and series. It lets users log titles (manually or via TMDB search), set a watch status (pending / watching / completed / dropped), leave ratings and notes, organise titles into custom lists, and see statistics about their viewing habits. A recommendation engine surfaces pending titles that match the user's highest-rated genres. The app runs fully offline; TMDB is used only for metadata import.

## Positioning

A private, local-first alternative to Letterboxd or Serializd: no social feed, no public profile, no server — just your own catalogue, ratings, and watch history on your machine.

## Operating Context

Used at home, typically after finishing or starting a title. Sessions are short (1–5 minutes): mark something as watched, rate it, look up what to watch next. The app stays open in the background while the user is on another screen. Dark environments are common (home theatre, evening couch use); dark mode is the default.

## Capabilities and Constraints

- Five pages: Login, Home, Catalog, TitleDetail (also new-title form), Statistics.
- Auth: register / login / logout via bcrypt + in-memory session (single-user desktop, no JWT).
- Titles: create (manual or TMDB import), read, update, delete. Fields: title, type (movie/series), status, rating (0–10), genres (JSON array), runtime, release year, overview, poster/backdrop paths, notes.
- Records: watch-history entries per title (watched_date, platform, per-record rating).
- Lists: named collections of titles.
- Statistics: genre counts, monthly watched counts, total hours watched, top genres.
- Recommendations: genre-affinity scoring over pending titles (MIN_RATING=8, TOP_N=5).
- Theme: light/dark toggle persisted to SQLite settings table.
- Primary brand color: #00BFFF (deep sky blue).
- bcryptjs for password hashing; in-memory session (no JWT, no token refresh).
- Framer Motion for animations; Recharts for charts; TMDB API key in `.env` (renderer only).

## Brand Commitments

- Name: CineTracker.
- Primary color: #00BFFF (non-negotiable; used for interactive elements, active states, and key accents).
- Both light and dark modes required.
- No social features, no cloud sync, no public-facing content.

## Evidence on Hand

- Full working codebase in `frontend/src/` and `backend/`.
- Existing CSS design system in `frontend/src/styles/theme.css`.
- All pages functional with real IPC data.

## Product Principles

1. **Clarity over decoration** — the user came to log a title or check their stats, not admire the interface.
2. **Offline-first confidence** — every screen works with zero network; TMDB import is an enhancement, not a dependency.
3. **Personal, not social** — the tone is a private journal, not a public profile. No vanity metrics.
4. **Dark by default** — most use happens in low-light environments; dark mode is the primary target.
5. **Delight in the details** — animations and micro-interactions should feel considered, never gratuitous.

## Accessibility & Inclusion

WCAG 2.1 AA contrast minimums. All interactive elements keyboard-accessible. Spanish and English copy both acceptable (UI currently in English).
