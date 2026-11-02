# Shared system · approved direction

**Approved visual direction; CSS and PNGs are the visual reference. Production state variants must be completed during implementation.** Retain the current Playgrid name, mark, self-hosted Inter and existing original portrait art.

- Shell `#06131D`; deeper header/footer `#041019`; raised control `#142B38`; border `#365061`; text `#F1F5F4`; secondary `#AFC0CA`.
- Platform action `#B3F84C` with dark text `#12200C`; focus `#D6FF8B`. Individual surfaces use their own palettes. Ownership and game-card colors are never replaced with platform lime.
- Inter: 14–16px body, 12px metadata, 10px nonessential labels. Game names remain compact in the shell; do not waste a second hero header in play.
- 8/12/16/24/32px spacing; 9–12px controls, 14–22px containers. ≥44px phone actions. Dense board cells need precise selection, keyboard alternatives or explicit confirmation rather than an impossible blanket 44px rule.
- Selected = stable outline + label/check; focus = separate 3px external ring. Unavailable = reason + non-interactive intent, while private cards remain inspectable. Turn ownership is labeled in words, not inferred from glow.
- Existing player portraits are identity; the game surface supplies personality. No new logo, avatar pack, account system, lobby or monetization redesign.

## Responsive intent

Concepts are rendered at **1440×900**, **768×1024**, **390×844** and **360×740**, plus **844×390 Pool**. Each PNG is the exact viewport, not a stretched image. The layout checks record page bounds and primary-action bounds.

| Game | Desktop | Tablet | Phone / narrow phone |
| --- | --- | --- | --- |
| Color Stack | Opponents along an oval arena, central piles, large fanned private hand, bottom action dock | Same social arrangement, narrower fan | Compact opponent rail, central piles stay visible, fan with a lifted inspection selection and explicit Play. Longer hands will require a Stage B expanded-hand tray. |
| Pool | Horizontal wood table, edge player strip, grouped Aim / Power / Shoot | Horizontal table with controls below | Portrait table is a **proposed presentation transform**, not physics; labels stay upright. Fine aim and separate power below. Landscape uses a right control rail. |
| Mini Golf | Entire existing course visible, head score and low control rail | Center course without changing geometry | Full-width 2D course; short score header, power and Putt below, no overlay over ball/hole. Decorative outside geometry is non-colliding. |
| Ludo | Large center board; players around its perimeter; die and legal choices in a side pod | Die pod becomes a low rail | Full-width board, compact corner-player strips, die plus four legal-token alternatives below. |
| Property Tycoon | Board plus contextual illustrated property card | Property card moves beneath the map | Map stays visible above a short property sheet. Buy/Auction remain immediately accessible; advanced management is a later sheet. |
| Battleship | Two distinct coordinate charts side by side | Retain twin charts if legible; offer precision focus in Stage B | Full-width active chart, fleet/target tabs and an explicit coordinate Fire action. 10 columns cannot fit 44px each: keep aim-confirm and keyboard/precision alternatives. |
| Go Fish | Social table, pond, book display, large hand, explicit ask sequence | Group rank/target controls | Large rank choices separate from card inspection. Ask summary stays beside target choice; sample hand remains readable. Longer hands need a rank-grouped expansion, not tiny faces. |
| Chess | Dominant square board, edge clocks, restrained right move history | History drops below the board | Full-width square; opponent/local clocks above/below; quiet draw/resign controls. Theme choices do not crowd the phone board. |

Implementation must test browser safe areas and visualViewport/on-screen keyboards on real devices. CSS already reserves the footer safe area and reduced motion; static previews do not establish soft-keyboard, touch, orientation-switch or screen-reader quality. Rules/chat use overlays without replacing the game route or party.

## Approved motion and audio direction

- Micro: 100–180ms (focus is immediate); accepted card/piece action: 180–450ms; meaningful celebration: 600–1,000ms, once. Server shot duration and deadlines always win.
- Use transform/opacity; no full-screen shake, rapidly flashing clocks or perpetual turn pulses. A single entrance emphasis is enough.
- Reduced motion: snap to authoritative end positions and preserve textual outcome. Do not hide pending/resolving state or change game timing.
- Original sound briefs only: felt/card paper for Color Stack/Go Fish, soft ivory/wood for Ludo/Chess, restrained cue/rail/pocket sounds for Pool, light turf/cup sounds for Golf, a small register/wood-click for Tycoon, low-energy water/impact sounds for Battleship.
- No sound implementation or audio assets at Stage A. Existing mute persists; no autoplay ambience or sound-only information. Stage B should specify independent low-sensory intensity, bounded gain and no rapid stacked collision sounds.


## Stage A revision: physical objects and richer board materials

Use `revision.css` after `shared.css` for the five revised concepts. Its selectors are scoped to their game bodies. Opponent seats use a public count plus a fan of face-down original backs; the prototype renders one back per card for the sample counts. Keep exact count text even when a long hand is visually compressed. Never derive backs from hidden card values.

Tycoon adds original miniature architecture and champagne edging; naval hulls become recognizable top-down vessels; golf adds landscaped garden material while remaining strictly 2D. These concepts do not authorize new rules, physics, hazards, opponent data or asset loading dependencies. All new assets are editable SVG with no external resources. Use the approved event/motion and responsive requirements in IMPLEMENTATION-HANDOFF.md.
