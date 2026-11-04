# Avatar Studio · asset and engineering handoff

## Art direction and deliverables

Canonical family is the unchanged `node-server/public/assets/hero-mascots.png` and `player-portraits.png`, shown directly in [style review](character-review.html). New silhouettes are original Playgrid designs: 8 humans, 12 animals, 6 robots and 6 fantasy characters = **32 distinct characters**, not palette variants counted as characters. There are no generated stock images or copied IP. All art is editable SVG source; no paid AI service was called.

**Review gap:** new characters share the home family's chibi scale, layered hair/fur/metal, glossy eyes, navy hoodies, dark ink and lime/violet rims, but have a cleaner vector finish than the painted canonical hero. Do not replace the hero or silently call the match exact. Existing classic portraits remain available.

`catalog.json` maps stable IDs a01–a32 to name, family, silhouette, asset/thumbnail path, twelve layers, compatibility, anchors and legacy fallback. Character names are display labels only; persist IDs. `assets/characters/a01-ember.svg` naming continues for all 32; transparent 128px PNG thumbnails are `assets/thumbnails/a01.png` etc. Thumbnails are build outputs of the actual SVGs rendered in Chromium, not alternative artwork.

Each SVG has stable `data-layer`: backdrop → body → head-back → face → markings → eyes → mouth → hair-front → rim-light → hat → glasses → accessory. Symbols for beanie, cap, crown, sunglasses, round glasses, scarf and headphones are packaged inside trusted SVGs. Anchors provide x/y/width/height and do not assume one universal rectangular head. Each character is under 32KiB uncompressed.

## Compatibility and tiny contexts

See [COMPATIBILITY.csv](COMPATIBILITY.csv), generated from the catalog. Human/rounded heads accept broad hats; ears/horns/antenna restrict hats to None/Crown; round ears and axolotl frills restrict headphones; cyclops does not accept two-eye glasses. Selecting a new silhouette preserves compatible modules and resets unsupported modules to None with a visible explanation. Never stretch accessories until they cover the defining silhouette.

Six accent palettes modify clothing/rim/accent only; they do not recolor skin/fur indiscriminately. Five expressions (smile, joy, focused, surprised, sad), three eye treatments (default, bright, sleepy), four hat options including None, three glasses options including None, three accessory options including None. Modules are optional; not every combination is promised for every silhouette. At 24/32/48px, silhouette and major eyes/ears remain readable; fine strand detail deliberately disappears. The review sheet contains all three real sizes for every character, plus a lobby row in Studio.

## Existing choices are preserved

Current client has **24 e choices × 10 c ring colors**. The four canonical portrait quadrants repeat with hue offsets `floor(e/4)*12deg`. Only portrait paint is hue-rotated; the outer c ring stays the exact legacy color. Legacy e0–23/c0–9 all remain selectable. Legacy portraits remain static and do not get fake modules.

The prototype saves ONLY to `pg_avatar_studio_preview_v1`; it does not touch `pg_profile`, current avatar, rooms or server. Save normalizes and limits the serialized config to 256 UTF-8 bytes. Malformed local JSON, oversized input, unknown IDs/options and unavailable assets fall back to a known character/legacy portrait. No account, backend call or image upload is required.

## Proposed v2 config — NOT the current wire protocol

```json
{"v":2,"id":"a01","palette":"lime","expression":"smile","eyes":"default","hat":"none","glasses":"sunglasses","accessory":"none"}
```

Legacy saved design representation is `{ "v":1, "kind":"legacy", "e":0, "c":0 }`; the actual existing server representation remains `{e,c}`.

Current `node-server/server/rooms.js` normalizes only e/c. It cannot sync these modular avatars as-is. Claude must scope/review an optional `avatarV2` field or another backwards-compatible mechanism before implementing synchronization. Do not send this whole object through an existing numeric e field, replace the old avatar object blindly or store user-provided SVG.

Proposed future sync contract:

- Allowlist exact primitive fields and catalog values server-side; reject arrays/nested objects, nonstrings, unknown versions, unknown IDs and incompatible modules. Normalize to a compact accepted config ≤256 UTF-8 bytes; request-body cap before parse and no unbounded strings. Defaults come from the packaged catalog, never user values/prototype keys.
- Persist locally with profile while retaining e/c fallback. Older clients receive legacy fallback. New clients with unknown catalog/asset failure render that fallback plus name/initial; never an empty/broken player tile. Catalog versioning is separate from config v2.
- Use the existing authenticated/private-alpha room membership and authorization boundary. A member can only change their own profile. Suggested profile rate limit: one accepted update per 2s, burst 3; coalesce local edits and emit on Save, not every slider/tap. Limits are proposed, not deployed.
- Broadcast only normalized public config, no raw SVG/HTML/CSS/URL, no arbitrary avatar filename and no filesystem paths. Names remain escaped text. Current canvas/game identity privacy stays unchanged.
- Avatar rendering reads only a trusted bundled path from a catalog ID. Prefix every SVG/clip/gradient/symbol ID per mounted instance (prototype `renameIds`). Never insert untrusted markup. No external SVG references, script or foreignObject.
- Reactions should not mutate saved appearance or let clients claim a win. Win/loss derives from real result. Any future manual lobby cheer is bounded, e.g. at most one per 3s, burst 2, 650ms display; not a secret-role indicator. Scope/rate-limit server messages separately rather than adding undocumented events now.

## Reactions and performance

| Context | Reaction | Timing | Reduced motion |
|---|---|---|---|
| Lobby ready | Single subtle 2px rise + smile | 260ms, once per accepted ready change | Ready text/ring only |
| Score gain | Small rim highlight; retain score delta | 320ms, deduplicated | Static delta |
| Win | Joy eyes/mouth and 4° tilt max | 520ms, one-shot | Joy expression + result badge |
| Loss | Sad expression, 2px settle | 420ms; no humiliating effect | Sad/static result |
| Cheer preview | Joy and one pulse | 450ms; transient | Joy expression only |

Prototype reaction returns to the chosen expression after 650ms and never saves it. Classic portraits stay static. No perpetual blinking across every lobby player. Pause offscreen/hidden-tab reactions; cap simultaneous animations and cache parsed trusted SVG once per ID. Unmount clears timers. Use current name/readiness as accessible content; decorative avatar graphics should not produce repeated live announcements.

## Acceptance before production

All 32 SVGs parse with all twelve layers, no script/foreignObject, no external resources; thumbnails match source. Verify all permitted modules on all silhouettes and denied combinations normalize safely. Confirm tiny context and highest-contrast palettes; actual contrast/user testing remains required. Retain all 240 legacy e/c combinations, safe Save/Reset/reload, corrupt storage fallback, unknown future version fallback and storage-denied behavior. Test multiple SVG instances for ID collisions. Native tabs/arrows, dialog focus and OS reduced motion must work on desktop and phone. New public config must sync/fallback across old/new clients and reconnect only after engineering integration; the local prototype is not evidence of that networking behavior.
