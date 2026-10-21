# Rams Playbook — Business Requirements Document (BRD)

**Owner:** Matthew (Head Coach, Lake Nona Rams, 5th-grade 6v6 flag)
**Version:** 1.0 draft · October 2026
**Status:** Ready for development
**Design direction:** "V2 — Rams Playbook Pro" (premium broadcast film-room look). Reference prototype: https://claude.ai/artifact/B1bCp2Gpj231HRpz1xunzv and file `rams-playbook-v2.html`.

---

## 1. Purpose and vision

Our boys should learn our offense the way they learn a video game: tap a play, watch it run, then build their own. The Rams Playbook is a phone-first web app that teaches our **formations, route tree, play-call language, and how plays beat different defenses**.

**One-sentence goal:** a 5th grader can read a call like "Dubs 21129 Y Cross," see it animate, try it against Cover 3, Cover 2 and Man, and understand *why* a receiver is open.

### Users
| User | Need |
|---|---|
| **Players (primary, ages 10–11)** | Learn calls and routes fast, practice on their own, have fun. Mostly on phones/tablets. |
| **Coach (Matthew)** | A teaching tool for practice and at home. Wants to change the playbook easily. |
| **Parents** | Open the same link on their phone to quiz their son. |

### Success looks like
- A player can open the link, pick any play, and watch it with zero instructions.
- A player can build a legal play and see it run in under 30 seconds.
- Every play can be shown against all three defenses with a plain-English explanation of the result.
- The coach can add or change a play or route without a developer.

---

## 2. Scope

### In scope (v1)
1. **Playbook** — library of plays; tap one to see formation, pre-snap motion, and routes animate.
2. **Draw Up (builder)** — choose a formation, assign routes, add motion, run it. Pick-by-tap **and** type-the-call.
3. **Defense view** — Off / Cover 3 / Cover 2 / Man (single-high safety). Animated defenders, zone shading toggle, and a "result" callout that flags the open receiver and explains why.
4. **How to read a call** card (anatomy of the play call) — liked in V2, keep it.
5. **Learning modes:** Call-code quiz · Read the defense · Concept cards · Beat the coverage.
6. **My Plays** — save player-built plays on that device.
7. **Installable** web app (add to home screen), works offline after first load.

### Out of scope (v1)
Accounts/logins, cloud sync, coach dashboard, progress tracking across devices, real-time multiplayer, defenses beyond the three, more than the five formations, tackle/contact simulation, sound.

### Future ideas (parking lot)
Team leaderboard, coach-assigned "play of the week," sharing a play by link, additional formations/defenses, printable wristband cards, progress tracking.

---

## 3. The football rules the app must encode

