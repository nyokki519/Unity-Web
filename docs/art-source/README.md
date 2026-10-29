# Original Unity MIX art masters — 2026-10-29

These three PNG masters were newly produced with image generation for this project, not scraped from a website or another game.

- `vesper-salon.png`: quiet boutique private casino, original walnut panels/emerald upholstery/champagne brass, deliberately dark central negative space, no people/cards/logos/type.
- `vesper-courts.png`: three original engraved upper-body portraits (attendant, queen, king), botanical regalia/brocade, deep emerald/ivory/antique gold. No known people/characters, no card indices/pips/generated typography. Precision ranks/suits are a separate vector layer.
- `shooting-stages.png`:3columns×2rows of original top-down environment paintings. City, factory, sky fortress, orbital field, solar citadel, violet ruins. No ships/bullets/collision meaning/generated labels.

`python tools/prepare-unity-art.py` prepares deployment WebPs; `python tools/generate-baccarat-materials.py` regenerates deterministic maps/community engraving; `python tools/generate-baccarat-cards.py` rebuilds52precise SVGs and deduplicated packed card-data.js. Asset tests assert exact packed/master equality and numeric pip counts; `tools/baccarat-art-check.py` checks rotated back raster symmetry.

Web files remain optimized WebP/SVG. PNG masters are documentation/editing sources and are not requested by games at runtime. Existing community heart-cup mark is user-authorized; no Unity Technologies branding or third-party font/audio/library art has been added.
