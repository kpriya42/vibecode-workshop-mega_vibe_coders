# Pitfalls

Add incidents when they occur: date, symptom, cause, correction and how to detect recurrence. Do not turn guesses into historical incidents.

## 2026-10-20 — broad pkill during parallel work

- Symptom: the M1.5 coder ran `pkill -f "node server.mjs"` to stop its manual test server, and it killed its own shell too.
- Cause: a pattern-based kill matches every process on the machine with that command line. During this session three coders and two Codex reviewers were running servers at the same time.
- Correction: the coder reran using exact PIDs. Both running Codex reviews survived. Every role prompt now says: kill only processes you started, by exact PID; never use pkill or killall.
- Detect: grep the step's validation.md and the transcripts for `pkill` or `killall`. Watch for a reviewer or coder reporting that a server died unexpectedly.

## 2026-10-20 — chained deploy silently skipped

- Symptom: during the M1.5 release, `npm test | grep … && npm run deploy` printed what looked like success, but the deploy never ran. The guest kept serving 0187eaa.
- Cause: the grep matched nothing and exited 1, so the `&&` skipped deploy. The reported "exit 0" belonged to a different command.
- Correction: run `npm run deploy` on its own. The guest smoke caught the revision mismatch before anything was reported as live.
- Detect: always run `npm run smoke -- <URL>` after a deploy and compare the served revision with the intended SHA. Never pipe test output through a filter that sits in front of `&& npm run deploy`.
