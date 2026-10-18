# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Electron 29 + React 18 + Vite 5 + better-sqlite3. Renderer is a Chromium web view; all IPC goes through `window.electronAPI` (contextBridge, contextIsolation on, nodeIntegration off). CSS lives in a single `theme.css` with CSS custom properties for light/dark; no Tailwind or UI library. Framer Motion for animation, Recharts for charts. TMDB and the AI provider (Gemini, or Anthropic Claude) are called from the main process; keys live in the gitignored `backend/.env`.

## Users

General consumers in Colombia — people who watch movies and series on streaming platforms (Netflix, Max, Disney+, etc.) who want a private, offline-first place to track what they have watched, what they are watching, and what they want to watch next. No technical background required. University final project (Software Engineering, UCC Pasto) by Camilo Rosero; it is also evaluated by instructors.

## Product Purpose

CineTracker is a personal desktop journal for movies and series. Users log titles (TMDB search or manual entry), set a watch status (pending / watching / completed / dropped), rate them 1–10, leave notes, keep a watch history, organise titles into lists, see statistics about their viewing habits, and get recommendations: rule-based by genre affinity, or AI-generated with a one-sentence reason when an Anthropic key is configured. Success: a user can register, find and add a title with its poster, rate it, see it reflected in statistics and recommendations, and find everything again after restarting the app.

## Positioning

A private, local-first alternative to Letterboxd or Serializd: no social feed, no public profile, no server. Your own catalogue, ratings and watch history on your own machine.

## Operating Context

Used at home, typically right after finishing or starting a title. Sessions are short (1–5 minutes): mark something as watched, rate it, look up what to watch next. The app often stays open in the background. Low-light environments are common (evening, couch, home theatre).

## Capabilities and Constraints

- Pages: Home, Catalog, Title showcase (title detail; also the new-title form), Statistics, Lists, Profile & Settings, Login/Register (page and modal).
- Accounts: several accounts per installation; each account sees only its own titles, records and lists. Session is in memory (log in again after restart). bcrypt passwords.
- Guest-first: guests can browse Home (TMDB trending) and every page read-only; any change (add, edit, delete, rate, status, lists) and personalised recommendations require login, and the original action resumes after logging in.
- Titles: CRUD; fields title, type (movie/series), status, rating 1–10, genres (JSON array), runtime, release year, overview, poster/backdrop paths, notes. TMDB metadata is saved locally so titles work offline afterwards.
- Records: watch-history entries per title (watched date, platform, rating, note), full CRUD.
- Lists: named collections per user (create, rename, delete, add/remove titles).
- Statistics: totals by status and type, completion rate, average rating, hours watched, genre distribution, top and top-rated genres, 12 months of activity.
- Trailers: the best YouTube trailer from TMDB (Spanish first) plays in a reusable YouTubePlayer on an on-air screen, from the Home stage and the title showcase.
- API keys can be typed in Perfil (sealed with the OS) and a remembered session keeps the user signed in for 30 days.
- Recommendations: AI (Google Gemini; Anthropic Claude when only its key is set) with fallback to the rule-based engine when there is no key, no network, an API error, or fewer than 3 rated titles.
- Theme: light/dark toggle persisted locally; dark is the default.

## Brand Commitments

- Name: CineTracker.
- Accent: green #018751 on near-black #0A0A0A (replaces the former #00BFFF blue; user decision, applies to both light and dark themes).
- Both light and dark modes required.
- Code, comments and commits in English; all UI text in Spanish (Latin American, informal "tú"). TMDB metadata is requested in Spanish (es-MX); genres are stored by their English TMDB name and translated for display.
- No social features, no cloud sync, no public-facing content.
- Must not look generic or "AI-made" (user's explicit concern).

## Evidence on Hand

- Full working codebase in `frontend/src/` and `backend/`, with a Vitest suite in `backend/tests/`.
- Real catalogue data comes from the user's own entries and TMDB (posters, backdrops, overviews, genres). No testimonials, metrics or user counts exist; never invent them.

## Product Principles

1. **Your catalogue is the hero** — real posters and the user's own titles carry the experience; nothing is mocked or hardcoded.
2. **Practical stays one step away** — add, rate and mark watched must never get harder because of visual ambition.
3. **Offline-first confidence** — every screen works without network; TMDB is an enhancement.
4. **Personal, not social** — a private journal tone, no vanity metrics.
5. **Considered motion** — animation makes browsing feel cinematic but stays fast (200–400ms) and respects reduced motion.

## Accessibility & Inclusion

WCAG 2.1 AA contrast in both themes. Visible focus states, full keyboard navigation, aria labels, minimum 44px targets for primary controls, `prefers-reduced-motion` respected.
