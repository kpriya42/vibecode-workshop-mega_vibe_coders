# M1.4 validation — join, leave and find each other

- Coder: a fresh Claude subagent (Claude Code, Opus 5.5) dispatched by the milestone lead via the Agent tool, using `ponytail:ponytail` and `superpowers:test-driven-development`.
- Branch: `m1.4-join-leave`
- Base: `main` at `279eb160bc10e3c56f27142da66ff0acf1aac3b1` (brief commit `2f5b876` on top)
- Implementation head: `e84f7a11122081a17a16ee59e2f93a882eb6b3d9`
- Node: `v22.23.3` (scratchpad Node 22 on PATH for every node/npm command)

## Booking shape (one line)

`{ table: 1|2, start: 'YYYY-MM-DDTHH:MM', spots: 2|4, players: booker's group size, login: booker's login, browser: booker's browser id, joined: [{ login, browser }] }`. Each joiner takes one spot, so spots left = `spots - players - joined.length`. Bookings without `joined` (old fixtures) are read as an empty list.

## What changed

- `server.mjs`: book's validation is split into shared `slotOf` (exact table, exact `HH:MM` slot start in opening hours, not ended), `loginOf` and `bookingAt` helpers. New synchronous actions `POST /join` (table, time, login), `POST /cancel` (table, time) and `POST /leave` (table, time, login) go through the same body limit, cookie issue and refusal handling as `/book`. Refusals say "Not joined / Not cancelled / Not left: …". Success redirects with 303 to `/table/N?joined|cancelled|left=HH:MM`, and the page shows a status notice. The table page reads the `browser` cookie on GET. It shows the booker (with "(group of N)" when N > 1) and each joiner as `https://profile.intra.42.fr/users/<login>` links, escaped. It shows a cancel form only to the booking browser, a "Leave as <login>" form only to the browser that joined as that login, and a join form on open (not full, not ended) slots. The browser id is never written into the page.
- `public/style.css`: slot rows wrap, with a `.controls` row for the small forms.
- `test/join.test.mjs`: 16 new tests (written first, see below).
- `test/book.test.mjs`: the one shape assertion now expects `joined: []`. No other M1.3 test changed.

