# M1.2 validation — Today's slots per table

- Coder: Claude subagent (Opus 5.5) dispatched by the milestone lead via the Agent tool, skills `ponytail:ponytail` and `superpowers:test-driven-development`.
- Branch: `m1.2-table-slots`
- Base: `0a683012c361115649b577308cc8249a25968869` (main; brief commit `188baf9` on top)
- Implementation head: `0c3b6ae9f36a93f3386fdcc1a960c47a05390801`
- Node used: v20.11.1 (local). The guest uses Node 22 and `package.json` says `>=22`; nothing was run on Node 22.

## Changes

- `server.mjs`: `createApp` takes `now` (clock), `bookings`, `opens`, `closes` (hours, default 9 and 18). `GET /table/1|2` renders today's slots; every other 404 is now a small HTML page linking to tables 1 and 2.
- `public/style.css`: slot list styles (free / open / full / ended).
- `test/table.test.mjs`: 10 new tests. `test/app.test.mjs` and `test/deploy.test.mjs` untouched.

Booking shape: `{ table: 1|2, start: 'YYYY-MM-DDTHH:MM' (Berlin wall-clock slot start), spots: 2|4, players: filled count }`. M1.4 can swap `players` for a list and read `players.length`.

## Commands and results

| Command | Result |
|---|---|
| `node --test test/table.test.mjs` before implementing | 9 fail, 1 pass (escape test passed vacuously; see mutation check) — failures were 404s for the missing route |
| `node --test test/table.test.mjs` after implementing | 10 pass, 0 fail |
| Mutation: removed `escape()` around `booking.spots`, reran table tests, restored | escape test failed (1 fail, 9 pass), proving it catches unescaped output |
| `TZ=UTC npm test` (on head `0c3b6ae`) | 31 tests, 31 pass, 0 fail, 0 skipped |
| `TZ=Europe/Berlin npm test` (on head `0c3b6ae`) | 31 tests, 31 pass, 0 fail, 0 skipped |
| `curl` on running app: switch link of `/table/1` → `/table/2` and back | both 200; `/api/health` 200 |

## Browser evidence (headless Chrome, `/usr/bin/google-chrome --headless=new`)

App started with `PORT=3123 HOST=127.0.0.1 node server.mjs` (real clock, ~14:48 Berlin on 20 Oct 2026). A second seeded instance on port 3124 used `createApp` with clock `2026-10-20T10:00:00Z` and bookings (table 1: 13:00 1/2, 14:00 4/4; table 2: 15:30 3/4). Both were stopped afterwards. Screenshots are in `.ai/browser/` (git-ignored):

- `m1.2-table1-desktop.png`, `m1.2-table2-desktop.png` (1280x800): a centred column with a "Switch to table N" link, the heading "Table N", "Tuesday, 20 October 2026 · German time", then slot rows. Rows up to 14:00 are dimmed and dashed with "Ended".
- `m1.2-table1-phone.png`, `m1.2-table2-phone.png` (390x844): the same single column, rows full-width with ~48px height (tappable size), time on the left and status on the right. Nothing clipped at the right edge.
- `m1.2-table1-phone-tall-live.png` (390x1400, scrollbars not hidden): all 18 rows, 09:00–14:00 ended, 14:30–17:30 green "Free". No horizontal scrollbar.
- `m1.2-seeded-table1-phone-tall.png`, `m1.2-seeded-table2-phone-tall.png`, `m1.2-seeded-table1-desktop-tall.png` (scrollbars not hidden): 09:00–11:30 ended, 12:00 free; table 1 shows 13:00 orange "1 of 2 spots left" and 14:00 grey "Full"; table 2 shows 15:30 "1 of 4 spots left". No horizontal scrollbar.
- `m1.2-table3-desktop.png`, `m1.2-table3-phone.png`: "Not found / This page or table does not exist." with links to table 1 and table 2.

Overflow was checked by inspecting screenshots taken without `--hide-scrollbars`; I did not measure `scrollWidth` in the DOM. Switching tables was checked by following the link href with curl, not by clicking in a browser.

## Acceptance mapping

| Acceptance | Evidence |
|---|---|
| `/table/1`, `/table/2` 200 HTML, 18 slots 09:00–17:30, hours from config | tests "table pages list 18…", "opening hours are configurable"; screenshots |
| free / open with spots left / full from seeded bookings | test "bookings show open…" (also checks other table's and other day's bookings don't leak); seeded screenshots |
| ended slots distinct; in-progress slot not ended | tests "summer time" (12:00 not ended at 12:00) and "winter time" (11:00 not ended at 11:00); dashed/dimmed rows in screenshots |
| `2026-10-20T10:00Z` | test "Berlin summer time…" |
| `2026-12-01T10:00Z` | test "Berlin winter time…" |
| `2026-10-25T08:00Z` | test "DST end day…" |
| `2026-10-20T23:30Z` | test "after Berlin midnight…" (date 21 October, nothing ended) |
| `2026-10-20T16:30Z` | test "after closing…" (all ended + "Closed for today" notice) |
| All TZ cases under `TZ=UTC` and `TZ=Europe/Berlin` | both full runs above |
| Link to other table | test "table pages list…" asserts `href="/table/<other>"`; curl follow |
| Unknown tables 404 HTML with link | test "unknown tables…" for `/table/3`, `/table/0`, `/table/abc`, `/table/`, `/table/1/x` |
| Existing behaviour | `test/app.test.mjs` (3) and `test/deploy.test.mjs` pass unchanged |
| HTML escaping of data | test "rendered booking data is HTML-escaped" + mutation check |
| Browser task | section above |

## Limits and skipped

- Not run on Node 22 and not hosted (M1.1 blocked); local only.
- Ended/not-ended compares Berlin wall-clock minutes; marked with a `shortcut:` comment — only wrong if opening hours ever cover the 02:00–03:00 DST jump.
- Non-table 404s (e.g. `/.env`) now also return the HTML not-found page instead of plain "Not found"; status stays 404 and the traversal tests pass.
- Booking times are matched by exact `start` string; malformed booking data is not validated (no write path exists yet; M1.3 owns input validation).
