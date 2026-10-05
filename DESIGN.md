# Design System — CineTracker

<!-- impeccable:design-schema 1 -->

## Visual World

Dense, ruled module grid. Near-black shell (#0d0d12) with hairline-bordered cards. Every interactive element uses #00BFFF (deep sky blue) as its active state, focus ring, and accent. Neutral surface elevations are additive: base → surface → raised → module. No gradients on text; no colored border-left/right above 1px on cards.

## Color

| Token | Dark | Light | Role |
|---|---|---|---|
| `--bg-base` | #0d0d12 | #f2f2f8 | Page ground |
| `--bg-surface` | #13131a | #ffffff | Sidebar, modal bg |
| `--bg-module` | #1e1e2a | #ffffff | Cards, chart panels |
| `--bg-input` | #22222f | #eaeaf2 | Inputs, tracks |
| `--accent` | #00BFFF | #0099cc | Interactive, active |
| `--accent-hover` | #29cfff | #00BFFF | Hover state |
| `--accent-dim` | rgba(0,191,255,.12) | rgba(0,153,204,.1) | Active sidebar bg |
| `--status-pending` | #f7c04f | #c9950a | Pending status |
| `--status-watching` | #00BFFF | #0099cc | Watching status |
| `--status-completed` | #4fcf70 | #279e52 | Completed status |
| `--status-dropped` | #f74f4f | #d9362a | Dropped / error |

## Typography

System stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`. No external font loaded. Scale:
- Page heading: 1.4rem / 800 / tracking -.3px
- Section heading: .95rem / 700
- Body: .875rem / 400
- Label / meta: .72–.78rem / 600–700 / uppercase / tracking .6px
- Stat value: 1.35–1.65rem / 800 / tabular-nums
- Smallest: .64–.7rem (status badges, chip labels)

## Spacing

8px base grid. Standard paddings: page 28px, module card 14–18px, input 8px v / 10px h, chip 3px v / 10px h.

## Elevation / Shadows

| Level | Token | Use |
|---|---|---|
| Module | `--shadow-module` | Cards, stat pills |
| Medium | `--shadow-md` | Modals, dropdowns |
| High | `--shadow-lg` | Login card, poster detail |

## Border radius

xs 3px · sm 5px · md 8px · lg 12px · xl 18px · full 9999px

Cards use md (8px). Modal uses lg (12px). Login card uses xl (18px). Chips and badges use full.

## Components

**TitleCard** — 2:3 aspect poster with bottom-gradient scrim. Status badge bottom-left over poster. Info strip below (title 700, meta .7rem muted). Hover: border-color → accent, box-shadow → md. CSS handles hover; framer-motion handles mount stagger and whileTap.

**StatPill** — Column flex, centered. Icon → value (800) → label (uppercase muted). Used on Home summary strip.

**StatCard** — Same column pattern with more padding, supports `--accent/green/gold` value color variants. Used on Statistics.

**Chip** — pill-shaped filter toggle. Active variant matches the status color it represents.

**Sidebar nav link** — active state: `background: accent-dim` + `box-shadow: inset 3px 0 0 accent`. Transition 200ms.

**Sidebar user block** — 30px initials circle (accent fill) or avatar + name + logout text button.

## Motion

- Page transitions: fade + y:8→0 enter / y:0→-5 exit, 200ms easeOut / 130ms easeIn.
- Card grid stagger: 40ms between cards, each card 200ms easeOut from scale .95.
- Login card: y:20→0 fade-in 280ms. Error banner: height 0→auto 180ms. Shake: 380ms keyframe on auth failure.
- Stat cards (Statistics): staggered y:8→0, 60ms delay per card.
- Theme toggle: all colored containers use `transition: background-color .3s ease, border-color .3s ease, color .2s ease`. Body uses `background-color .3s, color .3s`. Interactive states (hover, focus) use `var(--t)` = `.15s ease`.
- Spinner: `@keyframes spin { to { transform: rotate(360deg) } }` — defined globally in theme.css Reset block.
- No width/height/margin/padding animations (layout thrash). Use transform + opacity.

## Principles

1. The module grid is the identity — density and hairlines over whitespace.
2. #00BFFF is the only accent — it appears on interactive states, active sidebar items, and watching badges.
3. Status colors are data, not decoration — each maps to exactly one status value.
4. Tabular figures everywhere numbers appear.
5. No kickers, no eyebrows, no section numbers, no gradient text.
6. All hardcoded color values in component CSS are replaced by design tokens — no `rgba(0,191,255,x)` except in token definitions.
7. `@keyframes spin` is global (defined once in Reset block). Never duplicated per-component.
