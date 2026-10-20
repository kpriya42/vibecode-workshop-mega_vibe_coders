# M1.3 validation — Book a slot

- Coder: fresh Claude subagent (Opus 5.5) dispatched by the milestone lead via the Agent tool, using `ponytail` and `superpowers:test-driven-development`.
- Branch: `m1.3-book-slot`. Base: `main` at `632909c7ad8e77a487babbc8e7286e71592c165f` (brief commit `716d527` on top).
- Implementation head: `648d618481dd2b22572d061f6151bf90fecba29e`. Files: `server.mjs`, `public/style.css`, `test/book.test.mjs` (new).
- Node: `v22.23.3` (scratchpad Node 22 on `PATH`; system node is v20). No new dependencies.

## Booking shape (one line, in server.mjs)

`{ table: 1|2, start: 'YYYY-MM-DDTHH:MM' (Berlin wall-clock slot start), spots: 2|4, players: filled count, login: booker's 42 login, browser: booker's server-issued browser id }`

M1.4 can add a `joiners` list next to `login`/`browser` and keep `players` as the filled total, so the display code does not change.

## What was built

- `POST /book` (form fields `table`, `time`, `login`, `spots`, `players`). Success → `303` to `/table/N?booked=HH:MM`, which shows a `role="status"` "Booked HH:MM" notice. Reloading that GET page books nothing.
- Refusals: `400` for bad or missing input, `409` for a slot that has ended or is already booked, `413` for a body over 4096 bytes. Each refusal renders the table page with a `role="alert"` "Not booked: …" message. A bad table renders a small page that links to both tables.
- Validation and check-and-store run in one synchronous function after the body has been read, so two concurrent requests can't both pass the "already booked" check.
- Browser id: `crypto.randomUUID()` in the cookie `browser=…; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`. A valid existing cookie is reused. The page never renders the id. The slot shows the booker's login (escaped).
- Table page form: a time select listing only free, not-ended slots, a login input, singles/doubles, group fills (number), and a Book button. All controls are full-width and 48px high.
- A client that disconnects mid-body no longer crashes the server. The first run of that test failed with `aborted` (an unhandled rejection), and catching the read error fixed it.

## Commands run (all with Node 22.23.3)

| Command | Result |
|---|---|
| `node --test test/book.test.mjs` before implementation (RED) | 1 pass / 12 fail. The only pass was "other writes are still 405", which already held. Every other test failed on 405 (feature missing) |
| `node --test test/book.test.mjs` after adding the disconnect test (RED) | 13 pass / 1 fail (`error: 'aborted'`) |
| `node --test` after the fixes | 45 pass / 0 fail |
| `TZ=UTC npm test` | 45 tests, 45 pass, 0 fail, 0 skipped |
| `TZ=Europe/Berlin npm test` | 45 tests, 45 pass, 0 fail, 0 skipped |
| Ad-hoc check: POST `/book` with a 1 MB body | status `413` (a real response, not a connection error) |

The 45 tests are 31 existing (app, table, deploy) plus 14 new in `test/book.test.mjs`.

## Acceptance mapping

| Acceptance box | Evidence |
|---|---|
| Normal case: singles/1 → open "1 of 2 spots left"; doubles/4 → full; fills 1..spots | tests "singles booking with 1 player…", "doubles booking with 4 players…", refusal cases `players` 0/3 (singles)/5 (doubles); browser journey |
| Clear success feedback; reload doesn't rebook | 303 + `role="status"` "Booked 14:00" asserted; test "reloading the success page does not book again"; browser shows "Booked 15:00. See you at the table!" |
| Login + unguessable HttpOnly browser id stored, never shown | test "the browser gets an unguessable HttpOnly id…" (cookie format, HttpOnly, stored on the booking, absent from HTML, reused on the next request); "two browsers get different ids"; in the browser `document.cookie` was `""` (HttpOnly) |
| Login validation (empty, whitespace, `jw osylu`, `<script>` refused; `jwosylu`, `ben42`, `j-doe` accepted) | tests "refused bookings…" (asserts no raw `<script>` in the response) and "normal logins are accepted" |
| Server refusals: booked, ended, outside hours / off-boundary, table ≠ 1/2, spots ≠ 2/4, fills 0 or > spots, missing/malformed field | tests "refused bookings…" (18 cases + each field missing → 400, `bookings.length === 0`), "an already booked slot is refused" (409). All sent directly with `fetch`, not through the form |
| Concurrent requests → exactly one booking | test "two simultaneous requests…" → statuses `[303, 409]`, one booking |
| Bounded body; oversized refused without crash | test "an oversized body is refused and the app keeps serving" (health 200 and a later booking still works afterwards), the ad-hoc 413 check, and test "a client that disconnects mid-body does not crash the app" |
| Existing behaviour holds | all 31 pre-existing tests pass under both TZ values; test "other writes are still 405" (`POST /`, `POST /table/1`, `PUT /book`, `DELETE /book`) |
| Browser task at 1280×800 and 390×844 | see below |

