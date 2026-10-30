# Production verification — 2026-10-30

Play: https://unity-mix.onrender.com/chinchiro/index.html

Implementation commit: `27163b4`. Normal fast-forward push from `49ae0a7` to main; Render auto-deploy. No environment/credential/service changes.

- All23 public/chinchiro files SHA256 match local files: [assets.json](production/assets.json).
- Public375/390/414/1440px actual Chromium play passed. Live physics, selected coins, pause/resume, native dialog close, comparison, exact125 payout, reset, loss/tie, audio and reduced motion: [browser report](production/browser/report.json).
- No page errors in any viewport.
- Existing retro/room/shooting/baccarat code, shared libraries and physical constants are unchanged in the release diff. Local full suite431/431 and recorded prior regression runs remain green.
- [Public mobile screen](production/browser/bet-390.png), [public desktop screen](production/browser/bet-1440.png).
- The win screenshot is a legal fixed-face Match fixture for comparison. The report separately records each real, unforced physical throw.
- Physical iPhone Safari and real-GPU60fps remain unverified. No claim of completed hardware QA.

Rollback if needed: revert27163b4 with a new normal commit, verify prior version and redeploy; no force-push.

This record commit changes only documentation and evidence, not game files.
