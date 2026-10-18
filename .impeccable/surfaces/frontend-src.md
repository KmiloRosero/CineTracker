---
version: 1
slug: "frontend-src"
primary_target: "frontend/src"
related_targets: []
---

# Surface: CineTracker app UI (Home, Title showcase, shell; then Catalog, Statistics, Lists, Profile, Login)

Mode: Experience (Home first viewport, Title showcase); Operate for Catalog, Statistics, Lists, Profile.
Target: frontend/src
Seed key: 87dfac91 (pick card, chosen by the user)

## Scope and audience

Colombian streamers tracking movies and series at night on a laptop. Jobs: see what is on tonight, open a title, rate it, mark it watched, find it again. Guests see TMDB trending; users see their own titles. Constraints: keep every IPC call and data path; nothing hardcoded; English UI; light and dark; AA; reduced motion; 44px primary targets. Must not read as generic or "AI-made" (user's concern).

## Direction contract

THESIS: Your catalogue as a match-night broadcast: titles are fixtures, status is the scoreline, the rating is the score bug. It refuses the streaming-clone poster rows on black and the neon-glow dark dashboard.

OWN-WORLD: Broadcast black #0A0A0A ground; pitch green #018751 is the only owned colour and carries whole slabs (lower-thirds, score bugs, active nav, the hero's light band); chalk white type. Heavy condensed uppercase display (Anton) at caption scale, condensed tabular numerals (Barlow Condensed) for every number, Barlow for body. Components: lower-third bars (green slab + black slab, square cut), score bug for rating, ticker strip, fixture cards with registered posters. Depth by overlap only, no glows. Light theme: chalk studio set with the same black slabs and green.

STORY: The viewer tunes in, sees tonight's lineup (continue watching, picks, or trending), opens a fixture, the title goes to the replay showcase, they set the score and blow full time (mark watched), and leave in under five minutes.

FIRST VIEWPORT: Home is a full-bleed stage: the featured title's backdrop cross-fades slowly, graded to black with a low green horizon band. Anton headline (the title's name) spans the left two-thirds at ~8vw. Bottom-left lower-third: green slab label (WATCHING / PICK FOR YOU / TRENDING #n), black slab with year, runtime, genres, then the primary action (Open title / Add to catalog). Right: three overlapped, slightly rotated poster cards for the next featured titles; clicking one makes it the featured title. A ticker strip closes the viewport with the user's counts or trending names. The showcase: one huge poster tilted on a saturated radial field sampled from the poster, title and lower-third at left, round side controls for previous/next title, edit, lists, and an isolated delete.

FORM: Sports broadcast graphics package (Colombian football TV), position 1 of my ordered list, chosen as the pick card over assigned candidate 5 (cinema ticket stub). Seed key 87dfac91. Signature interaction: the broadcast wipe (green slab leads, black slab follows, 280ms on x) for lower-thirds and status changes; rating as a score bug that flips. Motion 200-400ms; reduced motion turns wipes into fades.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Raises from declined challengers

- Papercut (Łowicz): depth comes only from overlap of flat slabs and posters, never glows or soft shading.
- Botanical folio: every poster sits at one fixed scale and a shared baseline across grids and states (registration).
- Dark console: destructive actions are isolated by deliberate space and stay outline until focused.
- Night-flight six-pack: every stat shows its value and its trend against the previous month.
- One-bit desktop: pressing inverts (green fill to black or back) as unambiguous press feedback.
- Cyclorama: atmosphere is a low horizon band of light taken from the backdrop, organised in phases, never full-screen gradients.

## Unresolved

- Exact light-theme slab treatment to be checked at the first inspection round.