## Browser evidence

Method: `npm start`-equivalent `PORT=3913 HOST=127.0.0.1 node server.mjs` (real clock, Berlin 15:17 on 2026-10-20), `google-chrome --headless=new --remote-debugging-port=9333 --user-data-dir=/tmp/m13cdp/profile`, driven over CDP by a Node 22 script (`/tmp/m13cdp/journey.mjs`, not committed). Two tabs (A and B) both loaded `/table/2`. Tab A filled and submitted the form by clicking Book. Tab B then submitted its stale form for the same time (a second player racing for the slot). Server and Chrome were stopped afterwards.

- **Desktop 1280×800** (login `jwosylu`, singles, fills 1, time 15:00): A landed on `/table/2?booked=15:00`, notice "Booked 15:00. See you at the table!", slot `open | 15:00 1 of 2 spots left · jwosylu`, 15:00 no longer offered in the select. B landed on `/book` with alert "Not booked: The 15:00 slot on table 2 is already booked." `scrollWidth` 1265 = `clientWidth` 1265 (the viewport minus the scrollbar). Controls 486×48.
- **Phone 390×844** (login `j-doe`, doubles, fills 2, time 15:30): A got "Booked 15:30…", slot `open | 15:30 2 of 4 spots left · j-doe`. B got "Not booked: The 15:30 slot on table 2 is already booked." `scrollWidth` 390 = `clientWidth` 390 on the form, success and refusal pages: no horizontal scroll. Controls 343×48 (tappable).
- I viewed the screenshots with the Read tool: `.ai/browser/m1.3-{desktop,phone}-{1-form,2-booked,3-refused}.jpg` (git-ignored, not committed). The phone full-page form shot shows the slot list, then the "Book a slot" form with stacked full-width controls. The refusal shot shows the red-bordered alert above the list.

## Skipped / not verified / limitations

- Hosted acceptance was not checked (M1.1 is blocked). Everything here is local only.
- The browser journey covered the success and already-booked refusal paths only. The other refusals are covered by HTTP tests, not by the browser.
- The `players` input has a static `max="4"`, so in the browser singles with 3 is caught by the server (clear 400 message), not by the browser.
- The cookie has no `Secure` flag, so it also works over plain-HTTP localhost. Adding `Secure` behind HTTPS is a possible later hardening.
- Bookings are in memory only and are lost on restart (persistence is M1.5). No CSRF protection (out of scope per the brief).
- The login rule is `[A-Za-z0-9-]{1,32}` after trimming surrounding whitespace. Logins are not checked against 42.
- The `?booked=HH:MM` notice is shown for any well-formed time in the URL, even without a matching booking. It is cosmetic only and books nothing.
- I did not run `ponytail-review` or any other review. The independent review is the reviewer's job.

## Round 2 — fix for review finding P2

- Review round 1 (Codex, REQUEST CHANGES on `9957f5b`) was committed unchanged as `aeebadc`.
- New implementation head: `f166811d456a17ecbd1965b6876e7deee2cf6165`. Base is unchanged (`632909c`). Node `v22.23.3`.
- Fix (`server.mjs`, `book()`): the submitted time must equal the canonical `HH:MM` built from its own minute count, in addition to the earlier checks (30-minute boundary, within opening hours). A time like `12:60` computes to 780 minutes, whose canonical form is `13:00`, so it is refused with 400 "12:60 is not a slot within opening hours." and nothing is stored.
- New test: "times that are not a real slot start, like 12:60, are refused and book nothing". It covers `12:60`, `12:90`, `13:60`, `08:60`, `17:90`, `99:00`, `1:00`, `14:00:00` and ` 14:00` (each must get 400 with a time message), checks that no booking is stored, and then checks that `13:00` can still be booked.
- P3 notes (duplicate fields, content type) are left out of this step as instructed.

| Command | Result |
|---|---|
| `node --test test/book.test.mjs` with the new test, before the fix (RED) | 14 pass / 1 fail (`12:60`: expected 400, actual 303) |
| `TZ=UTC npm test` after the fix | 46 tests, 46 pass, 0 fail, 0 skipped |
| `TZ=Europe/Berlin npm test` after the fix | 46 tests, 46 pass, 0 fail, 0 skipped |

Not re-run in round 2: the browser journey. The change only adds a server-side check on input the form never sends, because the select offers only canonical slot times.
