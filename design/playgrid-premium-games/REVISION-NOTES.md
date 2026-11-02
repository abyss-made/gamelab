# Stage A · owner revision

Five revised directions, still design-only. Original approved navy/lime identity and existing portraits remain. Pool, Ludo and Chess are unchanged.

| Game | What changed | Desktop | Phone |
|---|---|---|---|
| Color Stack | Visible opponent fans, original geometric card back, paper depth and stronger social table | [1440](color-stack/desktop.png) | [390](color-stack/mobile.png) |
| Go Fish | Opponent card backs, engraved face/back art, suit distinction, physical private hand, book stacks | [1440](go-fish/desktop.png) | [390](go-fish/mobile.png) |
| Mini Golf | Landscaped 2D botanical course, stone curbs, garden pond, planting, full-height portrait course | [1440](mini-golf/desktop.png) | [390](mini-golf/mobile.png) |
| Property Tycoon | Original miniature city, dimensional buildings, canal, champagne board frame, richer property card | [1440](property-tycoon/desktop.png) | [390](property-tycoon/mobile.png) |
| Battleship | Carrier, battleship, destroyer, submarine and patrol artwork, ocean grid and private fleet view | [1440](battleship/desktop.png) | [390 target](battleship/mobile.png) · [390 fleet](battleship/mobile-fleet.png) |

## Validation

Browser renders cover all eight games at 1440×900, 768×1024, 390×844 and 360×740, plus Pool landscape. Check `layout-checks.json` for the 33 core viewports; the revised inspection checks add a friendly fleet phone screenshot, verify opponent-back counts, fleet view switching, card-selection feedback and reduced motion. All primary controls fit in the viewport. Review artifacts are concept browser screenshots, not working multiplayer captures.

## Boundaries

Opponent cards stay private. Golf’s course polygon and ball/cup positions remain unchanged; the outside garden pond is decorative. Portrait rotation is a proposed client view transform, not new physics. Tycoon retains the original 36-tile order/economy and original building art; the city center is decorative, and ownership uses explicit dots. Naval ships render only on the friendly chart; the enemy chart contains public hit/miss information only.

The owner has approved these revisions and the other three games. Claude must complete production assets and game states using IMPLEMENTATION-HANDOFF.md. Nothing in this revision changes production code, merges or deploys the application.
