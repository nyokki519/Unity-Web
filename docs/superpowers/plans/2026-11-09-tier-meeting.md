# Tier Meeting Implementation Plan

> **For agentic workers:** Use parallel independent tasks; integrate centrally after interfaces are available.

**Goal:** Ship a mobile-first, real-time 2–10 person Tier board meeting game inside Unity MIX.

**Architecture:** Reuse existing event room lifecycle. Keep theme content, pure validation/aggregation, and Tier UI modules separate; add a small central event-flow integration. Do not fork the room server.

**Tech Stack:** Existing Node.js ESM server, WebSocket rooms, vanilla JavaScript DOM/CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-09-tier-meeting-design.md`

## Global Constraints
- 2–10 ready people; every answer is a mapping of provided item IDs to S/A/B/C/D.
- Never expose another player's placements before public reveal.
- Equality is descriptive; no winner or ranked score.
- Mobile touch drag plus tap alternative; support reduced motion and keyboard.
- Reuse existing event mode and preserve all other games.

## Review Focus
- Unassigned item on submit -> reject; tested by backend contract test.
- Identical most frequent Tier -> all tied tiers majority; tested in pure aggregate tests.
- A user joins after round began -> does not enter participant set; existing flow behavior retained.
- Name/prompt/item XSS -> escape in component; tested by UI string test.
- 10/11 ready players -> 10 accepted, 11 rejected; tested in room lifecycle.

### Task A: Theme content
Create `data/tier-themes.json`; validate theme shape and categories. Test variety and IDs.

### Task B: Tier domain logic
Create `src/events/tier.js` and `test/events-tier.test.js`; validate answers, compute descriptive counts and agreement.

### Task C: Standalone Tier UI component
Create `public/js/events/tier.js`, `public/js/events/tier.css`, and UI tests. Export a component mount/render API compatible with event screen props.

### Task D: Central integration
Modify `src/events/catalog.js`, `src/events/flow.js`, `src/events/view.js`, `src/engine.js`, `public/js/events/screen.js`, `public/js/home.js`, and relevant tests. Restrict Tier rooms to 10 participants; route rules, theme selection, confirm/reveal/results, and image share/print affordance.

### Task E: Verification
Run focused and full tests; run multi-browser room flow and mobile widths; inspect screenshots; document run path and unsupported behavior.
