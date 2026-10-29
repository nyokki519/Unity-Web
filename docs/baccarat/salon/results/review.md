# Independent whole-change review

Reviewed approved spec, implementation plan Global Constraints/Review Focus, review-package.diff change inventory and current product source (including the latest native-panel save-error handling). Scope: controller/Session boundary, asynchronous round orchestration, native panels/focus, squeeze pointer lifecycle/fallback, boot/storage recovery. No product edits; full tests belong to independent QA.

## Findings

### Important — repeated persistence failure clears the retry and hides the failure

Location: `public/baccarat/salon-main.js:55-56` (retry dispatch and common perform wrapper), also success at line 23.

The retry action invokes the saved `perform` callback, which catches a repeated SAVE failure internally and installs a new retry. It returns normally to the outer retry action's `perform`, which unconditionally calls `app.success()`. This clears the newly installed retry, hides the top notice, and removes any native-panel error, even though persistence still failed. Remaining message retry buttons become no-ops. This particularly compromises recovery for failed reset inside the native panel and failed async checkpoints.

Repro/proof: Chromium against `/baccarat/index.html`; start; place PLAYER bet; set `SALON.controller.session.commit=()=>false`; confirm. State is `{retry:true,notice:true}`. Click the notice retry without restoring storage. Observed `{retry:false,notice:false,phase:'betting'}`. No debit occurred, but failure recovery UI was incorrectly erased.

Fix: make retry dispatch return directly to the original callback, or propagate operation success/failure through wrappers so an inner failure cannot be overwritten by outer success. Cover two consecutive failures followed by successful exact retry, including native-panel reset.

### Important — squeeze keyboard trap overrides native settings/history dialog

Location: `public/baccarat/salon-main.js:59`.

The document keydown listener only tests whether squeeze is hidden. Settings/history opened from the squeeze leave that host visible behind the native modal. Tab is prevented and directed to the inert background squeeze controls, preventing normal movement through native dialog controls. Escape finishes the underlying card instead of respecting the modal boundary. This violates the accessible live-panels and paused manual-reveal requirements.

Repro: start manual squeeze; open settings from its tools; press Tab / Escape. Source establishes the conflicting handlers; independent QA separately reproduced the Escape failure and root is fixing it. Fix: defer to the native modal whenever `ui.panel.open`, retaining squeeze trap only while it is the active dialog. Verify Tab and Shift+Tab stay within settings, Escape closes it without revealing or discarding the pending gesture, and return focus goes back to squeeze tools.

## Spec compliance and code quality

Financial core files remain unmodified. The controller keeps Session validation/transaction commit as the sole financial writer and upgrades cosmetic reveal to durable transactions. Failed confirmation, reveal, settlement, next, and fresh-session commits preserve the preceding state; rebet retries repeat replacement bets and only confirm once. Round epochs and cancellation checks prevent stale presentation tasks from advancing financial state after cancellation; persisted paid results do not pay again on restoration. No forced outcomes found.

Native HTML interface, independent art/audio modules, preserved classic entry, detailed paper deformation, keyboard/tap completion, pointer capture/cancellation, event-driven renderer, CSS fallback, reduced-motion handling, and module-load retry are present. Native panels pause the sequence; visibility requires explicit resume. Denied storage permits explicit temporary play. These are structurally aligned with the spec, subject to the two interaction defects above and QA's separate layout/audio/visual evidence.

Code separation is sensible: Session owns accounting, controller adapts UI, round coordinates presentation, and squeeze has a single promise completion channel. The two material findings arise in centralized event dispatch rather than financial algorithms. Several orchestrator functions are compressed onto very long lines, making exception nesting and modal precedence harder to audit; formatting is a minor maintainability suggestion, not a release blocker.

No Critical findings. Two Important findings communicated to root before its fixes. This report records pre-fix review evidence; root/QA must verify repaired behavior before publication. No full suite was rerun by this reviewer.

## Scoped fix review

Root updated `runAction` so retry and temporary dispatch return before the common perform wrapper, and updated squeeze key handling to return when a native panel is open. Source review confirms both original causes are removed. QA owns repeated-failure/success and dialog keyboard regression verification.

Follow-through noted to root: asynchronous round retry is `()=>this.run()` in `salon-round.js`; this callback catches its own failure and also lacks success cleanup. With terminal retry dispatch, a successful async checkpoint retry must clear the obsolete error/retry on successful round completion (without clearing a subsequent failure). Otherwise the restored game retains a misleading SAVE notice. Financial state remains protected.

## Final review status

Scoped source confirmation: `salon-round.js` now calls `a.success()` after `a.result()` only in the terminal `phase === 'result'` branch, after epoch validation and successful settlement. Exceptions and cancellation return paths do not clear the error. This addresses the async-success cleanup follow-through while retaining retry on subsequent failure.

All material review findings are addressed in current source. No remaining Critical/Important findings from this review. Final behavioral sign-off depends on the independent QA regressions (including asynchronous reveal failure → restored retry → result with no stale SAVE notice); this reviewer did not rerun the broad suite.
