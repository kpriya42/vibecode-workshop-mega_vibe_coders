# Current focus

Milestone M1 (human owner jasuoh), led by a Claude Code milestone-lead session on 2026-10-20.

- Live: https://team-02.intra.land serves main `da5bb14`. That release contains M1.2 (slots), M1.3 (book), M1.4 (join, leave, cancel, profile links), M1.5 (persistence), and the UI steps M1.7, M1.8 and M1.9 (Ping Pong 42, one tap to book or join). Bookings persist under `~/.local/share/vibecode-workshop/data/` on the guest, and real bookings survived the da5bb14 redeploy.
- Next: M1.6. Real players use QR stickers for `/table/1` and `/table/2` on their own phones and run the IDEA.md journey. Record one observed problem and turn it into a new step. This also closes M1.1's phone and collaborator-access checks. Then jasuoh accepts the milestone (or doesn't) and M2 gets planned.
- Pipeline per step: Claude coder subagent → Codex `codex exec` review (rounds until APPROVE on the exact SHA) → Claude committer subagent → PR with `--repo kpriya42/...` and merge → release on jasuoh's instruction. Parallel steps use separate git worktrees.
- The fork has no CI; PR checks report "no checks". Local system Node is v20 and the home disk is ~99% full, so steps used a verified Node 22.23.3 binary in the session scratchpad. The guest runs Node v24.
- SSH to the guest uses a local `~/.ssh/config` alias `team-02` with the handout key and known_hosts. Connection details stay off the repo.
