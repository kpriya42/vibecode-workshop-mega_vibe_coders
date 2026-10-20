# Session — 2026-10-20 project lead, M1 plan

## Decisions

- The assigned idea "Queue Together" went through two reframes. A coffee-machine queue was dropped; then a live table tennis queue became booking slots and finding players. The team said the real need is booking a table for a group or finding people who want to play.
- A slot is one table at one time with 2 (singles) or 4 (doubles) spots. The booker fills some spots, and the rest are open for others to join. One model covers both booking and finding players.
- Two tables with one QR code each, 30-minute slots, today only, Europe/Berlin time. Hours are in config.
- Identity: a typed 42 intra login shown as a profile link. It isn't verified. Cancelling or leaving is limited to the browser that made the booking or join.
- Moved to M2: admin page, "Sign in with 42", live updates and notifications, fairness limits, QR code shown in the app.

## Handoff

State: IDEA.md, PLAN.md and .ai/context.md merged in PR #1. The team agent setup (Claude builds, Codex reviews) is recorded in AGENTS.md.
Next step: start a fresh milestone-lead session for M1. Get the organiser handout to unblock M1.1.
Half-done work: none.
Branch / reviewed SHA / PR: plan merged as 5fea7a4 (PR #1); agent setup on m0-agent-setup.
Checks and limitations: documentation only. No code changed and no tests run.
