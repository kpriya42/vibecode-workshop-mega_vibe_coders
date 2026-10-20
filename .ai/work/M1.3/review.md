# M1.3 review

Base SHA: 632909c7ad8e77a487babbc8e7286e71592c165f
Head SHA: 9957f5ba744c5c9e26f71532eb8f2e8ff53fab4a
Reviewer session/provider: Codex CLI (codex exec, OpenAI model family), dispatched by the Claude milestone lead

## What I checked

Read AGENTS.md, IDEA.md, PLAN.md, reviewer role, rules, review template, brief and coder validation. Independently inspected the complete committed range (implementation, tests, CSS, brief and validation). `git rev-parse HEAD` returned the head above; initial `git status --short` was empty. Implementation is 648d618481dd2b22572d061f6151bf90fecba29e. No implementation was written by this reviewer.

Every node/npm command used this PATH prefix:

```sh
PATH=/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/node-v22.23.3-linux-x64/bin:$PATH
```

- `node --version`: v22.23.3.
- `TZ=UTC npm test`: 45 passed, 0 failed, 0 skipped.
- `TZ=Europe/Berlin npm test`: 45 passed, 0 failed, 0 skipped.
- These runs include all existing app/table/deploy tests: Berlin summer/winter/DST dates, opening hours, free/open/full/ended display, unknown table, HTML escaping, repository-file/traversal protection, HEAD and unsupported writes. New booking tests also independently rerun stored booking shape, doubles/4 → full, accepted logins jwosylu/ben42/j-doe, browser-id reuse/difference, reload without a second booking, and mid-body disconnect recovery.

### Direct HTTP acceptance checks

Started `node /tmp/m13-review/server.mjs`: a scratch wrapper importing the reviewed createApp, with an in-memory bookings array, revision `review`, fixed clock `2026-10-20T10:00:00Z` (12:00 Berlin), listening on 127.0.0.1:3927. This gives deterministic ended/free slots and uses the real reviewed HTTP server. Stopped it after review.

Ran `python3 /tmp/m13-review/attack.py`, which invokes curl directly for each POST (no browser validation). Command shape: `curl -sS -o /tmp/m13-review/body-… -w '%{http_code}' -H 'Content-Type: application/x-www-form-urlencoded' --data-binary BODY http://127.0.0.1:3927/book`. Default fields: `table=1&time=14%3A00&login=jwosylu&spots=2&players=1`.

| Case | Actual result |
|---|---|
| Valid singles/1 | 303; page shows open, 1 of 2 spots left |
| Same slot again | 409 |
| Ended 09:00 | 409 |
| 09:15, 18:00, 08:30 | 400 each |
| Tables 0, 3, abc | 400 each |
| Spots 3 | 400 |
| Group fills 0, 5, 3 with singles | 400 each; suite additionally covers doubles/5 |
| Login empty, whitespace-only, containing a space, `<script>` | 400 each |
| Each of table/time/login/spots/players omitted | 400 each |
| Body over 4096 bytes | 413; subsequent bookings and health still work |
| URL-encoded body labeled application/json | 303 (non-blocking note below) |
| Duplicate players (`players=1&players=0`) | 303, first value used (non-blocking note below) |
| Malformed time 12:60 | 303: blocking finding below |
| 20 parallel curl requests for table 1, 16:00 | Exactly one 303 and nineteen 409; table HTML contains exactly one corresponding open booking |
| TCP client disconnects with Content-Length 1000 after sending only `table=1` | App stays alive; subsequent health returns 200 |

`curl /api/health` returned 200 with `{"ok":true,"revision":"review"}` after attacks. `/missing` returned HTML 404. The test runs additionally confirm POST /, POST /table/1, PUT /book and DELETE /book remain 405 and original Allow behavior holds.

Browser identity: inspected randomUUID generation, HttpOnly/SameSite/Path cookie flags and booking.browser assignment. The executed tests verify the cookie id is stored on the booking, reused, differs between browsers and is absent from rendered HTML. Direct curl also returned a UUID cookie with HttpOnly. Chrome document.cookie was empty. Successful submissions redirect with 303; two subsequent curl GETs of the success URL worked; executed reload test asserts bookings.length stays one.

