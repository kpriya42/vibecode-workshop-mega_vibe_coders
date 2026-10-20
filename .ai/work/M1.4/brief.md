# M1.4 — Join, leave and find each other

## Outcome

On a table page, a player sees which games are open and how many spots are left, and joins one with their 42 intra login. Everyone in a slot is shown as a link to their intra profile, so players can find each other. Only the browser that made a booking can cancel it, and only the browser that joined can leave. This completes the IDEA.md proof journey, except that bookings don't survive a restart until M1.5.

## Audit

- Base: `main` at `279eb160bc10e3c56f27142da66ff0acf1aac3b1` (M1.3 merged via PR #4). Branch: `m1.4-join-leave`. This revision is deployed at https://team-02.intra.land (smoke OK).
- `server.mjs`: `POST /book` validates and pushes a booking `{ table, start, spots, players, login, browser }` into an in-memory array. `players` is the booker's group size (a number). `browser` comes from an HttpOnly `browser` cookie (UUID) issued on the first POST. The page shows "N of M spots left" or "Full" and the booker's login (escaped, not a link). Refusals use `Refusal(status, message)` and re-render the table page with a "Not booked: …" message. Every other POST returns 405.
- Tests: 46 in total (`app`, `table`, `book`, `deploy`), all passing on Node 22.23.3 under both time zones.
- Node 22: prefix commands with `PATH=/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/node-v22.23.3-linux-x64/bin:$PATH`. The home disk has under 200 MB free, so put scratch files and Chrome profiles under /tmp.
- Assumption (lead, not yet confirmed by jasuoh): the booker's group members have no logins. The slot shows the booker's login and their group size, and each joiner under their own login.

## Acceptance

- [ ] Join: on an open game that hasn't ended, a player submits their login and takes one spot. The slot shows one fewer spot left, or "Full" when no spots are left. Login rules are the same as for booking (empty, spaces or HTML refused, with a clear message).
- [ ] The server refuses (4xx, clear message, nothing changed): joining a full game; the same login joining the same game twice, including the booker's own login; joining a free slot (book it instead); joining a slot that has ended or doesn't exist.
- [ ] Find each other: the booker and every joiner are shown by login, each linking to `https://profile.intra.42.fr/users/<login>`. Logins are escaped in both the text and the link.
- [ ] The booker sees who joined the next time they open or reload the page. No live updates.
- [ ] Cancel: only the browser that made the booking sees a cancel control and can cancel. Cancelling frees the slot. A cancel request from any other browser, including one that typed the same login, or one with no cookie, is refused by the server with a 403 and nothing changes.
- [ ] Leave: only the browser that joined sees a leave control for that player and can leave. Leaving reopens the spot. A leave request from any other browser, including the booker's, is refused by the server with a 403 and nothing changes.
- [ ] These ownership checks must be tested by sending requests directly with different cookies, not only by hiding the buttons. The browser id is never rendered into the page.
- [ ] Simultaneous joins for the last spot result in exactly one joiner.
- [ ] Existing behaviour holds: the M1.2 display, M1.3 booking and its refusals, the 404 page, `/api/health`, 405 for unknown writes, the traversal tests, and `test/deploy.test.mjs`.
- [ ] Browser journey in headless Chrome with two separate browser profiles (two cookies), at 1280×800 and 390×844. Profile A books 14:00 on `/table/2` as singles with one spot open, as `jwosylu`. Profile B joins as `ben42`, and the slot shows Full. Profile A reloads and sees `ben42` as a profile link. Profile B sees no cancel control for A's booking, and A sees no leave control for B. B leaves, and the spot reopens. A cancels, and the slot becomes free. There is no horizontal scroll at phone width. Use a slot that hasn't ended at the time you run the check if 14:00 has already passed, or a fixed clock. Record what you saw in validation.md. Screenshots go in `.ai/browser/` and are not committed.

## Boundaries and dependencies

- Depends on M1.3 (merged). Hosted acceptance follows a later release; this step is checked locally.
- Evolve the booking shape minimally (for example a joiner list of `{ login, browser }`) and document it in one line. Keep `players` meaning the booker's group size, or replace it, as long as the display and the M1.3 tests stay correct. M1.5 will persist this shape, so keep it plain JSON.
- Out of scope: persistence (M1.5), live updates and notifications, verifying logins against 42, CSRF tokens (the cookie is already SameSite=Lax), editing a booking, admin.
- Deploy contract unchanged. No new runtime dependency. Don't edit PLAN.md or .ai/context.md.

## Handoff

- Human owner: jasuoh. Milestone lead: Claude Code session (Opus 5.5), 2026-10-20.
- Coder: a fresh Claude subagent (Agent tool) on `m1.4-join-leave`, using `ponytail` and `superpowers:test-driven-development`. It writes `.ai/work/M1.4/validation.md`.
- Reviewer: Codex CLI (`codex exec`). It writes `.ai/work/M1.4/review.md`.
- Committer: a fresh Claude subagent after APPROVE on the exact head SHA, opening a PR with `--repo kpriya42/vibecode-workshop-mega_vibe_coders`. Deploying needs the team's release instruction.
