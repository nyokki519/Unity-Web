# Reference material provenance

Target: https://playingcards.jp/m/gamble/baccarat/ — captured2026-10-29.
The Unity community operator explicitly states that permissions for the source design, images, sounds and code needed for this reproduction have been obtained. This import relies on that authorization; the private agreement itself is not included here.

- MasunakaSoft / トランプスタジアム game materials:31 game PNG assets and11 MP3 effects. Exact original URLs, frame dimensions and SHA256 are in manifest.json. Files are locally hosted, not hotlinked or re-encoded. Copyright attribution is retained in the game footer.
- Phaser CE2.8.0:MIT, local vendor/phaser-LICENSE.txt.
- SaveCPU plugin:MIT, Ivanix Mobile LLC2014; copyright and license remain in vendor/SaveCPU.js. The source's30fps rendering cap is retained.
- jQuery3.2.1 and jQuery UI1.12.0/Cupertino theme:MIT, vendor/jquery-LICENSE.txt and jquery-ui-LICENSE.txt. Theme images are copied with the CSS.
- Alfa Slab One:OFL1.1, font-OFL.txt; original font resource is recorded in manifest.json.
- Unity deck:the existing community heart/cup artwork and original52-face deck, not the reference card art and not the Unity Technologies logo. The classic variant uses white paper and source-like black edges, rasterized into144×200 frames; generation and hash are in ../classic-cards.json and tools/generate-baccarat-classic-atlas.py. VESPER masters are unchanged.

The source game.js1.1.1 and shared library3.6.2 were read to confirm geometry, blend modes, tween paths, durations and sound calls. The integration does not bundle their account/PlayFab/Photon, ad, purchase or tracking code. Only the rendering libraries and assets named above are shipped. No reference playing-card atlas is distributed.
