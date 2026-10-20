# Ideas and suggestions (living document)

Goal: help our 10U flag team learn plays, routes and concepts, and see them run against different defenses. Ten-year-olds like cool things, games and a reason to come back. Add to this list any time. Nothing here is committed work until we pick it.

**Rating key:** Fun = how much the kids will notice (★ to ★★★). Effort = S (an hour or two), M (a day), L (several days).

---

## A. Make it feel like a game (best fit for Phase 6, the Train tab)

| # | Idea | Fun | Effort | Notes |
|---|---|---|---|---|
| A1 | **Celebrations.** Confetti or a "flag pull" burst on a right answer, a shake on a wrong one, with a short "Nice read!" line. | ★★★ | S | Pure visuals, no accounts needed. |
| A2 | **Streaks and ranks.** Rookie, Starter, Captain, All-Pro. XP for each right answer, streak counter (🔥 x5). Saved on the device only. | ★★★ | M | BRD already wants simple stars. Ranks are a cheap upgrade of that. |
| A3 | **Beat the Coverage levels.** Level 1 is Cover 3 only, then Cover 2, then Man, then "mystery defense". Hint button costs a star. | ★★★ | M | Uses the engine we already have to grade the play. |
| A4 | **Play of the Day.** One featured play on the home screen, picked by the coach (a flag in `plays.json`). Opening it and running it earns bonus XP. | ★★ | S | Gives a reason to open the app every practice day. |
| A5 | **Beat the clock huddle drill.** App shows a play, you have 10 seconds to pick the call, like calling it in the huddle. | ★★★ | M | Trains the exact skill we need on game day. |
| A6 | **Draw the route with your finger.** A route is shown by name, kid traces it, app scores how close. | ★★★ | L | Great for learning shapes, but tracing on small screens needs testing. |
| A7 | **Badges.** "Tell Spotter" (read man vs zone 5 times right), "Route Rocket", "Cover 2 Crusher". | ★★ | S | Works on top of A2. |
| A8 | **Vs. a friend.** Two kids pass one phone, each builds a play, the app picks the winner against a defense. | ★★★ | M | No accounts. Good for bus rides and practice breaks. |

## B. Cool visuals (can sit on top of what is built)

| # | Idea | Fun | Effort | Notes |
|---|---|---|---|---|
| B1 | **Spotlight on the open receiver.** When the read appears, dim everything else, ring him, and slow the last second. | ★★★ | S | Makes "why he is open" obvious, which is the main lesson. |
| B2 | **Comet trails and speed lines** behind runners, a spinning ball, a little dust puff on cuts. | ★★ | S | Mostly CSS and SVG. |
| B3 | **Jersey-number players** instead of plain dots, with helmet shapes and the flag belt. | ★★ | M | Cosmetic, but kids will love it. Keep letters A/B/Y/Z visible. |
| B4 | **Camera modes.** QB view (first person behind the center), and a broadcast zoom that follows the ball. | ★★★ | L | We already have a tilted 3D field, so the base is there. |
| B5 | **Field skins you unlock** with XP: Night Game (now), Day Game, Chalkboard, Gold Rush. | ★★ | M | The v4 chalkboard prototype already exists to borrow from. |
| B6 | **Film-room mode.** Defenders show short thought bubbles ("I have the flat!", "Y is crossing, go with him!"). | ★★★ | M | The best way to teach the tell. Text lives in the data files. |
| B7 | **Replay of the catch** in slow motion with a "TOUCHDOWN" flash when the open receiver beats the defense. | ★★ | S | |

## C. Coach and parent tools

| # | Idea | Effort | Notes |
|---|---|---|---|
| C1 | **Share a play by link** or QR code so a parent can text one play to a player. The call code goes in the URL. | S | BRD parking lot. Very little code because plays are just text. |
| C2 | **Printable wristband cards** (6 to 8 plays per card, from the library). | M | BRD parking lot. Good game-day tool. |
| C3 | **Coach picks the quiz pool.** Tag the plays that matter this week so quizzes only use those. | S | Uses the `tags` already in `plays.json`. |
| C4 | **Side-by-side compare.** Two plays on one screen, or the same play against two defenses. | M | Great for teaching "why this beats that". |
| C5 | **Concept cards with a mini-lesson**: Smash, Mesh, Flood. Each shows the idea, the picture, and why it beats Cover 2 vs. Cover 3. | M | Phase 6 already plans these. I draft, coach edits. |
| C6 | **Pre-snap read quiz**: "How many safeties deep? Where is the weak side?" | M | Builds the habit of looking before the snap. |

## D. Polish and reach

| # | Idea | Effort | Notes |
|---|---|---|---|
| D1 | **Landscape layout** for phones turned sideways and for tablets: big field on the left, controls on the right. | M | Many kids hold phones sideways. |
| D2 | **"New version ready" message** when the app updates itself. | S | The offline service worker already knows when an update installs. |
| D3 | **Haptic buzz** on phones for right answers. | S | Android only, iPhone Safari ignores it. |
| D4 | **Optional sound effects**, off by default, with a mute switch. | S | The BRD says no sound in v1, so this would be a deliberate change. |
| D5 | **Bigger text option** and a colorblind check of the receiver colors. | S | Letters are already on every player, so color is never the only clue. |
| D6 | **"You are the Y today."** A kid picks his own position and the app highlights him throughout. | S | Very personal for kids. Keep any names on the device only (see risks). |

---

## My suggested picks, in order
1. **B1 spotlight** and **B6 film-room thought bubbles**. Together they teach the main lesson (why a receiver is open and what the tell means) better than any text.
2. **A1 + A2 + A7** (celebrations, ranks, badges) as the reward layer on top of the four Train modes in Phase 6.
3. **A3 levels** for Beat the Coverage, so it grows with the kids.
4. **C1 share link** plus **C2 wristband cards** for game days.
5. **D1 landscape** before the season starts.

## Risks and things to watch
- **Kids' names and photos.** The site is public. Do not put real names, photos or rosters in the repo. If we add personalization (D6), keep it on the device only.
- **Team logo.** It is currently the NFL Rams mark. That is a trademark question if the link spreads beyond the team. A team-made logo avoids it. Your call.
- **Project folder is in iCloud Drive.** iCloud has already made stray "name 2" copies of files here. Once it is on GitHub the repo is the real backup, so moving the working folder out of iCloud Drive (for example into a `Developer` folder) is safer for git.
- **Route and coverage accuracy.** The route shapes, the center's break direction, and how zones lean against Trips and Quads are all my starting guesses from the BRD and prototype. Phase 7 is where you confirm them.
