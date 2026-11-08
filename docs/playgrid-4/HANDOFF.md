# Implementation handoff

## Integration boundaries

All functionality lives in the existing application. No separate demo, runtime dependency, game removal, rules change or authentication change was introduced. Existing gameplay improvements from PR #63 are the starting point. The reference branch was rechecked before delivery; concurrent upstream changes must be reviewed before merging.

| File | Responsibility |
|---|---|
| `node-server/public/js/main.js` | Visual creator, draft/save/fallback, invitation identity confirmation, retained room session, navbar return |
| `node-server/public/js/avatar.js` | Existing SVG composer; stricter palette type validation and retryable catalog/asset failures |
| `node-server/public/js/games/tycoon.js` | Measures available desktop board height after roster wrapping; skips hidden views, refits on return |
| `node-server/public/js/games/drawguess.js` | Desktop expansion keeps chat in the room; mobile adopts/releases chat; resize reconciles both |
| `node-server/public/playgrid4.css` | Scoped creator, return, ad and game-specific desktop layout overrides |
| `node-server/public/js/ads.js` | Central ad mounts, visibility/size/consent guards, unfilled collapse |
| `node-server/public/assets/avatars/` | 35 compatible bases, 35 composed previews, family/preview catalog metadata |

`playgrid4.css` loads after the existing design sheets. Keep these overrides scoped to game IDs and desktop breakpoints. Mobile Pool/Golf canvas rotation and inverse pointer mapping remain in the existing renderers.

## Creator decisions

Three interaction directions were considered: a full-screen gallery-first wardrobe, a radial layered editor, and a split preview/gallery with a separate customization category. The split design was selected because it retains an immediate preview, makes all 35 choices discoverable, works with keyboard-native buttons, and composes the existing SVG layers without a large rendering dependency. On phones it becomes a stacked compact-preview layout. Radial controls were rejected because their precision and keyboard behavior would add complexity without improving this party-entry flow.

The `studio` object owns a normalized draft and a 32-step undo stack. Changing a look does not overwrite the saved v3 character until Save or Save & Join. Reset restores the selected character's defaults. Headphones are incompatible with hats, as enforced by the existing normalizer/server. Classic e/c choices are retained. Failed local saves restore the prior v3 config and show an explanation. Party avatar rate-limit responses keep retrying the most recent save.

`pg_identity_confirmed` differentiates an automatically generated starter profile from a deliberately saved identity. Existing users with a prior profile migrate as returning players. New players require a name at invite entry. Explicit successful saves also mark the identity confirmed, so choosing a player on the homepage is retained when an invite opens.

`pg_active_room` is session-scoped. It reuses the existing `pg_token`; it does not manufacture a second seat. On refresh, the server validates the remembered room through the existing silent join. An invalid room clears local active-room state and explains the result. The server still controls membership, full/locked/closed rooms, spectators, host transfer and reconnect handling.

## Advertisement integration

Defaults make **zero Google requests** and reserve no visible space. Eligible preview/real placements currently require at least **1600 × 950 CSS pixels** and a visible owning screen. The conservative cutoff collapses all placements on ordinary laptops and phones. Keys are `home`, `games`, `lobby`, `game`; `game` sits below chat in the desktop rail.

For an internal visual preview in the browser console:

```js
PGAds.configure({ preview: true });
// Restore production defaults:
PGAds.configure({ preview: false, enabled: false });
```

Future owner configuration belongs in `window.PG_ADS_CONFIG` before `ads.js`, or one centralized call to `PGAds.configure`. Supply your real `publisher` and `slots` values there; no individual game edits are necessary. `enabled` must be true, the publisher/slot formats must validate, and consent must be true before an `ins.adsbygoogle` mount is created. No example/fabricated publisher IDs are included.

Connect the actual consent platform to `PGAds.setConsent(boolean)`. The module emits `playgrid:ad-consent`. After genuine consent/configuration, `playgrid:adslot-ready` provides `{placement, element}` to an owner-supplied loader. That loader must load/init Google's SDK according to the account's requirements, handle ad sizing, and account for subsequent consent withdrawal. **This branch deliberately does not load the SDK or serve ads.** The hook is an integration boundary, not a claim that adding an ID alone fully enables monetization.

An unfilled `data-ad-status` collapses the mount and stays collapsed across room refreshes. Resizing or leaving an eligible screen removes active content. Preview bypasses publisher requirements solely to show labeled placeholders; leave it false in production. There is no mobile ad treatment or SDK/CMP integration to approve in this branch.

## Assets and reproducibility

Run `python docs/playgrid-4/character_personality.py`, then `python docs/playgrid-4/refine_art.py` to regenerate the compatible material pass and default-look thumbnails. The pass is idempotent. SVG metadata retains layer slots and unique IDs; the runtime composer prefixes IDs per rendered instance. No third-party artwork was added.

Current thumbnails live in `public/assets/avatars/previews/<id>.svg`. `catalog.json` supplies each character's `preview` and `family`. Treat these as trusted bundled URLs; do not accept arbitrary user SVG or URLs. Saved player configs remain schema v3, not raw markup.

## Remaining creative work

The original homepage art remains the style benchmark. This branch does not replace all 35 silhouettes, proportions, expressions or accessory drawings with individually art-directed new illustrations. Preserve IDs and anchors when completing that work. The visual editor and actual multiplayer integration are ready for review now; do not represent the asset refinements as a finished 35-character redraw.
