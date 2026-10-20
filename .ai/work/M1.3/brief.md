# M1.3 — Book a slot

## Outcome

A player on `/table/1` or `/table/2` books a free, not-yet-ended slot by typing their 42 intra login, choosing singles (2 spots) or doubles (4 spots) and saying how many spots their group already fills. The slot then shows as open (with spots left) or full. Bad input and impossible bookings are refused by the server with a clear message, and nothing is booked.

## Audit

- Base: `main` at `632909c7ad8e77a487babbc8e7286e71592c165f` (merge of PR #3, M1.2). Branch: `m1.3-book-slot`.
- `server.mjs`: `createApp({ revision, now, bookings, opens, closes })`. `GET/HEAD /table/1|2` renders today's slots (Berlin time) as free/open/full/ended from the `bookings` array. Booking shape (comment in server.mjs): `{ table: 1|2, start: 'YYYY-MM-DDTHH:MM' Berlin wall-clock, spots: 2|4, players: filled count }`. Every non-GET/HEAD request returns 405; unknown paths return an HTML 404. Data rendered into HTML goes through `escape`.
- Tests: `test/app.test.mjs` (starter; asserts `POST /` → 405 with `Allow: GET, HEAD`), `test/table.test.mjs` (M1.2), `test/deploy.test.mjs`. 31/31 pass on Node 22.23.3 under `TZ=UTC` and `TZ=Europe/Berlin` (lead's localhost check on 632909c).
- Bookings live only in memory for now. Persistence is M1.5.
- Node 22: the system `node` here is v20.11.1. Use the verified official Node 22 by prefixing commands with `PATH=/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/node-v22.23.3-linux-x64/bin:$PATH`, and record `node --version`.
- The home disk has under 200 MB free. Keep screenshots small and put scratch files under /tmp, not in the home directory.

## Acceptance

- [ ] Normal case: on a free, not-ended slot, a player submits login `jwosylu`, singles, group fills 1. The booking is stored and the table page shows that slot as open, "1 of 2 spots left". With doubles and group fills 4, the slot shows full. Group fills must be between 1 and the number of spots.
- [ ] The player gets clear feedback that the booking worked, and reloading the page afterwards does not book again (e.g. redirect after the form post).
- [ ] The booking records the booker's login and which browser made it (an unguessable server-issued id kept by the browser, e.g. an HttpOnly cookie). The id is never shown in the page. M1.4 will use it to allow cancelling and leaving. Showing the booker's login on the slot is allowed; profile links are M1.4.
- [ ] Login validation: empty, whitespace-only, and a login containing spaces (`jw osylu`) are refused with a clear message, and nothing is booked. A normal login such as `jwosylu`, `ben42` or `j-doe` is accepted. Input that could be HTML (`<script>`) must never be rendered as markup — refusing it is fine.
- [ ] Server-side refusals (4xx with a clear message, nothing booked) for: an already booked slot; a slot that has already ended; a time outside opening hours or not on a 30-minute boundary; a table other than 1 or 2; spots other than 2 or 4; group fills of 0 or more than the spots; a missing or malformed field. These must be tested by sending the request directly, not only by hiding the form.
- [ ] Two booking requests for the same slot sent at the same time result in exactly one booking. One request succeeds and the other is refused.
- [ ] Request bodies at the trust boundary are bounded. An oversized body is refused without crashing the app.
- [ ] Existing behaviour holds: the M1.2 slot display, the 404 page, `/api/health`, the repository-file and traversal tests, `POST /` (and other non-booking writes) → 405, and `test/deploy.test.mjs` all still pass.
- [ ] Browser task: in headless Chrome at desktop (1280×800) and phone (390×844), book a free slot on `/table/2` with the form, see the success message and the slot change to open, then try to book the same slot again and see the refusal. No horizontal scroll at phone width; form controls are tappable. Record what you saw in validation.md and keep screenshots in `.ai/browser/` (git-ignored).

## Boundaries and dependencies

- Depends on M1.2 (merged). M1.1 is still blocked, so acceptance is local only.
- Keep the shared booking shape and evolve it minimally: add the booker login and the browser id. M1.4 will add joiners, so make the player list easy to extend. Document the shape in one line, as M1.2 did.
- Out of scope: joining, cancelling, leaving, profile links (M1.4); storing to disk and surviving a restart (M1.5); accounts or checking logins against 42; CSRF protection; live updates; changing `/`.
- Deploy contract unchanged: scripts, `scripts/`, lockfile, port 3000, `/api/health`. No new runtime dependency unless justified in validation.md.
- Don't edit PLAN.md or .ai/context.md.

## Handoff

- Human owner: jasuoh. Milestone lead: Claude Code session (Opus 5.5), 2026-10-20.
- Coder: fresh Claude subagent (Agent tool) on `m1.3-book-slot`, using `ponytail` and `superpowers:test-driven-development`. Writes `.ai/work/M1.3/validation.md`.
- Reviewer: Codex CLI (`codex exec`). Writes `.ai/work/M1.3/review.md`.
- Committer: fresh Claude subagent after APPROVE on the exact head SHA, with a PR to `kpriya42/vibecode-workshop-mega_vibe_coders` using `--repo`.
