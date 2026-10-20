# M1.5 — Persistence

## Outcome

Bookings, and the joins added by M1.4, survive a page reload, viewing from another device, an app restart and a redeploy. The proof journey in IDEA.md ("after a redeploy everything is still there") holds on the team server.

## Audit

- Base: `main` at `279eb160bc10e3c56f27142da66ff0acf1aac3b1` (M1.3 merged and deployed). Branch: `m1.5-persistence`, in its own worktree at `/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/wt-m1.5`.
- M1.4 (join, leave and cancel) is being coded **in parallel** on `m1.4-join-leave` and changes `server.mjs`. It adds more write actions and a joiner list to the booking shape (plain JSON). M1.7 (static front page) is also running in parallel and touches only `public/`.
- `server.mjs` on base: `createApp({ revision, now, bookings = [], opens, closes })` keeps bookings in an in-memory array. `POST /book` validates and pushes `{ table, start, spots, players, login, browser }`. On success it redirects with 303. Refusals are `Refusal(status, message)`. When run directly, `createApp()` is called with no bookings.
- On the guest, `vc-app.service` runs `npm start` from an immutable release dir (`WorkingDirectory=<release>`). The deploy drop-in sets `PORT`, `HOST`, `APP_REVISION` and loads an optional `EnvironmentFile=-~/.config/vibecode-workshop/app.env`. `HOME` is the `vc-team` home. Releases are pruned on deploy, so data must not live in the release dir.
- Node 22: prefix commands with `PATH=/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/node-v22.23.3-linux-x64/bin:$PATH`.

## Acceptance

- [ ] Restart: book a slot, stop the app, start a new app on the same data location. The booking is still shown, with the same booker login, and the same browser can still act on it (the browser id is kept).
- [ ] Every successful change is saved before the success response is sent. That includes every write M1.4 adds, so design persistence to cover any successful state change without a separate save in each new handler. A refused request writes nothing.
- [ ] The default data location on the guest is under `~/.local/share/vibecode-workshop/data/`, outside the release and repository directories. It can be overridden for local runs and tests, through a `createApp` option and an environment variable usable from `app.env`. Tests never write into the repo or the real home data directory.
- [ ] Missing data directory or file: the app starts with no bookings and creates the directory and file on the first save. An empty file is also treated as no bookings.
- [ ] A damaged data file (invalid JSON, or not an array) is reported clearly. Choose and justify either refusing to start with a clear message, or serving with writes refused. Never silently replace or overwrite the damaged file. Test it.
- [ ] A crash mid-write must not leave a half-written data file. For example, write to a temporary file in the same directory and then rename it. Test or demonstrate it.
- [ ] Two requests in quick succession (or concurrent ones) both persist. No lost update: after two bookings on different slots, both are in the file.
- [ ] The data contains only booking data. No secrets, connection details or environment dumps. The data directory and file are not world-readable if that is cheap to do (for example mode 600 or 700). Data files are git-ignored if they could ever land in the repo.
- [ ] Existing behaviour holds: all current tests pass under `TZ=UTC` and `TZ=Europe/Berlin`, plus `/api/health`, the deploy contract and `test/deploy.test.mjs`.
- [ ] Manual check: run the real server (`npm start`) with the override pointing to a temp dir, book through HTTP, kill it with SIGTERM, start it again, and see the booking. Record this in validation.md.

## Boundaries and dependencies

- Depends on M1.3 (merged). After M1.4 merges, this branch is rebased or merged onto the new main. The persistence must then cover M1.4's join, leave and cancel writes. That updated head needs re-review, so keep the integration surface small (for example, one persistence module and minimal wiring in `createApp`).
- Plain JSON file storage with Node built-ins. No database and no new dependency unless justified in validation.md.
- Out of scope: pruning old days, backups, multi-process locking (one app process serves the guest), admin, migrations beyond reading the current shape.
- Don't change `scripts/` or the deploy behaviour. Don't edit PLAN.md or .ai/context.md.

## Handoff

- Human owner: jasuoh. Milestone lead: Claude Code session (Opus 5.5), 2026-10-20.
- Coder: a fresh Claude subagent on `m1.5-persistence` in the worktree above, using `ponytail` and `superpowers:test-driven-development`. It writes `.ai/work/M1.5/validation.md`.
- Reviewer: Codex CLI (`codex exec`). It writes `.ai/work/M1.5/review.md`.
- Committer: a fresh Claude subagent after APPROVE on the exact head SHA. Hosted proof (survives a redeploy) needs a release instruction from the team.
