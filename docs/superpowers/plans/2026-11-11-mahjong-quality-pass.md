# Unity MIX Mahjong quality pass

## Goal

Improve the existing four-player Mahjong game through evidence-based work across rules, CPU play, mobile interaction, presentation, sound, and replay/retention. Preserve online room behavior, privacy, existing characters/artwork, and other Unity MIX games.

## Constraints

- Keep the work in the existing isolated linked worktree and do not touch unrelated shooter/other-game artifacts.
- Keep server-authoritative legal actions, scoring, hidden-hand privacy, and the current four-human room protocol intact unless a verified defect requires a focused fix.
- Do not copy upstream code/art/audio merely because permission was asserted; use existing vendored material only within recorded licenses and test dependencies.
- No production deployment until implementation, independent QA, and regression gates pass. User has authorized production deployment after these gates.
- Record active implementation and QA time separately; never count idle/wait time. Do not claim the 120-minute implementation or 60-minute QA minimum unless actually reached.

## Work sequence

1. Baseline: inspect tracked diff, current tests and UI; record known quality gaps and active work start.
2. Parallel scoped audits: rule/score coverage; CPU strategy/privacy; mobile UX and visual system; character/audio assets; retention/replay and storage; independent QA. Only the coordinator integrates shared-file changes.
3. Prioritize reproducible high-impact issues. For each behavior change, write a failing regression test first, verify red, implement, then verify green.
4. Improve the selected independent areas and review each agent's diff before integration.
5. QA: full Mahjong tests, full repository suite, seeded CPU matches, browser PC/mobile play from deal to hand end, multiplayer synchronization/privacy, and focused edge cases. Fix and rerun failures.
6. If all gates pass, commit Mahjong-only changes, push/deploy to the authorized production environment, then verify public HTTP and a real browser flow. Roll back if production regresses.

## Acceptance evidence

- Exact test command/results and any pre-existing failures.
- Browser checks at 375/390/414px and desktop, including at least one complete CPU hand and multiplayer smoke where environment permits.
- Seeded match stats distinguish legality/stability from competitive strength claims.
- Screenshots and a concise list of remaining unverified areas, including physical iPhone limitations.
- Separate implementation, QA, and deployment active-time totals.
