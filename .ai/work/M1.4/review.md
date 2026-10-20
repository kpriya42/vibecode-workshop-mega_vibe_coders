# M1.4 review

Base SHA: 279eb160bc10e3c56f27142da66ff0acf1aac3b1
Head SHA: 34a074cc5c4f722c4ae41384ce5ff1749658097e
Reviewer session/provider: Codex CLI (codex exec, OpenAI model family), dispatched by the Claude milestone lead

## What I checked

`git rev-parse HEAD` confirmed the full head above on the assigned checkout; initial `git status --short` was empty. Read AGENTS.md, reviewer role, review template, IDEA.md proof journey, PLAN.md, .ai/rules.md, M1.4 brief and validation, and M1.3 review including its corrected-head approval. Independently inspected the complete committed base-to-head diff: brief, validation, server, CSS, booking test adjustment and all 213 lines of new join tests. Implementation commit: e84f7a11122081a17a16ee59e2f93a882eb6b3d9. This reviewer did not write implementation code.

All node/npm commands used this prefix:

```sh
PATH=/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/node-v22.23.3-linux-x64/bin:$PATH
```

- `node --version`: v22.23.3.
- `TZ=UTC npm test`: 62 passed, 0 failed, 0 skipped; `/tmp/m14-review-utc.log`.
- `TZ=Europe/Berlin npm test`: 62 passed, 0 failed, 0 skipped; `/tmp/m14-review-berlin.log`.
- Existing suites rechecked M1.2 Berlin dates/DST/opening hours and slot states, M1.3 booking validation, concurrent booking, cookie storage/reuse, body bounds/disconnect, 404s, traversal/repository-file protection, HEAD, unsupported writes and deployment contracts. The M1.3 malformed-time correction remains present and passes.
- `git diff 279eb160 HEAD -- package.json package-lock.json scripts test/deploy.test.mjs`: empty. No new dependency, deployment-contract change, secret or attribution trailer found in the committed range/log.

### Independent direct HTTP checks

Ran `node /tmp/m14-review/attack.mjs`, a reviewer-written scratch script importing the reviewed `createApp`, listening on an ephemeral 127.0.0.1 port with inspectable in-memory bookings and fixed time `2026-10-20T10:00:00Z` (12:00 Berlin). Requests used real HTTP fetch, URLSearchParams and manual redirects, bypassing browser constraints. Bookings and joins initially obtained actual server-issued cookies A and B. Every refusal below asserted unchanged serialized storage and a clear refusal notice. The app was closed in finally.

| Case | Actual result |
|---|---|
| A books doubles, one group member; B joins | 303 each; separate issued cookies |
| Join using booker's login `jwosylu` or `JWOSYLU` | 409 each |
| Join existing `ben42` as `BEN42` from a different cookie | 409 |
| Cancel with no cookie, unrelated UUID cookie, forged all-zero UUID, `browser=bad`, `browser=%00`, or 36 hyphens | 403 each |
| Leave ben42 with each of those cookies | 403 each |
| Joiner's cookie cancelling booking; booker's cookie leaving ben42 | 403 each |
| Cancel from another browser while typing `jwosylu` | 403; typed login grants no right |
| B leaves `absent` or case variant `BEN42` | 404 each, unchanged; exact stored `ben42` succeeds later |
| Join free 15:00 / ended 11:00 | 409 each |
| Join nonexistent table 3 / malformed 12:60 | 400 each |
| Join with empty login, internal space, or `"><img src=x onerror=alert(1)>` | 400 each, no stored attacker markup |
| Book, cancel, leave with 12:60 | 400 each |
| Fill doubles with two more joiners, then extra join | First two 303; extra 409 |
| B leaves full game | 303; join count drops by one, GET shows 1 of 4 spots left |
| A cancels | 303; storage empty, GET renders 14:00 Free |
| Rebook singles, send 20 concurrent distinct joins for last spot | Exactly one 303, nineteen 409, exactly one stored joiner |
| PUT/DELETE/PATCH to each of /join, /cancel, /leave | 405 in all nine cases |
| GET /missing and /api/health after attacks | 404 and 200 |

Checked all stored browser ids absent from every POST response body and GET table HTML for anonymous, A and B requests. Cookie parsing/ownership comparisons and rendering were inspected directly. Executed suite additionally verifies escaped text AND href for malicious seeded booker/joiner logins; normal HTTP input refuses that markup before storage. Profile links use the required intra URL. Case-sensitive leave lookup returns 404 for a differently cased name, while the generated leave form submits the stored spelling; this does not bypass ownership or block the normal journey.

