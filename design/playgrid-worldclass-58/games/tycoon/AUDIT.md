# Property Tycoon · Issue 58 delta audit

Priority **P0**. Current client reference **06609a4**. Approved composition **87d8b35**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/tycoon-desktop.png) · [Phone current capture](../../review/current-client/tycoon-mobile.png) · [Desktop design](../../review/proposed/tycoon-desktop.png) · [Phone design](../../review/proposed/tycoon-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=tycoon) · [Approved specification](https://github.com/abyss-made/gamelab/tree/codex/playgrid-premium-directions/design/playgrid-premium-games)

## Observed current state and scope

Current board and property information are functional but much less tactile than the approved Plaza direction. The hardest gap is turn economics: purchase, auction, rent, upgrades, trading and automatic debt resolution need consistent contextual controls rather than a prettier board alone.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/tycoon.js`; rules: `node-server/server/games/tycoon.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep the original 36-tile Playgrid Plaza, owned-color bands and illustrated city center. Selected property gets a readable deed; current location/owner/level is distinct from local inspection. Do not imitate Monopoly names, 40-tile geometry or copied board/card art.

## Controls and rules discoverability

Tap any tile to inspect without taking a turn action. Buy/auction exist only for the currently eligible landed tile. Auction uses high bidder, minimum valid bid, your cash and Pass. Trade review includes both cash amounts and both property lists before offer/accept. Build/sell needs exact cost and eligibility; insufficient-payment receipt explains automatic upgrade liquidation and bankruptcy, never a manual debt timer or invented loan.

Current action contract / source reference: `Read current node-server/server/games/tycoon.js onAction for phase-specific roll/buy/auction/bid/pass/build/sell/trade payloads (bankruptcy is automatic, not a user action); this package does not introduce a replacement action schema.`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: numbered board stays visible; a focused deed sheet carries full name, group, rent, purchase and phase action. Bottom actions belong to the active phase. Long trade/asset lists scroll inside the sheet with visible headings; never bury automatic bankruptcy explanation behind a horizontal strip.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Dice settles 300ms; accepted travel uses 70ms/tile capped at 650ms, then deed opens 180ms. Cash changes show a signed persistent receipt; no continuous confetti over an auction deadline. Sound: restrained dice, paper deed, soft cash tick. Reduced motion jumps to location and shows transaction line.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: state-driven phase sheets, 36-tile hit map, ownership details, trade review and focus restoration. Engine change: none. Auction end, automatic liquidation, rent formula, net worth and bankruptcy stay authoritative. Example cash values are fixtures, not a second economy.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting | [Desktop + phone pair](../../review/states/tycoon/waiting.html) · [Source](index.html?state=waiting) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Active / controls | [Desktop + phone pair](../../review/states/tycoon/active.html) · [Source](index.html?state=active) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Spectator | [Desktop + phone pair](../../review/states/tycoon/spectator.html) · [Source](index.html?state=spectator) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Unavailable / invalid | [Desktop + phone pair](../../review/states/tycoon/invalid.html) · [Source](index.html?state=invalid) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Reconnect / resync | [Desktop + phone pair](../../review/states/tycoon/reconnect.html) · [Source](index.html?state=reconnect) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / host | [Desktop + phone pair](../../review/states/tycoon/result.html) · [Source](index.html?state=result) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / participant | [Desktop + phone pair](../../review/states/tycoon/rematch.html) · [Source](index.html?state=rematch) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Roll / travel | [Desktop + phone pair](../../review/states/tycoon/roll.html) · [Source](index.html?state=roll) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Auction / bid | [Desktop + phone pair](../../review/states/tycoon/auction.html) · [Source](index.html?state=auction) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Rent receipt | [Desktop + phone pair](../../review/states/tycoon/rent.html) · [Source](index.html?state=rent) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Owned property / build | [Desktop + phone pair](../../review/states/tycoon/build.html) · [Source](index.html?state=build) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Trade offer / review | [Desktop + phone pair](../../review/states/tycoon/trade.html) · [Source](index.html?state=trade) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Debt / sell | [Desktop + phone pair](../../review/states/tycoon/debt.html) · [Source](index.html?state=debt) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Bankrupt / watching | [Desktop + phone pair](../../review/states/tycoon/bankrupt.html) · [Source](index.html?state=bankrupt) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |

## Acceptance / priority

- **P0 functional parity:** Exactly 36 tiles with original names/prices; inspection cannot buy another tile; invalid bids cannot be drafted; trade shows full give/get; rent uses actual level; insufficient payments show automatic liquidation/bankruptcy receipts; no wallet change before authoritative update.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
