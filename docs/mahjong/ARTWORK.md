# Unity Mahjong character artwork provenance

## Original generated portraits

The four character portraits in `public/mahjong/assets/` were generated specifically for Unity Mahjong with OpenAI's image generation tool on 2026-11-10. The current production portraits replace the initial pass after review found their illustration quality too low. The user-provided image was used only as a broad quality benchmark for illustration detail, luminous lighting, expressive faces, and costume finish. The new assets are original generated characters, not copied from that image or from an existing anime/game/person. Prompts explicitly excluded the reference's characters, costumes, logo, composition, and other recognizable designs.

| Character | Production asset | Source generation artifact | Art direction |
|---|---|---|---|
| 星乃 モカ | `moka.webp` | `/workspace/generated_images/exec-6960a0f7-b1f6-4df2-b563-3b9a3a5fa01f.png` | Adult café proprietor; chestnut hair, coffee-flower pin, tailored forest-green jacket, porcelain cup, warm brass café |
| 琥珀 すみれ | `sumire.webp` | `/workspace/generated_images/exec-8d66ab2f-7d73-40d8-9143-f77f68158d10.png` | Adult bookshop owner; ink-black/plum hair, fine glasses, indigo embroidered clothes, café-library |
| 深山 焙真 | `houma.webp` | `/workspace/generated_images/exec-fbe2f5c7-1146-4c52-bf75-7f0dd6021726.png` | Adult furniture artisan; espresso hair, forest work jacket, mahjong tile, walnut workshop |
| 小野 コナ | `kona.webp` | `/workspace/generated_images/exec-0dbe4318-42f5-49e2-aea6-e4e153ec08ec.png` | Adult late-night radio host; silver-blue hair, navy tailoring, headphones and microphone, midnight booth |

The WebP exports are 768 × 960 pixels (4:5), approximately 165–204 KB each. The game uses `object-fit: cover`; the character card frame is also 4:5, so full portraits retain their original framing. The compact table portrait crops toward the face, keeping the character recognizable at 48 × 58 CSS pixels. There are no external fonts, logos, or source images embedded in these portraits. Character names, settings, and dialogue remain project-authored.

## In-game state treatments

The portrait cards avoid icon badges over the artwork so the generated illustration remains unobstructed. The current portraits are shared across character states to avoid duplicating large artwork. The focus state uses a small contrast/saturation adjustment, victory adds a restrained gold outline and short motion, and defeat uses a mild desaturation. These treatments are decorative only and do not affect match logic. The existing `prefers-reduced-motion`/in-game reduced-motion rules suppress the victory animation.

## Reproducibility and maintenance

Keep the source generation artifacts with the project record where available. If replacing a portrait, update the matching WebP, preserve the 4:5 crop, and recheck character selection and the compact table portrait at 375, 390, and 414 CSS pixels. Do not add official Unity Technologies marks; “Unity” here is the community name.