Refusal codes: bad or missing field → 400; ended slot, free slot ("Book it instead"), full game, login already in the game (case-insensitive, including the booker's) → 409; cancel or leave from the wrong browser or without a cookie → 403; leaving as a login that isn't a joiner in that game → 404.

## Commands run

| Command | Result |
|---|---|
| `node --version` | `v22.23.3` |
| RED: `node --test test/join.test.mjs test/book.test.mjs` before any server change | 31 tests: 14 pass, 17 fail. All 16 new join/cancel/leave tests failed (routes 405, no links), and the updated shape test failed (`joined` missing) |
| `node --test` after the first implementation | 62 tests: 60 pass, 2 fail. Both were mistakes in my tests (one read the page without the `?joined=` notice; one expected a 4-spot game to be full after 3 joins). I fixed the tests, not the code |
| `TZ=UTC npm test` | 62 tests, 62 pass, 0 fail, 0 skipped |
| `TZ=Europe/Berlin npm test` | 62 tests, 62 pass, 0 fail, 0 skipped |
| Browser journey (below), twice: 1280×800 and 390×844 | All steps as expected |

Before the step there were 46 tests; 62 = 46 + 16 new tests in `join.test.mjs`.

## Browser journey

Setup: `/tmp/m14/launch.mjs` imports the real `createApp` from `server.mjs` with a fixed clock of `2026-10-20T10:00:00Z` (12:00 Berlin) on `127.0.0.1:3914`, because 14:00 had already passed (it was 15:30 CEST). `/tmp/m14/journey.mjs` starts two headless Google Chrome 155 instances with separate `--user-data-dir` profiles (`/tmp/m14/profile-a-*`, `/tmp/m14/profile-b-*`), so there are two cookies, and drives them over CDP with `Emulation.setDeviceMetricsOverride`. Forms are filled through the DOM and submitted with `requestSubmit()`. Each width ran against a fresh app. The app and both Chromes were stopped afterwards (`ss -ltnp` showed nothing on 3914). Public team-02 was not used.

Observed state of the 14:00 slot on `/table/2`. The same at both widths except the scroll width:

| Step | URL / notice | Slot | Profile links | Controls shown |
|---|---|---|---|---|
| 1. A books 14:00, singles, 1 player, `jwosylu` | `?booked=14:00`, "Booked 14:00. See you at the table!" | open, "1 of 2 spots left · jwosylu" | jwosylu | A: Cancel booking, Join |
| 2. B opens the page | — | open, "1 of 2 spots left · jwosylu" | jwosylu | B: Join only (no cancel) |
| 3. B joins as `ben42` | `?joined=14:00`, "Joined 14:00. See you at the table!" | full, "Full · jwosylu, ben42" | jwosylu, ben42 | B: Leave as ben42 (no cancel) |
| 4. A reloads | — | full, "Full · jwosylu, ben42" | jwosylu, ben42 (`https://profile.intra.42.fr/users/ben42`) | A: Cancel booking only (no leave for ben42) |
| 5. B leaves | `?left=14:00`, "Left 14:00. Your spot is open again." | open, "1 of 2 spots left · jwosylu" | jwosylu | B: Join |
| 6. A reloads | — | open, "1 of 2 spots left" | jwosylu | A: Cancel booking, Join |
| 7. A cancels | `?cancelled=14:00`, "Cancelled 14:00. The slot is free again." | free, "Free" | none | none |

- `document.documentElement.scrollWidth` / `clientWidth`: 1265 / 1265 at 1280×800 (scrollbar), 390 / 390 at 390×844 on every step. No horizontal scroll.
- `document.cookie` was empty in both profiles on every step (the cookie is HttpOnly).
- I looked at `m1.4-phone-1-a-booked.jpg`, `m1.4-phone-2-b-joined.jpg` and `m1.4-desktop-3-a-reload.jpg` with the Read tool. The slot rows, links and buttons were readable and nothing overflowed. Ten small JPEGs (about 25–35 KB each) are in `.ai/browser/m1.4-{desktop,phone}-*.jpg` and are not committed. The success notice sits above the list, so it is out of frame in screenshots that are scrolled to 14:00. I checked it from the DOM instead.

## Acceptance mapping

| Acceptance box | Evidence |
|---|---|
| Join takes one spot; one fewer left / Full; login rules as booking | `joining an open game takes one spot and the slot shows Full`, `joining a doubles game shows one fewer spot left`, `a first-time joiner gets a browser cookie`, `refused joins…` (empty, spaces, space inside, HTML); browser steps 3 |
| Refusals: full, same login twice incl. booker, free slot, ended / nonexistent, nothing changed | `refused joins get a clear 4xx message and change nothing` (booker login in two cases, free slot, other table, ended 11:00, 14:15, 12:60, 08:00, table 3, missing fields; JSON snapshot unchanged), `joining a full game or the same login twice is refused` |
| Profile links for booker and joiners, escaped in text and href | `booker and joiners link…`, `logins are escaped in link text and href`; browser step 4 |
| Booker sees joiners on reload, no live updates | `booker and joiners link…` (A's page before and after B joins); browser step 4. No live updates were added |
| Cancel: only the booking browser sees and can use it; other browser, same login elsewhere, no cookie → 403, unchanged | `only the booking browser sees the cancel control…`, `the booking browser can cancel, which frees the slot`, `cancel from another browser, the same login typed elsewhere, or no cookie is refused with 403`, `cancelling a free or ended slot is refused…`; browser steps 2, 3, 7 |
| Leave: only the joining browser; booker and others → 403, unchanged | `only the booking browser sees … leave control`, `the joining browser can leave, which reopens the spot`, `leave from another browser, including the booker, or no cookie is refused with 403`, `leaving as someone not in the game…`; browser steps 4, 5 |
| Ownership tested with direct requests and different cookies; browser id never rendered | All 403 tests send raw POSTs with cookies A, B, C or none. The controls test asserts the A and B ids don't appear in their own pages; `book.test.mjs` already asserts this for the booking page |
| Simultaneous joins for the last spot → exactly one joiner | `simultaneous joins for the last spot make exactly one joiner` (5 parallel requests: one 303, four 409, `joined.length === 1`) |
| Existing behaviour holds | All of `app`, `table`, `book` and `deploy` tests pass under both time zones. The only change to them is the `joined: []` shape assertion. `other writes are still 405` still passes (`POST /`, `POST /table/1`, `PUT/DELETE /book`) |
| Browser journey, two profiles, both widths, no phone scroll | Table above |

## Skipped and limitations

- No hosted check. This step was checked locally only; nothing was deployed.
- The browser journey used a fixed clock through a launcher script in `/tmp`, not `npm start`, because 14:00 had already passed today.
- No physical phone. Only the 390×844 emulated viewport was tested.
- The booking browser also sees the Join form on its own open game. It can add a friend's login, but its own login is refused.
- Not done (out of scope or not asked for): duplicate form fields still use the first value (M1.3 round-1 P3 note, non-blocking); CSRF tokens; persistence (M1.5); live updates. Cancel and leave are refused once a slot has ended, through the shared ended check.
- I did not run `npm run doctor`, `deploy:preview` or `smoke`.

## Round 2 — fix for review round 1 (P1)

- Reviewed head: `34a074cc5c4f722c4ae41384ce5ff1749658097e`, verdict REQUEST CHANGES. The review was committed unchanged as `bf49dc0`.
- Fix commit (new implementation head): `1e47df7187ba10700c8261cf281d299cecf8d9bb`
- Coder: the same Claude subagent, continued by the milestone lead with the review findings. Node `v22.23.3`.

**P1 (GET `/table/2?toString=14:00` crashed Node).** Root cause: the notice texts lived in a plain object, `done`. So `done[k]` was truthy for inherited names such as `toString`, and `.replace` was then called on a function. Fix: `done` is now a `Map`, read with `done.has(k)` and `done.get(key)`, like the existing `actions` and `assets` maps. Only `booked`, `joined`, `cancelled` and `left` can reach rendering.

**Other lookups by user input.** I grepped `server.mjs` for `obj[userValue]` (`grep -nE "\w\[[a-zA-Z_]+\]"`) and found none. The remaining lookups by request data are `actions.get(req.url)` and `assets.get(path)` (both Maps), and `table[1]` and `asset[0]` (fixed indices).

**Test, written first.** The new test in `test/join.test.mjs` is `query keys that are not notices, like toString or __proto__, leave the app serving and bookings unchanged`. It seeds a booking and sends GET `/table/2?<key>=14:00` for each of `toString`, `constructor`, `__proto__`, `hasOwnProperty`, `valueOf` and `nope`. For each one it checks that the table page renders without a status notice. Afterwards it checks that `/api/health` returns 200, that the table page still shows `jwosylu`, and that the bookings JSON is unchanged.
- RED before the fix: `node --test test/join.test.mjs` gave 17 tests, 16 pass and 1 fail. The failure was `TypeError` at `server.mjs:238`, the `.replace` call.
- GREEN after the fix:

| Command | Result |
|---|---|
| `TZ=UTC npm test` | 63 tests, 63 pass, 0 fail, 0 skipped |
| `TZ=Europe/Berlin npm test` | 63 tests, 63 pass, 0 fail, 0 skipped |

**Not re-run in round 2:** the browser journey. The change touches only how success notices are looked up. The normal `?booked|joined|left|cancelled=` notices are still covered by the HTTP tests (`joining an open game…`, `…can cancel…`, `…can leave…` and the M1.3 booking test).
