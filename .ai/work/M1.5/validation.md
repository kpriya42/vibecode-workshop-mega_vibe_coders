# M1.5 validation

- Base: `main` 279eb160bc10e3c56f27142da66ff0acf1aac3b1 (brief commit d71c671 on top).
- Implementation head: c5b06de054428bdbfc34f5e98647d86fd0f52428.
- Coder: a fresh Claude subagent (Opus 5.5) dispatched by the milestone lead through the Agent tool, in the worktree `.../scratchpad/wt-m1.5`. Skills used: `ponytail:ponytail`, `superpowers:test-driven-development`.
- Node: v22.23.3 (scratchpad Node 22 on PATH for every command).

## Change

- `store.mjs` (new): `load(dir)` and `save(dir, bookings)`, Node built-ins only, no dependency.
- `server.mjs`: `createApp({ dataDir })` loads bookings from `dataDir/bookings.json`; a `persist()` closure saves after a successful action and before the 303. Without `dataDir` the app is memory-only, as before (existing tests unchanged). The direct-run block passes `VC_DATA_DIR` or the default and exits 1 with a clear message if loading fails.
- `.gitignore`: `/data/` and `bookings.json*`, in case `VC_DATA_DIR` ever points inside a checkout.
- `test/persist.test.mjs` (new): 8 tests, all using `mkdtemp` under the OS temp dir.

**Integration point for M1.4:** call `persist()` once, right after the action function returns in the shared POST dispatcher (the `book(...)` line now). M1.4's join/leave/cancel run through one dispatcher, so the merge is a single line there. A save failure throws `Refusal(500, ...)`, which the existing refusal path renders.

**Data location:** `~/.local/share/vibecode-workshop/data/bookings.json` by default (`os.homedir()`, which is the `vc-team` home under systemd). Override with the env var **`VC_DATA_DIR`** (a directory; can be set in `~/.config/vibecode-workshop/app.env`) or the `createApp({ dataDir })` option.

