# Reference access and observation — 2026-10-29

Benchmark: https://playingcards.jp/m/gamble/baccarat/

## Access chronology
Initially HTTPS CONNECT returned403 under the managed restricted host policy. The user subsequently published a network configuration permitting access. The enforced policy was checked before browsing. No proxy bypass or TLS verification disable was used. Browser TLS trust was limited to the environment proxy certificate SPKI.

## Actually observed
Normal guest play: choose PLAYER, then denomination100, then DEAL. PLAYER9♠/6♣/4♥ totals9; BANKERA♣/5♦ totals6. Wallet50,000→50,100. WIN200 contains principal100 and profit100. The repeat-bet Yes/No dialog was displayed. Its completed return transition was not verified. The capture viewport was800×1300 with a640×960 canvas and viewport metadata640; this does not establish physical iPhone layout.

Reference assets were not imported. Private reference captures remain outside the repository. The original comparison matrix is in `../superpowers/specs/2026-10-29-vesper-table-design.md`.

## Not verified
Reference history/roads interaction, all rule branches, long-session performance, physical iPhone audio/touch/Safari behavior. Do not infer these from the single observed round or claim comprehensive superiority.
