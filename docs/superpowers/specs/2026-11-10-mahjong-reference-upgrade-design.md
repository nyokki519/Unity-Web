# Mahjong Reference Upgrade

## Intent

Raise the quality of the Unity MIX Mahjong match screen and CPU opponents by applying the useful engineering ideas visible in `gimite/mjai` and `kobalab/Majiang`: server/rule-authoritative legal actions, explicit turn states, a readable tile-first board, and an AI policy that evaluates tile efficiency and visible danger. The existing rules engine, online protocol, character artwork, and scoring remain the source of truth.

## Goals

- Replace text-only tile faces on the hand, rivers, melds, and dora with a consistent original, accessible vector tile renderer.
- Improve the CPU's discard choice using shanten, visible ukeire, dora retention, and public safety information without reading hidden hands or the wall.
- Give CPU characters modestly distinct risk preferences while keeping their action legality identical.
- Keep mobile hand scrolling usable at 375/390/414px, preserve online privacy, and respect reduced-motion preferences.
- Add focused regression tests and a browser capture of the resulting phone table.

## Non-goals

- Do not import or copy either reference repository's code, UI assets, fonts, or tile art.
- Do not replace the existing engine, change match rules/scoring, add dependencies, or alter the online room protocol.
- Do not claim competitive-strength or commercial-grade Mahjong AI; the CPU remains a lightweight local opponent.

## Approaches considered

1. Replace the engine/UI with an existing package. Rejected: larger compatibility and licensing surface, new dependencies, and unnecessary risk to the established server-authoritative rules.
2. Improve the current engine's policy and presentation in place. Chosen: preserves tested legal-action/scoring code, applies Majiang's separation of core/UI/AI and MJAI's explicit action model, and lets us build original Unity MIX tile art.
3. Change only the art. Rejected: the current CPU's shanten-only choices remain visibly weak even after the table looks better.

## Reference and licensing notes

- `gimite/mjai` README and gemspec describe the source as New BSD; the checkout has no standalone license file. Its protocol/action separation and test-oriented shanten/hand logic are reference material only.
- `kobalab/Majiang` declares MIT. Its README documents separate core, AI, UI, and server packages; its UI uses explicit tile sizing, focused keyboard actions, and table-layout primitives. Its code and art are not copied.
- All new tile drawings and presentation code are original Unity MIX work; no dependency is added.

## Implementation decisions

- Create a focused browser module that renders tile IDs into SVG faces and exports the existing Japanese accessibility label alongside the markup.
- Use only the acting CPU's hand plus public rivers, melds, dora indicators, and public riichi state for AI evaluation; do not inspect opponent concealed hands, live wall, or dead wall.
- Rank legal discards first by shanten, then expected visible ukeire and retained bonus value, then a bounded public danger penalty. Preserve the legal action object from the engine.
- Apply character-specific weights only to tie-breaking risk/bonus terms; do not change legal actions, hand outcome, or expose private state.
- Replace tile text in the existing mobile board with vector faces while retaining scrollable own hand, readable opponent rivers, and accessible action labels.

## Quality checks

- Verify tile rendering for all 34 types and 3 red fives, accessible names, and no unsafe markup.
- Verify CPU improvement on fixtures where equal-shanten discards have different ukeire; verify genbutsu preference under a public riichi threat.
- Verify hidden opponent hands/wall changes do not affect the CPU decision for a fixed seed.
- Run Mahjong tests, full suite, mobile browser screenshots at 375/390/414, and ensure no horizontal page overflow.
- Preserve reference URLs and findings in this document; do not claim a physical iPhone test.
