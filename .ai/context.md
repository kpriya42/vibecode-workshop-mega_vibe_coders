# Current focus

Milestone M1 (human owner jasuoh), led by a Claude Code milestone-lead session since 2026-10-20.

- Live: https://team-02.intra.land serves main `279eb16` (M1.2 slots + M1.3 booking). Bookings are in memory until M1.5 merges and is released, so a restart or deploy clears them.
- In progress, in parallel: M1.4 join/leave/cancel (`m1.4-join-leave`, main checkout), M1.5 persistence (`m1.5-persistence`, separate worktree; must be rebased onto M1.4 and re-reviewed), M1.7 front page (`m1.7-front-page`, separate worktree).
- Pipeline per step: Claude coder subagent → Codex `codex exec` review → Claude committer subagent → PR with `--repo kpriya42/...` and merge. Deploy only on jasuoh's explicit release instruction.
- Open for M1.1: a teammate on a phone; collaborator access for every teammate.
- The fork has no CI; PR checks report "no checks". Local Node is v20; steps use a verified Node 22 binary outside the repo.
