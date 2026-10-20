# M1.8 validation — tap a slot to book or join

- Coder: a Claude subagent (Claude Code, Opus 5.5), dispatched by the milestone lead via the Agent tool. Skills used: `ponytail:ponytail`, `superpowers:test-driven-development`.
- Branch: `m1.8-tap-to-book`, worktree `/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/wt-m1.8`.
- Base: `main` `0187eaa864b0ee89b520577652b6df613af5b9a4` (brief commit `77e8549`).
- Implementation head: `18050ab29bf224a72de2f11eeace01da2f66f04f`. This file is committed on top of it; the code under review is `18050ab`.
- Node: `v22.23.3` (scratchpad toolchain on `PATH`).

## What changed

- `server.mjs`: `/` now renders `tablePage(1)`. `/table/1` and `/table/2` render the same view. The header has the PING PONG 42 wordmark and a Table 1 | Table 2 switch, and the current table link carries `aria-current="page"`. Each free, not-ended row has `<details name="slot"><summary>Book</summary>` with a `/book` form for exactly that slot. It shows "HH:MM · Table N", the login, Singles/Doubles radios (`name="spots"`, values 2/4) and group size. Each open row has a `Join` panel with a login field. Full and ended rows get no panel. Cancel and leave forms are unchanged and still shown only to the owning browser. The time `<select>` is gone. The 3-step intro became one line below the slots. Only the `assets` map, `tablePage` and the `/` route line changed. POST handlers, validation, the booking shape and the notice handling are untouched (`git diff 0187eaa 18050ab -- server.mjs` hunks: lines 4, 38, 47–83 and 236).
- I didn't add `?slot=`. `<details name="slot">` is the browser's exclusive accordion, so only one panel is open at a time without JavaScript. That means no new query input exists. The test for junk queries on `/` still guards against it.
- I deleted `public/index.html`. The `/` entry in the assets map went with it.
- I rewrote `public/style.css` for the single view: centred 34rem column, the same dark palette and orange accent, a pill segmented switch, slot cards with a pill action button, compact ended rows, and a segmented Singles/Doubles control.
- Tests: new `test/tap.test.mjs` (4 tests). The `test/book.test.mjs` test that checked "booking form with only free, not-ended slots" read `<option>` times. It now reads each row's hidden `time` in its `/book` form. The intent is the same: 12:00 is first, 11:30 (ended) and 14:00 (booked) are absent, 14:30 is present.

## TDD

Red, before any production change (`node --test test/tap.test.mjs`): 3 failures. They were no `aria-current` switch, no per-row `/book` form or `<summary>`, and the time `<select>` still present. The junk-query test passed already because `/` was static then. It's kept as a regression guard for the new server-rendered `/`. Green after the implementation.

## Commands and results

| Command | Result |
|---|---|
| `npm ci` | ok, 0 vulnerabilities (no dependencies) |
| `TZ=UTC npm test` | tests 67, pass 67, fail 0, skipped 0 |
| `TZ=Europe/Berlin npm test` | tests 67, pass 67, fail 0, skipped 0 |

Before: 63 tests. Added 4 in `tap.test.mjs`, rewrote 1 in `book.test.mjs`. Every M1.3 and M1.4 refusal test is unchanged and passes.

## Browser journey

The setup lives under `/tmp/m18/`: `launch.mjs` starts `createApp` with a fixed clock at `2026-10-20T10:00:00Z` (12:00 Berlin), and `journey.mjs` drives headless `/usr/bin/google-chrome --headless=new` over CDP with raw `Page`, `Input.dispatchMouseEvent`, `Input.insertText` and `Runtime.evaluate`. It uses two profiles, `--user-data-dir=/tmp/m18/profile-A-<w>` and `profile-B-<w>`. Clicks are real mouse events at element centres, not `element.click()`. I cleared the profiles before the final runs, and each width used a fresh app (empty bookings). The script killed its own child processes by their PIDs (app, Chrome A and Chrome B).

Results were the same at 390×844 (mobile emulation) and 1280×800:

1. A opens `/`: current switch item "Table 1", 0 `select[name=time]`, 18 rows. Screenshot `/tmp/m18/<w>-A1-home.png`.
2. A taps "Table 2" in the switch: URL `/table/2`, current "Table 2".
3. A taps Book on 14:00: panel open, heading "14:00 · Table 2", 1 open panel (`A2-book-panel.png`). A then taps Book on 14:30: still 1 open panel, and 14:00 closed (exclusive accordion confirmed). A re-opens 14:00.
4. A types `jwosylu`. Defaults are Singles (`spots=2`) and group `1`. A taps "Book 14:00": URL `/table/2?booked=14:00`, notice "Booked 14:00. See you at the table!", row `slot open | 1 of 2 spots left · jwosylu`, and A sees "Cancel booking" (`A3-booked.png`).
5. B opens `/table/2`: current "Table 2", 14:00 offers "Join", and B sees no cancel form. B taps Join, types `ben42` and taps "Join 14:00" (`B1-join-panel.png`): URL `/table/2?joined=14:00`, notice "Joined 14:00. See you at the table!", row `slot full | Full · jwosylu, ben42`, no Book/Join summary, and B sees "Leave as ben42" (`B2-full.png`).
6. A reloads: the 14:00 row has the `ben42` link to `https://profile.intra.42.fr/users/ben42`. A sees Cancel and doesn't see Leave (`A4-reload.png`).

The measurements cover every visible switch link, summary, panel input, segment label and panel/cancel/leave button on each page:

| Width | scrollWidth / clientWidth | Smallest tap target height | Under 44px |
|---|---|---|---|
| 390×844 | 390 / 390 on every page | 44px | none |
| 1280×800 | 1265 / 1265 on every page (scrollbar) | 44px | none |

