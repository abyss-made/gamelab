# Validation and remaining limits

The final browser match, rendering checks, input checks and full regression run used production source **`28225c3994e16e7e98934e21573b835d6a6c6e78`**. Subsequent changes in this package are documentation and verification artifacts. The before images retain the original Party Gauntlet snapshot, `2e0dc0e29ae0e7253c4074666a416640b232323a`.

## Automated verification

| Check | Actual result |
| --- | --- |
| Complete package test suite | **38/38 programs passed**, zero failed checks, skips or startup errors. Each command in `node-server/package.json` was run serially with its own exit code. [Manifest](test-results/suite.json); adjacent `.log` files contain verbatim output. |
| Party Gauntlet rules | **11 checks passed**: deterministic moving contacts, a resting opponent pushed by a sweeper, safe envelopes, shared motion clock, gate behavior, settings and matching player views. Includes 2,400 putts across four motor phases and 960 gate-layout putts. |
| Existing golf regression | `batch5` passed **274 checks**, including all 36 holes and phase-aware routes. `batch5ui` passed **136 checks**. |
| Backend reliability | **374 checks passed**. Browser reliability passed **49/49 on the first attempt in this run**. No production heartbeat/security settings were changed. |
| Rendering fixtures | **36/36 holes passed**: finite geometry, recessed cups, water cutouts and screen/course mappings. Moving arm poses, replay reconnect, gate locking, reduced motion and a stationary aiming camera passed. [Report](rendering-checks.json). |
| Input/responsiveness | Native mouse/touch, held pull, cancellation, second-finger rejection, exactly one shot on release, opponent replay equality, chat, score and reconnect passed at **1440×900, 390×844 and 932×430**. No horizontal overflow. [Report](input-checks.json). |
| Preservation | The original five courses and original 18-hole tour are unchanged. The shared integrator has an opt-in `keepAwake` hook; **120 differential cases produced identical legacy frames, durations and final balls** with the hook absent. Other games and security/logging/health/shutdown files are unchanged. [Report](preservation-checks.json). |

## Actual browser match

[Full match report](full-course-checks.json) · [Screenshots and recordings](SCREENSHOTS.md)

Two separate browser players completed a normal six-hole match through actual controls: **29 putts, 12 cups, a 14–16 result**, no forfeits and no stroke-limit pickups. One deliberate slime entry produced the correct +1 penalty. The phone player completed an actual touch-played putt into the cup on a motor hole.

All **18 motor-shot checks** matched across clients, including motion metadata, ball samples and impacts. Two authoritative motor contacts occurred during the match and are visible in the recordings. All ten gate replay checks matched across clients. No page errors were reported.

A real Socket.IO transport disconnect/reconnect preserved the player identity and rejoined **941ms into an active powered cycle**. The rendered arm matched the replay clock. A separate full page reload preserved identity and the parked motor phase. Tests do not extend the physics interval or inject game state to create this evidence.

Browser testing exposed a genuine aiming defect: camera movement changed the ball's screen position during touch and turn handoff. The camera now holds during aiming, settles during the post-shot pause before controls unlock, and retains the last ball position after a cup or hazard. The final native-touch and renderer checks include these fixes.

## Difficulty probes

Seven automated two-player rules-level matches produced **83 cups and one stroke-limit pickup across 84 player-holes**. Profiles include exact planned input and 1.5°/3° aim/power perturbations; the larger-noise profile produced the pickup. These probes test reachability and sensitivity, not human enjoyment. [Raw actions and outcomes](balance-checks.json).

**No human playtest feedback has been collected.** [PLAYTEST.md](PLAYTEST.md) provides the outstanding first-time-player and four-to-six-player observation checklist. Physical phones, Safari and hardware-GPU performance were not tested here; browser proof uses Chromium with software rendering and native CDP touch events.

## Review evidence and scope

There are **55 unchanged native PNG captures** and **seven recordings**: desktop/phone full matches, two short real-time excerpts of those matches, and three input-test recordings. Video codec compression preserves source size, frame rate and timing; source hashes and probe records are in [encoding-checks.json](video/encoding-checks.json). The interactive comparison can show one hole at a time or all six, with matching viewport and camera. Separate before/after matches can differ in player names, timers and gate phases.

The [gallery check](gallery-checks.json) passed all six viewport/camera combinations, image dimensions, individual-hole navigation, current links, overflow checks and playback of both displayed clips. [Source hashes](source-manifest.json) identify the tested production files separately from later documentation commits.

Sweepers run **during putts for up to 2.4 seconds**, then park. They are real server-simulated colliders, not continuously running idle obstacles. Existing gates alternate after a putt and are fixed during its replay. This remains a flat physics plane with an angled 3D presentation; it does not add jumping, vertical ramps or procedural maps.

The completed code and automated checks are ready for owner review. Human difficulty/fun feedback remains outstanding. **Nothing has been merged or deployed.** PR #79 remains stacked on #78.