**Damaged file choice: refuse to start.** On invalid JSON or a non-array, `createApp` throws `"<path> is not valid JSON (...)/is not a list of bookings. Fix or move it away; it was not changed."` and `npm start` exits 1 with `Not starting: ...`. Reason: it is the smallest code, it can never overwrite the damaged file, and it is loud (systemd marks the unit failed, deploy's health check fails). Serving with writes refused would need a read-only mode in every write handler, including M1.4's. Trade-off: a damaged file takes the site down until someone fixes or moves the file, and deploy's rollback to the previous release would also fail to start, because it reads the same file.

## TDD

1. Wrote `test/persist.test.mjs` first. `TZ=UTC node --test test/persist.test.mjs`: 1 pass, 7 fail (the "refused request writes nothing" case passed trivially before persistence existed; the rest failed because nothing was saved or loaded).
2. Added `store.mjs` and the wiring. Same command: 8 pass, 0 fail.

## Commands and results

| Command | Result |
|---|---|
| `npm ci` | ok, 0 vulnerabilities (no dependencies) |
| `TZ=UTC npm test` | 54 tests, 54 pass, 0 fail, 0 skipped |
| `TZ=Europe/Berlin npm test` | 54 tests, 54 pass, 0 fail, 0 skipped |
| `ls ~/.local/share/vibecode-workshop` after the test runs | does not exist: the tests wrote nothing into the real home |

Test 7 prints one expected `Could not save bookings: EISDIR ...` line to stderr.

### Manual restart check (real server, data under /tmp/m15-manual, removed afterwards)

At 15:32 Berlin time:

1. `VC_DATA_DIR=/tmp/m15-manual/data PORT=3915 HOST=127.0.0.1 node server.mjs`, then `curl -c jar -d 'table=1&time=17:30&login=jwosylu&spots=4&players=2' .../book` returned 303 to `/table/1?booked=17:30`. The directory was created `drwx------` and `bookings.json` `-rw-------`, containing exactly `[{"table":1,"start":"2026-10-20T17:30","spots":4,"players":2,"login":"jwosylu","browser":"fc136ea6-..."}]`, the same browser id as the cookie.
2. `kill -TERM`, then started again with the same `VC_DATA_DIR`. `/table/1` showed `<time>17:30</time><span>2 of 4 spots left · jwosylu`. Rebooking from the same cookie jar returned 409 (slot kept). `/api/health` returned `{"ok":true,"revision":"development"}`.
3. Wrote `{oops` into the file and started again: it printed `Not starting: /tmp/m15-manual/data/bookings.json is not valid JSON (...). Fix or move it away; it was not changed.`, exited 1, and the file still read `{oops`.
4. Default location: `HOME=/tmp/m15-manual/home node server.mjs` with no `VC_DATA_DIR`. A booking returned 303 and created `/tmp/m15-manual/home/.local/share/vibecode-workshop/data/bookings.json` (directories 700, file 600).
5. Through `npm start` (the real service command): with `VC_DATA_DIR` and a fresh file, a booking for table 2 at 17:00 returned 303. Stopped it with SIGTERM, then ran `npm start` again: `/table/2` showed `<time>17:00</time><span>1 of 2 spots left · j-doe`. After SIGTERM to npm and node, npm exited 143 and the port was free.

A first attempt at step 5 used `pkill -f "node server.mjs"`, which also matched and killed my own shell. That process match could also have hit any other `node server.mjs` on this machine; the other coders' test runs use `node --test`, so they probably were not hit, but it is worth knowing. The rerun used exact PIDs.

## Acceptance mapping

| Acceptance | Evidence |
|---|---|
| Restart keeps the booking, login and browser id | test 1 "a booking survives a restart..."; manual steps 1, 2 and 5 |
| Saved before the success response; a refused request writes nothing | test 2 (file read right after the 303); test 3 (409 and 400 leave no directory); M1.4 coverage through the single `persist()` call (see above; that needs re-review after the merge) |
| Default `~/.local/share/vibecode-workshop/data/`, overridable through an option and env var, tests never write to the repo or home | manual step 4; `VC_DATA_DIR` in manual steps 1 to 3; the `dataDir` option in every test; `ls` check above |
| Missing directory or file means start empty and create on first save; an empty file means no bookings | test 4, test 5 |
| A damaged file is reported clearly and never overwritten | test 6 (invalid JSON, `{...}` object and `null`, file unchanged); manual step 3 |
| No half-written file after a crash mid-write | temp file, fsync, then rename in `store.mjs`; test 7 makes the temp write fail and checks that the old file is unchanged, the request gets 500, memory goes back to the saved state, and a later save works |
| Concurrent requests both persist | test 8 (3 parallel bookings, all in the file). The save is synchronous inside the request, so no other request runs between a change and its save |
| Only booking data; not world-readable; git-ignored | the file holds only the booking array (manual step 1); dir 700 and file 600 (test 4, manual steps 1 and 4); `.gitignore` additions |
| Existing behaviour holds | full suite under both TZ values, including `test/deploy.test.mjs` and the health tests |
| Manual check | manual steps 1, 2 and 5 |

## Skipped or not checked

- No browser check: there is no UI change (the page HTML is unchanged).
- No hosted check: deploying needs the team's release instruction. "Survives a redeploy" is shown only by the restart and default-location checks.
- No real power-loss test. Atomicity rests on rename within one directory, plus fsync of the temp file. The directory itself is not fsynced, so after power loss the rename might roll back to the previous whole file.
- If the data file is damaged by something else while the app runs, a later save failure re-reads it, and that load error is not handled (the request would error). Treated as out of scope.
- `mkdirSync(..., { mode: 0o700 })` also applies 700 to parent directories it creates. On the guest, `~/.local/share` already exists, so only `vibecode-workshop/data` (or just `data`) is new.
- Not rebased on M1.4. After M1.4 merges, add `persist()` after its action call and re-run the suite.

## Integration with M1.4

Same coder session (Claude subagent, Agent tool), continuing after Codex approved 7d56dd1.

- `d74d4a92db7b59c7f6e76c2169cd3b311aedd263`: commits review.md unchanged, `docs: M1.5 review round 1 (approve on 7d56dd1)`.
- `git fetch origin && git merge origin/main`, with origin/main at `0187eaa864b0ee89b520577652b6df613af5b9a4` (M1.4 PR #7, M1.7, docs PR #5). A merge, not a rebase, so the reviewed commits are unchanged.
- **Conflicts:** one, in `server.mjs` at the POST handler, where my `book(...)` + `persist()` met M1.4's shared `run(form, ...)` dispatcher for book, join, cancel and leave. Resolved by taking M1.4's dispatcher and adding a single `persist()` after `run(...)` and before the 303. Every successful action now saves through that one line, and a Refusal throws before it, so a refused write saves nothing.
- **A second clash git did not flag:** my `import { join } from 'node:path'` collided with M1.4's `function join` (a SyntaxError at load time). I dropped the import and built the default path as `` `${homedir()}/.local/share/vibecode-workshop/data` ``.
- Merge commit: `6bb7dd8d0f19212877fb7b207b04a2c04f39e52e` (server.mjs resolution only).
- Test commit: `b131108a1fa8263283ae4f0f99433926351f7cb3`. Note: at the merge commit on its own, 2 of the earlier persist tests have stale expectations. M1.4 added `joined: []` to the stored shape and wraps the login in a profile link. The test commit updates them, so check green at b131108, not at 6bb7dd8.

### TDD

New tests in `test/persist.test.mjs`:
- join survives a restart, and only the joining browser can leave after it (another browser gets 403), and the leave also survives a restart;
- cancel survives a restart, and only the booking browser can cancel after it (another browser gets 403), and the cancel also survives a restart;
- six refused writes (a join on a full game, a join on a free slot, a leave from another browser, a leave by someone not in the game, a cancel by a non-booker, a cancel of a free slot) each answer 4xx and leave the file byte-identical;
- a failed save of a join answers 500 and the join is forgotten.

Red: with the conflict resolved to M1.4's dispatcher without `persist()`, `TZ=UTC node --test test/persist.test.mjs` gave 2 pass and 10 fail. Green after adding the one `persist()` line, except the stale profile-link assertion in test 1, which I then updated to allow the `<a>` tag.

### Commands and results (Node v22.23.3)

| Command | Result |
|---|---|
| `TZ=UTC npm test` | 75 tests, 75 pass, 0 fail, 0 skipped |
| `TZ=Europe/Berlin npm test` | 75 tests, 75 pass, 0 fail, 0 skipped |
| `ls ~/.local/share/vibecode-workshop` | does not exist (no test wrote into the real home) |

### Manual check (real `npm start`, data under /tmp/m15-manual2, port 3916, removed afterwards; killed only by exact PIDs)

At 15:40 Berlin time:
1. `VC_DATA_DIR=/tmp/m15-manual2/data PORT=3916 HOST=127.0.0.1 npm start`. Cookie jar A booked table 1 at 17:30 as jwosylu (doubles, group of 1): 303 to `?booked=17:30`. Cookie jar B joined as ben42: 303 to `?joined=17:30`. The file held one booking with `joined: [{ login: 'ben42', browser: <B's id> }]`.
2. `kill -TERM <node pid> <npm pid>`: npm exited 143. Started `npm start` again on the same data.
3. `/table/1` with cookie B showed `2 of 4 spots left · jwosylu, ben42` (both as profile links), with a "Leave as ben42" form for B and a Join form.
4. Ownership survived the restart: leave ben42 from cookie A returned 403, and cancel from cookie B returned 403.
5. Stopped by exact PIDs. The port was free afterwards.

### Skipped

The same as above: no browser check (this merge changes no UI), and no hosted or redeploy check (needs a release instruction). The merged head needs a fresh review.
