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

`npm test` starts the server and plays both games with fake players (49 checks).

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
