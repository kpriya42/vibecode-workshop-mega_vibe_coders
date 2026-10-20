# M1.5 review

Base SHA: 279eb160bc10e3c56f27142da66ff0acf1aac3b1
Head SHA: 7d56dd18e3c2c2123eda38d6f0a075ff60e1ae47
Reviewer session/provider: Codex CLI (codex exec, OpenAI model family), dispatched by the Claude milestone lead

## What I checked

Independently read AGENTS.md, reviewer role, review template, context, IDEA.md, PLAN.md, rules, docs/deploy.md, the brief and coder validation. Confirmed `git rev-parse HEAD` equals the full head above and the initial checkout was clean. Inspected the full base-to-head diff, including evidence files, and surrounding server code. Implementation is c5b06de054428bdbfc34f5e98647d86fd0f52428; approval covers the supplied final head.

All Node/npm commands used `PATH=/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/node-v22.23.3-linux-x64/bin:$PATH` (Node 22.23.3).

| Check / command | Actual result |
|---|---|
| `npm ci` | Passed; audited 1 package, 0 vulnerabilities. |
| `TZ=UTC npm test` | 54 passed, 0 failed, 0 skipped. |
| `TZ=Europe/Berlin npm test` | 54 passed, 0 failed, 0 skipped. Includes deployment-contract tests. |
| `python3 /tmp/m15-independent-check.py` with the Node PATH above | Passed all independent HTTP/startup checks described below. Initial invocation as `python` failed because that executable is absent; reran successfully with python3. |
| `git diff --exit-code <base> HEAD -- scripts package.json package-lock.json public` | No differences; deploy scripts, package contract, lockfile and UI assets unchanged. |
| `git check-ignore data/example bookings.json bookings.json.tmp` | All three paths ignored. |

The independent temporary harness started real `npm start` processes on dynamically allocated spare loopback ports, with `VC_DATA_DIR` under `/tmp/m15-review-xs7aymxl`. It discovered only each started npm process's descendants and sent SIGTERM to exact PIDs; it waited for npm to exit. No broad process matching or signals were used. Test logs are under that temporary directory; suite logs are `/tmp/m15-review-{ci,utc,berlin}.log`. All runtime data was under /tmp.

- Missing directory: startup and a refused invalid-table request created no directory. Booking table 1 at 17:30 as review42 returned 303 and created directory mode 0700 and file mode 0600. The saved browser UUID matched the issued cookie. A duplicate returned 409 without changing file bytes.
- Restart: stopped the real process with SIGTERM, started `npm start` again against the same directory, and fetched the page with the original cookie. It showed `2 of 4 spots left · review42`; the stored ownership UUID was identical. Rebooking returned 409. A separate GET without a cookie also sees the public booking through existing suite coverage. Health returned HTTP 200 with `{"ok":true,"revision":"review-m15"}`.
- Save failure: changed that data directory to mode 0500 as the actual non-root user. A different-slot booking returned 500 with the save error message, retained identical old file bytes, and showed the failed slot as Free afterwards. Restored permissions and stopped only the started process.
- Missing file in an existing directory and a zero-length file: each real server started empty and saved one booking successfully on the first write.
- Invalid JSON, an object and null: each real `npm start` exited 1 with `Not starting:` and a path-specific parse/list error; exact original file contents remained unchanged.
- Concurrent persistence: independently reran the committed test sending three parallel different-slot requests; all returned 303 and all three bookings were present in the file. The synchronous mutation/save section has no await, so requests cannot interleave there in the supported single process.
- Save timing and refusal: code and tests confirm save runs before 303; invalid/past requests do not create storage. Duplicate requests leave existing bytes unchanged. The committed temp-path obstruction test also passed: 500, unchanged old JSON, rolled-back memory, and successful retry once obstruction is removed.
- Atomicity: inspected store.mjs:22–30. It writes and fsyncs a temporary file in the same directory, closes it, then renames over bookings.json. A failure before rename leaves the old destination whole. No asynchronous save can race another request. New directory/file modes are private; existing directory permissions are not tightened.
- Default path: checked server.mjs:205 directly: VC_DATA_DIR overrides `join(homedir(), '.local/share/vibecode-workshop/data')`. createApp also accepts dataDir for tests. This is outside immutable releases with the guest HOME contract. No default-path runtime write was needed. The serialized content is only the booking array (table, start, spots, players, login, browser ownership UUID), with no environment dumps, credentials or connection details. The ownership identifier is intentionally persisted authorization state and is protected by the private storage modes; it is not emitted in public booking HTML.

