# Playgrid 3.0 · one-pass design proposal

Brief: [Issue #37](https://github.com/abyss-made/gamelab/issues/37). **Design only; owner approval required before revision or implementation.** HTML files are reusable visual specifications with illustrative data and inert controls, not a working application. No production files were modified.

## Review files

- `desktop-overview.png`: 1440px shared party hub plus Play / Games / Rooms route hierarchy.
- `desktop-modals.png`: 1440px Create Party, searchable picker, game settings and results component sheet.
- `mobile-lobby.png`, `mobile-picker.png`: separate 390px layouts, captured with a 390 × 844 viewport (full-page output).
- Corresponding HTML and shared `design.css` provide inspectable geometry and styles. They reference existing local artwork; open through a local HTTP server at the repository root.

## Experience and reusable components

**Create → Invite → Choose → Ready → Play → Same lobby.** No game is required to create a party. Creation asks only visibility (private default) and spectators (allowed default); no naming step. “The Friday Crew” is illustrative room naming, not an additional required input. The initial lobby displays an empty game slot with **Choose a Game**, an invite code, roster and chat. The populated state is shown in the proposal. Keep the party ID, roster, chat and queue when changing games.

| Component | Behavior and states |
| --- | --- |
| Navigation | Play `/`, Games `/games`, Rooms `/rooms`; Profile opens local nickname/avatar/preferences. Rooms is a separate route, never an alias for Games. Preserve a current-party return affordance. |
| Create Party | Two visibility choices plus spectator switch. Create shows busy state, then inviteable lobby. Failure preserves choices and offers retry. No game, difficulty, timer, seat-count or name fields here. |
| Party header | Code with copy confirmation, share/invite and host party settings. Participants see Leave Party instead of host settings. Reconnecting status belongs beside identity, not in a blocking modal. |
| Roster | Explicit host badge and Ready / Not ready. Readiness is proposed new behavior, not inferred from connection. Separate reconnect status. Host transfer updates permissions without navigating away. Readiness is advisory: host can start once the game’s minimum connected player count is met. |
| Game slot | Empty: Choose a Game (host), Suggest a Game (participant). Selected: icon, title, player range and concise settings summary. Host Change action; participant Suggest action. Selection never creates a new party. |
| Picker | Search name/category; All, category chips, Fits our party. Desktop two-column compact grid, mobile full-screen single-column rows with pinned confirmation. One selected game; hover border, clear focus ring, explicit selected check. Escape/Close restores lobby focus. No match: clear query/filter action. |
| Eligibility | Explain disabled state in text. Two-player games remain eligible for a larger party if spectators are permitted: choose two seats and queue the others. Disable when required participants/settings cannot be satisfied; never disable solely because total party size exceeds seats. |
| Voting / queue | Members suggest and vote once per game, with an undoable vote. Host confirms selection; vote totals do not auto-launch. Queue lists waiting spectators in order. Keep proposal actions distinct from host-only confirmation. Mobile “Queue & votes” opens one sheet. |
| Settings | Only available after a game is chosen. Defaults shown first; Advanced contains the complete supported values and game-specific options. Save/Cancel are explicit; participant settings are read-only. Do not discard existing engine options or invent unsupported presets. |
| Results | Existing game results remain intact. Shared action bar only: host Play Again / Choose Another Game / Back to Lobby; participant Ready for Rematch / Vote for Next Game / Back to Lobby. Back to Lobby stays in the same party. Rematch readiness resets for the next round. |
| Rooms | Join by code, current-party card, then public rooms with game/players/Join or Spectate. Empty: “No public parties yet. Start one and invite your people.” Include loading, retry and invalid/closed/locked code states. Never imply persisted personal room history. |
| Games | Search/filter 21 visible games in compact cards; icon, title, range, category, one Play action. Selecting Play creates/returns to a party first, then preselects the game (host confirms if joining an existing party). No individual game-board redesign. |

The local inspected `main` contains only Draw & Guess and Four in a Row. Those are the representative entries in this package; the brief’s complete 21-game inventory must be verified against the implementation branch before population. “At capacity” and “Keyboard focus” tiles on the desktop modal sheet are explicitly component-state specimens, not invented game entries. The mobile no-match box is also a state specimen, not concurrent search results.

## Tokens and layout

Reuse the existing Playgrid mark, hero/portrait artwork, SVG game icons and self-hosted Inter. No image generation or new branding is needed.

| Token | Value |
| --- | --- |
| Page / surface / inset | `#030D17` / `#0A1A27` / `#07141F` |
| Text / muted / border | `#EEF5FB` / `#A4B6C7` / `#253D4E` |
| Primary / on-primary / focus | `#ADFF00` / `#061000` / `#D6FF8B` |
| Spacing | 4, 8, 12, 16, 24, 32px; desktop outer 40px; phone outer 16px |
| Radius | 8px fields/chips; 10px cards; 14px panels/dialogs |
| Typography | Inter 14px body, 12px metadata, 16px section titles, 22–29px headings; phone heading 25px |
| Desktop | 1440px viewport, 1360px content, hub `minmax(0,1fr) 320px`, 18px gap. Modal sheet shows separate dialog specimens; production dialogs max 640px. |
| Mobile | 390px viewport, 358px content, 4 compact roster columns. Stack game slot and chat; queue/votes in a sheet. Bottom actions sticky with safe-area inset. Picker becomes a full-screen sheet; no nested horizontal scrolling. |

Use lime for the primary action, selection and readiness; navy outlined controls for secondary actions. No glow around every card. Keep the shared lobby dominant, with catalog artwork small and functional.

## Implementation boundaries after approval

- Preserve alpha auth, reconnect, host transfer, existing games/tests and room lifecycle. A no-game party is a real room-state change; do not fake it with a preselected invisible game. Define unset game ID, start guards and server-validated host selection explicitly.
- Add real readiness/voting state only after agreement on this proposal; server validates membership, permissions, votes and eligibility. Treat readiness and connectivity separately.
- Use one catalog visibility predicate across Games, search, suggestions and picker. Hide Higher or Lower, Liar’s Dice, Hot Potato and Reversi, retaining their code. Confirm 21 visible entries. Production cache/UI diagnosis is deferred to implementation; it was not performed in this design pass.
- Keyboard: native controls, visible 3px focus, dialog focus trap/return, Escape dismissal, labelled search and live search-result counts. Ready/selected/disabled states need text/icons as well as color. Target controls ≥44px where practical, minimum 24px; announce copy/errors and support reduced motion.
- Test separate routes, no-game creation, eligibility/seat allocation, readiness/host transfer, votes/queues, same-room transitions, all 21 selectors, alpha/reconnect, keyboard and 390px overflow. Do not implement or deploy until owner approves.

## Approval checkpoint

Approve or reject this single consolidated direction, especially advisory readiness, host-confirmed voting and the no-game initial lobby. No revisions, production implementation, commit, PR, merge or deployment are included in this pass.
