# Majiang reference integration design

## Intent

Raise Unity MIX Mahjong's tile and sound quality and give its CPU opponents the deeper tile-efficiency and push/fold strategy of the user's chosen reference, `https://kobalab.net/majiang/`, without replacing Unity MIX's mobile flow, multiplayer rooms, server-authoritative legal actions, or score settlement.

## What is confirmed about the reference

- The live `ver. 2.5.4` page uses authored 80×112 GIF tiles, including 34 standard faces, three red fives, and a tile back. The faces stay crisp while being scaled in the board.
- The page plays separate WAV samples for discard, chi, pon, kan, ron, tsumo, riichi, a gong, and a beep.
- Its source repository and `@kobalab/majiang-core@1.3.5` / `@kobalab/majiang-ai@1.2.0` packages are MIT. The top-level package uses jQuery for its original UI; Unity MIX will not add or copy that UI layer.
- The reference AI evaluates expected hand value from shanten, estimated remaining tiles, dora, calls, and public danger. Its AI package expects the Majiang core state model, so Unity MIX needs a narrow state adapter.

## Approaches

1. Embed the complete Majiang page and replace the Unity MIX game. Rejected because it would discard the existing online room protocol, mobile presentation, custom rule constraints, and server-owned privacy boundary.
2. Copy only visual ideas and continue drawing SVG tiles and synthesizing all audio. Rejected because the user specifically prefers the reference's actual tile design and recorded game cues.
3. Use the MIT tile/audio assets and pinned MIT Core/AI packages, adapt a private/public state snapshot for CPU advice, and pass the recommendation through Unity MIX's existing legal-action engine. Chosen: this uses the reference's highest-value assets and strategy while retaining the current server and client contracts.

## Goals

- Use reference tile faces and sounds with the upstream MIT notice, served locally and included in the offline cache.
- Have the CPU consult Majiang AI for discard/call advice using only its own concealed hand and publicly visible game information.
- Accept a recommendation only when it matches an action returned by Unity MIX's `legalActions`; otherwise fall back to the existing policy.
- Keep CPU and online rules, scoring, private views, character behavior, and 375/390/414px layout working.
- Preserve gesture-gated sound and add reduced-volume, non-overlapping replay behavior appropriate to phones.

## Non-goals

- Do not embed the reference site's complete page, jQuery UI, navigation, table layout, or title branding.
- Do not give the AI other players' concealed tiles, wall order, or unrevealed kan-dora.
- Do not change Unity MIX scoring/rule decisions merely to match the reference's default rules.
- Do not claim the reference's full strength until seeded self-play and gameplay review support it.

## Integration decisions

- Vendor only `m0`–`m9`, `p0`–`p9`, `s0`–`s9`, `z1`–`z7`, and the reference tile back, plus the WAV cues actually used. Keep files under a reference-specific asset directory with MIT notice.
- Pin the AI and Core package versions used by the live site. The AI adapter translates Unity tile IDs/melds and visible rivers/dora into Majiang's notation and remaining-tile counts; the server's own `match.js` remains authoritative.
- Map Majiang's result back to one current Unity legal action by tile/meld identity. A mismatch, illegal/no-yaku action, or adapter error uses the existing deterministic legal policy.
- Keep generated cues only for gestures/events with no reference equivalent. Every sound remains off until a user gesture.
- Keep the existing SVG label helper for Japanese screen-reader labels, while tile faces/back use the reference artwork.

## Verification

- Verify all 34 faces, red fives, tile back, and accessible Japanese labels at hand and compact river sizes.
- Verify every sound cue resolves to a bundled file, only starts after opt-in, handles overlap/caps, and caches offline.
- Unit-test tile/meld/round translation, public-only AI inputs, action mapping, fallback, and legality.
- Run the full suite and seeded multi-game simulations with action legality, termination, and point conservation assertions.
- Browser-test the production-like local page at 375/390/414px, CPU start/discard/CPU reply, online privacy/sync, no overflow, no asset errors, and reduced motion.
- Record that physical iPhone Safari and subjective speaker/headphone audio remain separate checks when unavailable.
