# M1.1 — localhost stand-in (not hosted acceptance)

Run by the M1 milestone lead (Claude Code, Opus 5.5) on 2026-10-20, at jasuoh's request, while the organiser handout is still missing. This checks only what can be checked on a laptop. It does **not** tick any M1.1 box: no SSH, guest, systemd, public URL or phone was involved.

- Commit: main `632909c7ad8e77a487babbc8e7286e71592c165f` (after M1.2 merge, PR #3).
- Node: official `node-v22.23.3-linux-x64` from nodejs.org, SHA256 checked against `latest-v22.x/SHASUMS256.txt` (OK). Kept outside the repo; the system Node here is v20.11.1. npm 10.9.9.

| Check | Command | Result |
|---|---|---|
| Install | `npm ci` | OK, 0 packages, 0 vulnerabilities |
| Tests | `TZ=UTC npm test`, `TZ=Europe/Berlin npm test` | 31/31 pass each |
| Doctor | `npm run doctor` | OK Node 22.23.3, git, npm, origin = team fork, AGENTS/IDEA/PLAN exist |
| Deploy preview | `npm run deploy:preview` | Prints unit with `WORKSHOP_GIT_SHA=632909c…`; "PREVIEW ONLY: no … state changed" |
| Run + health | `APP_REVISION=<sha> npm start` (0.0.0.0:3000) | started |
| Smoke | `npm run smoke -- http://127.0.0.1:3000` | `OK … serves revision 632909c7ad8e77a487babbc8e7286e71592c165f` |
| Routes | curl `/`, `/table/1`, `/table/2`, `/table/3` | 200, 200, 200, 404 |
| Stop | SIGTERM | stopped |

Still open for real M1.1: collaborator access, SSH as `vc-team`, assigned HTTPS URL, `npm run smoke` against that URL from a laptop, a teammate opening it on a phone. Blocked on the organiser handout.

## Assigned URL probe (2026-10-20, from the lead's laptop)

jasuoh gave the assigned URL: https://team-02.intra.land/

- `GET /` → 200, the workshop starter landing page.
- `GET /api/health` → 200 `{"ok":true,"revision":"c3e2c3936c0c938b2eb4e01ac6cd89e7ee3a3645"}`. That is the starter commit the fork began from, not ours.
- `GET /table/1` → 404 (M1.2 is not deployed).
- `npm run smoke -- https://team-02.intra.land` → FAIL only because it compares against the local checkout (on branch m1.3-book-slot at the time). The served revision is c3e2c39.

So the public HTTPS route works and serves the organiser's starter deployment. Still open: SSH access as `vc-team`, a deploy of our main (needs the team's release instruction), smoke matching our SHA, and a teammate's phone.

---

## Release evidence: team main after M1.2 + M1.3 (2026-10-20)