Design judgement from the screenshots: on a phone the header shows the orange wordmark and a pill switch with the selected table filled orange. Ended rows are compact and dimmed, so the bookable slots start above the fold. Each card's time, status and orange pill button are vertically aligned. The open panel is outlined in orange, with a full-width login field, a segmented Singles/Doubles control and a full-width "Book 14:00" button. Desktop is the same column, centred. I fixed two things after the first round of screenshots: the text sat higher than the button's centre, and the tall ended rows pushed free slots below the fold.

## Acceptance mapping

| Acceptance | Check |
|---|---|
| `/` header, switch, current selected, table 1 default; `/table/1`, `/table/2` same view; `/table/3` 404 | `tap.test` test 1; existing `table.test` "unknown tables get an HTML 404"; browser steps 1, 2 and 5 |
| Book action per free, not-ended slot; panel for exactly that slot/table with login, Singles/Doubles, group; books; no time dropdown | `tap.test` tests 2 and 3; `book.test` rewritten form test; browser steps 3 and 4 |
| Join on open games with a login field; none on full or ended; cancel/leave only for the right browser | `tap.test` test 2; existing `join.test` "open games offer a join form…" and the cancel/leave visibility tests; browser steps 5 and 6 |
| One panel at a time; works without JS; how-it-works short and below the slots | `tap.test` test 3 (`details name="slot"`); browser step 3 (opening 14:30 closed 14:00). The forms are plain HTML POSTs inside `<details>`. The how-it-works line renders after `</ol>`. |
| Success returns to the same table with a notice and the new state; refusals still clear | Browser steps 4 and 5; existing `book.test` and `join.test` redirect and refusal tests |
| Validation and ownership unchanged | No hunks in the POST handlers or validators; all M1.3 and M1.4 refusal tests pass |
| Escaped; `?slot=` and junk queries can't inject or crash | `tap.test` test 4 (`?slot=<script>`, `?slot=14:00`, `?toString`, `?__proto__`, `?booked=<b>x</b>` on `/`, then health 200); existing escape tests; `?slot=` isn't used |
| Phone first, about 44px targets, no horizontal scroll; desktop deliberate; same palette | Measurements table; screenshots |
| Two-profile CDP journey at both widths with a fixed clock | Browser journey above |
| `npm test` under both TZ values; health and deploy contract unchanged | Commands table; `scripts/`, `package.json` and the lockfile are unchanged; `/api/health` code is untouched and `app.test` covers it |

## Skipped or not verified

- I didn't run the journey in a browser with JavaScript disabled. The page ships no JavaScript, and the panels are native `<details>`/`<form>`.
- `<details name>` exclusivity needs Chrome 120+, Safari 17.2+ or Firefox 130+. Older browsers allow several open panels, which still work.
- No hosted or deployed check. No real-device test (phone width was emulated). No Safari or Firefox rendering check.
- The merge with M1.5 (persistence, POST side) isn't tested here and needs re-review, as the brief says.

## Merge with M1.5

At the coordinator's request I merged `origin/main` at `7ee2064bb8642dc107074fdbf8fba3f223b0ae31` (M1.5 persistence) into this branch with `git fetch origin && git merge origin/main`, using a merge, not a rebase.

- Merge commit: `becab3baf98523cead6d811fae8cf42f4c79d450`. **No conflicts.** Git merged `server.mjs` automatically. M1.5 changed imports, `createApp` and the POST handler; M1.8 changed `assets`, `tablePage` and the `/` route.
- Clash check:
  - The top-level names in `server.mjs` are unique. `store.mjs` imports `join` from `node:path`, but only inside its own module, so it doesn't clash with `server.mjs`'s `join` action.
  - `node --check server.mjs` is clean.
  - The `/` route line and `<details name="slot">` panels are present, and `index.html` is not referenced.
- Tests on Node v22.23.3 after `npm ci`:
  - `TZ=UTC npm test`: tests 79, pass 79, fail 0.
  - `TZ=Europe/Berlin npm test`: tests 79, pass 79, fail 0.
  - The new count includes M1.5's tests. I didn't change any assertion.
- Real entry point: `PORT=4555 HOST=127.0.0.1 VC_DATA_DIR=/tmp/m18/data APP_REVISION=merge-check node server.mjs` logged "listening". `/api/health` returned `{"ok":true,"revision":"merge-check"}` and `/` returned 200. SIGTERM exited with 0.
- Browser check at 390×844, using the same CDP two-profile script as above:
  - Setup: `/tmp/m18/launch2.mjs` runs `createApp` with the fixed clock and `dataDir: VC_DATA_DIR=/tmp/m18/data`. The profiles and the data directory were cleared first.
  - A opened `/`, switched to Table 2, tapped Book on 14:00 and booked as jwosylu, singles, group 1. The notice read "Booked 14:00…" and the row read "1 of 2 spots left · jwosylu".
  - B opened `/table/2`, tapped Join and joined as ben42. The row read "Full · jwosylu, ben42", and B saw a Leave button.
  - A reloaded and saw the ben42 profile link and Cancel. No horizontal scroll, and the smallest tap target was 44px.
  - `bookings.json` held the one booking, with ben42 in `joined`.
  - I sent SIGTERM to the app by its exact PID (79949). It exited with code 0, and health was refused while it was down. I then restarted it (new PID 80439).
  - After the restart, A's `/table/2` showed 14:00 as "Full · jwosylu, ben42" with the ben42 profile link and A's Cancel. B still had Leave and no Cancel, so ownership survived through the cookies. Screenshot: `/tmp/m18/390x844-A5-after-restart.png`.
- I didn't re-run the 1280×800 journey after the merge. The merge changed no rendering code.
