# M1.9 review

Base SHA: 4baee8c6098850c3addd7e718a3665dd5b3ffa77
Head SHA: fa68a4bebac72863cfd2fc8393b8b45befd30d8d
Reviewer session/provider: Codex CLI (codex exec, OpenAI model family), dispatched by the Claude milestone lead

## What I checked

Confirmed the exact head with `git rev-parse HEAD`; initial worktree was clean. Read AGENTS.md, reviewer role and template, IDEA.md, PLAN.md, .ai/rules.md, M1.9 brief/sketch and validation, and M1.4 and M1.8 reviews. Inspected the full `git diff 37c35b9 HEAD`: brief, validation, server, CSS and all test changes. Comparison baseline is merged main 37c35b98df7e5979ac7b5f4c52525a681ae22135. This independent session did not write implementation code. `git diff --check` passed. Persistence implementation, deployment scripts, package/lockfile and health contract are unchanged.

Commands began with the requested Node PATH assignment; final runs exported that PATH through the command shell. `node --version` confirmed v22.23.3. An initial browser attempt accidentally used the shell's older Node for a later command and failed with `WebSocket is not defined`; it was superseded by all three successful Node 22 runs below. The initial timezone runs were likewise superseded by explicit Node 22 runs.

- `TZ=UTC npm test`: 87 passed, 0 failed, 0 skipped; `/tmp/m19-review-utc.log`.
- `TZ=Europe/Berlin npm test`: 87 passed, 0 failed, 0 skipped; `/tmp/m19-review-berlin.log`.
- Existing suites retain server booking/join validation, ownership, concurrent attempts, Berlin time/DST, persistence failures/restart and deployment contracts. Changed tests preserve per-slot action matching, absence of actions on full/ended slots and absence of panels/time dropdowns.

### Direct HTTP security and validation

Ran reviewer-written `/tmp/m19-review/probe.mjs` against the actual createApp on an ephemeral loopback port, fixed clock 2026-10-20T10:00:00Z. Created booking and join over HTTP with actual server-issued distinct browser cookies. Log: `/tmp/m19-review/http.log`.

- Twelve forged-login ownership probes: each of `login=jwosylu` and `login=ben42`, without browser cookie, with unrelated browser cookie, and with the other participant's browser cookie for the requested action. Cancel and leave all returned 403 and preserved the entire serialized booking state. Real joiner leave with `login=jwosylu` and real booker cancel with `login=ben42` each returned 303, confirming the login cookie neither grants nor revokes ownership. The first draft of the probe mistakenly expected a legitimate joiner leave to fail; corrected the test matrix before the final successful run.
- Eight malicious cookie values: markup/event handler, quote, 10,000 characters, cookie syntax `foo; Path=/; browser=bad`, encoded markup, malformed percent encoding, embedded equals and quoted login. GET remained 200, no injected img markup appeared, prefill was empty except valid `foo` before the semicolon (a cookie separator), subsequent health was 200. No percent decoding is performed. Source inspection confirms strict 1–32 allowed-character matching before prefill and escaping at rendering; successful POST cookies use the already validated login.
- Thirty-nine junk/prototype query probes across `/`, `/table/1`, `/table/2`: toString, constructor, __proto__, hasOwnProperty, valueOf, unknown, malformed percent key/value, bare percent, NUL, mixed inherited/valid notice and encoded markup. Every GET returned 200, subsequent health returned 200, no script/b markup was injected and booking JSON remained identical. The M1.4 crash remains fixed by Map lookup.
- Twelve direct POST probes across Book and Join with empty, whitespace, internal-space, markup, 33-character and percent-encoded-looking logins: all 400, message points to Login at the top, no booking/join mutation. These bypass native browser validation.

### Browser, layout and persistence

Inspected the coder's scratch CDP driver and adapted it into reviewer-owned `/tmp/m19-review/journey.mjs`, with independent profiles/data/screenshots, an explicit boolean mobile metric, and restart verification. Ran:

```
node /tmp/m19-review/journey.mjs 390 844 mobile
node /tmp/m19-review/journey.mjs 1280 800 desktop
NOJS=1 node /tmp/m19-review/journey.mjs 390 844 mobile
```

Each run used two separate headless Chrome profiles controlled over CDP, a fixed-clock app and `VC_DATA_DIR` under /tmp. Actual mouse events and text insertion exercised the forms. The no-JS run disabled page script execution in both profiles before navigation. Logs: phone.log, desktop.log, nojs.log in that directory.

All three runs:

1. A opened `/`, Table 1 selected, one settings bar, no details/selects. Switched to Table 2. Empty-login Book was blocked by required validation; no data file appeared. Enter in the filled login field submitted nothing and booked nothing.
2. A typed jwosylu once, Singles/group 1, tapped 14:00: correct table/slot booked, notice and “You booked”/Cancel appeared. Reload prefilled jwosylu; one tap on 15:00 booked precisely that second slot.
3. B opened Table 2, typed ben42, tapped Join on 14:00: correct slot became Full with “You joined”/Leave. Reload prefilled ben42. A reload showed ben42's exact intra profile link and Cancel. Full and ended rows had no Book/Join.
4. Saved JSON contained exactly the two expected table-2 bookings and one joined player. Stopped the app's exact child PID, waited for exit, restarted against the same VC_DATA_DIR, reopened both profiles: full booking, player links, A's Cancel, B's Leave and remembered login all survived.

Measured switch links, settings inputs, segment labels and row buttons at home, booked, joined and final states:

| Run | scrollWidth / clientWidth | Minimum target height / width | Targets below 44px |
|---|---|---|---|
| 390×844 | 390 / 390 | 44 / 56 | none |
| 1280×800 | 1280 / 1280 or 1265 / 1265 with scrollbar | 44 / 56 | none |
| 390×844, JS disabled | 390 / 390 | 44 / 56 | none |

Visually inspected phone home, phone join success, phone final owned/full rows and desktop home screenshots under /tmp/m19-review. Layout is clean and deliberate: compact settings, segmented game choice, orange actions aligned right, dimmed compact ended rows, clear ownership and readable player links. Sticky settings remain visible while scrolling. Matches the sketch without horizontal overflow; no taste change requested.

Additional nondefault-settings browser run: `node /tmp/m19-review/nondefault.mjs 390 844 mobile`, log `/tmp/m19-review/nondefault.log`, artifacts/data under `/tmp/m19-review-extra`. After the standard journey, selected Doubles through its label and set the group input to 2 using the CDP driver, then clicked Book 16:00. Storage correctly recorded spots=4, players=2. The resulting page immediately showed spots=2, players=1. Clicking Book 16:30 without touching settings recorded spots=2, players=1. This exposes the finding below; the default-only journey cannot detect it.

### Skipped checks and limits

No hosted journey, actual deploy/redeploy, physical phone, Safari or Firefox. Restart persistence was checked locally through UI-created data; hosted acceptance is not claimed. No independent desktop no-JS run (phone no-JS completed the full journey). No doctor, smoke or deploy preview needed for this diff. Data/profiles/screenshots stayed under /tmp. Drivers terminated only their own child processes by exact PID. Only this review file was changed; session/context files were deliberately omitted under the explicit single-file restriction. No fix, commit, push or merge performed.

## Findings

1. **P2 — required change: successful taps discard the selected game and group settings.** `server.mjs:264–266` (success redirects at 235; defaults at 81–82). Concrete case: select Doubles and Players with me=2, tap Book 16:00, then tap Book 16:30. First booking stores 4/2; second stores 2/1 because the redirected GET supplies only the remembered login to tablePage. This violates the brief's outcome that the player sets login, singles/doubles and group size once and from then on books with one tap. It can advertise the wrong game and number of open spots unless the player resets the bar after every success. The coder's documented reset limitation does not amend the agreed outcome. Required outcome: preserve the selected game and group size through successful action navigation so successive taps use the player's chosen settings; retain the no-JS path, server validation and browser-only ownership. Verify consecutive nondefault bookings (and a join between bookings) preserve the settings. This does not require remembering those preferences forever or across unrelated future visits.

## Verdict

REQUEST CHANGES for fa68a4bebac72863cfd2fc8393b8b45befd30d8d. Security, validation, default one-tap journey, layout, no-JS operation and restart persistence passed, but nondefault settings reset after the first successful tap, defeating the agreed set-once flow. Re-review the corrected SHA before merge. Local checks only; no hosted approval.

## Round 2

Base SHA: 4baee8c6098850c3addd7e718a3665dd5b3ffa77
Head SHA: 09a2a1d17c548086b483c610d01494c2fdef7ffd
Reviewer session/provider: Codex CLI (codex exec, OpenAI model family), dispatched by the Claude milestone lead

### What I checked