- Authorisation: human owner jasuoh said "deploy after m1.3 merges" in this session. M1.3 merged via PR #4.
- Deployed SHA: `279eb160bc10e3c56f27142da66ff0acf1aac3b1` (team fork main. It contains M1.2 from PR #3 and M1.3 from PR #4, both reviewed by Codex.)
- Target: https://team-02.intra.land, guest user `vc-team`, reached over SSH with the handout alias in BatchMode.
- Done by: a Claude Code committer subagent.

## What was moved aside

The guest's `~/src/team` was a clone of the workshop starter. Before moving it, I checked it:
- `git status --short`: empty (clean)
- `git log -1 --oneline`: `c3e2c39 Merge pull request #1 from ikodo0/h10-participant-fixes`
- `git remote -v`: origin `https://github.com/ikodo0/vibecode-workshop.git`

Then I ran `mv ~/src/team ~/src/team.starter-2026-10-20`. Nothing was deleted, and `~/workshop` was not touched.

## Guest commands and results

```
git clone https://github.com/kpriya42/vibecode-workshop-mega_vibe_coders.git ~/src/team
cd ~/src/team && git switch main   -> Already on 'main'; up to date with 'origin/main'
git rev-parse HEAD                 -> 279eb160bc10e3c56f27142da66ff0acf1aac3b1  (matches the target)
npm ci                             -> up to date, audited 1 package; 0 vulnerabilities; exit 0
npm test                           -> tests 46, pass 46, fail 0; exit 0
npm run deploy                     -> exit 0
```

Deploy output (the test lines are trimmed; it reran the same 46 tests, all passing):
```
DEPLOYED 279eb160bc10e3c56f27142da66ff0acf1aac3b1
Release kept at ~/.local/share/vibecode-workshop/releases/279eb160bc10-sKyAeX
Removed 1 older release(s). The active release and the rollback release were kept.
User service vc-app.service is active. ~/workshop was not modified.
```
There were no recovery messages.

## Guest smoke

- `npm run smoke` with no argument printed `Usage: npm run smoke -- https://YOUR-ASSIGNED-URL` and exited 1. The script always needs a URL argument. On the guest it then probes the local health endpoint instead.
- `npm run smoke -- https://team-02.intra.land` gave this result, with exit 0:
  `NOTE Running on the workshop guest. Verified local http://127.0.0.1:3000/api/health ...`
  `OK  http://127.0.0.1:3000 serves revision 279eb160bc10e3c56f27142da66ff0acf1aac3b1`
- `curl --fail http://127.0.0.1:3000/api/health` returned `{"ok":true,"revision":"279eb160bc10e3c56f27142da66ff0acf1aac3b1"}`
- `systemctl --user is-active vc-app.service` returned `active`
- `git status --short` in the guest checkout after the deploy was empty.

## Laptop public smoke

The local checkout is on main at 279eb16. I used Node 22 from the scratchpad. `npm run smoke -- https://team-02.intra.land` gave this result, with exit 0:
```
OK  https://team-02.intra.land serves revision 279eb160bc10e3c56f27142da66ff0acf1aac3b1
```

## Public route codes (curl from the laptop)

| Path | Code | Notes |
|---|---|---|
| /table/1 | 200 | title "Table 1 · Today's slots". It has `<form method="post" action="/book">` and a Book button. |
| /table/2 | 200 | |
| /table/3 | 404 | This is expected. PLAN.md asks for a clear not-found page here. The page links to /table/1 and /table/2. |
| /api/health | 200 | |

No booking was made on the public site.

## Limits

- No teammate has checked it on a phone yet, and no browser check was done at desktop or phone widths. Only curl/HTML checks were run.
- Bookings are held in memory until M1.5. A restart or a later deploy clears them.
- The deploy removed one older release directory. This is the helper's normal pruning of the releases folder. It was most likely an earlier release on this guest. I did not inspect what it was.

## Later releases

### Release 0187eaa (M1.4 + M1.7)

- Authorisation: the human owner jasuoh said in this session to deploy ("merge together and then deploy").
- Deployed SHA: `0187eaa864b0ee89b520577652b6df613af5b9a4`. This is team fork main. It contains M1.2, M1.3, M1.4 (PR #7) and the M1.7 front page (PR #6), each reviewed by Codex. The previous release served 279eb16.
- Done by: a Claude Code committer subagent over SSH, using the handout alias in BatchMode.

### Guest commands and results

```
cd ~/src/team && git status --short   -> empty
git switch main                       -> Already on 'main'
git pull --ff-only origin main        -> Fast-forward 279eb16..0187eaa (14 files)
git rev-parse HEAD                    -> 0187eaa864b0ee89b520577652b6df613af5b9a4 (matches the target)
npm ci                                -> up to date, audited 1 package; 0 vulnerabilities
npm test                              -> tests 63, pass 63, fail 0
npm run deploy                        -> exit 0
```
Deploy output:
```
DEPLOYED 0187eaa864b0ee89b520577652b6df613af5b9a4
Release kept at ~/.local/share/vibecode-workshop/releases/0187eaa864b0-l91v6n
Removed 1 older release(s). The active release and the rollback release were kept.
User service vc-app.service is active. ~/workshop was not modified.
```
There were no recovery messages. The pruned release was the oldest one. The 279eb16 release stays as the rollback target.

### Guest smoke

- `npm run smoke -- https://team-02.intra.land` exited 0. It printed the NOTE that it verified the local health endpoint, then `OK  http://127.0.0.1:3000 serves revision 0187eaa864b0ee89b520577652b6df613af5b9a4`.
- `systemctl --user is-active vc-app.service` returned `active`.
- `git status --short` was still empty after the deploy.

### Laptop public smoke

The local checkout is on main at 0187eaa. I used Node 22 from the scratchpad. `npm run smoke -- https://team-02.intra.land` exited 0 and printed:
```
OK  https://team-02.intra.land serves revision 0187eaa864b0ee89b520577652b6df613af5b9a4
```

### Public route codes (curl from the laptop)

| Path | Code |
|---|---|
| / | 200. The HTML contains "Ping Pong 42". |
| /table/1 | 200 |
| /table/2 | 200 |
| /table/3 | 404 (expected: the not-found page) |
| /api/health | 200 `{"ok":true,"revision":"0187eaa864b0ee89b520577652b6df613af5b9a4"}` |

No booking was made on the public site.

### Screenshots (headless Chrome at 390x844, saved under /tmp)

- `/`: the dark theme M1.7 front page. The header reads "PING PONG 42 / HEILBRONN" with a "2 tables" pill. Below it are the "Ping Pong 42" heading, a short intro, orange "Table 1 →" and "Table 2 →" buttons, and the numbered steps "01 Pick a table." and "02 Book or join.". Nothing overflows sideways.
- `/table/1`: a "Switch to table 2 →" link, the heading "Table 1", and "Tuesday, 20 October 2026 · German time". The slot list starts at 09:00. The slots from 09:00 to 14:00 (the visible part of the page) show "Ended", which is correct at about 15:40 local time. The page fits 390px wide.

### Limits

- Bookings are held in memory until M1.5. This deploy cleared any earlier bookings, and the next restart or deploy will clear them too.
- No real phone was used. The phone check was only a headless Chrome screenshot at 390x844. It did not run the booking, join or leave journey on the public site.

---

### Release 7ee2064 (M1.5 persistence)

- Authorisation: the human owner jasuoh said in this session to deploy ("merge together and then deploy").
- Deployed SHA: `7ee2064bb8642dc107074fdbf8fba3f223b0ae31`. This is the merge of PR #8 (M1.5) into team fork main. Codex approved round 2 on head b868e47. The merged head 472224c adds only that review text. The previous release served 0187eaa.
- Done by: a Claude Code committer subagent over SSH, using the handout alias in BatchMode.

### Guest commands and results

```
cd ~/src/team && git status --short   -> empty; branch main
git pull --ff-only origin main        -> fast-forward 0187eaa..7ee2064
git rev-parse HEAD                    -> 7ee2064bb8642dc107074fdbf8fba3f223b0ae31 (matches the target)
npm ci                                -> up to date, audited 1 package; 0 vulnerabilities
npm test                              -> tests 75, pass 75, fail 0, skipped 0
npm run deploy                        -> exit 0
```
Deploy output (the test lines are trimmed; the deploy reran the same 75 tests, all passing):
```
DEPLOYED 7ee2064bb8642dc107074fdbf8fba3f223b0ae31
Release kept at ~/.local/share/vibecode-workshop/releases/7ee2064bb864-aGJkfM
Removed 1 older release(s). The active release and the rollback release were kept.
User service vc-app.service is active. ~/workshop was not modified.
```
There were no recovery messages. The deploy pruned the 279eb16 release. The releases folder now holds 0187eaa (the rollback target) and 7ee2064. The test output includes two `Could not save bookings: EISDIR ... /tmp/vc-persist-*/bookings.json.tmp` lines. These are expected: test/persist.test.mjs makes the temp path a directory on purpose to simulate a failed save.

A process note: my first attempt chained `npm test | grep ... && npm run deploy`. The grep matched nothing, so the deploy never ran. The guest smoke then showed 0187eaa still serving. I reran `npm run deploy` on its own, and the output above is from that run. Nothing was changed by the first attempt.

### Guest checks

- `npm run smoke -- https://team-02.intra.land` exited 0: `OK  http://127.0.0.1:3000 serves revision 7ee2064bb8642dc107074fdbf8fba3f223b0ae31`.
- `systemctl --user is-active vc-app.service` returned `active`.
- `git status --short` was empty after the deploy.
- `ls -la ~/.local/share/vibecode-workshop/data/` failed before the deploy with "No such file or directory". About 20 seconds after the restart, it showed the directory (`drwx------`) and `bookings.json` (`-rw-------`, owner vc-team), 140 bytes at 13:46 UTC. A later `stat` showed 204 bytes. The app writes this file only after a successful book, join, leave or cancel, so real visitors are booking on the public site. I did not read the file's contents, and I created and edited nothing there.
- The journal shows the restart at 13:45:58 UTC and `Workshop app listening on 0.0.0.0:3000`. During the stop, systemd logged `Killing process ... (SignalInspector) with signal SIGKILL` for the old process. Stop and start happened in the same second.

### Laptop public smoke

The local checkout is on main at 7ee2064 and clean. I used Node 22.23.3 from the scratchpad. `npm run smoke -- https://team-02.intra.land` exited 0:
```
OK  https://team-02.intra.land serves revision 7ee2064bb8642dc107074fdbf8fba3f223b0ae31
```

### Public route codes (curl from the laptop)

| Path | Code |
|---|---|
| / | 200 |
| /table/1 | 200 |
| /table/2 | 200 |
| /table/3 | 404 (expected: the not-found page) |
| /api/health | 200 `{"ok":true,"revision":"7ee2064bb8642dc107074fdbf8fba3f223b0ae31"}` |

No booking was made on the public site.

### Limits

- This deploy restarted the app onto the old in-memory release, so any bookings made before it are gone. This is the last deploy that loses data. From now on, bookings live in the data directory, outside the releases.
- Hosted restart and redeploy survival is not proven yet. Proving it needs a booking that exists before a restart or redeploy and is still there afterwards. The human chose not to book on the public site. The bookings visitors are already making would show this at the next deploy.
- There was no browser check or phone check. Only curl and smoke were run.

### Release 37c35b98df7e5979ac7b5f4c52525a681ae22135 (M1.8 tap to book)

Date: 2026-10-20, about 13:50 to 13:56 UTC. Authorised by jasuoh (merge, then deploy).

- PR: https://github.com/kpriya42/vibecode-workshop-mega_vibe_coders/pull/9. Merged with `--match-head-commit 2d45b2e` (Codex APPROVE on 4baee8c, plus a review-only commit). Merge SHA 37c35b98df7e5979ac7b5f4c52525a681ae22135. The local main checkout fast-forwarded to it and is clean.
- Guest checkout: `git status --short` was empty, `git pull --ff-only origin main` went to HEAD 37c35b98df7e5979ac7b5f4c52525a681ae22135. Guest Node v24.22.0.
- `npm ci`: exit 0. `npm test`: exit 0, 79/79 pass.
- `npm run deploy` (run on its own): exit 0, `DEPLOYED 37c35b98df7e5979ac7b5f4c52525a681ae22135`. 1 older release removed; the active and rollback releases were kept; `~/workshop` was not modified. No recovery messages.
- Guest smoke: `OK http://127.0.0.1:3000 serves revision 37c35b98df7e5979ac7b5f4c52525a681ae22135`. `systemctl --user is-active vc-app.service` gave `active`.
- bookings.json before deploy: `2 bytes, mtime 2026-10-20 13:46:27.580764356 +0000`. After the restart it was the same: `2 bytes, mtime 2026-10-20 13:46:27.580764356 +0000`. The file survived the redeploy unchanged. At 2 bytes it holds an empty collection, so no stored booking was there to carry over.
- Rendered slots after the restart (13:54 UTC): table 1 had 13 ended and 5 free, 0 open, 0 full. Table 2 had the same: 13 ended, 5 free, 0 open, 0 full.
- Laptop smoke (Node 22.23.3): `OK https://team-02.intra.land serves revision 37c35b98df7e5979ac7b5f4c52525a681ae22135`.
- Public route codes: `/` 200, `/table/1` 200, `/table/2` 200, `/table/3` 404.
- Headless Chrome at 390x844 on `/`: the Ping Pong 42 header with a Table 1|Table 2 switch (Table 1 active) and the heading "Table 1, Tuesday, 20 October 2026, German time". Slots 09:00 to 15:00 show as dimmed Ended rows, and 15:30 shows Free with an orange Book button. There was no horizontal overflow. No booking was made on the public site.
- Not checked: a real phone. The hosted persistence proof for M1.5 is weak, because no bookings existed to survive.

### Release da5bb146882dbcdf989f21eab8af5f87947339b0 (M1.9 one tap)

Date: 2026-10-20, about 14:08 to 14:14 UTC. Authorised by jasuoh (merge, then deploy).

- PR: https://github.com/kpriya42/vibecode-workshop-mega_vibe_coders/pull/10. Codex round 1 REQUEST CHANGES on fa68a4b, fix a3164af, Codex round 2 APPROVE on exactly 09a2a1d. The round 2 text was committed alone as e2a9da5 (`docs: M1.9 review round 2 (approve)`, review.md only, 39 insertions, 0 deletions). `gh pr checks` reported no checks. Merged with `--merge --match-head-commit e2a9da5`, and the branch was kept. Merge SHA da5bb146882dbcdf989f21eab8af5f87947339b0. The local main checkout fast-forwarded to it and is clean.
- Before the deploy (14:10 UTC, serving 37c35b9): bookings.json was `424 bytes, mtime 2026-10-20 14:08:37.069438410 +0000`. Table 1 had 14 ended, 3 free, 1 open (16:00) and 0 full. Table 2 had 14 ended, 2 free, 0 open and 2 full (16:30, 17:00). The file contents were not read.
- Guest checkout: `git status --short` was empty. `git pull --ff-only origin main` went to HEAD da5bb146882dbcdf989f21eab8af5f87947339b0. `npm ci`: exit 0, 0 vulnerabilities. `npm test`: 89 tests, 89 pass, 0 fail, 0 skipped. The exit code was read from the tail summary, not echoed.
- `npm run deploy` (run on its own): `Release kept at .../releases/da5bb146882d-IgV34h`. 1 older release was removed; the active and rollback releases were kept. `User service vc-app.service is active. ~/workshop was not modified.` No recovery messages.
- After the deploy (14:13 UTC): guest smoke exited 0 with `OK http://127.0.0.1:3000 serves revision da5bb146882dbcdf989f21eab8af5f87947339b0`. `systemctl --user is-active vc-app.service` gave `active`. bookings.json was `424 bytes, mtime 2026-10-20 14:08:37.069438410 +0000`, the same as before. The slot counts and times were the same: table 1 still had 1 open at 16:00, and table 2 still had 2 full at 16:30 and 17:00. `git status --short` was empty.
- Hosted M1.5 check: passed. Three real bookings existed before the redeploy, and all three were still shown after it, with the same state. The data file was not touched by the restart.
- Laptop smoke (Node 22.23.3): exit 0, `OK https://team-02.intra.land serves revision da5bb146882dbcdf989f21eab8af5f87947339b0`.
- Public route codes: `/` 200, `/table/1` 200, `/table/2` 200, `/table/3` 404 (the expected not-found page), `/api/health` 200 with revision da5bb14.
- Headless Chrome at 390x844 on `/`: the Ping Pong 42 header with a Table 1|Table 2 switch (Table 1 active), "Table 1" and "Tuesday, 20 October 2026 · German time". The new settings bar shows a Login field ("your 42 login"), a Singles|Doubles switch with Singles selected, and "Players with me" set to 1. Below it the slots from 09:00 to 15:30 show as dimmed Ended rows. There was no horizontal overflow. No booking was made on the public site.
- Not checked: a real phone, and the one-tap journey on the hosted site. No booking was made on the public site.