Damaged-data policy and rollback: refusing startup is explicitly permitted by the brief and is acceptable for M1. It preserves evidence and prevents silent data loss. It does leave the demo unavailable until an operator repairs or safely relocates the damaged file. As docs/deploy.md explains, release rollback does not undo data changes: restoring another persistence-aware release that reads the same damaged file will also fail. A pre-persistence release may start but cannot display these bookings. This is an acknowledged availability tradeoff, not a claim that rollback repairs data. No data deletion or automatic repair is introduced.

M1.4 integration: the store serializes the entire JSON array without discarding future joiner fields; rollback replaces the array contents in place. The persistence closure is independent of action type. Moving/retaining one `persist()` call immediately after the successful shared POST action and before its success response is a small, appropriate integration. This approval does not certify an unseen merge: join, leave, cancel, browser permissions, refused writes and save-failure rollback must be exercised on that merged SHA.

Skipped checks / limits:

- No deployment, hosted HTTPS journey or actual redeploy: no milestone release instruction. Local restart plus external data-path inspection supports the design, not hosted acceptance.
- No graphical browser/phone inspection: no UI changes. HTTP-rendered pages were exercised; actual cancellation/leave ownership behavior is absent on this branch and must be checked after M1.4 integration. The duplicate refusal is not proof of ownership authorization; persistence of the matching browser ID is the evidence available here.
- No power-loss or timed process-crash injection. Atomicity was reviewed structurally and failure-before-rename exercised by the suite. The directory is not fsynced, so a machine power loss may lose the last rename; no claim of power-loss durability is made.
- No multi-process locking, schema migration or recovery from external corruption during a running process; these are outside the brief. If both save and the rollback reload fail, the latter error is not converted into the normal 500 response. The ordinary read-only-directory case requested here was tested successfully.
- Modified only this review file; no implementation fixes, commits, pushes, merges, context edits or session-file edits, following the review assignment's explicit scope.

## Findings

No blocking defects found against the brief or project rules in the reviewed head. No required code changes.

## Verdict

APPROVE for 7d56dd18e3c2c2123eda38d6f0a075ff60e1ae47 only. Persistence, refusal behavior, startup handling, private storage and the unchanged deployment contract meet this step's local acceptance criteria. M1.4 integration requires its own re-review; hosted restart/redeploy proof remains pending release authorization.

## Round 2 (integration with M1.4)

Base SHA: 279eb160bc10e3c56f27142da66ff0acf1aac3b1
Head SHA: b868e47693c9e5bb4135d5fd3fe1e0ca67656a6a
Reviewer session/provider: Codex CLI (codex exec, OpenAI model family), dispatched by the Claude milestone lead

### What I checked

Confirmed `git rev-parse HEAD` matches the full head above and the initial checkout was clean. Read IDEA.md, PLAN.md, .ai/rules.md, reviewer role/template, context, M1.5 brief, round-1 review and validation including “Integration with M1.4”, and M1.4's review/fix evidence. Independently inspected `git diff 0187eaa HEAD` and `git diff 7d56dd1 HEAD -- server.mjs store.mjs`. Integration baseline is merged main 0187eaa864b0ee89b520577652b6df613af5b9a4. The store is unchanged since round 1. The resolved dispatcher runs each action, then synchronously persists, then sends 303; refusals bypass persistence. The path-import/function name collision is removed. No implementation was written by this reviewer.

All Node/npm commands used `PATH=/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/node-v22.23.3-linux-x64/bin:$PATH` (Node 22.23.3).

