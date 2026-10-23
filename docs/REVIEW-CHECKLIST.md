# Coach review checklist

Everything below is a starting guess made from the BRD and the prototype. Nothing is locked. For each item, the app works today with the "Current" value. Tell us what to change, or edit the file listed.

Tip: run through these with the app open on your phone, with the Playbook, Draw Up and Train tabs.

## 0. The Playbook (from your PDF)
The Playbook tab now shows the 28 passing plays from *2x2 - Attack System - Plays.pdf*, grouped the way the PDF groups them. Things to check:
- [ ] **Each diagram matches the PDF.** Routes were read straight from the PDF's drawing data, so lengths and angles should be close to exact (within about half a yard).
- [ ] **Route names.** The PDF doesn't name routes. We named each one from its shape (Hitch, Slant, Corner, Post, Snag, Trail, Wheel, and so on) and checked the odd ones by eye. A route that sits on the numbered tree shows its number (for example Slant is 2). Please correct any name that is wrong: edit `name` (and `tree`, or remove it) in `src/data/playbook.json`.
- [ ] **Gold star = a key route.** Routes the PDF drew in orange or red (other than the center, whose box is orange in every play) get a star. Is that what you intended them to mean?
- [ ] **Left side and right side.** Titles like "Smash / Double Slant" are shown as "Left side: Smash. Right side: Double Slant." Only the first (left-handed) version of each play is shown, not the mirror image.
- [ ] **"Base 2x2" is our Dubs formation,** with the app's own spacing. The stacked sets use a new formation, **Stacked 2x2** (playbook only).
- [ ] **Left out on purpose: the Run Game and Play-Action section** (jet sweeps, QB keeps, reverses, rollouts, Stalk & Go, Post-Wheel with a jet fake). Those need ball carriers and a moving quarterback, which the app doesn't have yet. Also left out: the six defense reference diagrams (plays 1, 2, 17, 18, 33, 34).
- [ ] **Same concept in two sections** (for example 4 Verticals under Cover 2 and under Cover 3) are shown under both, since the PDF draws them slightly differently.

## 0b. Route Lab (Draw Up > More routes)
- [ ] **Template shapes.** Wheel, Snag, Trail, Swing, Arrow and the six double moves were copied from your PDF where it had them (Post-Corner, Corner-Post, Wheel, Snag, Trail, Arrow) and drawn from the names for the rest (Out & Up, In & Up, Slant & Go, Hitch & Go, Swing). Please check the lengths and angles. Edit `src/data/routelab.json`.
- [ ] **Stem and Break.** Each press changes it by 1 yard. Stem runs 1 to 16 yards. Break can shrink to 40% or grow to 220% of the template's first cut. Is that range right?
- [ ] **Naming.** Custom routes are named only, with no codes. Plays that use them are saved whole in My Plays and can't be typed as a call.

## 1. Route shapes (BRD question 1)
Edit: `src/data/routes.json` (`points` are lateral yards, then depth yards).

| # | Route | Current | Check |
|---|---|---|---|
| 0 | Comeback | 12 yards deep, back 3 | Right depth and angle? |
| 1 | Speed Out | **2 yards deep**, then 8 yards to the sideline (you changed this) | Good? |
| 2 | Slant | **3 yards (three steps)**, then 6 across to 8.5 deep (you changed this) | Angle? |
| 3 | Whip | 5 deep, step in, then out 6 | Right shape? |
| 4 | Jerk | 5 deep, step out, then in 7 | Right shape? |
| 5 | Out | 11 yards, then 7 to the sideline | |
| 6 | Dig | 12 yards, then 9 across | |
| 7 | Corner | 10 yards, then 7 wide, 17 deep | |
| 8 | Post | 10 yards, then 6 in, 17 deep | |
| 9 | Fade/Go | 18 yards deep, drifts 1.5 to the sideline | |

## 2. The center (BRD questions 2 and 3)
- **Current:** the center breaks toward the strong side (right if tied). After motion, every receiver's route is mirrored to the side he ends up on, and the center's break flips if motion changes which side is strong.
- **Question:** is that right? Or should the center always break one way, and should routes follow a motion man's new side or his original side?
- **Where:** `src/engine/scene.js`.

## 3. Formation spacing (BRD question 4)
Edit: `src/data/formations.json`. Please check Chiefs, Trips and Quads against what you actually line up.

## 4. How the defenses lean against Trips and Quads (BRD question 5)
- **Current:** zone defenses slide toward the side with more receivers: 12 px per extra receiver, maximum 36 px. Man coverage is not shifted.
- **Edit:** `overload` in `src/data/settings.json`. Set both numbers to 0 to turn it off.

## 5. What counts as "open" (BRD question 6)
- **Current:** the receiver with the most space around him at the end of the play. This makes most plays look good against zone and makes Man hard to tell apart.
- **Better:** write concept-versus-coverage rules, such as "Smash beats Cover 2" or "Mesh beats Man". If you tell us the rules, we can grade plays by concept instead of by distance.
- Stars in Beat the Coverage use `beat.thresholds` in `src/data/settings.json`.
- The one-sentence reasons ("He is in the flat...") are in `src/engine/evaluate.js`.

## 6. Man coverage alignment (BRD question 7)
Man defenders start 42 px (3.5 yards) off and close to 10 px. Tune to what opponents do. Where: `src/engine/scene.js` (`MAN_CUSHION`).

## 7. Concept cards (BRD question 8)
Eight cards are drafted for you to edit: `src/data/concepts.json`. Please read each one for football accuracy. The "Beating Man" card carries your two teaching points.

## 8. Quizzes and rewards (BRD questions 9 and 10)
- Rounds are 5 questions (`quizLength` in `src/data/settings.json`).
- Ranks: Rookie, Starter (100 XP), Captain (300), All-Pro (600). XP per right answer and the streak bonus are in the same file.
- **Question:** do the boys care about these rewards? What would they want?

## 9. Playbook changes (BRD question 11)
Plays live in `src/data/plays.json`. Add one with a call such as `Dubs 21129 Y Cross`, a name and a note. After editing, run `npm run deploy` (or ask Claude) to publish.

## 10. Real-phone check (acceptance criteria 5 to 7)
- [ ] Opens on iPhone Safari and Android Chrome in portrait with no sideways scrolling.
- [ ] Add to Home Screen works, and the icon looks right.
- [ ] Turn on airplane mode, open the installed app: it still works.
- [ ] Play, Draw Up (pinned field), and the four quizzes feel good with thumbs.

## Sign-off (acceptance criteria 8 and 9)
- [ ] Route shapes reviewed
- [ ] "Why" text reviewed
- [ ] Concept cards reviewed
