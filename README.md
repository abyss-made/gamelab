# Gamelab

Free browser party games with lobbies. No accounts, no leaderboards. Live games: **Draw & Guess** (2-12 players) and **4 in a Row** (2 players + spectators).

The repo holds two versions of the same project:

| Folder | What it is | Design |
|---|---|---|
| `playgrid/` | Current version (temporary name "Playgrid"). One HTML file built for Claude artifacts. Multiplayer runs in the host's browser through the artifact `room` capability. Bots let you practice alone. | Approved navy/lime "Social Arcade" UI |
| `node-server/` | Earlier standalone website: Node.js + Express + Socket.IO server, ready to host on a VPS. | Playgrid 2.0 frontend ([screenshots and QA](docs/playgrid-2.md)) |

## playgrid/

Files:

- `playgrid-src.html` - the source (HTML, CSS and JS in one file). It has two placeholders: `%%WORDS%%` and `%%SHARE_BASE%%`.
- `words.min.json` - the Draw & Guess word list.
- `build.py` - fills the placeholders and writes `playgrid.html` (what gets published) and `site/index.html` (a local test copy).
- `mock.js` - a stand-in for the artifact `room` capability that uses BroadcastChannel, so several browser tabs can play together locally.
- `pg.py` - Playwright UI test (solo Draw & Guess, solo 4 in a Row, two-tab lobby, phone layout). Screenshots go to `pshots/`.

Run it locally (needs Python 3; the test also needs `pip install playwright` and a Chromium):

```bash
cd playgrid
python3 build.py https://claude.ai/artifact/LzNKon9ttiHPLnBLL7yMKZ playgrid-src.html playgrid.html
cd site && python3 -m http.server 8765
# open http://localhost:8765 (open a second tab to test multiplayer)
# in another terminal, from playgrid/:  python3 pg.py
```

Opening `playgrid.html` directly in a browser does not work: it expects the Claude artifact runtime (`window.claude`). Use `site/index.html`, which has the mock built in.

## node-server/

Needs Node.js 18 or newer.

```bash
cd node-server
npm install
npm start        # http://localhost:3000
npm test         # starts the server and plays both games with fake players
```

Settings come from environment variables (see `node-server/.env.example`): `SITE_NAME` and `PORT`. Hosting steps (VPS, PM2, Nginx, Cloudflare) are in `node-server/README.md`.
