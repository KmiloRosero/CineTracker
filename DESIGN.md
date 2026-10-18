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
  nav-link:
    textColor: "{colors.booth-text-secondary}"
    typography: "{typography.label}"
    padding: "0 16px"
    height: "44px"
  nav-link-active:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.on-green}"
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

The dark theme is the booth at night (broadcast black ground); the light theme is a chalk studio set where the slabs stay exactly as they are on air. Home, the title showcase, the edit form and the app shell are the migrated surfaces. Catalog, Statistics, Login and Lists still carry legacy layout and have only inherited the tokens and faces; they are not a reference for this system until their own passes land.

**Key Characteristics:**
- One owned colour, used as solid slabs (lower-thirds, score bugs, active nav, ticker tag, rail tags, primary buttons).
- Broadcast black slabs that never change with the theme.
- Anton capitals for every name and big number; Barlow Condensed capitals for every label and small number; Barlow for reading.
- Square or near-square corners on everything that carries text; full circles only for icon-only controls.
- Depth by overlap and rotation; soft shadows belong to posters treated as physical objects.
- Left-origin wipes at 280ms for slabs, clip wipes around 500ms for titles, fades under reduced motion.

## Colors

A broadcast palette: near-black ground, one saturated pitch green, chalk type, plus two fixed on-air card colours for status.

