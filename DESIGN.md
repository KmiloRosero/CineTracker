---
name: CineTracker
description: A personal film and series tracker staged as a match-night sports broadcast.
colors:
  pitch-green: "#018751"
  pitch-green-deep: "#016e42"
  pitch-green-bright: "#1fb574"
  pitch-green-light-status: "#017a49"
  broadcast-black: "#0a0a0a"
  chalk: "#f4f4f0"
  on-green: "#ffffff"
  booth-surface: "#101110"
  booth-module: "#161816"
  booth-input: "#1c1f1d"
  booth-hover: "#222623"
  booth-text-secondary: "#b6bab3"
  booth-text-muted: "#8b9088"
  studio-chalk: "#f1f1ec"
  studio-white: "#ffffff"
  studio-input: "#e7e8e2"
  studio-hover: "#e0e2db"
  studio-text-secondary: "#3d423d"
  studio-text-muted: "#5c625b"
  card-amber: "#f2c14e"
  card-amber-ink: "#8a5f00"
  card-red: "#f0675c"
  card-red-ink: "#b83227"
  chart-amber-studio: "#b8860b"
typography:
  display:
    fontFamily: "Anton, Barlow Condensed, sans-serif"
    fontSize: "clamp(3.5rem, 7.4vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Anton, Barlow Condensed, sans-serif"
    fontSize: "clamp(2.25rem, 3.6vw, 3.25rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0.01em"
  title:
    fontFamily: "Anton, Barlow Condensed, sans-serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
  title-sm:
    fontFamily: "Anton, Barlow Condensed, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 400
    lineHeight: 1
  score:
    fontFamily: "Anton, Barlow Condensed, sans-serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
  label:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
  label-sm:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.06em"
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-lead:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  xs: "2px"
  sm: "3px"
  md: "4px"
  lg: "6px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "56px"
components:
  button-primary:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-green}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 18px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.pitch-green-deep}"
  button-primary-active:
    backgroundColor: "{colors.broadcast-black}"
    textColor: "{colors.chalk}"
  button-primary-lg:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.sm}"
    padding: "0 28px"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sm}"
    padding: "0 18px"
    height: "40px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.card-red}"
    rounded: "{rounded.sm}"
    padding: "0 18px"
    height: "40px"
  lower-third-label:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-green}"
    typography: "{typography.label}"
    padding: "4px 14px 3px"
    height: "36px"
  lower-third-meta:
    backgroundColor: "{colors.broadcast-black}"
    textColor: "{colors.chalk}"
    typography: "{typography.label}"
    padding: "4px 14px 3px"
    height: "36px"
  score-bug:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-green}"
    typography: "{typography.score}"
    rounded: "{rounded.xs}"
    padding: "4px 10px 2px"
  score-segment:
    backgroundColor: "{colors.booth-input}"
    textColor: "{colors.booth-text-secondary}"
    rounded: "{rounded.xs}"
    width: "30px"
    height: "44px"
  score-segment-on:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-green}"
  rail-tag:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-green}"
    padding: "4px 10px 3px"
  fixture-card:
    backgroundColor: "{colors.booth-module}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sm}"
    padding: "12px"
  input-field:
    backgroundColor: "{colors.booth-input}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    height: "44px"
  select-field:
    backgroundColor: "{colors.booth-input}"
    textColor: "{colors.chalk}"
    padding: "0 12px"
    height: "44px"
    width: "160px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.booth-text-secondary}"
    typography: "{typography.label}"
    padding: "0 12px"
    height: "36px"
  chip-active:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.broadcast-black}"
  chip-watching-active:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-green}"
  chip-pending-active:
    backgroundColor: "{colors.card-amber}"
    textColor: "{colors.broadcast-black}"
  chip-dropped-active:
    backgroundColor: "{colors.card-red}"
    textColor: "{colors.broadcast-black}"
  view-toggle-option:
    backgroundColor: "{colors.booth-input}"
    textColor: "{colors.booth-text-secondary}"
    width: "44px"
    height: "42px"
  view-toggle-option-active:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.broadcast-black}"
  catalog-row:
    textColor: "{colors.chalk}"
    padding: "8px 12px 8px 4px"
  catalog-row-hover:
    backgroundColor: "{colors.booth-hover}"
  ticker-standalone:
    backgroundColor: "{colors.broadcast-black}"
    textColor: "{colors.chalk}"
    typography: "{typography.score}"
    height: "88px"
  panel:
    backgroundColor: "{colors.booth-module}"
    textColor: "{colors.chalk}"
    typography: "{typography.title-sm}"
    padding: "24px"
  status-bar-segment:
    rounded: "{rounded.md}"
    height: "28px"
  ranking-item:
    textColor: "{colors.chalk}"
    typography: "{typography.label}"
    height: "52px"
  list-row:
    backgroundColor: "{colors.booth-module}"
    textColor: "{colors.chalk}"
    typography: "{typography.title}"
    padding: "16px 16px 16px 24px"
  list-row-poster:
    backgroundColor: "{colors.booth-input}"
    rounded: "{rounded.xs}"
    width: "64px"
  settings-section:
    textColor: "{colors.chalk}"
    typography: "{typography.title-sm}"
    padding: "32px 0"
  avatar-slab:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-green}"
    size: "96px"
  empty-state:
    backgroundColor: "{colors.booth-module}"
    textColor: "{colors.chalk}"
    typography: "{typography.title}"
    padding: "48px 40px"
  modal:
    backgroundColor: "{colors.booth-surface}"
    textColor: "{colors.chalk}"
    padding: "24px 28px 28px"
    width: "480px"
  toast:
    backgroundColor: "{colors.booth-surface}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  toast-icon-success:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-green}"
    size: "28px"
  toast-icon-error:
    backgroundColor: "{colors.card-red}"
    textColor: "{colors.broadcast-black}"
    size: "28px"
  nav-link:
    textColor: "{colors.booth-text-secondary}"
    typography: "{typography.label}"
    padding: "0 16px"
    height: "44px"
  nav-link-active:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-green}"
  sidebar-user-active:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-green}"
    height: "52px"
  side-control:
    backgroundColor: "rgba(10,10,10,.5)"
    textColor: "{colors.chalk}"
    rounded: "{rounded.full}"
    size: "48px"
  segmented-option-active:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.broadcast-black}"
    height: "44px"
    padding: "0 16px"
  wordmark-cine:
    backgroundColor: "{colors.broadcast-black}"
    textColor: "{colors.chalk}"
  wordmark-tracker:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-green}"
