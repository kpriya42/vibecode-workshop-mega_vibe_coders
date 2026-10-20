# Session — 2026-10-20 M1 milestone lead

## Decisions

- **Node 22:** jasuoh asked for Node 22. The system Node was v20 and the home disk was too full to install it there, so a checksum-verified official Node 22.23.3 ran from the session scratchpad. All step checks used it.
- **M1.1 hosting:** the handout arrived during the session (team-02). jasuoh authorised deploys ("deploy after M1.3 merges", then "merge together and then deploy"). Six releases went out, the last one da5bb14. Evidence is in `.ai/work/M1.1/validation.md`.
- **New steps:** jasuoh added scope after seeing the live site.
  - M1.7: a Ping Pong 42 front page. jasuoh chose a static landing page.
  - M1.8: tap a slot to book or join.
  - M1.9: one tap with settings set once. jasuoh chose this over a confirm sheet.
  - Each was briefed with the option chosen, recorded in its brief.
- **Lead assumptions, not yet confirmed by jasuoh:**
  - A booker's group members have no logins and show as "(group of N)".
  - The booking browser may add another login to its own open game.
  - A mistaken one-tap booking is undone with Cancel; there is no confirm step.
- **Damaged data file:** the app refuses to start and leaves the file untouched. Codex accepted this for M1. The site stays down until someone moves the file aside.
- **Parallel work:** to go faster, M1.4, M1.5 and M1.7 were coded at the same time in separate worktrees. Each later merge onto the new main got its own Codex review on the exact merged head.

## Review rounds worth remembering

- M1.3: times like `12:60` created invisible bookings. Fixed in round 2.
- M1.4: `GET /table/2?toString=14:00` crashed the server through a plain-object lookup. Fixed with a Map in round 2.
- M1.9: game and group settings reset after a tap. Fixed in round 2 with a validated cookie.
- All other steps were approved in their first round. Every approval names its exact head SHA in `.ai/work/<step>/review.md`.

## Handoff

- **State:** main = live = `da5bb14`. M1.1–M1.5 and M1.7–M1.9 are merged: PRs #3, #4 and #6–#10, plus docs PRs #5 and this one. M1.1 still lacks a phone check and confirmed collaborator access for every teammate.
- **Next step:** M1.6 with real players and QR stickers (see `.ai/context.md`), then jasuoh's milestone acceptance and M2 planning. M2 candidates are in PLAN.md, now including "show who booked a slot after it ended".
- **Half-done work:** none. The step branches are kept on the fork. The scratchpad worktrees can be removed.
- **Branch / reviewed SHA / PR:** see the PLAN.md table and each step's review.md.
- **Checks and limitations:**
  - No real-phone check.
  - No Safari or Firefox check.
  - The fork has no CI.
  - The one-tap journey was not run on the public site, because no releases booked publicly.
  - Two pitfalls from today are in `.ai/pitfalls.md`: a broad `pkill`, and a deploy chained behind `grep`.
  - The safety classifier was intermittently unavailable during the last release. The lead verified that release's results independently: live revision, PR head, guest status and slot counts.
