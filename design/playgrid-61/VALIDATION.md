# Verification · Issue #61

Real local Chromium checks on November 4, 2026. Design previews only; no production implementation claim.

| Check | Evidence | Actual result |
|---|---|---|
| Character inventory | ASSET-MANIFEST.json / ORIGINALITY.csv | 32 refined additional bases + 3 home-family studies. All 32 additional bases have distinct geometry signatures ignoring paint colors; this is structural evidence, not a substitute for style review. |
| SVG source | check-design.py / build-manifest.py | 35 editable SVGs, 13 layers each, <40KiB each, unique IDs, no scripts/foreignObject/event handlers/external hrefs; paint servers and internal hrefs resolve. |
| Exports | avatar-studio/assets/thumbnails | 105 actual 24/32/48px exports + 35 128px exports, rendered from composed SVG source in Chromium. Preferred-look catalog previews stay vector-sharp. |
| Creator responsive/functional | CHECKS.json | Desktop1440×900, phone390×844, narrow360×740, tablet768×1024 and landscape1024×768. No page overflow; randomize/undo/reset, confirmation/cancel/reload, original profile unchanged, empty recovery, fit constraints, unsaved-exit focus, reduced motion and classic choices pass. |
| Variant structure | CHECKS.json | 639 allowed single-slot configurations composed/normalized; 240 classic e/c pairs normalize unchanged; unknown version fallback and v2 migration checked. This is not a pixel inspection of every accessory cross-product. |
| Cross-slot fit | CHECKS.json / CONFIG-CHECKS.json | Headwear/headphones conflict normalizes to compatible fields and UI describes unavailable choices. |
| Malformed config / byte budget | check-config.mjs / CONFIG-CHECKS.json | Rejects array/object/prototype palette coercion, unknown ID/version; preserves known v2 fields and removes unknown fields; all 35 default configs round-trip within 256 UTF-8 bytes. |
| Error states | screenshots/asset-error-* / storage-error-* | Browser-injected source503 and real Storage.setItem failure produce actual recovery UI; no fake failure button is shipped in the product prototype. |
| Six component frames | CHECKS.json | Pool/Color Stack/Go Fish/Ludo/Tycoon/Golf at1440/390/360 =18 layout/interaction checks; no horizontal overflow or page JS errors. Full-page component captures intentionally include external review controls; they are not proposed whole-game shells. |
| Focused final regressions | REVIEW-CHECKS.json | Portrait world mapping, no commit on release, reconnect input guard, stable card focus, wild picker across refresh, correct pending target name, same-world loupe/pointer cancel, delayed-source Save/reaction race guard, classic sprite fallback, card ID0 selection and five review pages at390px pass. |
| Offline rule evidence | game-feel/build-fixtures.cjs / fixtures.json | Samples from unchanged Pool/Golf physics; prearranged Color Stack action views and Go Fish book view; Ludo movable-token view. These are arranged local fixtures, not live room acknowledgements or completed matches. |
| Manifest / local links | build-manifest.py / REVIEW-CHECKS.json | 217 asset hashes verified; local HTML href/src targets resolve; no HTTP errors in reviewed gallery/context pages. |

Portable archive: `PACKAGE-CHECKS.json` confirms extracted preview/canonical images, creator Save and Go Fish Ace14 work with no HTTP/JS errors. No production game/server code is included in the ZIP.

## Direct visual review

Compared canonical hero with new foundation studies, all characters/tiny-size sheet, matching-config before/after, desktop/390px creator, classic selection, victory expression, tablet layouts and the six component board. Corrected oversized eyes/mismatched animal silhouettes, catalog PNG upscaling, surprised mouth reused for joy, classic swatches shrinking into ovals, hidden eye-style feedback under sunglasses, loading race, pending target naming and same-tick wild/focus preservation.

Screenshot inventory is in SCREENSHOT-INDEX.md. They are actual HTML/SVG/browser renders. The prior whole-game screenshot libraries remain in their original packages and are linked rather than recopied.

## Explicit limits / remaining work

- New vectors are closer in grammar but **not pixel-identical to the painted home artwork**. Texture/pose/soft lighting remain a visual owner-review difference. Hero and classic source assets are unchanged.
- No live Render site, production profile/server/protocol, full multiplayer match, AI play, engine physics retuning or deployment was changed or validated. The existing production npm suite was not rerun because no production code changed; Claude must run it after integration.
- Real iOS/Android, keyboard-open forms, 200% zoom, screen-reader/contrast certification and low-end phone performance remain integration tests. Chromium viewport checks are not those certifications.
- Sounds are a direction, not delivered audio recordings. Exact collision/hidden-card event timing and explicit action acknowledgements are not invented where current views do not expose them.
- Avatar sync/rate limits/optional v3 field are proposed engineering contract, not implemented networking. Prototype saves only its isolated local key. Owner approval of design work does not automatically approve production implementation.
