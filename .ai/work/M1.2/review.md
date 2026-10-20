# M1.2 review

Base SHA: 0a683012c361115649b577308cc8249a25968869
Head SHA: 8fa3579fb6c174407a722f9bb6d3063ed5f401f8
Reviewer session/provider: Codex CLI (codex exec, OpenAI model family), dispatched by the Claude milestone lead

## What I checked

Read AGENTS.md, IDEA.md, PLAN.md, .ai/context.md, .ai/roles/reviewer.md, .ai/rules.md, .ai/templates/review.md, the M1.2 brief and validation.md. Independently inspected the full `git diff 0a68301 HEAD`, rereading the code/test diffs separately where combined output was truncated. `git rev-parse HEAD` confirmed the full head above; branch is `m1.2-table-slots`, and the checkout was initially clean. I did not write the implementation.

Commands and actual results (Node v20.11.1):

- `TZ=UTC npm test`: 31 passed, 0 failed, 0 skipped.
- `TZ=Europe/Berlin npm test`: 31 passed, 0 failed, 0 skipped.
- `git diff --exit-code 0a68301 HEAD -- test/app.test.mjs test/deploy.test.mjs package.json package-lock.json scripts/`: exit 0, all unchanged. Existing repository-file/traversal, method handling and deployment tests passed in both runs. Startup still defaults to port 3000 and binds to 0.0.0.0; no new runtime dependencies.
- `git diff --check 0a68301 HEAD`: exit 0.
- Inspected every changed file and `git log 0a68301..HEAD --format=fuller`: no secrets, private connection details or attribution trailers found.

Started the real app using `PORT=3124 HOST=127.0.0.1 APP_REVISION=review-m12 npm start`. Exercised every requested route with `curl -sS -o /tmp/m12-review-body -w ...`: `/table/1`, `/table/2` and `/` returned 200 HTML; `/style.css` returned 200 CSS; `/api/health` returned 200 JSON with exactly `{"ok":true,"revision":"review-m12"}`. `/table/3`, `/table/0`, `/table/abc` and `/table/` returned 404 HTML. Independently fetched each 404 body and asserted a real table link and no error/stack trace. `curl -i -X POST .../table/1` returned 405 with `Allow: GET, HEAD`; `curl -I .../table/1` returned 200 HTML headers without a body. Followed both switch hrefs by HTTP and later clicked them in Chrome. Stopped the app with SIGINT; subsequent curl failed with connection refused. All temporary createApp servers were closed, and Chrome's CDP instance was closed through `Browser.close`.

Acceptance mapping:

| Brief requirement | Independent evidence |
|---|---|
| Both table pages, all default slots, configurable hours | Passing table tests and live HTML; separate inline Node/assert script called `createApp({now, ...})` on an ephemeral port, counted 18 rows, and confirmed custom 10–12 hours yield four rows. Code generates starts every 30 minutes, 09:00 through 17:30 by default. |
| Free/open/full, booking boundary and isolation | Re-ran seeded booking tests: 14:00 open with 1 of 2 spots left, 15:00 full, other-table and previous-day bookings do not leak. Separate script also asserted full and other-table isolation. Documented booking start is a Berlin wall-clock `YYYY-MM-DDTHH:MM` string; numeric players is the agreed filled count. Production defaults to empty bookings. No write route or persistence introduced. |
| Ended versus current/in-progress | Separate script counted ended rows at exact boundaries and within a slot; 12:29:59 Berlin leaves 12:00 unended, 12:30:00 ends it. Ended rows have a distinct status and dashed/dimmed presentation; no slot has a booking control in this display-only step. |
| Every specified Berlin clock case | Separate inline Node/assert script: `2026-10-20T10:00Z` → 20 October, 6 ended; `2026-12-01T10:00Z` → 1 December, 4 ended; `2026-10-25T08:00Z` → 25 October, 0 ended; `2026-10-20T23:30Z` → 21 October, 0 ended; `2026-10-20T16:30Z` → 20 October, all 18 ended plus Closed for today notice. All had 18 rows. Additional spring-transition probe `2026-03-29T07:00Z` → 29 March, 0 ended. Both full TZ suite runs also passed. |
| Switch table and unknown-table recovery | HTTP checks above; browser click checks below. Fixed HTML 404 contains table links and does not interpolate the requested path. |
| HTML escaping | Inspected all interpolation sites. Table IDs/statuses are internally constrained, dates are Intl output, and booking-derived labels are escaped. Separate hostile `spots` probe containing `<`, `&`, both quote characters and `<script>` asserted numeric HTML entities and absence of a raw script element. Current players/start fields are not rendered as raw HTML. |
| Browser desktop and phone | Captured and personally viewed both tables at 1280×800 and 390×844 with headless Chrome; measured the live DOM and clicked navigation in both directions at both widths. Details below. |

Browser command pattern: `google-chrome --headless=new --disable-gpu --user-data-dir=/tmp/review-m12-chrome --window-size=WIDTH,HEIGHT --screenshot=/tmp/review-m1.2-tableN-SIZE.png http://127.0.0.1:3124/table/N`. Four screenshots: `/tmp/review-m1.2-table1-desktop.png`, `/tmp/review-m1.2-table2-desktop.png`, `/tmp/review-m1.2-table1-phone.png`, `/tmp/review-m1.2-table2-phone.png`. Screenshots stay outside the repository to comply with the explicit instruction to modify only review.md; the coder's existing `.ai/browser/` evidence was not changed.

Observed a centered desktop column and a readable phone column, correct table headings, wrapped date text at phone width, dashed/dimmed ended rows and an accessible switch link. Vertical scrolling is necessary for all 18 slots. Using a second headless Chrome with `--remote-debugging-port=9224`, a temporary Python standard-library CDP client set viewport metrics, navigated to each table, measured layout, and clicked `nav a`. For each desktop page, document `scrollWidth == clientWidth == 1265`; for each phone page, both were 375 (15px vertical scrollbar). Every page contained 18 rows, each at least 48px high; switch links measured 43px high. All four browser clicks reached the other table heading. No horizontal overflow.

Skipped checks and limits: Node 22 and hosted acceptance were not run; hosting remains blocked on M1.1. Initial Chrome invocation failed to create its default profile; explicitly using a writable `/tmp` profile succeeded, despite read-only config/NSS warnings. No independent screenshots of seeded open/full states or the 404 page were taken; those states were verified through code and HTTP/tests. The implementation's documented wall-clock shortcut assumes daytime opening hours; hours spanning the repeated/missing DST hour are not covered by this approval. Malformed booking validation and typed login display belong to later write steps. No additional session/context files were changed, per this review's explicit file restriction.

## Findings

No blocking defects found against the M1.2 brief and its specified clock cases. No required code changes.

## Verdict

APPROVE

The exact head `8fa3579fb6c174407a722f9bb6d3063ed5f401f8` satisfies the locally reviewable M1.2 acceptance criteria: both test environments pass, route/security/deployment contracts hold, clock and escaping probes pass, and live desktop/phone rendering and navigation were independently verified. Approval is local to this SHA and the stated limits; it does not approve a hosted journey or deployment.
