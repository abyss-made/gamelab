# PartyPad (placeholder name)

Browser party games with lobbies. No accounts, no database. Version 1 has two games:

- **Draw & Guess** (2-12 players): one person draws, everyone else guesses in chat.
- **4 in a Row** (2 players + spectators).

What's in it: create lobby, Quick Play, public lobby browser, one share link per lobby, host controls (public/private, lock, max players, spectators, game settings, switch game, kick, end game), spectators with Take Seat, winner-stays, vote-kick in public lobbies, chat filter and rate limits, reconnect on refresh, auto start in public lobbies, sounds, mobile layout, ad slot placeholders, and one page per game for Google.

## Run it on your computer

Needs Node.js 18 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000. To test multiplayer by yourself, open a second **tab** (each tab is its own player) or another browser.

`npm test` starts the server and plays both games with fake players (smoke, safety and private-alpha gate checks).

## Private alpha on Render (preparation only)

This repo is ready for a password-protected test service, but **nothing is deployed**. Creating the service is a separate manual action by the repository owner after this change is merged.

### How the access gate works

Set `ALPHA_ENABLED=true` and `ALPHA_SECRET=<long random string>` (16+ characters) in the host's environment. Then:

- Every page, static file and API route needs an access cookie, except `/healthz` (returns just `ok`, no room or player data).
- Visitors without the cookie see a password page. Posting the right password to `/alpha-login` sets an `HttpOnly`, `SameSite=Lax` cookie (`Secure` over HTTPS) valid for 7 days. The password is never put in a URL.
- Socket.IO checks the same cookie on every connection (polling and WebSocket upgrade), so unauthorized clients cannot join rooms.
- Wrong passwords are rate limited per IP (8 per 10 minutes, in memory).
- If `ALPHA_ENABLED` is on and the secret is missing or too short, the server exits at startup instead of running open.
- With `ALPHA_ENABLED` unset, nothing changes: the site is fully open as before.

Limits: it is one shared password, not per-user accounts. The cookie value is derived from the secret, so anyone holding the cookie has access until you change the secret (changing it logs everyone out). Pages are marked `noindex`. **The GitHub repository is public**, so the code is visible to everyone even though the running service is gated. Do not rely on this for anything sensitive.

### Manual steps on Render

1. In Render, create a **new, separate** web service for the alpha (do not reuse a public service). Either use *New > Blueprint* and pick this repo (`render.yaml` at the repo root), or create a Web Service by hand with root directory `node-server`, build command `npm ci --omit=dev`, start command `npm start`, health check path `/healthz`, and the Free plan if available.
2. Set environment variables in the Render dashboard: `ALPHA_ENABLED=true` and `ALPHA_SECRET` (generate one, e.g. `openssl rand -base64 24`). Optionally `SITE_NAME`. Render provides `PORT` and HTTPS; WebSockets work without extra settings.
3. Deploy. Check the service logs show it started (a missing secret makes it exit with an error).
4. Test on desktop: open the `onrender.com` URL, confirm the password page, enter the password, create a room. Test on a phone (different network if possible): open the same URL, enter the password, join the room by code or `/r/CODE` link. Confirm that an incognito window without the password cannot load the game.
5. To stop: suspend or delete the service in Render. To lock everyone out without stopping it, change `ALPHA_SECRET`.

### Free-tier things to know

- Free web services sleep after a period of inactivity; the first visit afterwards takes about a minute to wake up. Check Render's current pricing and limits before relying on this.
- Rooms live in memory. Every sleep, restart or redeploy ends all rooms and games.
- Free services run a single instance, which is what this in-memory design needs; do not scale it to more than one.

## Put it on a VPS (Ubuntu 22.04/24.04)

These steps assume a fresh $6-12/month VPS from DigitalOcean, Hetzner, Linode or similar, and a domain you own.

### 1. Install Node, PM2 and Nginx

```bash
ssh root@YOUR_SERVER_IP
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs nginx
npm install -g pm2
```

### 2. Upload and start the app

From your computer (in the folder that contains `partygames`):

```bash
scp -r partygames root@YOUR_SERVER_IP:/opt/
```

Then on the server:

```bash
cd /opt/partygames
npm install --omit=dev
SITE_NAME="PartyPad" PORT=3000 pm2 start server/index.js --name partygames
pm2 save
pm2 startup        # run the command it prints so the app restarts after a reboot
```

### 3. Nginx in front (WebSockets need the Upgrade headers)

Create `/etc/nginx/sites-available/partygames`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/partygames /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable
```

### 4. Domain and HTTPS with Cloudflare

1. Add your domain to Cloudflare (free plan) and point an **A record** for `@` and `www` to your server IP, proxied (orange cloud).
2. In Cloudflare: **SSL/TLS → Overview → Full**. WebSockets work through Cloudflare by default.
3. For **Full (strict)**, create a Cloudflare Origin Certificate and add it to Nginx on port 443.

Without Cloudflare, use Let's Encrypt instead: `apt install -y certbot python3-certbot-nginx && certbot --nginx -d yourdomain.com -d www.yourdomain.com`.

### Updating later

```bash
scp -r partygames/public partygames/server root@YOUR_SERVER_IP:/opt/partygames/
ssh root@YOUR_SERVER_IP "cd /opt/partygames && pm2 restart partygames"
```

Restarting closes all open lobbies (they live in memory), so update when it's quiet.

## Before turning on ads

- [ ] Pick the real name: set `SITE_NAME` (step 2) and change the default in `server/config.js`.
- [ ] Replace the drafts in `public/privacy.html` and `public/terms.html`.
- [ ] Add a cookie consent banner. Google requires a certified consent tool for EU/UK visitors (AdSense has one built in under Privacy & messaging).
- [ ] After AdSense approval: paste its `<script>` where `index.html` says `AD NETWORK`, swap each `<div class="ad-slot">` for an ad unit, and put your line in `public/ads.txt`.
- [ ] Check AdSense's rules for child-directed content if many players are under 13.

## Where things are

```
server/
  index.js        web server, game pages (/draw-and-guess, /four-in-a-row), /api/rooms
  rooms.js        lobbies, seats, spectators, host controls, chat, links, auto start
  config.js       site name, timings, limits
  filter.js       bad-word list for names and chat (add words here)
  games/          one file per game (drawguess.js, fourrow.js) + index.js to register them
  data/words.json Draw & Guess word list
public/
  index.html, style.css
  js/main.js      home, lobby browser, create/join, lobby screen, chat
  js/games/       the screen for each game
  privacy.html, terms.html, ads.txt
test/smoke.js     automated test
```

**Adding a game:** write `server/games/yourgame.js` with the same exports as `fourrow.js`, add it to `server/games/index.js`, add its screen in `public/js/games/`, and add it to the `GAMES` list at the top of `public/js/main.js`.
