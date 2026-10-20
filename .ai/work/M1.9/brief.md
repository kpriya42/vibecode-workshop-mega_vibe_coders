# M1.9 — One tap to book or join

## Outcome

A player sets their login, singles/doubles and group size once at the top of the table view, and from then on books a free slot or joins an open game with **one tap** on that slot. The browser remembers the login, so a returning player only taps. The layout is cleaner than M1.8: no per-slot panels.

New scope requested by jasuoh on 2026-10-20 ("better cleaner ui, select the slot with one click, book it"). jasuoh chose "set once, then 1 tap" over a confirm sheet. Agreed sketch:

```
PING PONG 42        [Table 1|Table 2]
 Login [jwosylu    ]  (remembered)
 [Singles|Doubles]   Players with me [1]

 14:00  Free               [ Book ]
 14:30  ben42 · 1 left     [ Join ]
 15:00  Full · a, b
 15:30  Free               [ Book ]
tap Book 14:00 -> booked instantly; the row shows "You · 1 left · Cancel"
```

## Audit

- Base: `m1.8-tap-to-book` at `4baee8c6098850c3addd7e718a3665dd5b3ffa77` (Codex APPROVED). It is being merged and released as PR "M1.8" in parallel, and this branch merges `origin/main` once that lands. Branch: `m1.9-one-tap`, worktree `/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/wt-m1.9`.
- `server.mjs`: `tablePage()` renders slot cards, each with a `<details name="slot">` panel holding a Book form (login, spots, players) or a Join form (login), plus Cancel and Leave forms for the owning browser. POST `/book` needs `table, time, login, spots, players`. POST `/join` needs `table, time, login`. POST `/cancel` and `/leave` need `table, time` (and `login` for leave). `persist()` runs after every successful action. The ownership cookie `browser` is HttpOnly. Notices come from the `done` Map.
- Tests: 79, including `test/tap.test.mjs` (M1.8 UI assertions; update them where the markup legitimately changes, keeping the intent: no time dropdown, no Book or Join on full or ended slots, junk queries are safe).
- Node 22: prefix commands with `PATH=/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/node-v22.23.3-linux-x64/bin:$PATH`.

## Acceptance

- [ ] At the top of the table view, set once: login, a Singles|Doubles choice and "Players with me" (the group size, default 1). Every free, not-ended slot has a single **Book** button. One tap books that slot with the current settings. Every open game has a single **Join** button, and one tap joins with the login. There are no per-slot panels and no time dropdown. It works without JavaScript; for example, one form with a `name="time"` submit button per slot, and `formaction` for Join.
- [ ] Remembered login: after a successful book or join, the browser's next visit shows the login prefilled. It is fine to remember it server-side against the browser id, or in a cookie. It is never a substitute for ownership: cancel and leave still check the `browser` cookie only. A remembered login is escaped wherever it is rendered.
- [ ] If the login is empty or invalid when Book or Join is tapped, the server refuses with a clear message and nothing is booked, as before. The message makes clear the login field at the top needs filling. The page keeps whatever the player had typed if that's cheap; if it isn't, say so in validation.md.
- [ ] Rows owned by this browser read clearly, for example "You · 1 left" with a Cancel button, or "You joined · Leave". Other players are still shown as intra profile links.
- [ ] Full and ended slots have no Book or Join button. Ended rows stay compact and dimmed so upcoming slots lead on a phone.
- [ ] Server validation, ownership and persistence are unchanged. All M1.3, M1.4 and M1.5 refusal and persistence tests still pass. If the remembered login needs a POST-side change (setting a cookie, say), keep it minimal and test it.
- [ ] Clean and polished: phone first at 390×844, with tap targets of 44px or more, no horizontal scroll, and the settings bar compact (sticky if that's cheap). Desktop at 1280×800 should look deliberate. Same palette. Look at your screenshots and iterate until it looks like a real app.
- [ ] Browser journey, two headless Chrome profiles at both widths, with a fixed clock:
  - A opens `/`, types `jwosylu` once, leaves Singles and group 1, and taps Book on 14:00 on Table 2. It is booked, and the row shows A's ownership.
  - A reloads: the login is prefilled. A taps Book on 15:00, a second one-tap booking.
  - B opens `/table/2`, types `ben42` and taps Join on 14:00, which becomes Full.
  - A sees `ben42` as a profile link.
  - With JavaScript off, a booking still works.
  - Record all of this in validation.md. Screenshots go under /tmp.
- [ ] `npm test` passes under `TZ=UTC` and `TZ=Europe/Berlin`. `/api/health` and the deploy contract are unchanged.

## Boundaries and dependencies

- Builds on M1.8 (approved, merging now). Merge `origin/main` before handing over for review once M1.8 has merged, so the review covers the final diff.
- Accidental double-booking by one tap is acceptable, because Cancel undoes it. No confirm dialog.
- Out of scope: live updates, sign-in, admin, limits on how many slots one login may book (M2 fairness).
- Don't edit PLAN.md or .ai/context.md.

## Handoff

- Human owner: jasuoh. Milestone lead: Claude Code session (Opus 5.5), 2026-10-20.
- Coder: a fresh Claude subagent in the worktree above, using `ponytail` and `superpowers:test-driven-development`. It writes `.ai/work/M1.9/validation.md`.
- Reviewer: Codex CLI (`codex exec`). It writes `.ai/work/M1.9/review.md`.
- Committer: a fresh Claude subagent after APPROVE on the exact head SHA, then a release under jasuoh's standing "merge and deploy" instruction.