### Primary
- **Pitch Green** (#018751): the only owned colour. Fills slabs, never outlines them: lower-third labels, score bugs and filled score segments, the sliding active-nav slab, the ticker tag, rail tags, primary buttons, the TRACKER half of the wordmark, text selection, the fallback showcase field and the horizon band (at 50% to 12% alpha). White on it passes 4.57:1, so it carries uppercase condensed labels and large type only.
- **Deep Pitch** (#016e42): primary hover; in the light theme also the readable green for links, focus outlines and green text on chalk.
- **Floodlight Green** (#1fb574): the readable green on black: links, focus outline, active stage dot, upward ticker deltas, the "watching" status colour in the dark theme (7.5:1 on black).

### Neutral
- **Broadcast Black** (#0a0a0a): dark-theme ground and every slab that reads "black" in both themes (lower-third meta, wordmark CINE, stage, ticker, poster labels, pressed primary buttons, edit-form label tags).
- **Chalk** (#f4f4f0): primary type on black and the slab text colour in both themes; also the "completed" status card.
- **Booth Surface / Module / Input / Hover** (#101110 / #161816 / #1c1f1d / #222623): the four dark tonal steps for sidebar, fixture cards, fields and hovered rows. Steps of roughly 2-3% lightness; no step is a different hue.
- **Booth Secondary / Muted** (#b6bab3 / #8b9088): secondary and tertiary text on black.
- **Studio Chalk / White / Input / Hover** (#f1f1ec / #ffffff / #e7e8e2 / #e0e2db): the light theme's ground, surfaces, fields and hover.
- **Studio Secondary / Muted** (#3d423d / #5c625b): secondary and tertiary text on chalk.
- Borders are chalk or black at 9-10% (hairline) and 18-20% (strong) alpha, never a separate grey.

### Status cards
- **Amber Card** (#f2c14e, ink #8a5f00 on chalk): pending.
- **Pitch Green** (#018751, text #1fb574 on black, #017a49 on chalk): watching.
- **Chalk** (#f4f4f0): completed; on the chalk studio it becomes white with a 2px black inner edge so it stays a slab.
- **Red Card** (#f0675c, ink #b83227 on chalk): dropped and every destructive action.

### Named Rules
**The One Owned Colour Rule.** Pitch green is the only brand hue. Amber and red exist only as status and danger signals; no third decorative colour enters. The exception is the showcase field, which is sampled from the poster itself and falls back to pitch green.

**The Slab Not Stroke Rule.** Green appears as a filled slab or as readable text, not as a thin decorative line. The one green stroke is the 3px inset frame drawn inside a hovered poster.

**The On-Air Constancy Rule.** Slabs, status cards and the Home stage are theme-invariant: broadcast black stays #0a0a0a and the stage stays black in the light theme, the way on-air graphics do not follow the studio lights.

## Typography

**Display Font:** Anton 400 (with Barlow Condensed, sans-serif)
**Label/Numeral Font:** Barlow Condensed 500/600/700 (with Barlow, sans-serif)
**Body Font:** Barlow 400/500/600 (with system-ui, sans-serif)

All three are self-hosted through @fontsource; no other weights are loaded. Numerals are tabular everywhere (set on the body).

**Character:** A heavy condensed caption face shouting names and scores over a tidy condensed label face, with a plain humanist grotesque for anything that has to be read as a sentence. It is the type stack of a match graphic, not of a magazine.

### Hierarchy
- **Display** (Anton 400, clamp(3.5rem, 7.4vw, 6rem), line-height 0.9, uppercase): the featured title on the Home stage; the showcase title uses clamp(3rem, 6.2vw, 6rem). Clamped to three lines, balanced.
- **Headline** (Anton 400, clamp(2.25rem, 3.6vw, 3.25rem), line-height 0.95, uppercase): page headings and the guest sign-up title.
- **Title** (Anton 400, 2rem, line-height 1, uppercase): rail titles above a 2px rule; fixture titles step down to 1.45rem and clamp to two lines.
- **Score** (Anton 400, 2rem; 2.6rem large, 1.05rem small): the score-bug value and ticker values (1.9rem). Every number big enough to be a score is Anton.
- **Label** (Barlow Condensed 700, 1rem, 0.08em tracking, uppercase): lower-third slabs, ticker tag, list-menu title. Buttons use 700 at 0.95rem and 0.06em; nav links 600 at 1rem and 0.06em.
- **Label small** (Barlow Condensed 600-700, 0.75-0.9rem, 0.06-0.1em, uppercase): status tags, genre tags, metadata lines, form labels, showcase control labels.
- **Body** (Barlow 400, 1rem, line-height 1.5): running text; overviews step up to 1.02-1.05rem at 1.55-1.6 line-height, capped at 56-60ch and clamped to three lines on the stage.

### Named Rules
**The Every Number Is Condensed Rule.** Counts, years, runtimes, scores, dates and deltas are set in Barlow Condensed or Anton, never in body Barlow.

**The Caps For Captions Rule.** Anton and Barlow Condensed run uppercase with positive tracking; Barlow body text is never uppercased.

## Layout

A fixed 224px sidebar and a single scrolling content column; the window itself never scrolls, so the sidebar and the showcase's side controls stay put.

Two compositions define the migrated surfaces:
- **The stage** (Home first viewport): full-bleed, at least the viewport height (min 600px). A two-column grid, copy at left bottom-aligned (56px left gutter, up to 900px wide) and the up-next deck at right (about 34%, min 280px), with the ticker spanning the full width as the last row.
- **The showcase** (title detail): a full-viewport grid with an 88px right column for sticky side controls; inside, copy (about 1.05fr, min 360px) and a centred poster (about 0.95fr). Watch history follows below the fold on the page ground with 56px padding, rows capped at 820px.

Below the stage, rails run in a container up to 1400px with 56px gutters and 56px between rails. Fixture cards fill rows of auto-fill columns at min 340px with 16px gaps. Legacy pages use a 1200px container with 40px padding.

Spacing rhythm is 4px-based with a small working set: 4, 8, 12, 16, 20/24, 32, 40, 56. Primary interactive targets are 44px tall (nav links, inputs, score segments, segmented options); standard buttons 40px, large 48px, side controls 48px circles.

Responsive: at 1180px the stage deck narrows to 260px, the title scales to clamp(2.8rem, 6.4vw, 4.75rem), gutters fall to 32px, the ticker compresses, the showcase poster shrinks to min(26vw, 280px) and the edit form drops its poster preview. At 860px the showcase stacks to one column with the poster first.

## Elevation & Depth

Flat by default, with depth by overlap. Slabs sit directly on photographs, rotated posters overlap each other in the up-next deck (-7deg, 5deg, -2deg, stacked by z-index), the showcase poster tilts over a saturated radial field sampled from its own colours, and the Home backdrop is graded to black with a low green horizon band blended in screen mode. Surfaces separate by tonal step and hairline border, not by shadow.

### Shadow Vocabulary
- **Poster object** (`box-shadow: 0 24px 48px rgba(0,0,0,.55), 0 6px 14px rgba(0,0,0,.4)`; light theme at .28/.18 on #0a0a0a): only for posters lifted as physical objects (stage deck cards, the showcase poster).
- **Poster at rest** (`box-shadow: 0 2px 8px rgba(0,0,0,.45)`; light 0 2px 6px rgba(10,10,10,.07)): the quiet shadow under catalog poster cards; the rotated edit-form preview poster uses `0 6px 18px` at .55.
- **Popover** (`box-shadow: 0 18px 40px rgba(0,0,0,.65)`): the list menu, which also carries a 4px green top edge.
- **Focus ring** (`box-shadow: 0 0 0 3px rgba(31,181,116,.28)`; light rgba(1,135,81,.25)): a hard spread ring on focused fields, not a blur.

### Named Rules
**The Overlap Not Glow Rule.** Nothing glows. Light enters only as the horizon band at the foot of the stage and as the sampled field behind the showcase poster; elements never get coloured halos or blurred outer glows.

**The Inside Frame Rule.** Hover on a poster card draws a 3px green frame inside the poster edge; it does not lift the card with a bigger shadow.

## Shapes

Square-cut. Slabs that carry text (lower-thirds, rail tags, ticker tag, wordmark halves, nav highlight, edit-form label tags) have no radius at all. Small interactive and informational pieces take barely-there corners: 2px for score bugs, segments and tags, 3px for buttons, fields and fixture cards, 4px for poster cards, 6px for the showcase poster. Full circles are reserved for icon-only controls: the showcase side controls (48px), history remove (36px) and poster delete (32px). Posters are always a 2:3 frame.

## Components

### Buttons
Condensed caps on square slabs; pressing inverts so feedback never depends on hover.
- **Shape:** near-square (3px), 40px tall (32px small, 48px large), 18px side padding.
- **Primary:** pitch green slab with white Barlow Condensed 700 caps; hover deepens to #016e42; press inverts to a broadcast-black slab with chalk text and a green edge.
- **Ghost:** transparent with a strong hairline border and primary text; hover fills with the hover tone; press inverts to a solid text-colour slab. On the stage it sits on 35% black with a 45% chalk border.
- **Danger:** outlined in red-card colour, fills red only on hover or keyboard focus.
- **Focus:** 2px outline in the readable green, 2px offset.

### Lower-third (signature)
The broadcast caption bar: a green label slab ("Now watching", "Pick for you", "Trending #n", or the status) followed immediately by a black meta slab (year, type, genres). Both are 36px tall, Barlow Condensed 700 caps at 0.08em, square, and wipe in from the left with scaleX: green over 280ms, black 80ms behind. On the showcase the label slab becomes the status card colour.

### Score bug (signature)
Rating as a broadcast score bug: a green slab with the value in Anton and "/10" in condensed 600 at 85% opacity. Read-only bugs sit on poster corners (overhanging the showcase poster by 14px) and in fixture scorelines. When editable, ten 30x44px segments follow the slab; segments up to the hovered or chosen value fill green, press inverts to black. Hidden when unrated.

### Ticker
The strip that closes the stage: 64px of broadcast black under a hairline, a green tag at left ("Your catalog" with a small "± vs last month" line), then stats as Anton value plus condensed label and a condensed delta (#1fb574 up, #f0675c down) separated by hairlines. Values count up over 900ms with a quartic ease-out. Guests get a 60s linear crawl of trending names separated by small green squares, paused on hover. A stat with no truthful trend shows no delta.

### Cards / Containers
- **Fixture card:** a 96px registered poster beside an Anton title, condensed meta line and a scoreline (status tag plus score bug); module background, hairline border that turns green on hover, hover-tone background on press, 12px padding, 3px corners.
- **Poster card (catalog):** 2:3 poster at 4px corners with a bottom scrim, a status tag slab at bottom-left, Barlow Condensed 700 caps title below; hover scales the image 1.04 and draws the inside green frame; delete is a hidden 32px black circle until hover or focus.
- **Status tag:** a 2px-cornered slab in the fixed card colours, condensed 700 caps at 0.75-0.8rem.
- **Rail header:** Anton title over a 2px solid rule in the text colour, an optional green count tag ("3 in progress") and a right-aligned action.

### Inputs / Fields
- **Style:** 44px fields on the input tone with a strong hairline border and 3px corners; textareas start at 96px.
- **Labels:** condensed 600 caps; on the edit form each label becomes a small black slab tag.
- **Focus:** border turns the readable green and a 3px spread ring appears; no outline.
- **Error:** red-card border with a 22% red ring; form errors sit in a 12% red tint box with a 55% red border.

### Navigation
Sidebar links are 44px rows of Barlow Condensed 600 caps at 0.06em with 16px icons at 80% opacity. Hover fills with the hover tone. The active link sits on a single green slab that slides between links (shared layout, spring stiffness 520, damping 42), with white text. The wordmark heads the sidebar: CINE in a black slab (with a hairline inner edge), TRACKER in a green slab, Anton caps.

### Showcase controls
- **Side controls:** a vertical column of 48px circles on 50% black (70% white on chalk) with a 50% border; hover inverts to a solid text-colour disc, press scales to 0.94. A position counter in condensed numerals sits between previous and next. Delete is separated by 40px and outlined in red until hovered or focused.
- **Segmented status:** a single outlined bar of 44px condensed caps options; the active option is a solid text-colour slab with ground-colour text.
- **Field:** a radial gradient of the poster's sampled hue (most saturated dominant hue, pushed to 44% lightness) pooled behind the poster, cross-fading over 1s, falling back to pitch green.

### Motion
One ease, cubic-bezier(.16, 1, .3, 1), across the migrated surfaces. Slab wipes 280ms scaleX from the left; title wipes 500-550ms clip-path inset from the right edge to open; Home backdrops cross-fade in over 1.6s from 1.06 scale and out over 1.2s, rotating every 9s and pausing on hover or focus; the showcase poster settles into its tilt over 700ms. Under reduced motion every wipe becomes an opacity fade, hover lifts are dropped, count-ups jump to their value, and a global rule collapses CSS animation and transition durations.

## Do's and Don'ts

### Do:
- **Do** put pitch green (#018751) on whole slabs: caption labels, score bugs, the active nav, the ticker tag, primary buttons.
- **Do** pair every green caption slab with a broadcast-black slab that follows it, and wipe them in from the left, green first (280ms, black 80ms behind).
- **Do** set every name and score in Anton capitals and every label, count, date and delta in Barlow Condensed capitals.
- **Do** keep slabs, status cards and the Home stage identical in both themes.
- **Do** show posters at a 2:3 frame and a single registered scale within any grid or rail.
- **Do** make press feedback an inversion (green to black, outline to solid).
- **Do** isolate destructive actions by space and keep them outlined in red until hovered or focused.
- **Do** give every stat its trend against the previous month only when the data supports it; omit the delta otherwise.
- **Do** keep primary targets at 44px and replace wipes with fades under reduced motion.

### Don't:
- **Don't** add a second brand hue; amber and red are status signals only.
- **Don't** put coloured glows or blurred halos around elements; light enters only through the horizon band and the sampled showcase field.
- **Don't** use soft drop shadows to lift slabs, fixture cards or buttons; shadows belong to posters (and the one popover) only.
- **Don't** round slabs or text buttons beyond 3px, and don't use full circles for anything but icon-only controls.
- **Don't** set numbers in body Barlow or uppercase running text.
- **Don't** treat the legacy Catalog, Statistics, Login and Lists layouts as patterns for new surfaces.
