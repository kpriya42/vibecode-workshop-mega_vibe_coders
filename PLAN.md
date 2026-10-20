# Project plan

Agreed with the team on 2026-10-20. See IDEA.md for the problem and constraints. Keep assigned IDs permanent; add new steps rather than renumber.

## Goal

At our team's live URL, a 42 Heilbronn student scans a table's QR code, books or joins a table tennis slot for today, and the other player can find them by intra login.

## Working model

Project lead → one milestone lead → one step at a time through coder → independent reviewer → committer. Each milestone has one lead session. Each step names a human owner and the real agent sessions used. The lead records blockers here; it does not invent an approval.

## M1 — Book or join a table tennis slot

Milestone lead: Claude Code session started 2026-10-20 (handoffs in .ai/sessions/). Human owner: jasuoh. Release: only after the team accepts the journey.

| Step | Outcome | Depends on | Human owner | State / PR |
|---|---|---|---|---|
| M1.1 | Our fork runs at the assigned URL and reports its deployed revision | Organiser handout | jasuoh | live on team-02 at da5bb14; phone check and collaborator access open ([evidence](.ai/work/M1.1/validation.md)) |
| M1.2 | Each table's page shows today's slots as free, open or full | M1.1 for hosted checks; can be coded locally | jasuoh | merged [PR #3](https://github.com/kpriya42/vibecode-workshop-mega_vibe_coders/pull/3); live |
| M1.3 | A player books a slot with their intra login | M1.2 | jasuoh | merged [PR #4](https://github.com/kpriya42/vibecode-workshop-mega_vibe_coders/pull/4); live |
| M1.4 | Others join open games and see who is playing; only the right device can cancel or leave | M1.3 | jasuoh | merged [PR #7](https://github.com/kpriya42/vibecode-workshop-mega_vibe_coders/pull/7) |
| M1.5 | Bookings survive reload, other devices, restart and redeploy | M1.3 | jasuoh | merged [PR #8](https://github.com/kpriya42/vibecode-workshop-mega_vibe_coders/pull/8); live; real bookings survived the da5bb14 redeploy |
| M1.6 | Real players use the two QR stickers; observed failures are corrected | M1.1–M1.5 | jasuoh | draft |
| M1.7 | `/` is a Ping Pong 42 front page that leads to both tables | M1.2 | jasuoh | merged [PR #6](https://github.com/kpriya42/vibecode-workshop-mega_vibe_coders/pull/6); live |
| M1.8 | Tap a slot to book or join it directly; `/` becomes the booking view | M1.4, M1.7 | jasuoh | merged [PR #9](https://github.com/kpriya42/vibecode-workshop-mega_vibe_coders/pull/9); live |
| M1.9 | One tap books or joins with settings set once at the top | M1.8 | jasuoh | merged [PR #10](https://github.com/kpriya42/vibecode-workshop-mega_vibe_coders/pull/10); live da5bb14 |

### M1.1 — The live starting point

Already done: the team fork exists (`kpriya42/vibecode-workshop-mega_vibe_coders`) and `npm start` works locally.

Handout received 2026-10-20 (team-02, https://team-02.intra.land). Connection details stay on laptops, not in the repo.

- [ ] Every teammate has collaborator access to the same team fork.
- [x] The assigned SSH connection reaches our team environment as `vc-team`.
- [x] Our page is reachable at the assigned HTTPS URL.
- [x] `/api/health` reports the revision we intended to deploy (`npm run smoke` from a laptop).
- [ ] Another teammate opens the page on a phone.

### M1.2 — Today's slots per table

- `/table/1` and `/table/2` each show today's 30-minute slots within opening hours (default 09:00–18:00).
- Each slot is shown as free, open (with how many spots are left) or full.
- Slots that have already ended can't be booked.
- "Today" and slot times follow Europe/Berlin, including summer and winter time. A server on UTC still shows German times.
- You can switch to the other table from either page.
- An unknown table such as `/table/3` gives a clear not-found page, not a crash.
- The page is usable at phone width.

### M1.3 — Book a slot

- A player enters their intra login, picks singles (2 spots) or doubles (4 spots) and says how many spots their group already fills. The rest stay open.
- A free slot becomes open or full as a result.
- An empty login or one with spaces is refused with a clear message; nothing is booked.
- A slot that is already booked can't be booked again. Two simultaneous attempts on the same slot leave exactly one booking.
- A past slot or a slot outside opening hours is refused by the server, not only hidden in the page.

### M1.4 — Join, leave and find each other

- Open games show how many spots are left; a player joins with their intra login.
- A full game refuses an extra player. The same login can't join the same game twice.
- Every player in a slot is shown as their login, linking to `https://profile.intra.42.fr/users/<login>`.
- The booker sees who joined the next time they open the page (no live updates or alerts in M1).
- Only the browser that made a booking can cancel it, and only the browser that joined can leave. A request from another browser is refused, including one typing the same login.
- When a joiner leaves, the spot becomes open again.

### M1.5 — Persistence

- Bookings survive a page reload, viewing from another device, an app restart and a redeploy.
- Data is stored outside the release directory, under `~/.local/share/vibecode-workshop/data/` on the guest. A path can be configured for local runs and tests.
- Missing or empty storage starts as "no bookings", without a crash. A damaged data file is reported, not silently replaced.
- No secrets or private connection details go in the data or the repo.

### M1.6 — Real use and feedback

- Print two QR stickers (any free generator) pointing to `/table/1` and `/table/2` on the live URL.
- At least two real players, on their own phones, complete the IDEA.md proof journey.
- Record one observed problem, the resulting acceptance criterion and the result after correction. New scope becomes a new step.

### M1.7 — Front page

Added 2026-10-20 at jasuoh's request. Static landing page named "Ping Pong 42" (jasuoh chose it over a live status summary).

- `/` names the app, says what it does in one line, and links to `/table/1` and `/table/2`.
- A three-step "how it works" that promises only built features.
- No workshop-starter wording or links remain; usable at phone width.

### M1.8 — Tap a slot to book or join

Added 2026-10-20 at jasuoh's request after seeing M1.7 live (chose "tap a slot" over "front page only picks a table"). See .ai/work/M1.8/brief.md.

- `/` is the booking view with a Table 1 | Table 2 switch; `/table/1` and `/table/2` (QR targets) open the same view.
- Tapping Book on a free slot opens booking for exactly that slot; Join on an open game opens joining; no time dropdown.
- Works without JavaScript; usable at phone width; server validation unchanged.

### M1.9 — One tap to book or join

Added 2026-10-20 at jasuoh's request ("cleaner UI, select the slot with one click"); jasuoh chose "set once, then one tap" over a confirm sheet. See .ai/work/M1.9/brief.md.

- A settings bar (login, singles/doubles, group size) is set once and remembered through validated cookies.
- One tap on a free slot books it; one tap on an open game joins it. No panels, no time dropdown, and it works without JavaScript.
- Cancel and leave stay tied to the browser cookie only. A mistaken tap books immediately; Cancel undoes it.

## M2 — Improve the demonstrated journey

Plan only after M1 gives evidence. Candidates the team already named: show who booked a slot after it ended, admin page (tables and hours without a deploy), "Sign in with 42", the page updating by itself or notifications, fairness limits, booking ahead, a QR code shown in the app.
