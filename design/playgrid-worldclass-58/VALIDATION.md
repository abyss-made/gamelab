# Validation and review limits

Validated in local Chromium on 2026-11-04. Browser screenshots are actual renders of the referenced HTML/client, not image-generation approximations. Proposed frames are still design fixtures, not implemented multiplayer games.

| Check | Evidence | Result / scope |
|---|---|---|
| Real current app, private alpha enabled | [Current client report](review/current-client-checks.json), `review/current-client/` | 20 games × desktop/mobile = 40 initial-game captures, plus unchanged home at both sizes; no JS page errors. Real local Express + Socket.IO; host plus non-playing fixture peers. |
| Proposed state layout | [Frame report](review/game-checks.json), [Failures](review/game-failures.json) | 247 major states × 1440×900 / 390×844 / 360×740 = **741 checks**. No JS errors, missing game images, page overflow or detected controls clipped by non-scrollable hidden containers. Scrollable detail/hand containers are intentional. |
| Full-size state captures | `review/states/{game}/` | **494 JPEGs**, desktop + phone for every state; each pair has an HTML review page and per-game audit links. |
| Active captures | `review/proposed/` | 20 games × 3 sizes = **60 PNGs**; required desktop/mobile pairs appear in five screenshot boards. |
| Local interaction drafts | [Interaction report](review/interaction-checks.json) | Desktop + phone: Pool aim/keyboard/local lock, Golf aim/action dock, Color Stack wild/keep-pass, numeric Go Fish ask, Ludo intent indices, Battleship picker/repeat guard, Chess promo/two-tap resign, Tycoon bid validation/two-sided trade, text Enter. No server acceptance simulated. |
| Avatar Studio | [Studio report](avatar-studio/studio-checks.json) | 1440×900, 390×844, 360×740: 32 characters/24 classic choices, local Save/reload, original profile unchanged, compatibility denial, unknown config fallback, reduced motion and dialog focus return. |
| Avatar assets / modules | Same scripts + interaction report | 32 SVGs parse, all 12 layers present, each <32KiB, no script/foreignObject. 32 transparent PNG thumbnails. **530 allowed single-module variants** rendered; **240 legacy e/c configurations** normalize unchanged; unknown future version falls back. This is not exhaustive testing of every cross-product of modules/expressions. |
| Golf source/art | `assets/golf/geometry.json`, `manifest.json`, [Course sheet](assets/golf/review.png) | 18 source holes, 36 wide/portrait SVG derivatives. Existing geometry and hazards reused; no new rules/physics. All 18 wide assets rendered. |
| Static sources | HTML local link resolution; `node --check` on new JS | Existing local HTML href/src targets resolve; new JS syntax passes. Minimal canonical font/mark/portrait/hero resources reused. |
| Portable archive | `build-package.py`, `check-package.py`, [Archive report](review/package-checks.json) | ZIP integrity; extracted archive gallery, explorer viewport switch, comparison images/links, Studio search/family filter; results reported separately after packaging. |
| Scope | `git diff 06609a4 -- node-server` and staged-path check | No production client/server change. No merge, deployment, paid AI API or new npm dependency. |

## Visual comparison performed

Reviewed all five desktop/mobile game boards, individual Pool and Golf phone controls, Battleship targeting, Studio desktop/mobile and the complete 32-character tiny-context sheet beside the unchanged canonical home illustration. The package has a per-game side-by-side comparison page using fresh current-client captures. Proposed layouts reuse approved material/composition source rather than presenting those earlier directions as newly created.

Corrections from review: Golf fine aim moved out of player totals into its action dock; removed conflicting baked sample aim marks; created real check/promotion fixture positions; named Battleship ships against the exact FLEET order; preserved legacy ring hue independently of portrait hue; enlarged Studio phone accent targets; corrected Tycoon automatic debt resolution in mockup/copy/handoff.

## What these checks do not prove

No production code changed, so a production regression suite run is not claimed. No complete multiplayer match/AI, physics tuning, real iOS/Android device, keyboard-open form, 200% zoom, full screen-reader or measured contrast certification is claimed. Complex fleet placement, full Tycoon management and live drawing are specified/illustrated, not complete local game engines. Sounds are a direction only, with no audio samples delivered. Avatar sync/schema/rate limiting is proposed engineering work; the prototype writes only its own local preview key.

The **new character SVGs are cleaner and less painterly than the canonical home illustration**. They preserve its family cues but do not exactly reproduce its finish. That is a visible owner-review difference, not hidden behind a claim of identical artwork. Original home artwork and classic portraits are unchanged. New game-feel/avatar decisions need review before Claude integrates them.
