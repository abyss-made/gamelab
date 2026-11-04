# Avatar Studio 2.0 · source, state and data contract

## Canonical family and counting

Actual source inspected: `node-server/public/assets/hero-mascots.png` and `player-portraits.png`. The home characters are a confident dark-haired gamer with rounded glossy sunglasses/navy hoodie; a white rounded robot with deep glass face/lime eyes; an orange/cream cat with sunglasses/lime bandana. Their shared grammar is a large head/small torso, expressive dark tapered ink, warm left light, violet right rim, glass highlights and layered fur/hair/metal. Preserve the exact home raster, mark and navy/lime identity.

a01–a32 are the **32 additional original characters already authored for #58**, refined here. They are not 32 new recolors, and they are not counted again as a second new set. h01–h03 are new editable foundation studies of the existing three home archetypes, outside the additional count. The robot visor and fox/shiba/red-panda/raccoon anatomy pass further reduces the risk of different colors being mistaken for different bases. `ORIGINALITY.csv` records each base’s structural distinction, source and role.

**Remaining review difference:** clean editable vector shading is not an exact reproduction of the painted home texture, lighting softness or pose. Do not replace the painted hero or claim a perfect style match. The three foundation studies and matching-config before/after sheet make this visible.

## Source of truth and rendering

`avatar-studio/catalog.json` catalogVersion **2**; config schema **3**. It defines stable IDs, source SVG, default-look SVG, PNG exports, family/anatomy, preferred look, 13 layers, option allowlists, per-silhouette anchors, detail type and legacy fallback. `ASSET-MANIFEST.json` adds provenance and SHA-256. Change display names without changing IDs; append IDs for new bases rather than reusing retired IDs.

Layers in paint order: backdrop, body, head-back, face, markings, eyes, mouth, hair-front, rim-light, hat, glasses, accessory, detail. Each SVG uses deterministic character-prefixed gradients/symbols/layer IDs. For inline mounting, `renderer.js` prefixes **every instance** again and rewrites paint servers, href and accessible-title references. Module positions come from anchors, not one universal head rectangle. Bare SVG is the editable source; `assets/previews/` applies the preferred look without external resources; 24/32/48/128px PNGs are exports of the composed source.

Six palettes recolor accents/cloth/rims, preserving skin/fur/metal identity. Five expressions and three eye styles; beak anatomy can keep a stable beak while eye expression changes. Hat: none/beanie/cap/crown. Glasses: none/sunglasses/round. Accessory: none/scarf/headphones. Detail: signature/clean, with actual hoodie stitch, scarf pin or panel-mark content. Unique ears/horns/antenna and single-eye visors constrain fitting. See `COMPATIBILITY.csv` for exact availability. Unavailable is a fit constraint, never a paid/locked item. Round-ear animals also reserve their ears (None/Crown and no headphones). Headwear and headphones are mutually exclusive: keep the hat, reset headphones to None with an explanation, and disable that choice while a hat is worn. This cross-slot rule is catalog metadata and normalization behavior, not just CSS.

## Working creator interaction

1. Base selection retains compatible edited options; incompatible modules revert to that base’s compatible default with a receipt. Choosing a base is not Save.
2. Randomize chooses a different base and only compatible options; less than half of random options add accessories to avoid visually noisy stacks. It is cosmetic, not a secure/random gameplay action.
3. Undo stores up to 32 normalized configurations. Reset restores the current base’s preferred look and can itself be undone. Undo never writes the saved profile.
4. Save opens a native confirmation dialog with summary. Keep editing/Escape changes nothing; confirm writes only the design preview key. Dirty exit prompts Keep editing/Discard. Focus returns to the launcher.
5. Search empty state offers Show everyone. Missing source SVG renders preserved classic fallback + explicit error/Retry; Save stays unavailable until the source recovers. Failed local storage leaves the confirmation open, shows an actionable error and leaves the original profile unchanged.
6. The creator has no unlocks, store, identity/account field, external uploads or custom URLs. The sidebar context selector is a design preview of lobby, scoreboard, waiting and game identity; sample name/scores never become production game data.

