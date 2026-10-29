# Baccarat salon browser QA

Command: `python test/baccarat-salon_browser.py`

URL: http://127.0.0.1:3483

- PASS independent title and session startup
- PASS chip-first all sides undo clear preserve wallet
- PASS natural banker exact commission and no duplicate settlement; repeat
- PASS legal natural tie pays 8:1 and pushes main bets
- PASS legal six-card third draw and real pointer gesture followed by skip
- PASS saved result reload does not repay
- PASS failed confirmation is atomic and retry charges once
- PASS failed settlement and next retry exactly once without hidden debit
- PASS interrupted committed round resumes once; rebet failure and retry
- PASS native panels focus Escape and keyboard wagering
- PASS 375 390 414 desktop fit and minimum 44px buttons
- PASS denied storage explicit temporary play; quota startup retry has no phantom session
- PASS failed reset preserves prior session and offers usable native-panel retry
- PASS async reveal save checkpoint retry clears stale error and settles once

Screenshots: .superpowers/sdd/baccarat-salon/mobile-banker-receipt.png, .superpowers/sdd/baccarat-salon/viewport-375.png, .superpowers/sdd/baccarat-salon/viewport-390.png, .superpowers/sdd/baccarat-salon/viewport-1440.png, .superpowers/sdd/baccarat-salon/viewport-414.png

Final full run exited 0 with all 14 groups passing; no page errors. Additional assertions include settings/history pause while squeeze waits, native Escape closes the top panel, direct pointer movement changes card progress, and all six dealt cards remain within their own hand column at 375/390/414/1440px. Visible buttons meet 44×44px minimum without overlaps or horizontal page overflow. Context uses reduced motion.

Async reveal checkpoint regression: reject durable reveal writes after confirm; verify zero revealed cards and one reserved stake; restore commit and retry; automatic sequence settles one history round, wallet 5,000,095 cents, error notice hidden and retry controls absent.

Initial RED: `.salon-title` missing before new index integration. Integration checks exposed fixes for squeeze skip accessibility, mobile toolbar button size, temporary startup intent, modal error visibility, Escape routing, repeated retry intent, and async success clearing. Tests preserve the shoe's already-dealt prefix and use matching ranks from remaining cards, retaining history validity and the 416-card permutation.