---

# Design System: CineTracker

## Overview

**Creative North Star: "Match Night On Air"**

CineTracker reads as a football broadcast graphics package laid over your own catalogue. Titles are fixtures, status is the scoreline, the rating is the score bug, and the Home stage is the live feed: a backdrop graded to black, a low band of pitch-green light rising from the bottom edge, the title set as a heavy condensed on-air caption, and a ticker strip closing the frame. The vocabulary is square slabs of flat colour, condensed capitals and tabular numerals, all of it identical in weight whether the studio is dark or lit.

Density is broadcast density: few elements, each loud. One owned colour (pitch green) carries whole slabs rather than thin accents, black slabs follow it, and chalk-white type sits on top. Depth comes from overlapping flat things (posters over fields, slabs over photographs, rotated cards stacked in a deck), not from soft shading. Motion is the broadcast wipe: slabs grow in from the left, green first and black after, titles reveal behind a clip that slides open.

The dark theme is the booth at night (broadcast black ground); the light theme is a chalk studio set where the slabs stay exactly as they are on air. Every surface is built in this world: Home, the title showcase and edit form, Catalog, Statistics, Lists and list detail, Profile and settings, Login, and the app shell with its modals and toasts. Working pages are the studio's graphics desk: Anton headings over a 2px rule, square modules on the module tone, chips and toggles that invert when chosen, and the same ticker and lower-third the stage uses.

**Key Characteristics:**
- One owned colour, used as solid slabs (lower-thirds, score bugs, active nav, the active profile block, ticker tag, rail tags, avatar, primary buttons).
- Broadcast black slabs that never change with the theme.
- Anton capitals for every name and big number; Barlow Condensed capitals for every label and small number; Barlow for reading.
- Square corners on modules, chips, fields and rows; 2-3px only on tags, buttons and fixture cards; full circles only for icon-only controls.
- Depth by overlap and rotation; soft shadows belong to posters treated as physical objects and to small floating layers.
- Left-origin wipes at 280ms for slabs, clip wipes around 500ms for titles, fades under reduced motion.

## Colors

A broadcast palette: near-black ground, one saturated pitch green, chalk type, plus two fixed on-air card colours for status.