### Independent browser journey

Inspected the existing `/tmp/m14/journey.mjs` CDP driver and copied it to `/tmp/m14-review/journey.mjs`, changing screenshot/profile paths to reviewer-owned /tmp locations and adding `--no-sandbox`. Ran the real reviewed server through the inspected fixed-clock launcher `/tmp/m14/launch.mjs` on 127.0.0.1:3928, with a fresh app for each viewport:

```sh
node /tmp/m14/launch.mjs 3928
node /tmp/m14-review/journey.mjs 1280 800 3928
# stop and restart the app before the next viewport
node /tmp/m14-review/journey.mjs 390 844 3928
```

Each run launched two headless Chrome processes with separate fresh profiles under `/tmp/m14-review/profile-{a,b}-{desktop,phone}`. Forms were filled and submitted through the DOM using requestSubmit. Actual results were identical at both widths:

1. A booked table 2, 14:00, singles/1, jwosylu: open, 1 of 2 spots left; jwosylu profile link; A had cancel and join controls.
2. B opened the page: join available, no cancel.
3. B joined as ben42: Full; both correct intra profile links; B had leave only.
4. A reloaded: Full with ben42 profile link; A had cancel only, no leave for B.
5. B left: open, 1 of 2 spots left; ben42 removed, join available.
6. A reloaded and cancelled: Free; no player links or slot controls.

Success notices matched each action. At all seven recorded states scrollWidth/clientWidth was 1265/1265 on desktop and 390/390 on phone; no horizontal overflow. document.cookie was empty throughout (HttpOnly). Logs: `/tmp/m14-review/{desktop,phone}.log`. Ten screenshots were generated under /tmp; visually inspected desktop A reload, phone A booked, phone B joined and phone B left. Slot states, profile links and owner controls are readable without clipping. Screenshots are scrolled to 14:00; notices were checked in DOM. Both Chrome processes were stopped after each run and app stopped afterwards; `ss -ltnp 'sport = :3928'` showed no listener.

### Crash reproduction and limits

Started a separate fixed-clock app, then ran:

```sh
curl -sS 'http://127.0.0.1:3928/table/2?toString=14:00'
```

Actual: curl error 52, Empty reply from server. Node terminated with `TypeError: done[key].replace is not a function` at server.mjs:238. Full trace: `/tmp/m14-review/crash.log`. This failure is outside the green automated coverage and blocks approval.

Skipped: hosted deployment/acceptance, physical phone use, restart/redeploy persistence (M1.5), CSRF tokens, live updates, doctor/deploy:preview/smoke. No claim of hosted acceptance. Existing non-blocking M1.3 duplicate-field/content-type notes remain outside this step's requirements. Scratch files and Chrome profiles stayed under /tmp. Only this review file was modified; session/context updates were omitted to obey the explicit restriction. No commit, push, merge or implementation fix performed.

## Findings

1. **P1 — blocking: unauthenticated query can terminate the app and discard in-memory bookings.** `server.mjs:236` and `server.mjs:238`. GET `/table/2?toString=14:00` selects inherited `Object.prototype.toString` because `done[k]` is truthy. Calling `.replace()` on that function throws an uncaught TypeError in the async HTTP listener, terminating Node (reproduced above). Anyone can interrupt all users; current in-memory bookings are lost on restart. This is introduced by the new success-notice lookup and violates the required working table-page/booking journey. Required outcome: only explicitly supported notice keys may reach string rendering; arbitrary query keys, including inherited object names, must leave the app alive and existing bookings unchanged. Validate the malicious request, subsequent health/table requests and retained booking state.

No access-boundary bypass found in the exercised cases. The normal join/leave/cancel journey, race handling, browser-id secrecy, escaping and both layouts passed.

## Verdict

REQUEST CHANGES for head 34a074cc5c4f722c4ae41384ce5ff1749658097e. Ownership and normal acceptance checks passed, but a single unauthenticated GET crashes the app. Re-review the corrected SHA before merge. This review covers local checks only.

## Round 2

Base SHA: 279eb160bc10e3c56f27142da66ff0acf1aac3b1
Head SHA: 0e2e3b34e35a17c82edb59bf1008fcaa63769a76
Reviewer session/provider: Codex CLI (codex exec, OpenAI model family), dispatched by the Claude milestone lead

