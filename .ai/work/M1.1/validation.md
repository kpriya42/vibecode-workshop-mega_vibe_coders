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
