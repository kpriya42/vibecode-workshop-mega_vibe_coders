# M1.8 review

Base SHA: 0187eaa864b0ee89b520577652b6df613af5b9a4
Head SHA: 4baee8c6098850c3addd7e718a3665dd5b3ffa77
Reviewer session/provider: Codex CLI (codex exec, OpenAI model family), dispatched by the Claude milestone lead

## What I checked

Confirmed the exact head with git rev-parse HEAD; initial working tree was clean. Read AGENTS.md, reviewer role, review template, IDEA.md, PLAN.md, .ai/rules.md, the M1.8 brief including jasuoh's sketch, validation including the persistence merge, and M1.4's original crash and corrected review. This session did not write the implementation.

Inspected the complete diff against current main, git diff 7ee2064 HEAD, and the original-base cumulative change. Implementation 18050ab adds rendering, CSS and corresponding test changes; becab3b brings in M1.5. Against current main 7ee2064bb8642dc107074fdbf8fba3f223b0ae31, server changes are confined to assets, tablePage and the root route. POST handlers, validators, ownership comparisons, booking shape, persistence, health and entry point are unchanged. git diff against current main for store.mjs, scripts, package.json and package-lock.json is empty. No new dependencies, external fonts/CDNs, secrets or out-of-scope behavior found. git diff --check passed.

All node/npm commands used:

```sh
PATH=/tmp/claude-104216/-home-jawosylu-dev-personal-vibecode-workshop-mega-vibe-coders/99a9365b-6314-49c9-af41-571fb039a30b/scratchpad/node-v22.23.3-linux-x64/bin:$PATH
```

### Automated and direct HTTP results

- TZ=UTC npm test: 79 passed, 0 failed, 0 skipped; /tmp/m18-review-utc.log.
- TZ=Europe/Berlin npm test: 79 passed, 0 failed, 0 skipped; /tmp/m18-review-berlin.log.
- Suites retain booking/join refusals, ownership enforcement, escaping in text and href, race behavior, Berlin time/DST, repository-file/traversal protection, persistence and deployment-contract checks.
- Independently ran node /tmp/m18-review/probe.mjs against the reviewed createApp with fixed time 2026-10-20T10:00:00Z and a real POST-created booking.
- Routes /, /table/1, /table/2, /api/health and /style.css returned 200; /table/3 returned 404. /index.html, /public/index.html, /server.mjs, /store.mjs, /.env and /%2e%2e/server.mjs returned 404.
- public/index.html is deleted and its asset mapping removed. Source search found no dangling runtime reference; docs/deploy.md's index.html mention belongs to a generic framework example.
- Forty query probes: on each of /, /table/1, /table/2 and /table/3, requested slot=<script>alert(1)</script>, toString=1, __proto__=x, constructor=, bare %, malformed %E0%A4%A key, malformed slot value, booked=<b>, booked=14:00 and the original toString=14:00 crash case. Every route retained its expected status, no injected script/b markup appeared, health was 200 after every request, and serialized bookings stayed identical. The Map-based notice lookup remains safe; M1.8 ignores slot query input.

### Acceptance and independent browser results

Inspected and adapted the existing /tmp/m18/journey.mjs CDP driver into reviewer-owned scratch directories, adding --no-sandbox and correcting its optional mobile argument to a boolean for the final desktop run. No repository code was changed. The first desktop attempt measured a default 780px viewport because the omitted mobile argument made the metrics command invalid; it is superseded by the correct 1280x800 run below.

Commands, with the Node prefix above:

```sh
node /tmp/m18-review/journey.mjs 390 844 mobile
node /tmp/m18-review-desktop/journey.mjs 1280 800
NOJS=1 node /tmp/m18-review-nojs/journey.mjs 390 844 mobile
```

Each run started a fresh fixed-clock app through its inspected launch2.mjs, with VC_DATA_DIR pointing to its own /tmp directory. Each launched two separate headless /usr/bin/google-chrome processes/profiles, controlled over CDP. Forms were exercised with Input.dispatchMouseEvent and Input.insertText. The no-JavaScript run sent Emulation.setScriptExecutionDisabled(value: true) to both profiles before navigating; the full journey still passed.