HTML escaping: inspected all dynamic render sites. Booking login and refusal messages pass through escape; table/status/time markup is derived from validated values/config. Success query text is constrained to digits/colon by an anchored regex. Direct GET `/table/2?booked=%3Cscript%3E` returned 200 without raw script markup. Login `<script>` is refused, and executed existing escaping test verifies injected booking data is escaped. No injectable query markup found.

### Real browser acceptance

Launched `google-chrome --headless=new --no-sandbox --remote-debugging-port=9347 --user-data-dir=/tmp/m13-review/chrome about:blank`. Chrome emitted read-only home configuration/NSS warnings but ran successfully. Drove it using the inspected scratch CDP script `/tmp/m13cdp/journey.mjs` with Node 22:

```sh
node /tmp/m13cdp/journey.mjs 9347 http://127.0.0.1:3927 1280 800 jwosylu 2 1 /tmp/m13-review/desktop
node /tmp/m13cdp/journey.mjs 9347 http://127.0.0.1:3927 390 844 j-doe 4 2 /tmp/m13-review/phone
```

Each run opens two tabs on /table/2 and clicks the form button. The second tab submits its stale form for the same time.

- Desktop: booked 12:00; success notice “Booked 12:00. See you at the table!”, slot open with “1 of 2 spots left · jwosylu”; selected time removed. Second tab showed “Not booked: The 12:00 slot on table 2 is already booked.” scrollWidth/clientWidth 1265/1265 before, success and refusal. Controls 486×48.
- Phone: booked 12:30; success notice and open slot with “2 of 4 spots left · j-doe”; selected time removed. Second tab showed the corresponding already-booked alert. scrollWidth/clientWidth 390/390 in all three states. Controls 343×48.
- Viewed all six generated screenshots (`/tmp/m13-review/{desktop,phone}-{1-form,2-booked,3-refused}.jpg`). Form labels, stacked controls, notices and slot states are readable; no clipping or horizontal overflow. Chrome was stopped afterwards. Evidence stays under /tmp per this review's file-write restriction; no screenshots added to the checkout.

### Shared contracts and limits

`git diff 632909c HEAD -- test/deploy.test.mjs scripts package.json package-lock.json` produced no output. Port/start/health contracts remain intact; no dependencies added. Inspected the full added content and `git log --format=full 632909c..HEAD`: no secrets/private connection details or attribution trailers found.

Skipped: hosted deployment/acceptance (M1.1 blocked), physical phone use, restart/redeploy persistence (M1.5), joining/cancellation (M1.4), CSRF (explicitly out of scope). Browser covers successful and duplicate booking; other refusals were exercised over HTTP. No claim of hosted acceptance. Only review.md was changed; session/context writes were omitted to obey the explicit reviewer restriction.

## Findings

1. **P2 — blocking: malformed wall-clock minutes create invisible bookings.** `server.mjs:93` (also format validation at line 84). At the fixed clock above, send `table=1&time=12%3A60&login=jwosylu&spots=2&players=1` to POST /book. Actual: 303 to `/table/1?booked=12:60`; the code stores the literal start `2026-10-20T12:60`. No slot for that key is ever rendered. A subsequent request for `13:00` also returns 303, despite the arithmetic treating both times as the same minute. This violates the brief's refusal of malformed fields and non-slot times, and falsely reports a booking that cannot be seen. Required outcome: reject invalid hour/minute components and any time that is not an actual configured slot with a clear 4xx, without storing anything. Cover invalid-minute cases such as 12:60 and 12:90 in regression validation.

2. **P3 — non-blocking note: duplicate fields silently use the first value.** `server.mjs:77`. `table=1&time=15%3A00&login=jwosylu&spots=2&players=1&players=0` returns 303, ignoring the second players value. Consider requiring exactly one value for each booking field to avoid ambiguous requests. The brief does not explicitly define duplicate-field handling, so this does not independently block approval.

3. **P3 — non-blocking note: content type is ignored.** `server.mjs:133`. A valid URL-encoded body sent with `Content-Type: application/json` returns 303 and books. Consider refusing unsupported media types clearly (e.g. 415) before parsing. Explicit content-type rejection is not an acceptance requirement, so this does not independently block approval.

## Verdict

