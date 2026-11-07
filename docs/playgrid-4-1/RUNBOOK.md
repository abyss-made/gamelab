# Playgrid 4.1 platform runbook

Scope: server reliability, diagnostics, load testing. No gameplay or UI changes.

## What changed (this PR)
- `server/log.js`: structured JSON logs (`evt`, `level`, `t`). Room codes appear only as an 8-char salted hash (`room`), tokens are scrubbed; names/chat are never logged.
- `server/index.js`: security headers (nosniff, same-origin referrer, SAMEORIGIN frames), `/healthz` (503 while draining), `/api/health` (aggregate counts, memory), graceful SIGTERM/SIGINT shutdown with an 8 s hard stop, a non-zero exit on listen errors (EADDRINUSE/EACCES), and process-level `uncaughtException`/`unhandledRejection` logging so one stray error is logged instead of silently killing every room.
- `test/platform.js` (in `npm test`): health, headers, adversarial socket input (junk payloads, prototype pollution, oversize packets, join flooding), log privacy, clean shutdown.
- `scripts/loadtest.js`: repeatable local load test (`npm run loadtest -- 40 4 10`).

## Diagnosing an outage
1. `curl https://<host>/healthz` → `ok` (200). `shutting down` (503) = deploy/restart in progress. Timeout = service asleep (free plan) or crashed: check Render Events.
2. `curl https://<host>/api/health` → `rooms`, `members`, `sockets`, `rssMb`, `heapMb`, `uptimeS`. A small `uptimeS` means a recent restart (rooms are in memory and are lost on restart; clients rejoin by token only if the room still exists).
3. Render logs: filter `"level":"error"`. Events: `room_loop_error`, `handler_error` (with `event` name and a 6-line stack), `uncaught_exception`, `unhandled_rejection`. Correlate lines for one room with the `room` hash.
4. Memory climbing with flat `rooms`/`members` → suspect a leak; capture `/api/health` over time. Free plan has 512 MB.

## Performance regression check
Run `npm run loadtest -- 40 4 10` before and after a change (local only; never against production).

Baseline (this PR, 4 vCPU container, Node 22): 40 rooms × 4 players, 10 s steady traffic, 0 errors:
every room starts a real Tic Tac Toe match and players send valid moves (matches end in ≤ 9 moves, so gameplay volume is small; the script fails if no move is applied); join p50 14 ms / p95 185 ms (burst of 160 simultaneous joins); rejoin p50 44 ms / p95 60 ms; chat fan-out p50 0.7 ms / p95 13 ms / p99 20 ms; ~950 events/s; server CPU ≈ 6 % of one core; RSS 83 → 107 MB. No bottleneck was found, so no optimisation was made (none is justified by data).

Known limits: single process, in-memory rooms, localhost network, Tic Tac Toe only (chat plus a few short matches), no browser load. Game-heavy traffic (Draw & Guess strokes, Chess Hard bots ≈ 270 ms event-loop block) is not covered.

## Deployment troubleshooting (Render)
- Blueprint: `render.yaml` (`healthCheckPath: /healthz`, `autoDeploy: false`). Deploys are manual and need owner approval.
- Deploy fails at boot: with `ALPHA_ENABLED=true` and no/short `ALPHA_SECRET` the process exits on purpose.
- Deploy hangs: SIGTERM now drains within 8 s; if it still hangs check Render's shutdown timeout.
- Static assets: JS/CSS are `no-store`; other assets `max-age=1h`. Left unchanged to preserve cache invalidation for new assets.

## Not done / owner decisions
- No CSP header: the client relies on inline script/style; adding one needs a client change (coordinate with SOL).
- Heartbeat tuning (phone silent-disconnect ≈ 45 s) and idle-stall policy (#42) remain owner decisions from the 3.2 report.
- Room lifecycle audit: existing `reliability.js` harness (380 checks) passes; no new reproducible lifecycle bug was found in this pass.