Results at both requested sizes, and in the disabled-script run:

1. A opened /: Ping Pong 42 header, Table 1 selected, 18 slots, no time select. Switching selected Table 2 and navigated to /table/2. Automated assertions also confirm /table/1 has the matching selected state.
2. Tapping Book on 14:00 opened the panel headed “14:00 · Table 2”, with login, Singles/Doubles and group size. Opening 14:30 closed 14:00; exactly one panel remained open.
3. A reopened 14:00, entered jwosylu and submitted singles/group 1. Redirect was /table/2?booked=14:00 with “Booked 14:00. See you at the table!”; exactly the 14:00 table-2 booking appeared, open with 1 of 2 spots left.
4. B opened /table/2: Join available on 14:00, no Cancel. B opened its panel, entered ben42 and submitted. Redirect was /table/2?joined=14:00 with the correct success notice. The slot became Full, with no Book/Join panel, and B saw Leave.
5. A reloaded: ben42 linked to https://profile.intra.42.fr/users/ben42; A saw Cancel and no Leave. B had Leave and no Cancel.
6. Saved JSON contained exactly the expected table/start/spots/players/login and joined player. Stopped the app using its exact child PID; exit was 0 and health was refused while down. Restarted against the same VC_DATA_DIR. Both profiles still saw the full booking and correct player link; A retained Cancel, B retained Leave and no Cancel.

Acceptance mapping beyond the journey: the per-slot test checks every row's Book form and hidden table/time, with no Book on booked or ended rows. Open games have Join; full and ended rows have neither action. Existing ownership tests check refusal and control visibility. Refusal tests retain clear “Not booked”/“Not joined” output. Markup inspection confirms the short how-it-works paragraph is below the slots and no time dropdown exists. Native details/form controls provide the no-JS path.

Measured switch links, summaries, visible panel inputs, segment labels and panel/cancel/leave buttons at home, open panel, booked and final states:

| Viewport | scrollWidth / clientWidth | Minimum control height | Controls under 44px |
|---|---|---|---|
| 390x844 | 390 / 390 | 44px | none |
| 1280x800 | 1265 / 1265 (vertical scrollbar) | 44px | none |
| 390x844, scripts disabled | 390 / 390 | 44px | none |

Logs and screenshots are under /tmp/m18-review/, /tmp/m18-review-desktop/ and /tmp/m18-review-nojs/. Visually inspected phone home, phone booking panel, phone full/joined state and desktop booking panel. The phone layout looks polished and consistent with the agreed sketch: orange wordmark and selected pill switch, clear aligned slot times/actions, compact dimmed ended rows, and a distinct panel with legible full-width fields and submit action. Desktop uses a deliberate centered column. No clipping or horizontal overflow was observed.

### Skipped checks and limits

No hosted acceptance, deploy/redeploy, physical phone, Safari or Firefox check; approval covers local Chrome and HTTP behavior only. Restart persistence was independently verified through the new UI; actual hosted redeploy persistence was not. No doctor/deploy:preview/smoke run was needed for this rendering-only diff. No older-browser accordion compatibility check.

Data and Chrome profiles stayed under /tmp. Drivers closed their HTTP apps and killed only child processes they started, by exact PID. Only this review file was modified; session/context handoffs were omitted to honor the explicit single-file restriction. No implementation fix, commit, push or merge performed.

## Findings

No blocking defects found. No requested taste changes. The earlier M1.4 query crash remains fixed, and the persistence merge preserves the rendering-only boundary.

## Verdict

APPROVE for exact head 4baee8c6098850c3addd7e718a3665dd5b3ffa77. Both 79-test timezone runs, direct query/security probes, the two-profile journey at both widths, no-JavaScript booking/joining, visual inspection and restart persistence passed. This is local approval, not hosted acceptance.