### What I checked

`git rev-parse HEAD` confirmed the exact head above; the initial working tree was clean. Read the reviewer role, review template, IDEA.md, PLAN.md, .ai/rules.md, step brief, original review and validation including Round 2. Inspected `git diff 34a074c HEAD` (fix, regression test and review/validation evidence) and re-scanned the complete `git diff 279eb160bc10e3c56f27142da66ff0acf1aac3b1 HEAD`, including server actions/rendering, CSS and tests. This session did not write implementation code.

All node/npm commands used the Node 22 PATH prefix recorded in round 1. Independent commands and actual results:

- `TZ=UTC npm test`: 63 passed, 0 failed, 0 skipped. Log: `/tmp/m14-r2-utc.log`.
- `TZ=Europe/Berlin npm test`: 63 passed, 0 failed, 0 skipped. Log: `/tmp/m14-r2-berlin.log`.
- `node /tmp/m14-r2-check.mjs`: passed against the actual `createApp`, listening on an ephemeral loopback port, fixed clock `2026-10-20T10:00:00Z`. The scratch driver used real HTTP requests and manual redirects, created a booking via POST, retained the server-issued owner cookie, and inspected both HTTP output and the in-memory booking array. Log: `/tmp/m14-r2-http.log`.

Direct HTTP checks:

- GET `/table/2` with each query key `toString`, `constructor`, `__proto__`, `hasOwnProperty`, `valueOf`, `unknown`, and each valid notice `joined`, `booked`, `cancelled`, `left`, all with value `14:00`: every response 200. Valid notices rendered the success status. Also tested `%E0%A4%A=14:00`, `joined=%E0%A4%A`, a bare `%`, `joined=%00`, and `toString=14:00&joined=14:00`. After **each** request, the server was still listening, `/api/health` returned 200, the table still rendered jwosylu, and the entire seeded booking JSON was unchanged.
- Seven malformed/unusual cookie strings, including invalid percent encodings, prototype names, a quoted value and duplicate browser fields: GET 200; after each, health 200 and booking JSON unchanged.
- Sixteen raw POST probes across `/book`, `/join`, `/cancel`, `/leave`, using malformed percent encodings in table/time/login and malformed/prototype-name field keys. Responses were 400 except cancel with malformed unused login (403) and leave with unknown malformed login (404). After each, health 200, seed still rendered and booking JSON unchanged.
- Normal booking and join obtained actual distinct cookies and returned 303; the join occupied the final spot. Cancel from the joiner's browser or without a cookie returned 403. Leave from the booker's browser or without a cookie returned 403. Every refused operation preserved the joined booking JSON. Correct joiner leave returned 303 and reopened one of two spots; correct owner cancel returned 303 and removed the booking. Final health was 200.

Crash-path scan: notice/action/asset lookups use Maps; no remaining object lookup by a request-controlled key was found. Cookie matching does not percent-decode or throw on malformed values. URL construction has its own catch; query/body URLSearchParams tolerate malformed encodings. Body reads are bounded and disconnects caught. Validated actions throw Refusal inside their handler catch, and stored booking/joiner types originate from validated strings/numbers. Unexpected non-Refusal exceptions are still rethrown and table rendering remains outside a general catch, but no request-controlled route to such an exception was found in this scan or the probes. The Map fix specifically prevents inherited names from selecting non-string notice values; the new regression test covers that cause.

### Skipped checks and limits

No new browser run: round 1 already independently exercised both viewport sizes and two browser profiles; the round-2 runtime diff changes only notice lookup, with no markup/CSS/control changes. HTTP checks rechecked valid notices and the normal flow. No hosted acceptance, physical phone, deployment, restart/redeploy persistence (M1.5), doctor, deploy:preview or smoke. This approval covers local behavior only. The scratch server closed in the driver's finally block; no external processes were killed. Scratch files stayed under /tmp. Only review.md was changed; session/context handoffs were omitted to follow the explicit single-file instruction. No commit, push or merge performed.

### Findings

Round-1 P1 is resolved. The formerly crashing GET and all requested inherited-name probes leave the app alive and bookings intact. No additional blocking finding or request-controlled crash found. The existing round-1 non-blocking limitations remain unchanged.

### Verdict

APPROVE for exact head 0e2e3b34e35a17c82edb59bf1008fcaa63769a76. Both 63-test time-zone runs, independent crash probes, ownership boundaries and normal join/leave/cancel regression passed.
