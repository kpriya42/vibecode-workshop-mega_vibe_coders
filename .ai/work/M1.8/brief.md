# M1.8 — Tap a slot to book or join

## Outcome

A player picks a table and taps a slot directly: tapping a free slot opens booking for exactly that slot, and tapping an open game opens joining it. There is no separate time dropdown. The front page (`/`) becomes this booking view, with the Ping Pong 42 identity and a Table 1 | Table 2 switch, so the journey from opening the site to booking takes as few taps as possible. The QR URLs `/table/1` and `/table/2` keep working and open the same view for their table.

New scope requested by jasuoh on 2026-10-20 after seeing M1.7 live. jasuoh chose the "tap a slot" option over "front page only picks a table". Agreed sketch:

```
PING PONG 42          [Table 1|Table 2]
 14:00  Free             [Book]
 14:30  jwosylu · 1 left [Join]
 15:00  Full
tap Book on 14:00 -> a panel for "14:00 · Table 1": login, Singles/Doubles, group fills, [Book 14:00]
```

## Audit

- Base: `main` at `0187eaa864b0ee89b520577652b6df613af5b9a4` (M1.2, M1.3, M1.4 and M1.7; live on team-02). Branch: `m1.8-tap-to-book`, in its own worktree at `/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/wt-m1.8`.
- **In parallel:** M1.5 (persistence) is in its final review on `m1.5-persistence`. It changes the POST handler and imports in `server.mjs`, adds `store.mjs` and tests, and will merge first. Keep this step to rendering (`tablePage`, the `/` route, `public/`) and don't touch the POST handlers or the validation. The later merge with M1.5 needs re-review.
- Today `server.mjs` `tablePage()` renders the slot list with per-slot Join, Leave and Cancel forms, plus one separate booking form with a time `<select>` of free slots, a game select and a group size. `/` serves static `public/index.html` (the M1.7 landing page). POST endpoints: `/book`, `/join`, `/leave`, `/cancel`. Success notices come through the `done` Map and query keys. Ownership comes from the HttpOnly `browser` cookie.
- Tests: 63 (app, table, book, join, deploy). Some assert on the HTML (e.g. the slot list regex in `test/table.test.mjs`, and `/` containing `<h1>`). Update assertions only where the markup legitimately changes, and keep their intent.
- Node 22: prefix commands with `PATH=/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/node-v22.23.3-linux-x64/bin:$PATH`.

## Acceptance

- [ ] `/` shows the Ping Pong 42 header, a clear Table 1 | Table 2 switch (the current table visibly selected), and today's slots for a table, defaulting to table 1. `/table/1` and `/table/2` show the same view with their table selected. `/table/3` still returns 404.
- [ ] A free, not-ended slot has a Book action on its row. Tapping it reveals a booking panel for exactly that slot and table, showing the time and table, with login, Singles/Doubles and group size. Submitting books that slot. There is no time dropdown anywhere.
- [ ] An open game has a Join action on its row that reveals a login field for that slot. Full and ended slots offer no book or join action. Cancel and leave controls stay visible only to the right browser, as in M1.4.
- [ ] Only one slot's panel needs to be open at a time. The page works without JavaScript; for example, each row's form sits behind `<details>`/`<summary>`, or the Book link goes to `?slot=HH:MM` which renders that slot's panel open. If you add JavaScript, the no-JS path must still book. Keep the 3-step "how it works" short or move it below the slots, so the slots come first on a phone.
- [ ] After a successful book or join, the page returns to the same table with the success notice, and the slot shows its new state. Refusals still show the clear "Not booked" or "Not joined" messages.
- [ ] Server validation and ownership checks are unchanged: every M1.3 and M1.4 refusal test still passes, and nothing new trusts the client.
- [ ] Everything rendered stays escaped, and a query parameter such as `?slot=` can't inject markup or crash the app (the M1.4 round-1 lesson: only accept an exact `HH:MM` that is a real slot).
- [ ] Phone first: at 390×844 the switch, rows and buttons are tappable (about 44px), with no horizontal scroll. Desktop (1280×800) also looks deliberate, for example both tables side by side or a centred column. Same dark palette and orange accent.
- [ ] Browser journey in headless Chrome over CDP with two profiles, at both widths, using a fixed clock if 14:00 has already passed. A opens `/`, switches to Table 2, taps Book on 14:00 and books as `jwosylu`, singles, group 1. B opens `/table/2`, taps Join on 14:00 and joins as `ben42`, and the slot shows Full. A reloads and sees `ben42` as a profile link. Record what you saw in validation.md; screenshots go under /tmp and are not committed.
- [ ] `npm test` passes under `TZ=UTC` and `TZ=Europe/Berlin`. `/api/health` and the deploy contract are unchanged.

## Boundaries and dependencies

- Rendering and static assets only. No changes to POST handlers, validation, the booking shape, persistence or scripts. No external fonts, CDNs or new dependencies.
- If `/` becomes server-rendered, remove or replace `public/index.html` cleanly, and keep the repository-file and traversal tests passing.
- Out of scope: live updates, a status summary across days, admin, sign-in.
- Don't edit PLAN.md or .ai/context.md.

## Handoff

- Human owner: jasuoh. Milestone lead: Claude Code session (Opus 5.5), 2026-10-20.
- Coder: a fresh Claude subagent in the worktree above, using `ponytail` and `superpowers:test-driven-development` for the behaviour (slot panel selection, `?slot=` validation). It writes `.ai/work/M1.8/validation.md`.
- Reviewer: Codex CLI (`codex exec`), including the two-profile browser journey. It writes `.ai/work/M1.8/review.md`.
- Committer: a fresh Claude subagent after APPROVE on the exact head SHA, then a release on jasuoh's standing instruction to deploy.
