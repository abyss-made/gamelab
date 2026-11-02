# Event-to-animation contract

Motion never advances game logic, starts a new turn, accepts an intent or delays a deadline. Update accessible state immediately, then animate a decorative layer from the previous accepted snapshot. Key effects by actual phase/round/turn/action revision; do not replay from unrelated timer or chat renders. Cancel or snap on newer state/reconnect/unmount.

| Trigger | Visual | Duration / easing | Reduced motion |
|---|---|---|---|
| Local inspect/focus | Stable ring / small lift where permitted | Focus immediate; optional 140ms ease-out | Ring only |
| Four in a Row accepted drop / moves changed | Disc falls from column top to accepted slot, settles once | 220ms cubic-bezier(.2,.75,.3,1); persistent last/win ring | Immediate destination and ring |
| TTT accepted mark | Material/opacity emphasis | 160ms ease-out | Immediate mark |
| Checkers accepted move | Translate from last.from to last.to; captured piece fade after accepted removal | Move 180ms ease-out; capture 120ms, no added engine delay | Immediate move/removal; text explains capture |
| Checkers crown/chain | Crown appears; persistent forced-piece/target outline | 180ms crown only; chain persists until actual state clears | Immediate crown/outline |
| Dots accepted edge / ownership changed | Stitch reveal, then patch and owner initial | Edge 140ms; patch 220ms ease-out; simultaneous claims all reflect state | Immediate line/initial + extra-turn text |
| Word Scramble new round | Rack enters once; solved gain receipt only for eligible view | 180ms rack; 200ms gain | Static rack + named gain |
| Word Chain chainLength/turn changed | Link accepted word; update required-letter tile once | 180ms, no time reset | Immediate text / new-turn announcement |
| Categories draft send / myDone / review | Pending text; locked field state; row gains | Pending has no success animation; accepted lock 140ms; review 220ms | Same text/readOnly state |
| Trivia accepted local lock / phase reveal | Stable selected border; simultaneous correct/wrong labels | Lock immediate; outcome 220ms | Static labels/outline |
| RPS myPick / reveal.throwNo / phase | Private lock; both authorized throws reveal together | Lock immediate; shared reveal 250ms | Both throws and named outcome appear together |
| Draw choose/draw/reveal | Word choice entrance, native direct ink, named guess receipt | Choice 180ms; pointer ink no extra tween; accepted receipt 200ms | Ink still direct; instant receipt |
| Telephone myDone / rev prefix changed | Page seal only on accepted myDone; new released entry joins timeline | Seal 180ms; released entry 250ms | Static accepted state / appended entry |
| Bluff myFake/myVote / reveal | Private lock; reveal truth, authors and voters together | Lock immediate; reveal 250ms | Immediate authorized text |
| Impostor local cover / actual phase/result | Cover snaps; local permitted role opens briefly; public phase heading stable | Cover immediate; role 180ms; result 250ms | Immediate correct role/phase text |
| Actual final result | Small trophy/heading emphasis, then persistent board/standings | ≤600ms once; no full-screen blocking confetti | Immediate result |

Reusable motion.css demonstrates presentation classes only. Claude must supply offsets from actual board geometry/accepted snapshots and deduplicate by existing revision IDs. Do not attach drop/king/reveal classes unconditionally inside update(). No server path, timers, scoring, physics or caps change.

Sound: keep existing Sound/mute integration and established result/intent events. No new external audio dependency is needed. Avoid repeating tick/collision/like sounds on render. Every sound has equivalent visible text; do not autoplay background audio. Original audio asset production is not required to implement this visual package.