### Primary
- **Pitch Green** (#018751): the only owned colour. Fills slabs, never outlines them: lower-third labels, score bugs and filled score segments, the sliding active-nav slab, the active sidebar profile block, the ticker tag, rail tags, primary buttons, the avatar slab, the success toast icon, the watching chip and chart series, the TRACKER half of the wordmark, text selection, the green top bars on modals, empty states and the login card, the fallback showcase field and the horizon band (at 50% to 12% alpha). White on it passes 4.57:1, so it carries uppercase condensed labels and large type only.
- **Deep Pitch** (#016e42): primary hover; in the light theme also the readable green for links, focus outlines and green text on chalk.
- **Floodlight Green** (#1fb574, token `--slab-green`): the readable green on black, fixed in both themes for anything on an on-air black surface (stage countdown bar, stage and trailer focus rings, crawl separators, the trailer language tag); in the dark theme also links, focus outline, upward ticker deltas, the top ranking position, the "watching" status colour in the dark theme (7.5:1 on black).

### Neutral
- **Broadcast Black** (#0a0a0a): dark-theme ground and every slab that reads "black" in both themes (lower-third meta, wordmark CINE, stage, tickers, login page ground, poster labels, pressed primary buttons, edit-form label tags, the initials slab inside the active profile block, the movie type badge).
- **Chalk** (#f4f4f0): primary type on black and the slab text colour in both themes; also the "completed" status card and the inverted active state of chips, view toggles and segmented options in the dark theme.
- **Booth Surface / Module / Input / Hover** (#101110 / #161816 / #1c1f1d / #222623): the four dark tonal steps. Surface carries the sidebar, modals, toasts and popovers; module carries fixture cards, panels, list rows and empty states; input carries fields, selects and toggle options; hover fills rows under the pointer. Steps of roughly 2-3% lightness; no step is a different hue.
- **Booth Secondary / Muted** (#b6bab3 / #8b9088): secondary and tertiary text on black.
- **Studio Chalk / White / Input / Hover** (#f1f1ec / #ffffff / #e7e8e2 / #e0e2db): the light theme's ground, surfaces and modules, fields and hover.
- **Studio Secondary / Muted** (#3d423d / #5c625b): secondary and tertiary text on chalk.
- Borders are chalk or black at 9-10% (hairline) and 18-20% (strong) alpha, never a separate grey. Section rules under page headers, the catalog toolbar and the settings stack are a 2px solid line in the text colour.

### Status cards
- **Amber Card** (#f2c14e, ink #8a5f00 on chalk): pending.
- **Pitch Green** (#018751, text #1fb574 on black, #017a49 on chalk): watching.
- **Chalk** (#f4f4f0): completed; on the chalk studio it becomes white with a 2px black inner edge so it stays a slab.
- **Red Card** (#f0675c, ink #b83227 on chalk): dropped, every destructive action, field errors and the error toast icon.

### Chart steps
The status part-to-whole bar uses one validated step per status and theme, always in the order watching, completed, pending, dropped:
- **Dark:** #018751, #f4f4f0, #f2c14e, #f0675c.
- **Light:** #018751, #0a0a0a, #b8860b, #b83227.

Completed is the neutral step (chalk on the booth, black in the studio) because green and amber are the pair most easily confused under colour-vision deficiency; a neutral between them separates the two hues by lightness, and the order is fixed so they never touch. Single-series charts (monthly columns, genre bars) use pitch green alone.

### Named Rules
**The One Owned Colour Rule.** Pitch green is the only brand hue. Amber and red exist only as status and danger signals; no third decorative colour enters. The exception is the showcase field, which is sampled from the poster itself and falls back to pitch green.

**The Slab Not Stroke Rule.** Green appears as a filled slab or as readable text, not as a thin decorative line. The green strokes are the 3px inset frame drawn inside a hovered poster and the hover border of fixture cards and list rows.

**The On-Air Constancy Rule.** Slabs, status cards, tickers and the Home stage are theme-invariant: broadcast black stays #0a0a0a and the stage stays black in the light theme, the way on-air graphics do not follow the studio lights.

**The Neutral Between Rule.** In any multi-status chart, completed sits between watching and pending as the neutral step, so green and amber are never adjacent.

## Typography

**Display Font:** Anton 400 (with Barlow Condensed, sans-serif)
**Label/Numeral Font:** Barlow Condensed 500/600/700 (with Barlow, sans-serif)
**Body Font:** Barlow 400/500/600 (with system-ui, sans-serif)

All three are self-hosted through @fontsource; no other weights are loaded. Numerals are tabular everywhere (set on the body).

**Character:** A heavy condensed caption face shouting names and scores over a tidy condensed label face, with a plain humanist grotesque for anything that has to be read as a sentence. It is the type stack of a match graphic, not of a magazine.

### Hierarchy
- **Display** (Anton 400, clamp(3.5rem, 7.4vw, 6rem), line-height 0.9, uppercase): the featured title on the Home stage; the showcase title uses clamp(3rem, 6.2vw, 6rem). Clamped to three lines, balanced.
- **Headline** (Anton 400, clamp(2.25rem, 3.6vw, 3.25rem), line-height 0.95, uppercase): page headings on every page and the guest sign-up title.
- **Title** (Anton 400, 2rem, line-height 1, uppercase): rail titles above a 2px rule, list names, empty-state titles and the autocomplete preview title; modal titles use 1.9rem; fixture titles step down to 1.45rem and clamp to two lines.
- **Title small** (Anton 400, 1.6rem, line-height 1, uppercase): panel titles on Statistics and settings section titles on Profile.
- **Score** (Anton 400, 2rem; 2.6rem large, 1.05rem small): the score-bug value, ticker values (1.9rem on the stage, 2.4rem on the standalone ticker), ranking positions (1.5rem), the avatar initial (2.6rem) and the list "+n" overflow (1.4rem). Every number big enough to be a score is Anton.
- **Label** (Barlow Condensed 700, 1rem, 0.08em tracking, uppercase): lower-third slabs, ticker tag, list-menu title, legend and ranking names, catalog row titles (1.1rem, 0.02em). Buttons use 700 at 0.95rem and 0.06em; chips 700 at 0.92rem and 0.06em; nav links 600 at 1rem and 0.06em.
- **Label small** (Barlow Condensed 600-700, 0.75-0.9rem, 0.06-0.1em, uppercase): status tags, genre tags, type badges, metadata lines, form and select labels, chart axis ticks, table toggles, showcase control labels.
- **Body** (Barlow 400, 1rem, line-height 1.5): running text, section intros and dialog messages; overviews step up to 1.02-1.05rem at 1.55-1.6 line-height, capped at 56-60ch and clamped to three lines on the stage.

### Named Rules
**The Every Number Is Condensed Rule.** Counts, years, runtimes, scores, dates, shares and deltas are set in Barlow Condensed or Anton, never in body Barlow.

**The Caps For Captions Rule.** Anton and Barlow Condensed run uppercase with positive tracking; Barlow body text is never uppercased.

## Layout

A fixed 224px sidebar and a single scrolling content column; the window itself never scrolls, so the sidebar and the showcase's side controls stay put.

Two full-bleed compositions belong to Home and the title showcase:
- **The stage** (Home first viewport): full-bleed, at least the viewport height (min 600px). A two-column grid, copy at left bottom-aligned (56px left gutter, up to 900px wide) and the up-next deck at right (about 34%, min 280px), with the ticker spanning the full width as the last row.
- **The showcase** (title detail): a full-viewport grid with an 88px right column for sticky side controls; inside, copy (about 1.05fr, min 360px) and a centred poster (about 0.95fr). Watch history follows below the fold on the page ground with 56px padding, rows capped at 820px.

Below the stage, rails run in a container up to 1400px with 56px gutters and 56px between rails. Fixture cards fill rows of auto-fill columns at min 340px with 16px gaps.

Every other page sits in the standard page container: up to 1200px wide, centred, with 40px top and side padding and 64px at the foot. A page opens with an Anton headline in a header row (bottom-aligned, 16px gap, 32px below) that may carry a green count tag and a right-aligned primary action. Within it:
- **Catalog:** a toolbar grid (search field over chips at full width, selects and view toggle at right) closed by a 2px rule with 28px below; then the poster grid or the catalog list.
- **Statistics:** a 24px vertical stack: standalone ticker, a caption line, then panels in two equal columns with wide panels spanning both.
- **Lists:** an inline create row up to 640px, then list rows stacked with 12px gaps.
- **Profile:** a settings stack up to 980px under a 2px rule; each section is a two-column grid (intro 200-300px, body up to 560px) with 32px gaps and 32px vertical padding.
- **Login:** a broadcast-black page with a single 440px card centred in it.

Spacing rhythm is 4px-based with a small working set: 4, 8, 12, 16, 20/24, 32, 40, 48, 56. Primary interactive targets are 44px tall (nav links, inputs, selects, view-toggle options, score segments, segmented options); chips 36px, standard buttons 40px, large 48px, side controls 48px circles, list rows and ranking rows at least 52px.

Responsive: at 1180px the stage deck narrows to 260px, the title scales to clamp(2.8rem, 6.4vw, 4.75rem), gutters fall to 32px, the ticker compresses, the standalone ticker wraps its stats instead of clipping them, Statistics panels collapse to one column, catalog rows drop the genre and added-date columns, the catalog toolbar stacks, settings sections stack, the showcase poster shrinks to min(26vw, 280px) and the edit form drops its poster preview. At 860px the showcase stacks to one column with the poster first.

## Elevation & Depth

Flat by default, with depth by overlap. Slabs sit directly on photographs, rotated posters overlap each other in the up-next deck (-7deg, 5deg, -2deg, stacked by z-index), the showcase poster tilts over a saturated radial field sampled from its own colours, and the Home backdrop is graded to black with a low green horizon band blended in screen mode. Surfaces separate by tonal step, hairline border and a green top bar, not by shadow. Modals, panels, list rows, empty states, the login card, chips and fields carry no shadow at all; the modal separates from the page by a 72% black scrim, a strong 1px border and its 6px green top bar.

### Shadow Vocabulary
- **Poster object** (`box-shadow: 0 24px 48px rgba(0,0,0,.55), 0 6px 14px rgba(0,0,0,.4)`; light theme at .28/.18 on #0a0a0a): only for posters lifted as physical objects (stage deck cards, the showcase poster).
- **Poster at rest** (`box-shadow: 0 2px 8px rgba(0,0,0,.45)`; light 0 2px 6px rgba(10,10,10,.07)): the quiet shadow under catalog poster cards; the rotated edit-form and autocomplete preview posters use `0 6px 18px` at .55.
- **Floating layer** (`box-shadow: 0 18px 40px rgba(0,0,0,.65)` for the list menu and toast; `0 6px 18px rgba(0,0,0,.55)` for the autocomplete dropdown and chart tooltip; light theme at .14 and .1 on #0a0a0a): small layers that float over content without a scrim. The list menu also carries a 4px green top edge.
- **Focus ring** (`box-shadow: 0 0 0 3px rgba(31,181,116,.28)`; light rgba(1,135,81,.25)): a hard spread ring on focused fields, the search field and selects, not a blur.

### Named Rules
**The Overlap Not Glow Rule.** Nothing glows. Light enters only as the horizon band at the foot of the stage and as the sampled field behind the showcase poster; elements never get coloured halos or blurred outer glows.

**The Inside Frame Rule.** Hover on a poster card draws a 3px green frame inside the poster edge; it does not lift the card with a bigger shadow.

**The No Lift Rule.** Slabs, modules and modals never get a soft shadow to lift them. A modal is separated by its scrim, border and green top bar; a module by its tone and hairline.

## Shapes

Square-cut. Slabs that carry text (lower-thirds, rail tags, ticker tag, wordmark halves, nav highlight, edit-form label tags, type badges, the avatar slab, the toast icon slab) have no radius at all, and neither do the working-page modules: panels, list rows, catalog rows, empty states, modals, the login card, chips, the view toggle, selects, the catalog search and the autocomplete field. Small interactive and informational pieces take barely-there corners: 2px for score bugs, segments, tags, legend swatches and list-row posters, 3px for buttons, form fields, fixture cards and toasts, 4px for poster cards and the outer ends of chart bars and the status bar, 6px for the showcase poster. Full circles are reserved for icon-only controls: the showcase side controls (48px), the modal close (40px), history and list-entry remove (36px) and poster delete (32px). Posters are always a 2:3 frame.

Containers that interrupt the page (modals, empty states, the login card) carry a 6px solid green bar along the top edge; the list menu carries a 4px one. No container carries a coloured stripe on its side.

## Components

### Buttons
Condensed caps on square slabs; pressing inverts so feedback never depends on hover.
- **Shape:** near-square (3px), 40px tall (32px small, 48px large), 18px side padding.
- **Primary:** pitch green slab with white Barlow Condensed 700 caps; hover deepens to #016e42; press inverts to a broadcast-black slab with chalk text and a green edge. Disabled drops to 45% opacity.
- **Ghost:** transparent with a strong hairline border and primary text; hover fills with the hover tone; press inverts to a solid text-colour slab. On the stage it sits on 35% black with a 45% chalk border.
- **Danger:** outlined in red-card colour, fills red only on hover or keyboard focus. Destructive buttons are set apart by space (24px in list detail, their own section on Profile).
- **Focus:** 2px outline in the readable green, 2px offset.

### Chips
Status filters on the catalog toolbar, each carrying its count.
- **Style:** 36px square chips, transparent with a strong hairline border, secondary text in Barlow Condensed 700 caps at 0.92rem and 0.06em; the count follows in 600 at 80% opacity. Hover raises text and border.
- **Active:** the chosen chip inverts to a solid slab. "All" and completed become a text-colour slab with ground-colour text; watching becomes pitch green with white; pending becomes amber with black; dropped becomes the red-card colour with ground-colour text.

### View toggle
A single outlined bar of two 44x42px icon options on the input tone, divided by a strong hairline; the active option inverts to a text-colour slab with ground-colour icon.

### Lower-third (signature)
The broadcast caption bar: a green label slab ("Now watching", "Pick for you", "Trending #n", or the status) followed immediately by a black meta slab (year, type, genres). Both are 36px tall, Barlow Condensed 700 caps at 0.08em, square, and wipe in from the left with scaleX: green over 280ms, black 80ms behind. On the showcase the label slab becomes the status card colour.

### Auth form lower-third
Login and sign-up open with a lower-third instead of a page title: the green slab carries the form title ("Log in", "Create account") and the black slab its one-line subtitle, both 44px tall and wrapping. Switching mode wipes the new pair in with the same 280ms green-first wipe. A failed submit shakes the form horizontally over 360ms (skipped under reduced motion). The password field carries a 44px reveal button inside its right edge. The submit is a full-width large primary button.

### Score bug (signature)
Rating as a broadcast score bug: a green slab with the value in Anton and "/10" in condensed 600 at 85% opacity. Read-only bugs sit on poster corners (overhanging the showcase poster by 14px), in fixture scorelines, catalog rows and the ranking. When editable, ten 30x44px segments follow the slab; segments up to the hovered or chosen value fill green, press inverts to black. Hidden when unrated.

### Ticker
The strip that closes the stage: 64px of broadcast black under a hairline, a green tag at left ("Your catalog" with a small "± vs last month" line), then stats as Anton value plus condensed label and a condensed delta (#1fb574 up, #f0675c down) separated by hairlines. Values count up over 900ms with a quartic ease-out. Guests get a 60s linear crawl of trending names separated by small green squares, paused on hover. A stat with no truthful trend shows no delta.

### Standalone ticker
The same strip opening the Statistics page: 88px tall, no top hairline, a 24px-padded green tag ("Your numbers") and values at 2.4rem. It is broadcast black in both themes. At 1180px its stats wrap onto a second row and values drop to 1.9rem rather than clipping. A condensed caption line (0.95rem, muted) under it explains how the numbers are counted. While loading it is a module-tone skeleton.

### Cards / Containers
- **Fixture card:** a 96px registered poster beside an Anton title, condensed meta line and a scoreline (status tag plus score bug); module background, hairline border that turns green on hover, hover-tone background on press, 12px padding, 3px corners. Its "Why this?" disclosure opens the recommendation reason in place.
- **Poster card (catalog):** 2:3 poster at 4px corners with a bottom scrim, a status tag slab at bottom-left, Barlow Condensed 700 caps title below; hover scales the image 1.04 and draws the inside green frame; delete is a hidden 32px black circle until hover or focus.
- **Status tag:** a 2px-cornered slab in the fixed card colours, condensed 700 caps at 0.75-0.8rem.
- **Rail header:** Anton title over a 2px solid rule in the text colour, an optional green count tag ("3 in progress") and a right-aligned action.
- **Panel:** the Statistics module: module tone, hairline border, square, 24px padding. Header is a small Anton title with a body-text subtitle beside it on the baseline, 20px above the content. Panels enter staggered.
- **Empty state:** module tone, hairline border with a 6px green top bar, square, 48px by 40px padding, up to 760px; an Anton 2rem title, one body paragraph up to 60ch and a primary action.
- **Settings section:** a row of the Profile stack: a small Anton title and a body intro at left, the controls at right, a hairline below. The danger section sets its title in the red-card colour and holds a single outlined danger button.

### Catalog row
The list view of the catalogue: a row with a 48px 2:3 poster, a Barlow Condensed 700 caps title, condensed meta (year, runtime), genres, the status tag, the score bug or a muted "Unrated", and the added date in condensed numerals. Rows are divided by hairlines and fill with the hover tone; a 48px delete column at the far right stays invisible until the row is hovered or the button is focused, then turns red on hover.

### Status part-to-whole bar
A 28px track of segments in the fixed chart order (watching, completed, pending, dropped) using the theme's chart steps, separated by 2px gaps of the panel surface and rounded 4px only at the two outer ends. Segments grow from the left over 600ms, 80ms apart. A legend below names every status (never colour alone): 14px swatch, condensed caps name, count and percentage share in condensed numerals, each row 32px over a hairline.

### Charts
Single-series bars in pitch green with a 4px rounded data end and bars no wider than 24px. Monthly columns keep a hairline horizontal grid and label only the peak and the current month; genre bars label every bar at its tip, so the value axis and grid are dropped. Axis ticks are Barlow Condensed 600. The tooltip is a small surface-tone layer with a condensed value; it adds detail but never gates it. Every chart has a "Show as table" twin collapsed beneath it.

### Ranking
A numbered list of rows at least 52px over hairlines: an Anton position (muted, the first in the readable green), a condensed caps name, a condensed count ("3 rated") and the score bug.

### List fixture row
A full-width button row on the module tone with a hairline border that turns green on hover and the hover tone on press: an Anton 2rem list name and a meta line (count tag, created date in condensed numerals) at left; at right a strip of up to six 64px registered posters at 2px corners, followed by an Anton "+n" when more titles exist, or "No titles yet".

### Avatar slab
Identity as a square slab. On Profile a 96px green square with the initial in Anton 2.6rem (or the photo, cropped square), beside the upload and remove ghost buttons and a hint line. In the sidebar a 40px version heads the profile block.

### Modal and confirm dialog
- **Modal:** a surface-tone panel, 480px (720px wide variant), square, a strong 1px border and a 6px green top bar, no shadow, over a 72% black scrim; it rises 16px and fades in over 240ms. Header is an Anton 1.9rem title with a 40px circular close. Escape and the scrim close it, Tab is trapped inside, focus goes to the control marked as the preferred first control and returns to the trigger on close.
- **Confirm dialog:** a modal with a body message, any form error, and the actions right-aligned: ghost Cancel first, which receives focus, then the outlined danger button with the confirm label and a spinner while busy.

### Trailer screen and YouTube player
- **YouTube player (reusable):** a 16:9 black screen holding YouTube's privacy-enhanced embed in a sandboxed frame. Until the embed reports ready, a green strip sweeps along the bottom edge like a buffering bar, then the frame fades in over 400ms. Empty, missing and error states use the same screen with a low pitch-green horizon band and one centred line of body text (plus a ghost Retry when it failed).
- **Trailer screen:** a modal that is always on-air black whatever the theme (92% scrim, 1120px max): a lower-third (green "TRÁILER" or "AVANCE" slab, black slab with the title) beside a circular close, the player, then a footer with the video's name in condensed numerals, its language in floodlight green and a ghost "Ver en YouTube" with an external-link icon. Opening it holds the Home stage's rotation; closing unmounts the player, which stops the video.
- **"Ver tráiler" buttons:** ghost large buttons with a filled play triangle, after the primary action on the Home stage and the showcase.

### API key rows (Perfil)
An Anton label with a square status tag beside it: outlined "Sin configurar", or a pitch-green slab naming where the key comes from. Below it, a hint line, a 44px password field with the green primary Guardar, then ghost Probar clave / Quitar and an underlined "Conseguir una clave" link pushed right. The test result sits under the row with a check (green) or alert (red card) icon. Rows are split by a hairline.

### Liquid metal background and intro
- **App background:** the liquid-metal WebGL shader (`src/components/ui/liquid-metal-shader.tsx`) in pitch-green tones fills the area right of the sidebar, under a theme scrim (broadcast black at 50–62%, chalk at 88%) so page text keeps AA. It drifts at speed 0.32 and 0.75 pixel ratio; Perfil can hold it still; reduced motion draws one still frame.
- **Intro:** a full-screen presentation on brighter green metal, shaded to near-black behind the copy column. Each of four steps has a lower-third (green step name, black "n de 4"), an Anton headline, one Barlow paragraph, three points with Lucide icons on green squares, and a deck of three real trending posters tilted like the Home stage with black and green tag slabs. A segmented progress bar (green done and current), "No mostrar al abrir la app", ghost Atrás and green Siguiente / Entrar a CineTracker close it; Saltar presentación sits top right. Steps slide 40px with the app's ease; reduced motion keeps only the fade.

### Where to watch
Provider buttons (44px logo, name, external-link icon) on module tiles, grouped in rows under condensed caps labels (Incluida en suscripción, Gratis, Alquiler, Compra), with the JustWatch credit and a "Ver todas las opciones" link below.

### Login: glass card on smoke
- **Smokey background** (`src/components/ui/login-form.tsx`): a full-screen WebGL shader of pitch-green smoke on broadcast black that drifts with the pointer, under a light backdrop blur. It is the one place the app uses a glow, chosen by the user for the sign-in moment. It pauses while the window is hidden and draws one still frame under reduced motion.
- **Glass card:** 384px, 16px corners, dark glass (broadcast black at 60% with a 16px backdrop blur and a 1px white-20% border) so chalk text keeps AA contrast over the brightest smoke. The wordmark sits on top, then an Anton uppercase heading ("Bienvenido de nuevo" / "Crea tu cuenta") and a Barlow line.
- **Floating fields:** underlined inputs whose label (with a Lucide icon) sits inside and floats to 75% above once focused or filled, so the label never disappears. Focus turns the underline and label floodlight green; errors turn them light red with the message under the field. A pitch-green submit button with an arrow that nudges right on hover, the remember checkbox and the mode switch link complete it.
- Used by the login modal (the smoke replaces the scrim; clicking it closes) and the #/login page.

### Toast
A surface-tone strip (240-360px, 3px corners, strong hairline) at the bottom-right, sliding in 24px from the right over 220ms. The icon sits on its own 28px square slab: pitch green with a check for success, red card with an alert for errors. Message in body 500, a 32px dismiss at the end. No coloured side stripe.

### Inputs / Fields
- **Style:** 44px fields on the input tone with a strong hairline border and 3px corners; textareas start at 96px. The catalog search, selects, the inline create field and the autocomplete field use the same tone and border, square; the autocomplete and create fields are 48-52px tall.
- **Select field:** a condensed 700 caps label at 0.78rem above a 44px select at least 160px wide.
- **Labels:** condensed 600 caps; on the edit form each label becomes a small black slab tag.
- **Focus:** border turns the readable green and a 3px spread ring appears; no outline.
- **Error:** an invalid field takes the red-card border; its message sits directly below in red-card body text (0.88rem, 500) and replaces the hint while shown. Form-level errors sit in a 12% red tint box with a 55% red border.
- **Hint:** muted body text at 0.85rem below the field.

### Navigation
- **Sidebar:** 248px on the surface tone, wordmark and a collapse button on top, the four links as 48px rows with 20px icons and the sliding green slab on the active one, then the theme toggle and the account (avatar, name, "Perfil y ajustes", and a logout icon button) at the foot, each group split by a hairline. Collapsed (button or Ctrl+B, remembered) it becomes a 76px icon rail: the wordmark shrinks to its C and T slabs, labels stay for screen readers, and each icon shows its name in a black broadcast tip on hover or focus. The width switches at once (animating it would relayout every page each frame).

### Icons
One family drawn on a 24px grid with a 2px stroke, square caps and mitred joins, inheriting the text colour; 16px in nav, chips and toasts, 18px by default.

### Showcase controls
- **Side controls:** a vertical column of 48px circles on 50% black (70% white on chalk) with a 50% border; hover inverts to a solid text-colour disc, press scales to 0.94. A position counter in condensed numerals sits between previous and next. Delete is separated by 40px and outlined in red until hovered or focused.
- **Segmented control:** a single outlined bar of 44px condensed caps options; the active option is a solid text-colour slab with ground-colour text. On page grounds (the Profile theme switch) it uses the page border, input and text tones, with icon and label options at least 120px wide.
- **Field:** a radial gradient of the poster's sampled hue (most saturated dominant hue, pushed to 44% lightness) pooled behind the poster, cross-fading over 1s, falling back to pitch green.

### Motion
One ease, cubic-bezier(.16, 1, .3, 1), across the app. Slab wipes 280ms scaleX from the left; title wipes 500-550ms clip-path inset from the right edge to open; Home backdrops advance on their own every 7s: each cross-fades over 1.4s while slowly pushing in from 1.0 to 1.08 scale, the active position bar fills over the slide's duration, and rotation pauses while the pointer is on a control, while a control has keyboard focus, while the window is hidden, or when the viewer presses the round pause button (under reduced motion the push-in is dropped and only the cross-fade remains); the showcase poster settles into its tilt over 700ms; modals rise over 240ms, toasts slide in over 220ms, status segments grow over 600ms. The whole app runs under a motion config that follows the user's reduced-motion setting: every wipe becomes an opacity fade, hover lifts and the form shake are dropped, count-ups jump to their value, chart bars skip their animation, and a global rule collapses CSS animation and transition durations.

## Do's and Don'ts

### Do:
- **Do** put pitch green (#018751) on whole slabs: caption labels, score bugs, the active nav, the ticker tag, primary buttons.
- **Do** pair every green caption slab with a broadcast-black slab that follows it, and wipe them in from the left, green first (280ms, black 80ms behind).
- **Do** set every name and score in Anton capitals and every label, count, date and delta in Barlow Condensed capitals.
- **Do** keep slabs, status cards, tickers and the Home stage identical in both themes.
- **Do** show posters at a 2:3 frame and a single registered scale within any grid, rail or row.
- **Do** make press and selection feedback an inversion (green to black, outline to solid).
- **Do** isolate destructive actions by space, keep them outlined in red until hovered or focused, and focus Cancel first in a confirmation.
- **Do** give every stat its trend against the previous month only when the data supports it; omit the delta otherwise.
- **Do** give every chart a labelled legend or direct labels and a table twin; keep completed as the neutral step between watching and pending.
- **Do** keep primary targets at 44px and replace wipes with fades under reduced motion.
- **Do** mark an interrupting container (modal, empty state, login card) with a 6px green top bar.

### Don't:
- **Don't** add a second brand hue; amber and red are status signals only.
- **Don't** put coloured glows or blurred halos around elements; light enters only through the horizon band and the sampled showcase field.
- **Don't** use soft drop shadows to lift slabs, modules, modals or buttons; shadows belong to posters and small floating layers only.
- **Don't** put a coloured stripe on the side of a card, row, toast or alert.
- **Don't** round slabs, modules or text buttons beyond 3px, and don't use full circles for anything but icon-only controls.
- **Don't** set numbers in body Barlow or uppercase running text.
