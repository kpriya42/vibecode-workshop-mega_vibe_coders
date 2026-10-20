# M1.7 — Front page

## Outcome

Someone who opens `/` (or the bare team URL) sees that this is **Ping Pong 42**, booking table tennis tables at 42 Heilbronn. They understand the flow in a few seconds and get to table 1 or table 2 with one tap. The page replaces the workshop starter landing page.

New scope requested by jasuoh on 2026-10-20. Agreed choices: a simple static landing page, and the name "Ping Pong 42". A live status summary per table was offered and not chosen.

## Audit

- Base: `main` at `279eb160bc10e3c56f27142da66ff0acf1aac3b1` (M1.3 merged and deployed at https://team-02.intra.land). Branch: `m1.7-front-page`, in its own git worktree at `/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/wt-m1.7`. M1.4 is being coded in parallel in the main checkout on `m1.4-join-leave`, which touches `server.mjs`, `public/style.css` and tests.
- `/` serves `public/index.html`, which is the starter page ("Vibecode workshop", a link to intra.land/vibecode, a health link in the footer). `public/style.css` already has the starter landing styles (`header`, `.wordmark`, `.status`, `.eyebrow`, `h1`, `.intro`, `.steps`, `.number`, `.action`, `footer`, and a mobile breakpoint at 42rem) followed by the table-page styles.
- `test/app.test.mjs` checks that `/` returns 200 HTML containing `<h1>`.
- Node 22: prefix commands with `PATH=/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/node-v22.23.3-linux-x64/bin:$PATH`. Run `npm ci` in the worktree first (there are no dependencies).

## Acceptance

- [ ] `/` shows the name "Ping Pong 42" and a one-line description: book a table tennis slot at 42 Heilbronn, or join an open game. The `<title>` and meta description match it.
- [ ] Two clear, tappable links go to `/table/1` and `/table/2`.
- [ ] A short "how it works" in three steps: scan the QR code on a table (or pick a table), book a slot with your 42 login or join an open game, then play and find each other through intra profile links. Keep the wording honest and don't promise features that aren't built (no notifications, no sign-in).
- [ ] Nothing left over from the workshop starter is visible: no "Vibecode workshop" wording, no intra.land/vibecode link, no "Check this app" health link.
- [ ] The page is usable at phone width (390×844) and desktop (1280×800): no horizontal scroll, readable text, tap targets about 44px or larger. It looks like part of the same app as the table pages, using the same dark palette and fonts.
- [ ] Existing behaviour holds: `npm test` passes under `TZ=UTC` and `TZ=Europe/Berlin`, including the `/` test, and `/api/health`, the table pages and the 404 page are unchanged.

## Boundaries and dependencies

- Static HTML and CSS only. No server logic, no JavaScript, no images or external fonts or CDNs, no new dependency.
- To avoid conflicts with M1.4, change only `public/index.html` if you can, reusing the existing starter classes. If you need CSS, put it in a single clearly marked block at the end of `public/style.css`, and don't edit or reorder existing rules. Don't touch `server.mjs` or the tests.
- Out of scope: a live status per table, QR codes, an admin page, sign-in.
- Don't edit PLAN.md or .ai/context.md.

## Handoff

- Human owner: jasuoh. Milestone lead: Claude Code session (Opus 5.5), 2026-10-20.
- Coder: a fresh Claude subagent on `m1.7-front-page` in the worktree above, using `ponytail`. TDD isn't needed for static copy; the existing `/` test covers the route. It writes `.ai/work/M1.7/validation.md`.
- Reviewer: Codex CLI (`codex exec`), which includes looking at the page at both widths. It writes `.ai/work/M1.7/review.md`.
- Committer: a fresh Claude subagent after APPROVE on the exact head SHA. If M1.4 merges first and the PR conflicts, the conflict resolution is a new head and needs re-review.
