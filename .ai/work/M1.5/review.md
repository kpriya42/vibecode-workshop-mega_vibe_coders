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