## Config schema (proposed production contract)

```json
{"v":3,"id":"h01","palette":"lime","expression":"smile","eyes":"default","hat":"none","glasses":"sunglasses","accessory":"none","detail":"signature"}
```

Legacy local representation: `{"v":1,"kind":"legacy","e":23,"c":9}`. The **actual existing server format remains `{e,c}`**. Nothing here changes it.

Normalize exact fields only into a fresh object. All values are enum strings from the bundled catalog. Reject unknown version/ID, arrays, objects, URLs, paths and malformed input; fall back to h01/default or the known legacy fallback. The local prototype migrates known Issue #58 v2 config to v3 by allowlisting old values and applying the new detail default. No arbitrary version coercion. Preserve e0–23 and c0–9 exactly; hue rotation applies only to the portrait paint, not the ring.

- Max normalized config: **256 UTF-8 bytes**. Current configs are below this; do not persist SVG, data URLs or long names inside config.
- Before local JSON parse: **512 UTF-8 bytes** maximum. Malformed/unavailable storage falls back without touching the current profile. Prototype key: `pg_avatar_studio2_design_v1`; never writes `pg_profile` or the prior preview key.
- Production local profile migration needs a reviewed namespaced field; retain e/c as backwards-compatible fallback. Avoid storing reaction state or public game results as profile preferences.
- Catalog revision and config version are independent. Unknown asset/catalog on an older client uses the provided legacy fallback; if portrait loading fails, the bundled minimal robot fallback remains readable with the player name.

## Proposed multiplayer synchronization — not implemented

Current `node-server/server/rooms.js` accepts only normalized e/c. Claude must explicitly implement/review a backwards-compatible optional v3 field (for example `avatarV3`) while retaining e/c for older clients. Do not encode JSON into e, silently replace the current avatar schema or invent undocumented socket events in a UI port.

Server validates the compact config with the same allowlists, compatibility and byte cap. A room member can edit only their own appearance. Coalesce edits locally and emit only on confirmed Save. Suggested profile limit: one accepted edit per 2s, burst 3; final exact event/ack and limit need engineering review. Broadcast normalized IDs/options only, never user SVG/HTML/CSS/URL. Apply alpha/room authorization exactly as now. Reconnect returns accepted configuration; rejected update keeps local draft and prior accepted appearance. No accounts required.

Win/loss/score reactions derive from actual accepted room events. If a manual cheer is later added, use a small transient enum, ≤1 per 3s/burst2, 650ms max display; don't mutate saved config or let a client announce a fake win. No voice, camera, hidden role inference or private game data belongs in avatar sync. The source assets are public identity graphics, not an authorization boundary.

## Motion and performance budget

| Event | Visual treatment | Budget | Reduced motion |
|---|---|---|---|
| Idle (opt-in) | Selected portrait rises ≤1.5px | 8s ease-in-out; one portrait | Static |
| Blink (opt-in/manual) | Eyes close briefly; glasses remain | 140ms; optional 9s interval on selected portrait only | No blink |
| Ready | One short rise | 220ms, ≤4px | Ready text/ring |
| Score | Small rim/delta highlight | 180–320ms, one accepted event | Static signed delta |
| Victory | Joy expression + ≤3° tilt | 500ms; restore saved look by 650ms | Joy/result badge only |
| Loss | Sad expression + ≤4px settle | 350ms; restore by 650ms | Sad/result text |
| Cheer | One gentle tilt | 500ms, no persistent loop | Joy expression |

Only the selected large preview animates; catalog images and lobby fleets do not run blink loops. At most one interval + one reaction timeout in the prototype. Hidden-tab reactions stop, pagehide clears timers, OS reduced motion wins over the optional toggle. Keep ≤5 inline preview instances; use SVG/PNG images for the catalog and production lists. Parse/cache each trusted SVG source once per ID (~35×<40KiB); reuse rendered look hashes in app integration. 24–48px contexts prioritize silhouette/eyes over fine stitching. Performance on real low-end phones remains an implementation test, not a claimed result.
