# Playgrid · Issue #61

**Avatar Studio 2.0 + targeted game-feel finishing work. Design only; not production implementation.**

This builds on the completed packages at `87d8b35`, `71ca099` and Issue #58 `f478a1e`. It does not repeat the 20-game screen library, replace the homepage or change any production file.

Branch: `codex/issue-61-avatar-studio-2-feel`. [Download portable ZIP](playgrid-61-design.zip).

Start with [CLAUDE-HANDOFF.md](CLAUDE-HANDOFF.md), [the review gallery](index.html), [game-feel deltas](GAME-FEEL-DELTAS.md) and [actual verification](VALIDATION.md). `ASSET-MANIFEST.json` is the source of truth for paths, revisions, provenance and hashes; `avatar-studio/catalog.json` is the render/compatibility catalog.

## Concrete deliverables

- **32 refined additional character bases**, carried forward from the original Issue #58 designs with stable IDs a01–a32. They are not claimed as 32 newly invented characters a second time. Silhouette corrections distinguish fox/shiba/red-panda/raccoon and wide-visor robots; smaller eyes, asymmetric smiles and warm/violet lighting follow the actual home family.
- **3 editable foundation studies** of the actual home gamer, robot and cat, IDs h01–h03. These are separate from the 32 additional-character count. Original painted hero and all classic portrait choices remain unchanged.
- 35 layered SVG sources, 35 sharp default-look SVG previews, **105 actual lobby-size PNG exports (24/32/48px)** and 35 128px exports; fallback SVG; compatibility CSV; originality/licensing inventory.
- Working local Studio: character search/family filter, palette, eyes/expressions, compatible modules, character details, randomize, 32-step undo, reset, save confirmation/cancel/reload, unsaved exit guard, empty/error recovery, optional idle/blink/reactions and OS reduced motion. Classic selection retains all 24×10 combinations. Screens cover desktop 1440px, phone 390/360px and tablet portrait/landscape.
- **Six targeted interaction references**, not six redesigned games: Pool cue response; Color Stack keyed long-hand focus/wild selection; Go Fish pending ask and exactly-once observed books; Ludo shared-cell token picker; Tycoon disappearing-offer review guard; 2D Mini Golf thumb loupe. Reusable DOM/CSS/SVG components and unchanged-engine offline fixtures are included.
- A 20-active-game delta matrix referencing approved work, with new artifacts only where a concrete missing interaction needed one. Removed/hidden games are excluded.

## Real screenshots

[Studio desktop](screenshots/studio-desktop.png) · [390px](screenshots/studio-mobile.png) · [360px](screenshots/studio-narrow.png) · [tablet](screenshots/studio-tablet.png) · [tablet landscape](screenshots/studio-tablet-landscape.png)

[All characters + tiny sizes](screenshots/character-sheet.png) · [Matching-config before/after studies](screenshots/style-delta.png) · [Identity contexts desktop](screenshots/contexts-desktop.png) · [mobile](screenshots/contexts-mobile.png)

[Game interaction boards](screenshots/feel-board.png) · [All individual/state captures](SCREENSHOT-INDEX.md)

## Important corrections / remaining difference

**Correction to my Issue #58 Go Fish handoff:** the actual game uses ranks **2–14; Ace is 14**, not 1. Use this package’s contract and fixtures. Current Color Stack IDs are numeric. Tycoon exposes no trade expiry timestamp, so the offer review has no invented countdown; a vanished offer is “no longer available,” not necessarily “expired.”

The new SVGs are closer to the home family but **do not perfectly reproduce the original painted texture**. Compare the foundation studies beside the unchanged hero. No exact-match claim or production approval is implied. Sounds are specified, not newly supplied audio samples. Networking, real matches, physics and production integration belong to Claude after review.

## Preview and reproduce

From repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/design/playgrid-61/`. No npm dependency is needed by these previews. Browser verification uses the available Python Playwright + `/usr/bin/chromium`.

```sh
node design/playgrid-61/game-feel/build-fixtures.cjs
python3 design/playgrid-61/build-avatars.py
python3 design/playgrid-61/capture-avatars.py
python3 design/playgrid-61/check-design.py
python3 design/playgrid-61/build-review.py
python3 design/playgrid-61/check-review.py
```

The prior approved packages are referenced, not recopied. Rebuild source requires this repository and its existing local game modules. No merge, deployment, paid generation call, account system or new game rule is included.