### 3.1 Field and players
- 6v6 flag. Offense: **Q** (quarterback) plus five eligible players: **A, B, Y, Z** and **C** (center, who runs a route).
- Field is 30 yards wide shown in a 360 × 400 coordinate space (12 px = 1 yard). Line of scrimmage (LOS) at y = 300. QB at (180, 348).
- Receiver labels: **A, B, Y, Z** go **left to right**; **C** is the center, listed last.
- Receiver colors (kept from Matthew's existing tool): A orange, B blue, Y teal, Z purple, C gray, Q red. Team colors: Rams royal blue `#003594` and gold `#FFD100`.

### 3.2 Formations (5 for v1)
Positions are x pixel on the 360-wide field, and yards off the line (positive = back).
| Key | Name | A | B | C | Y | Z | Description |
|---|---|---|---|---|---|---|---|
| dubs | Dubs | 45,0 | 108,1 | 180,0 | 252,1 | 315,0 | 2×2, two receivers each side of center |
| chiefs | Chiefs | 45,0 | 154,0 | 180,0 | 206,0 | 315,0 | 1×1 with B, C, Y bunched in the middle |
| dubstight | Dubs Tight | 108,0 | 144,0 | 180,0 | 216,0 | 252,0 | 2×2 compressed |
| trips | Trips | 45,0 | 71,0 | 180,0 | 97,0 | 315,0 | 3×1, three left, Z alone right |
| quads | Quads | 35,0 | 61,0 | 180,0 | 87,0 | 158,0 | 4×0, all four stacked left |

*Open question:* the coach should confirm Chiefs and Trips spacing against what he actually lines up.

### 3.3 Play-call grammar
```
<Formation> <5 digits> [<Letter> <Motion>]
```
- **Formation:** Dubs, Dubs Tight, Chiefs, Trips, Quads.
- **5 digits:** route numbers for A, B, Y, Z (left to right), then C (center last).
- **Optional motion:** a receiver letter (A, B, Y or Z) plus a tag: **Cross**, **Enter**, **Exit**.
- Example: `Dubs 21129` = A slant, B speed out, Y speed out, Z slant, C fade/go.
- Example: `Dubs 21129 Y Cross` = same routes; Y goes in motion across the center, giving a trips-left look. **Routes do not change because of motion.**
- Parsing is case-insensitive and tolerant of extra spaces and hyphens. Reference regex:
  `^(dubs[\s-]?tight|dubs|chiefs|trips|quads)\s*(\d{5})(?:\s+([abyz])\s*(cross|enter|exit))?$`
- Invalid calls show a friendly, specific error and an example.

### 3.4 Route tree (v1, numbers 0–9)
Waypoints are relative to the receiver's own alignment: lateral yards (+ = toward the sideline on his side) and depth yards. These are **approximations to be tuned by the coach** (see Open Questions).

| # | Route | Kind | Waypoints (lateral, depth) |
|---|---|---|---|
| 0 | Comeback | out | (0,12) → (2,9) |
| 1 | Speed Out | out | (0,2) → (8,2.5) |
| 2 | Slant | in | (0,3) → (−6,8.5) |
| 3 | Whip (out) | out | (0,5) → (−2,6) → (6,5.5) |
| 4 | Jerk (in) | in | (0,5) → (2,6) → (−7,5.5) |
| 5 | Out (10–12 yds) | out | (0,11) → (7,11) |
| 6 | Dig (12 yds) | in | (0,12) → (−9,12) |
| 7 | Corner | vert | (0,10) → (7,17) |
| 8 | Post | in | (0,10) → (−6,17) |
| 9 | Fade/Go | vert | (0,6) → (1.5,18) |

- "Kind" (out / in / vert) powers the Cover 2 "read the #2 receiver" logic.
- Routes mirror based on which side of the field the receiver stands on (after motion).
- The **center** has no side; his in/out breaks toward the strong side (right on ties). *Open question for coach.*

### 3.5 Motion
| Tag | Meaning | Where the receiver ends up |
|---|---|---|
| **Cross** | Crosses the center to the other side | Lands next to the inner receiver on the far side |
| **Enter** | Moves toward the center, does not cross | About x = 148 (left) or 212 (right) |
| **Exit** | Moves toward the sideline | Outside the outermost receiver, near the sideline |

Timeline: motion 1.4 s, then snap, then routes run 3.6 s (7 s in slow mode). Routes start from the post-motion position.

---

## 4. Defense requirements

Three defenses only. All start from a formation-based alignment, react to motion, and drop/cover on the snap.

| Defense | Shell | Players | Behavior |
|---|---|---|---|
| **Cover 3** | 3-deep zone | Deep thirds (LCB, S, RCB) + underneath LLB / M / RLB | Zones drop to landmarks; middle hole and seams are the weak points. |
| **Cover 2** | 2-deep zone | CBs in the flats, LBs in hooks, safety(s) deep halves | Reads the #2 receiver (out / in / vertical) to decide who carries him. |
| **Man** | Off-man with one deep safety | Each defender covers one receiver; safety deep middle | Off-man cushion of about 42 px closing to 10 px, inside shade, slight reaction lag. |

### 4.1 The "tell" (pre-snap motion logic)
- **Man:** a defender follows the motion player across the formation.
- **Zone:** nobody follows; the defense shifts instead.
- The app must **explain the tell in plain words** once motion finishes ("Nobody followed Y. That means zone.").

### 4.2 The "result" callout
After the play, the app finds the receiver with the most separation and shows:
- Open receiver (letter, route name, yards of space), highlighted on the field.
- A one-sentence **why** based on the zone or matchup ("He is in the soft spot between the linebackers and the M underneath.").
- If every receiver has less than about 2.2 yards of separation: "Covered on every route" with a nudge to change a route or add motion.
- The result is an **approximation for teaching**, not a physics simulation. Coach should review the "why" text for accuracy.

### 4.3 Display options
- Zone shading on/off (Man shows matchup lines instead).
- Legend explaining defender colors (deep / flat / hook; "letter = who he covers" in Man).
- Cover 3 and Cover 2 need adjustments for unbalanced sets (Trips, Quads). *Open question.*

---

## 5. Functional requirements

Priority: **P0** = must ship v1 · **P1** = should ship v1 · **P2** = later.

### 5.1 Playbook (P0)
- FR-1 Starter library of 13 plays (Appendix A). Each shows a mini diagram, call, name, and a one-line coaching note.
- FR-2 Tap a play → field animates: pre-snap look, motion (if any), then routes drawing as players run.
- FR-3 Controls: Play / Pause / Replay, scrubber, Slow mode, Space-bar shortcut on desktop.
- FR-4 Receiver tiles above the field show each receiver's letter, route glyph, number and name.
- FR-5 "How to read a call" card breaks the call into Formation · Routes · Motion with a plain-English line each.

### 5.2 Draw Up / builder (P0)
- FR-6 Pick one of 5 formations from thumbnails.
- FR-7 Tap a receiver (tile or on the field) then tap a route number 0–9 to assign.
- FR-8 Optional motion: choose who (A/B/Y/Z/none) and tag (Cross/Enter/Exit).
- FR-9 Type a call directly (e.g., "Trips 07294"); the field and controls update to match.
- FR-10 Every change auto-runs the play so the player sees it instantly.
- FR-11 Save to **My Plays**, rename, delete. Stored on the device only (localStorage). Handle storage being blocked.
- FR-12 "Erase routes" resets to all fades, no motion.

### 5.3 Defense (P0)
- FR-13 Defense selector: Off · Cover 3 · Cover 2 · Man. Selecting runs the play.
- FR-14 Everything in Section 4 (animated defenders, tell, result, zone toggle, legend).
- FR-15 Works for **every** playbook and player-built call, with no extra setup.

### 5.4 Learning modes (P1 — build after P0 is solid)
- **Call-code quiz:** show a play, pick the right call (or show a call, pick the right play). Immediate feedback; short rounds of about 10.
- **Read the defense:** show pre-snap look plus motion; player picks Man or Zone; the tell is revealed afterward.
- **Concept cards:** short cards on route combos, which concepts attack which zones, sequencing, and how motion shows leverage. Content authored by coach (see Open Questions).
- **Beat the coverage:** the app picks a defense; the player builds a play; the app grades whether it found an open receiver.
- Scoring: simple stars/points per session. No cross-device tracking in v1.

### 5.5 Install and offline (P0)
- FR-17 Web link that installs to the home screen on iPhone and Android (PWA: manifest, icons, service worker).
- FR-18 After the first load it works with no internet.

### 5.6 Coach content editing (P1)
- FR-19 Plays, route definitions, formations and concept text live in **plain data files** (JSON) separate from code, so the coach can edit them (or ask Claude Code to) without touching the engine.

---

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| **Devices** | Phone-first (360–430 px wide), also iPad and desktop. Portrait works without horizontal scrolling. |
| **Performance** | Animation steady at 60 fps on a mid-range phone; first load under 3 s on typical home wifi. |
| **Self-contained** | No reliance on third-party CDNs at runtime. **Bundle the fonts** (Big Shoulders Display, Barlow, Barlow Condensed) and all assets so the app works offline and cannot break if a CDN changes. |
| **Accessibility** | Tap targets at least 44 px; text contrast AA; full keyboard use; respects "reduce motion" (jumps to the end of the play); every control has a text label. Never rely on color alone (letters on players, labels on defenders). |
| **Privacy** | No accounts, no tracking, no personal data. Kids' plays stay on their device. |
| **Reliability** | Works if local storage is disabled. Invalid input never crashes the app. |
| **Tone** | Short sentences, 5th-grade reading level, football-coach voice. |

---

## 7. Design requirements (V2 "Rams Playbook Pro")

- **Concept:** broadcast film room at night. Dark ink background, glass panels, a field that tilts back and fades into the dark, routes that **draw as players run**, a call ticker with a route glyph per receiver.
- **Color:** ink `#030612`, night `#07102B`, text `#EEF3FF`, muted `#8FA0D0`, Rams blue `#3170FF` / royal `#0B3AC2`, **gold `#FFD21F` reserved for the live/selected state**. Receiver colors per Section 3.1. Defender colors: deep `#6EA2FF`, flat `#FFD21F`, hook white.
- **Type:** Big Shoulders Display (headlines/call), Barlow Condensed (labels), Barlow (body). Play-call digits are a single color (not rainbow) — coach feedback.
- **Motion:** staged page-load reveal; routes trace as receivers run; pulse on the open receiver. Respect reduced-motion.
- **Single dark theme** for v1.
- **Navigation:** three sections — Playbook · Draw Up · Train.
- **Rams branding:** Lake Nona Rams name; no NFL/Rams logos or marks that we do not have rights to use. Use the team's own logo if the coach supplies one.
- The prototype `rams-playbook-v2.html` is the visual reference. Other prototypes (v1, v3 chalkboard) are alternatives only.

---

## 8. Technical approach (recommended)

- **Stack:** plain HTML + CSS + vanilla JavaScript (ES modules), no framework, built with a small bundler (Vite) or no build at all. One deployable static site.
- **Architecture** (three layers, kept separate):
  1. **Data** — `formations.json`, `routes.json`, `plays.json`, `concepts.json`.
  2. **Engine** — pure functions with no DOM: `parseCall`, `buildScene` (positions over time for offense and defense), `evaluate` (open receiver + why). Unit-testable.
  3. **UI** — renders the SVG field, panels, quizzes; drives animation with `requestAnimationFrame`.
- **Reuse:** the prototype already contains a working engine (call parsing, motion, three defenses, result logic). Start from it and split it into the layers above.
- **Rendering:** SVG field, 360 × 400 viewBox, scaled to fit.
- **Storage:** `localStorage` key `rams_myplays` (array of `{code, name}`), wrapped in try/catch.
- **Hosting:** any static host (GitHub Pages, Netlify, Cloudflare Pages) → one shareable link.
- **PWA:** `manifest.webmanifest`, 192/512 px icons, service worker caching all files.
- **Testing:** unit tests for the call parser and scene builder; a script that loads every formation × defense × motion combination and confirms no errors; manual device check (iPhone Safari, Android Chrome).

---

## 9. Data model (examples)

```json
// plays.json
{ "call": "Dubs 21129 Y Cross", "name": "Slant / Speed, Y Cross",
  "note": "Same routes. Y crosses to give a trips-left look. Watch who follows him.",
  "tags": ["quick game", "motion"] }

// routes.json
{ "id": 2, "name": "Slant", "kind": "in", "points": [[0,1.5],[-6,7]] }

// formations.json
{ "key": "dubs", "name": "Dubs", "pos": { "A": [45,0], "B": [108,1], "C": [180,0], "Y": [252,1], "Z": [315,0] } }

// saved on device
{ "code": "Trips 07294", "name": "My play 1" }
```

---

## 10. Acceptance criteria (v1 "done")

1. Every play in Appendix A animates correctly with Off, Cover 3, Cover 2 and Man selected, with no console errors.
2. Typing any valid call draws and runs it; invalid calls show a helpful message.
3. The builder produces the same result whether the player taps or types.
4. The tell appears for any play with motion; the result callout appears at the end of every play with a defense on.
5. Works on iPhone Safari and Android Chrome in portrait; installs to the home screen; runs offline.
6. No external network requests at runtime (fonts bundled).
7. Reduced-motion users see the finished play without animation.
8. Coach can change a route's waypoints or add a play by editing a data file only.
9. Matthew signs off on route shapes and the "why" text (Section 11).

---

## 11. Open questions for the coach

1. **Route shapes:** confirm depths and angles for Comeback, Whip, Jerk, Slant, Corner.
2. **Center breaks:** which way do the center's in/out routes break (strong side, always left, always right)?
3. **Motion + routes:** after motion, are routes oriented to his new side (current assumption) or his original side?
4. **Formation spacing:** confirm Chiefs, Trips and Quads alignments.
5. **Defense vs. unbalanced sets:** how should Cover 3 / Cover 2 / Man shift for Trips and Quads?
6. **Result logic:** is "most separation wins" good enough, or should specific concept-vs-coverage rules be written (e.g., "Smash beats Cover 2")?
7. **Man coverage alignment:** tune cushion and shade to what our opponents actually do.
8. **Concept card content:** who writes the lessons (coach, or Claude drafts and coach edits)?
9. **Quizzes:** how many questions per round; any points/rewards the boys would care about?
10. **Playbook changes:** it is still being designed, so who edits it and how often?
11. **Progress tracking:** wanted later? (Would need accounts or a coach view.)

---

> **Update (Phase 7):** the Playbook tab no longer shows these 13 plays. It now shows the 28 passing plays from the coach's *2x2 - Attack System* PDF (`src/data/playbook.json`). These 13 plays remain as the call-coded library (`src/data/callbook.json`) for the call quiz, Read the defense and the concept cards.

## Appendix A — Starter library (13 plays)

| Call | Name | Coaching note |
|---|---|---|
| Dubs 21129 | Slant / Speed | Quick game. Slants inside, speed outs outside, center runs the fade to hold the deep middle. |
| Dubs 21129 Y Cross | Slant / Speed, Y Cross | Same routes. Y crosses to give a trips-left look. Watch who follows him. |
| Dubs 99999 | Five Verticals | Everyone goes. Stretches every deep zone. |
| Dubs 93591 | Flood Right | Three levels to the right: fade, out and the center in the flat. |
| Dubs 94699 | Mesh | Slots cross at different depths while both outside men and center clear deep. |
| Dubs 91963 | Dagger | Y clears the seam, Z digs behind it, center sits underneath. |
| Dubs 90683 | Mills | Z post with Y dig underneath attacks the deep middle. |
| Trips 07294 | Trips Smash | Comeback with a corner over the top on the three-receiver side. |
| Chiefs 93496 | Bunch Cross | Whip and jerk from the bunch cross, center on a dig. |
| Chiefs 93496 B Exit | Bunch Cross, B Exit | B motions out to the sideline before the snap. |
| Quads 98641 | Quads Layers | Four routes stacked at different depths on one side. |
| Dubs Tight 22222 | Tight Slants | Five slants from a compressed set. |
| Dubs 99999 Z Enter | Verticals, Z Enter | Z motions in toward the center before the snap. |

## Appendix B — Reference materials
- Prototype (design target): `rams-playbook-v2.html` — https://claude.ai/artifact/B1bCp2Gpj231HRpz1xunzv
- Other prototypes (not chosen): v1 (clean), v3 (polished v1), v4 chalkboard — https://claude.ai/artifact/9qprf8nyBPAxAQ61S2ULVa
- Team reference artifacts: *Rams Defense Playbook (Cover 3)* and *Rams Cover 2 Playbook* (colors and field conventions).
- Folder: `5th Grade Flag` on iCloud (Offer Letters, Roster, Videos).
