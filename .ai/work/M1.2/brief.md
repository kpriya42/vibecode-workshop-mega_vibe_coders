# M1.2 — Today's slots per table

## Outcome

A player who opens `/table/1` or `/table/2` (later via the table's QR sticker) sees today's 30-minute slots for that table, in German time, each marked free, open (with spots left) or full, and slots that have already ended are visibly not bookable. They can switch to the other table. Booking itself is M1.3; this step only shows slots.

## Audit

- Base: `main` at `0a683012c361115649b577308cc8249a25968869` (merge of PR #2). Branch: `m1.2-table-slots`.
- `server.mjs` is the unchanged starter: `createApp({ revision })` serves `/`, `/style.css` and `/api/health` from a fixed asset map, returns 404 for everything else and 405 for non-GET/HEAD. `public/` holds the starter landing page and stylesheet.
- `test/app.test.mjs` (3 HTTP tests via `createApp` on port 0) and `test/deploy.test.mjs` (deploy contract) pass on main. `npm test` runs `node --test`.
- There is no booking data and no write path yet. No dependencies in `package.json`.
- Local machine: Node v20.11.1 (project expects Node 22 on the guest; record the version you actually ran). Headless Chrome is at `/usr/bin/google-chrome` for screenshots.
- M1.1 (hosting) is blocked on the organiser handout, so this step is accepted locally only.

## Acceptance

- [ ] Normal case: `GET /table/1` and `GET /table/2` return 200 HTML listing every 30-minute slot of today from opening to closing time. With default hours 09:00–18:00 that is 18 slots, 09:00 to 17:30 starts. Hours come from config with that default.
- [ ] Each slot shows one of: free; open with the number of spots left (e.g. "1 of 2 spots left"); full. With no bookings, every not-yet-ended slot is free. Open and full must be demonstrable in tests by giving `createApp` some bookings (see Boundaries); no booking UI or write endpoint in this step.
- [ ] Slots that have already ended are shown as ended/not bookable, distinct from free. A slot that is in progress still counts as not ended (it ends at start + 30 min).
- [ ] Time zone: "today" and all slot times are Europe/Berlin, independent of the server's own time zone. Tests use an injectable clock and pass with `TZ=UTC` and with `TZ=Europe/Berlin`. Cases that must pass:
  - `2026-10-20T10:00:00Z` (Berlin 12:00 CEST): slots ending at or before 12:00 are ended; 12:00 is current/not ended; date shown is 20 Oct.
  - `2026-12-01T10:00:00Z` (Berlin 11:00 CET): 11:00 is current, 10:30 is ended.
  - `2026-10-25T08:00:00Z` (DST ends that night; Berlin 09:00 CET): 18 slots, 09:00 is current, none ended.
  - `2026-10-20T23:30:00Z` (Berlin 01:30 on 21 Oct): today is 21 Oct and no slot is ended.
  - `2026-10-20T16:30:00Z` (Berlin 18:30): every slot is ended; the page says so clearly rather than showing an empty list.
- [ ] Each table page links to the other table.
- [ ] Unknown tables (`/table/3`, `/table/0`, `/table/abc`, `/table/`) return a 404 page in HTML with a link back to a real table — not a crash, not a stack trace.
- [ ] Existing behaviour holds: `/`, `/style.css`, `/api/health` still work; the repository-file and traversal tests and the 405 test still pass; `test/deploy.test.mjs` untouched and passing.
- [ ] Logins/names are not part of this step, but anything rendered from data must be HTML-escaped (bookings will carry typed logins from M1.3).
- [ ] Browser task: open `/table/1` and `/table/2` in headless Chrome at desktop (1280×800) and phone (390×844) widths. Slots are readable and tappable-sized, no horizontal scroll, switching tables works. Save screenshots under `.ai/browser/` (git-ignored) and describe what you saw in validation.md.

## Boundaries and dependencies

- No dependency on M1.1; hosted checks happen once M1.1 is unblocked.
- Shared contract for M1.3–M1.5 (keep it this small): a booking is `{ table, start, spots, players }` where `table` is 1 or 2, `start` is the slot start (pick one clear representation and document it in one line), `spots` is 2 or 4 and `players` is the number of filled spots (M1.4 will turn this into a list of logins — choose whatever representation makes that change smallest). `createApp` accepts the bookings and a clock as options so tests can seed them; production uses an empty list and the real clock. Persistence is M1.5 — do not add a file store now.
- Out of scope: booking, joining, cancelling, persistence, live updates, an admin page, QR generation, more tables, changing `/` (it may keep the starter page).
- Keep the deploy contract: `start`, `test`, `deploy`, `smoke`, `doctor` scripts, `scripts/`, the lockfile, port 3000 and `/api/health` unchanged. No new runtime dependency unless you can justify it in validation.md; `Intl` already handles Europe/Berlin.
- Don't change PLAN.md or .ai/context.md (the lead does).

## Handoff

- Human owner: jasuoh.
- Milestone lead: Claude Code session (Opus 5.5), 2026-10-20.
- Coder: fresh Claude subagent (Agent tool) on `m1.2-table-slots`, skills `ponytail` and `superpowers:test-driven-development`. Writes `.ai/work/M1.2/validation.md` with base/head SHAs, commands actually run and their results, browser evidence and limits.
- Reviewer: Codex CLI (`codex exec`), different model family. Writes `.ai/work/M1.2/review.md` from `.ai/templates/review.md`.
- Committer: fresh Claude subagent after APPROVE on the exact head SHA; PR to `kpriya42/vibecode-workshop-mega_vibe_coders` with `--repo`.