REQUEST CHANGES. Normal bookings, concurrency, body bounds, identity storage, regression suites and both browser layouts passed, but malformed times currently book successfully and disappear from the displayed schedule. Re-review is required on the corrected head SHA. This verdict covers only the head named above and local checks.

## Round 2

Base SHA: 632909c7ad8e77a487babbc8e7286e71592c165f
Head SHA: 22726525f22cf48f14c44e3f3624299b580c1a61
Reviewer session/provider: Codex CLI (codex exec, OpenAI model family), dispatched by the Claude milestone lead

### What I checked

`git rev-parse HEAD` confirmed the full head above; initial `git status --short` was empty. Read IDEA.md, PLAN.md, .ai/rules.md, the reviewer role/template, brief, round-1 review and coder validation including Round 2. Inspected `git diff 9957f5b HEAD`: only the round-1 review, validation update, server time check and regression test changed. Rechecked the full step range `git diff 632909c7ad8e77a487babbc8e7286e71592c165f HEAD`, including booking validation/storage, request handling, rendering, CSS and tests. The added canonical-time comparison prevents minute overflow aliases before any booking is stored; existing valid slots retain the same path. No new blocking issue found. Deployment scripts, package.json, lockfile and deployment tests have no changes from base.

All node/npm commands used:

```sh
export PATH=/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/node-v22.23.3-linux-x64/bin:$PATH
node --version
TZ=UTC npm test
TZ=Europe/Berlin npm test
node /tmp/m13-r2-http.mjs
```

Actual results: Node v22.23.3; both timezone runs passed 46 tests, 0 failures, 0 skipped (logs: `/tmp/m13-r2-utc.log`, `/tmp/m13-r2-berlin.log`). Existing app/table/deploy and booking tests all passed, including identity, reload, validation, concurrent booking and disconnect recovery.

The scratch HTTP script imported the reviewed createApp, started the real app on spare port 38291 at 127.0.0.1, with an inspectable in-memory bookings array and fixed clock `2026-10-20T10:00:00Z` (12:00 Berlin). It sent direct fetch POSTs to `/book` using URLSearchParams, bypassing browser constraints. Default fields were table=1, login=jwosylu, spots=2, players=1.

- Each time `12:60`, `12:90`, `24:00`, `1:00`, `14:00:00`, ` 14:00`, `14:00 `, `14:00\n`, `14:00\u0000`, `13:60`, `08:60`, `17:90`, `99:00`, `00:00`, `23:30`, `14:15`, empty string, `１４:００`, `14:0`, and `-1:00` returned 400 with a “Not booked” message. The script asserted unchanged storage after every refusal; bookings remained empty throughout.
- Valid `13:00` returned 303 and stored exactly one booking; following the redirect showed the slot open with “1 of 2 spots left · jwosylu”. Repeating it returned 409 and left the single booking unchanged.
- Twenty simultaneous requests for 16:00 returned exactly one 303 and nineteen 409; exactly one matching booking was stored.
- A body containing a one-million-character login returned 413 and stored nothing. POST `/` returned 405 with `Allow: GET, HEAD`.
- Afterwards health returned 200 with `{ "ok": true, "revision": "round2-review" }`, and valid 17:30 still booked with 303. All assertions passed; the script stopped the app in its finally block.

Skipped: a new browser run, because the round-2 change affects only server validation of values the canonical time select never generates; rendering/CSS are unchanged since round 1's desktop and phone review. Hosted acceptance/deployment remains unverified (M1.1 blocked). Physical phones, persistence/redeploy (M1.5), joining/cancellation (M1.4), and CSRF remain outside this review. Round-1 P3 duplicate-field and content-type behavior was inspected as unchanged, not re-tested; both notes remain non-blocking. Scratch files stayed under /tmp. Session/context updates are omitted under the explicit instruction to modify only this review file. No implementation changes, commit, push or merge were performed.

### Findings

Round-1 P2 is resolved: malformed times are refused with 400 and create no hidden or aliased bookings. No new findings. Round-1 P3 notes remain non-blocking.

### Verdict

APPROVE for exact head `22726525f22cf48f14c44e3f3624299b580c1a61`. The blocking malformed-time defect is fixed, both timezone suites pass, and direct HTTP checks confirm refusals leave storage unchanged while valid bookings and regression cases still work. Approval covers local checks only.
