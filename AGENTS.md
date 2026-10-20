# Shared working instructions

Read IDEA.md, PLAN.md, .ai/rules.md and the role brief for your assignment. Inspect the relevant code and Git state before proposing work. CLAUDE.md is a symlink to this file, not a second instruction source.

## Responsibility

- The human owns the goal, taste, scope changes and milestone release decisions.
- The project lead agrees the plan, assigns one milestone lead at a time and brings unresolved decisions to the human. Leads do not implement code.
- The milestone lead audits the current state, writes step briefs and coordinates coder → reviewer → committer. It does not implement or approve its own team's code.
- The coder implements one step on its branch and commits it. It reports checks it actually ran.
- The reviewer is a different session that did not write the change, preferably using a different model family. It reviews the committed diff, acceptance criteria and validation output; UI review includes the running page. It records reasoning and a verdict on disk.
- The committer confirms the reviewed SHA, merges an approved step into the team's main branch and records a handoff. Deployment needs the team's explicit milestone release instruction.

## Changes and evidence

1. State what must be true and the cases that must pass. Do not prescribe unverified algorithms.
2. One step = one branch = one reviewable PR. IDs such as M1.1 are permanent; append new IDs rather than renumber.
3. Start from current main. Use `m1.1-short-description` for a step branch. Preserve dirty work; never reset or delete someone else's files.
4. Only one writer changes a checkout at a time. A fresh reviewer may inspect it while the writer is idle. Use separate clones/worktrees for concurrent writing, and agree shared contracts before splitting work.
5. Save evidence under `.ai/work/M1.1/`: brief.md, validation.md, review.md. State reviewed base and head SHAs. Do not hide failures, skipped checks or missing browser verification.
6. REQUEST CHANGES returns to the coder; a new SHA requires re-review. APPROVE must explain what was checked. Self-approval is not an independent review.
7. Changes merge through a PR within the team's fork. Explicitly target that fork, not the workshop starter. Main is the team's reviewed demo source, not an automatic production deployment.
8. Keep secrets and private connection details out of commits. Do not copy private keys between teammates; use each person's authorised personal account/key (the handout team key serves as the initial bootstrap credential). Do not add attribution trailers, session links or generated-by lines to commits or PRs.
9. Never delete app data, another team's files or hosting resources to repair your app. Diagnose and ask the organiser for platform failures.
10. Before ending a session, save a short handoff in `.ai/sessions/`, update `.ai/context.md`, and add a pitfall only when there is a new lesson.

## Our team setup

Agreed with the human owner (jasuoh) on 2026-10-20.

- **Tools:** Claude Code (`claude`) and Codex CLI (`codex`), each signed in with a teammate's own account.
- **Roles by tool:** project lead, milestone lead, coder and committer run in Claude Code. The reviewer runs in Codex, so the writer and the reviewer are different model families. If Codex is unavailable, use a fresh Claude session and say so in review.md. Never claim a Codex review that didn't run.
- **Dispatch:** a lead may start real role sessions itself. Use Claude subagents (the Agent tool, one fresh agent per role) or `claude -p` for coders, and `codex exec` or `codex review` from the shell for reviewers. Record the actual command or agent used in the step's validation.md or review.md.
- **Skills:** coders use `ponytail` (the smallest change that meets the brief) and `superpowers:test-driven-development` where behaviour can be tested. Coders may self-check with `ponytail-review` before handing over, but that is not the independent review.
- **Git and GitHub:** `gh` is authenticated as jasuoh. The committer may push step branches, open PRs against `kpriya42/vibecode-workshop-mega_vibe_coders` (always pass `--repo`) and merge them after an independent APPROVE on the exact head SHA. Planning-only docs the human agreed directly may merge without a separate review. Deploying still needs the team's explicit release instruction.

## Authoritative homes

IDEA.md owns the problem. PLAN.md owns planned outcomes, step status and dependencies. `.ai/context.md` owns the current focus. Step evidence owns proof and review. Session files own decisions and handoff history. GitHub PR state owns whether a PR merged; link it rather than maintain a second board.

## Starter commands

- `npm ci` — install the locked dependencies (the starter has none).
- `npm test` — HTTP behaviour and deployment-contract tests.
- `npm start` — app on `0.0.0.0:3000` by default.
- `npm run doctor` — environment diagnosis.
- `npm run deploy:preview` — print the proposed `vc-app` user drop-in without changing services.
- `npm run deploy` — release on the assigned workshop guest as `vc-team`, without sudo; see docs/deploy.md.
- `npm run smoke -- https://ASSIGNED-URL` — check the served revision (run on your laptop for public HTTPS).

## Framework replacement contract

If your team replaces the starter with Next.js, Vite, or another framework, you must preserve these deployment contracts:
1. **Preserve scripts in package.json:** keep `"deploy": "node scripts/deploy.mjs"`, `"smoke": "node scripts/smoke.mjs"`, `"doctor": "node scripts/doctor.mjs"`, and `"test": "..."`.
2. **Preserve the `scripts/` directory:** `scripts/deploy.mjs`, `scripts/smoke.mjs`, and `scripts/doctor.mjs` must remain in the repository.
3. **Commit the lockfile:** always commit `package-lock.json` (`npm ci` runs during deployment in a memory-bounded scope).
4. **`start` script:** must listen on `PORT` (or default `3000`), binding to `0.0.0.0` or `127.0.0.1`.
5. **`/api/health` endpoint:** must return HTTP 200 JSON `{"ok": true, "revision": "..."}` matching `process.env.APP_REVISION`.
6. **Network restriction:** server applications running inside the container cannot call their own or another team's public `*.intra.land` URL because Cloudflare challenges datacenter IPs. For server health checks inside the guest, probe `http://127.0.0.1:3000/api/health`.
7. **Test contract:** Deploy runs `npm test` first and refuses on failure. When you replace or delete `server.mjs`, delete or rewrite `test/app.test.mjs` (which imports `server.mjs`); keep `test/deploy.test.mjs`, which only imports `scripts/`, or set `"test": "node --test test/deploy.test.mjs"` (or your framework's test runner).

Do not claim hosted acceptance from a local green test. After UI changes, inspect the browser at desktop and phone widths, exercise the user journey and record evidence. Test scope must match the risk; do not manufacture tests merely to obtain a green badge.