- `TZ=UTC npm test`: 75 passed, 0 failed, 0 skipped; `/tmp/m15-r2-utc.log`.
- `TZ=Europe/Berlin npm test`: 75 passed, 0 failed, 0 skipped; `/tmp/m15-r2-berlin.log`. Includes deployment contracts and M1.4 behavior/boundary coverage.
- `python3 /tmp/m15-r2-check.py`: passed twice, with stronger exact rendered-state comparisons in the final run. Final artifacts: `/tmp/m15-r2-_23cp20c/`; first-run artifacts: `/tmp/m15-r2-_1hsttvw/`. The independent harness launches real `npm start` on loopback port 3949 with `VC_DATA_DIR` under /tmp, uses HTTP requests with manual redirects and reads the file immediately after each success response. It discovers only descendants of its own npm PID and sends SIGTERM to exact PIDs, waits for exit, then starts a new npm/node process. No broad process signals used. The final port check showed no listener.

Actual independent HTTP results:

1. Browser A booked table 1 at 17:30, singles/group of one, as review42: 303; file contained the booking before proceeding. SIGTERM/restart retained the booking and rendered login.
2. Browser B joined as ben42: 303; file contained the join immediately. A second SIGTERM/restart retained both players. A and B used distinct actual server-issued cookies.
3. After restart, B cancelling A's booking returned 403; A leaving B's join returned 403. Duplicate booking, join of full game, case-insensitive duplicate join and join of free slot each returned 409; absent-player leave returned 404; malformed `12:60` join returned 400. Every refusal left bookings.json byte-identical.
4. Made the data directory genuinely read-only (0500, running as the ordinary user). Attempted book on table 2, join on an open doubles game, leave and cancel: each returned 500 with “It could not be saved”, with no success response. Logs recorded EACCES opening bookings.json.tmp. The saved file stayed byte-identical after every attempt; fresh GETs of both tables exactly matched their pre-failure HTML, including B's leave control and the open game, establishing in-memory rollback for all four actions. Restored directory permissions afterwards.
5. Correct B leave returned 303 and was already absent from the file; SIGTERM/restart retained that removal. Correct A cancel returned 303 and was already absent from the file; another SIGTERM/restart retained cancellation. Thus every action was checked both at response time and across a real restart, with the correct owners succeeding after earlier ownership refusals.
6. GET `/table/2?toString=14:00`, plus constructor, __proto__, hasOwnProperty, valueOf and unknown keys: all 200; subsequent health checks were 200 and the booking file unchanged. The Map-based notice fix survives integration. The full suites additionally regress malformed input, browser ownership, full/duplicate joins, concurrency, escaping and deployment boundaries.

Default path verified by reading the direct-run block: `VC_DATA_DIR` override or `${homedir()}/.local/share/vibecode-workshop/data`; no path is inside the release by default. No runtime data was written outside /tmp. `git diff 0187eaa HEAD -- scripts package.json package-lock.json public` was empty: deployment contracts, dependencies and merged UI assets are unchanged by persistence.

Headless Chrome: the harness launched google-chrome with `--headless=new --no-sandbox --window-size=390,844`, separate profiles under its /tmp artifact directory, and captured `/` and `/table/1` screenshots and DOM. Both exited successfully. Visually inspected first-run home.png and table.png: landing heading and table links render legibly, and table navigation/date/slot list fit the phone width without visible clipping. This was the requested quick render check; the HTTP harness exercised the integrated journey. Chrome processes exited, and app processes were stopped in finally.

### Skipped checks and limits

No hosted acceptance, actual deployment/redeploy, physical phone or new desktop browser journey. No release was performed. Local process restarts and the external data path support persistence but do not prove hosted acceptance. No power-loss injection or multi-process locking check; round-1 atomic-rename/directory-fsync limitations remain. External corruption causing both save and rollback-load failure remains outside this brief, as recorded in round 1. No new schema-validation or migration claim is made.

Only this review file was modified. Session/context files were deliberately left unchanged to obey the assignment's explicit restriction. No commit, push, merge or implementation fix performed.

### Findings

No blocking integration defect found. All successful M1.4 writes pass through persistence before 303, refused operations preserve disk bytes, read-only save failures roll back all four mutations, and browser ownership survives real restarts. The former M1.4 crash probe remains fixed.

### Verdict

APPROVE for exact head b868e47693c9e5bb4135d5fd3fe1e0ca67656a6a. Both 75-test time-zone runs, real restart/ownership checks, read-only failure/rollback checks, boundary regression and quick phone-width Chrome rendering passed. Approval covers local integration only; hosted acceptance remains pending.