Confirmed `git rev-parse HEAD` equals the full head above on `m1.9-one-tap`; initial worktree clean. Read IDEA.md, PLAN.md, .ai/rules.md, reviewer role/template, brief, round 1 review and validation including Round 2. Inspected `git diff fa68a4b HEAD`, including the complete server/test change and evidence additions. The only runtime change is cookie selection, valid-pair cookie emission after successful Book/Join, and settings fallback when rendering. Server action validation, browser ownership, persistence, markup/CSS and deployment contracts remain unchanged. `git diff --check` passed. This independent reviewer did not write the implementation.

All Node commands used the requested PATH (exported in each command shell); `node --version` reported v22.23.3.

- `TZ=UTC npm test`: 89 passed, 0 failed, 0 skipped; `/tmp/m19-r2-utc.log`.
- `TZ=Europe/Berlin npm test`: 89 passed, 0 failed, 0 skipped; `/tmp/m19-r2-berlin.log`.
- These runs include booking/join refusal and concurrency tests, browser ownership, persistence/restart and storage failure checks, timezone/DST and deployment contracts. The new HTTP cookie-jar regression verifies nondefault settings through a join and successive bookings.

Independent additional HTTP script `/tmp/m19-r2-review/game.mjs`, log `game.log` in that directory, used the actual createApp, ephemeral loopback port, fixed clock and isolated in-memory bookings:

- Created another browser's open game; booked 14:00 with 4/2, joined the open 13:00 game, read the bar (still 4/2), then booked 14:30. Both stored bookings are spots=4, players=2. Verified the emitted `game=4-2` cookie has HttpOnly, SameSite=Lax, Path=/ and Max-Age=31536000.
- Forged values `4-9`, `2-3`, `0-0`, markup, 10,000 characters and `junk; Path=/; browser=bad` all gave HTTP 200 with Singles/1; supplied raw strings/markup were absent from HTML. Also checked `4-2; Path=/`: HTTP cookie syntax correctly treats the semicolon as a separator, so the valid game=4-2 component selects 4/2; the trailing syntax is not rendered. No decoding or raw cookie interpolation occurs. Every probe left health HTTP 200.
- For every forged value, direct booking POST spots=4&players=9 returned 400, with serialized state unchanged. Cookie prefill cannot override the server's validation.
- Eight Cancel/Leave probes using game alone, login alone, both together, or both plus an unrelated browser id returned 403 and preserved state. A real owner's Cancel with a different remembered login succeeded. The earlier regression script also checks legitimate Leave with a different remembered login.

Reran round 1's reviewer-written `/tmp/m19-review/probe.mjs`; current output is `/tmp/m19-r2-review/security.log`: all 12 forged-login ownership probes refused; eight malicious login cookies safe; 39 prototype/junk query probes returned 200 with unchanged state and healthy app; 12 invalid-login direct Book/Join POSTs returned 400 without mutation; real owner Leave and Cancel succeeded despite mismatching login cookies. Persistence regression was rerun through both full suites, including restart and damaged-storage cases; no new browser restart was needed for this cookie-only fix.

Adapted and inspected the coder's CDP settings driver into `/tmp/m19-r2-review/settings.mjs` with separate data, Chrome profiles and artifacts. Ran it at 390×844 both normally and with page JavaScript disabled; logs `browser.log` and `nojs.log`. Real mouse/text events selected Doubles and group 2, tapped Book 14:00 then Book 14:30. After each redirect the bar read 4/2 and both owned rows showed group of 2 with 2 of 4 spots left. Saved JSON confirmed both bookings stored 4/2 in both runs. Width was 390/390, minimum measured target 44px high and 56px wide, no undersized controls. Visually inspected `390x844-r2-A2-after-second.png`: Doubles and 2 remain selected, both owned rows clear, no horizontal overflow. Drivers stopped only their own exact child PIDs.

### Skipped checks and limits

No hosted/deploy/redeploy acceptance, physical phone, Safari or Firefox. Did not repeat the full two-profile desktop journey or browser restart from round 1: no markup/CSS, persistence or ownership implementation changed; the requested phone regression, HTTP security checks and automated persistence suites were rerun. All new data, profiles and scripts stayed under /tmp. Modified only this review file; session/context updates omitted under the explicit single-file restriction. No commit, push or merge.

### Findings

Round 1 P2 is resolved: successful Book and Join preserve the valid nondefault settings for subsequent taps, including without JavaScript. Invalid game cookies are constrained before rendering, and successful joins cannot emit an invalid game pair. No new findings.

### Verdict

APPROVE for 09a2a1d17c548086b483c610d01494c2fdef7ffd. Required settings persistence, validation and ownership regressions passed. Approval is for this exact head and local checks only.
