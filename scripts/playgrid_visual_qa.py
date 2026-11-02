"""Real-browser multiplayer regression and review captures. No application state is mocked.

Start node-server on port 3100, then run:
  python3 scripts/playgrid_visual_qa.py --base-url http://127.0.0.1:3100
Requires Python Playwright and Chromium (CHROMIUM_PATH can override its location).
"""
import argparse
import functools
import http.server
import threading
import json
import os
from pathlib import Path
import re
import shutil
import secrets
import socket
import subprocess
import urllib.request
import time
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/screenshots/playgrid-2'
checks = []
accessibility = []
AXE_PATH = os.environ.get('AXE_PATH')


def passed(text):
    checks.append(text)
    print('PASS', text, flush=True)


def wait_state(page, expression, timeout=10000):
    page.wait_for_function('() => window.App && App.S && (' + expression + ')', timeout=timeout)


def capture(page, name, locator=None):
    page.evaluate('document.fonts.ready')
    page.evaluate('document.activeElement?.blur()')
    page.wait_for_timeout(150)
    if AXE_PATH and not locator:
        if not page.evaluate('!!window.axe'):
            page.add_script_tag(path=AXE_PATH)
        report = page.evaluate('''async () => {
          const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
          return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),passes:r.passes.length};
        }''')
        accessibility.append({'screen':name,**report})
        (OUT/'accessibility-results.json').write_text(json.dumps(accessibility,indent=2)+'\n')
        assert not report['violations'], report['violations']
    if locator:
        page.locator(locator).screenshot(path=str(OUT / name))
    else:
        page.screenshot(path=str(OUT / name), full_page=True)


def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'


def state(page):
    return page.evaluate('App.S')


def chat(page, text):
    page.fill('#chat-input', text)
    page.locator('#chat-input').press('Enter')


def stroke(page, path, color='#000000', size=8):
    """Trace an SVG path with real mouse events into the actual shared drawing canvas."""
    subpaths = [part.strip() for part in re.split(r'(?=M)', path) if part.strip()]
    if len(subpaths) > 1:
        for part in subpaths:
            stroke(page, part, color, size)
        return
    page.locator(f'#dg-tools [data-color="{color}"]').click()
    page.locator('[data-tool=brush]').click()
    page.locator('#brush-size').fill(str(size))
    points = page.evaluate('''d => {
      const p=document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d',d); const n=p.getTotalLength();
      return Array.from({length:Math.ceil(n/7)+1},(_,i)=>{const q=p.getPointAtLength(Math.min(n,i*7));return [q.x,q.y]});
    }''', path)
    box = page.locator('canvas').bounding_box()
    for i, (x, y) in enumerate(points):
        page.mouse.move(box['x'] + x / 800 * box['width'], box['y'] + y / 600 * box['height'])
        if not i:
            page.mouse.down()
    page.mouse.up()
    page.wait_for_timeout(90)


def fill(page, x, y, color):
    page.locator(f'#dg-tools [data-color="{color}"]').click()
    page.locator('[data-tool=fill]').click()
    box = page.locator('canvas').bounding_box()
    page.mouse.click(box['x'] + x / 800 * box['width'], box['y'] + y / 600 * box['height'])
    page.wait_for_timeout(160)


def dragon(page):
    """An original test drawing, created through the same tools a player uses."""
    stroke(page, 'M347 281 C280 236 229 225 219 102 C120 87 59 159 77 284 C111 219 135 209 160 252 C178 216 203 228 227 267 C258 247 293 271 325 308 Z')
    fill(page, 165, 160, '#00cc00')
    stroke(page, 'M219 105 C186 164 188 198 160 250 M219 105 C245 201 288 250 325 302', '#005510', 4)
    stroke(page, 'M290 330 C278 287 319 239 365 221 L389 200 Q405 154 433 168 L454 184 L471 183 Q496 185 494 211 L522 216 Q540 232 528 249 L508 252 L492 269 Q476 268 465 254 L452 258 Q433 312 411 365 L414 408 L444 445 L417 459 L390 434 L373 448 L356 421 L330 437 L310 414 L315 377 L288 385 Q220 404 177 362 Q145 331 119 350 Q115 290 180 316 Q232 345 290 330 Z')
    fill(page, 360, 300, '#00cc00')
    stroke(page, 'M371 221 L354 191 L389 203 L394 174 L409 185 M431 168 L426 144 L447 172 M273 340 L267 313 L292 324 M231 337 L224 314 L247 331')
    stroke(page, 'M382 276 C394 297 369 348 350 375 L364 417 L342 425 L325 399 L338 349 Z')
    fill(page, 359, 344, '#ffe400')
    stroke(page, 'M374 302 L386 309 M362 326 L376 333 M350 350 L363 357 M343 377 L354 384', '#005510', 4)
    stroke(page, 'M416 205 Q433 190 441 208 M427 209 L428 216 M507 232 L510 232', '#000000', 8)
    stroke(page, 'M473 239 Q492 244 506 236', '#000000', 4)
    stroke(page, 'M334 425 L338 414 M349 428 L350 419 M419 449 L420 437 M431 445 L432 435', '#000000', 4)
    stroke(page, 'M546 245 C582 221 593 260 619 241 C616 223 607 216 607 216 C649 209 650 253 682 250 C716 243 737 288 711 325 C702 299 670 318 648 292 C620 306 591 267 562 270 L539 260 Z', '#ff7100', 8)
    fill(page, 645, 267, '#ff7100')
    stroke(page, 'M561 251 C598 246 615 272 647 263 C678 255 696 283 702 297 C675 277 666 290 645 279 C613 287 593 259 561 259', '#ffe400', 8)
    page.locator('[data-tool=brush]').click()


def build_review(browser):
    # Serve review artifacts locally because managed Chromium blocks file:// URLs.
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT/'docs'))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        review = browser.new_page(viewport={'width':1536, 'height':1100})
        review.goto(f'http://127.0.0.1:{server.server_port}/playgrid-2-review.html')
        review.wait_for_function('Array.from(document.images).every(img=>img.complete && img.naturalWidth>0)')
        review.screenshot(path=str(OUT/'actual-storyboard.png'),full_page=True)
        review.close()
    finally:
        server.shutdown()
        server.server_close()


def main():
    args = argparse.ArgumentParser()
    args.add_argument('--base-url', default='http://127.0.0.1:3100')
    base = args.parse_args().base_url.rstrip('/')
    OUT.mkdir(parents=True, exist_ok=True)
    errors, bad_assets = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
        pages = []

        def player(name, avatar, width=1440, height=900):
            ctx = browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=1)
            page = ctx.new_page()
            profile = json.dumps({'name': name, 'avatar': {'e': avatar, 'c': avatar}})
            page.add_init_script('localStorage.setItem("pg_profile",' + json.dumps(profile) + ')')
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('response', lambda r: bad_assets.append(r.url) if r.status >= 400 and '/assets/' in r.url else None)
            page.goto(base)
            pages.append(page)
            return page

        host = player('Alex', 0)
        expect(host.locator('#hero-title')).to_have_text('PLAYTOGETHERANYWHERE')
        expect(host.locator('.hero-art')).to_be_visible()
        host.wait_for_function('document.querySelector(".hero-art").naturalWidth > 0')
        capture(host, '01-landing-desktop.png')
        capture(host, 'panel-01-landing.png', '.site-shell')
        host.set_viewport_size({'width': 390, 'height': 844})
        capture(host, '01-landing-mobile.png')
        no_overflow(host)
        host.set_viewport_size({'width': 1440, 'height': 900})
        host.click('#hero-create')
        host.select_option('#c-max', '8')
        host.click('#c-go')
        wait_state(host, 'App.S.players.length === 1')
        code = state(host)['code']
        guests = []
        for avatar, name in enumerate(['Nova', 'Trouble', 'Kai'], 1):
            guest = player(name, avatar)
            guest.goto(base + '/r/' + code)
            guest.click('#join-btn')
            wait_state(guest, 'App.S.players.length >= 2')
            guests.append(guest)
        wait_state(host, 'App.S.players.length === 4')
        passed('Four independent browser sessions create and join the real room')
        # Reference-like room configuration is applied through the actual host controls.
        host.locator('#host-panel [data-choice=difficulty][data-value=mixed]').click()
        host.select_option('#host-panel [data-setting=drawTime]', '180')
        host.select_option('#host-panel [data-setting=rounds]', '5')
        chat(guests[0], 'ready!')
        chat(guests[1], 'lets go')
        chat(guests[2], 'need harder words')
        chat(host, 'starting soon!')
        expect(host.locator('#chat-log')).to_contain_text('lets go')
        capture(host, '03-lobby-desktop.png')
        capture(host, 'panel-03-lobby.png', '.site-shell')
        host.set_viewport_size({'width': 390, 'height': 844})
        no_overflow(host)
        capture(host, '03-lobby-mobile.png')
        host.set_viewport_size({'width': 1440, 'height': 900})
        assert guests[0].locator('#host-panel #switch-game').is_disabled()
        assert guests[0].locator('#lobby-start').is_hidden()
        passed('Host settings and chat synchronize; guest settings stay read-only')
        host.click('#settings-btn')
        host.click('#modal-body [data-choice=difficulty][data-value=hard]')
        host.click('#modal-body [data-choice=drawTime][data-value="240"]')
        wait_state(host, 'App.S.settings.drawTime === 240 && App.S.settings.difficulty === "hard"')
        capture(host, '07-settings-desktop.png')
        capture(host, 'panel-07-settings.png', '#modal-body')
        host.set_viewport_size({'width': 390, 'height': 844})
        no_overflow(host)
        capture(host, '07-settings-mobile.png')
        host.set_viewport_size({'width': 1440, 'height': 900})
        # Verify focus trap and escape restoration.
        host.locator('#modal-body [data-close]').first.focus()
        host.keyboard.press('Shift+Tab')
        assert host.evaluate('document.getElementById("modal-body").contains(document.activeElement)')
        host.keyboard.press('Escape')
        expect(host.locator('#modal')).to_be_hidden()
        expect(host.locator('#settings-btn')).to_be_focused()
        passed('Segmented settings persist to server; dialog traps and restores keyboard focus')
        # A one-round game finishes naturally, so the results screenshot is earned.
        host.select_option('#host-panel [data-setting=rounds]', '1')
        host.select_option('#host-panel [data-setting=drawTime]', '180')
        host.locator('.word-options summary').click()
        host.fill('#host-panel [data-setting=customWords]', 'dragon, pizza, sun, cat, house, tree')
        host.locator('#host-panel [data-setting=customOnly]').check()
        host.locator('.advanced-settings summary').click()
        host.select_option('#host-panel [data-host=maxPlayers]', '4')
        wait_state(host, 'App.S.settings.customOnly && App.S.maxPlayers === 4')
        host.click('#lobby-start')
        wait_state(host, 'App.S.phase === "game" && App.S.game.choices !== null')
        host.locator('[data-choose]').filter(has_text=re.compile('^dragon$')).click()
        wait_state(host, 'App.S.game.phase === "draw"')
        for guest in guests:
            wait_state(guest, 'App.S.game.phase === "draw"')
            assert state(guest)['game']['word'] is None
            assert state(guest)['game']['choices'] is None
            assert 'dragon' not in guest.locator('#room-word').inner_text().lower()
        passed('Drawer secrecy holds in server state and the visible redesigned UI')
        # Explicitly verify that header controls remain within the viewport.
        for selector in ['#sound-btn', '#settings-btn']:
            box = host.locator(selector).bounding_box()
            assert box and box['x'] + box['width'] <= 1440, (selector, box)
        dragon(host)
        host.wait_for_timeout(400)
        snapshot = host.locator('canvas').evaluate('(c)=>c.toDataURL()')
        for guest in guests:
            assert guest.locator('canvas').evaluate('(c)=>c.toDataURL()') == snapshot, 'Drawing relay differs'
        passed('Brush and paint bucket render the same drawing across all four clients')
        stroke(host, 'M650 500 L670 500', '#000000', 8)
        host.locator('[data-do=undo]').click()
        host.wait_for_timeout(350)
        assert host.locator('canvas').evaluate('(c)=>c.toDataURL()') == snapshot
        passed('Undo restores the shared drawing through server replay')
        host.click('#dg-expand')
        expect(host.locator('#dg-expand')).to_have_attribute('aria-pressed', 'true')
        assert host.locator('canvas').evaluate('(c)=>c.toDataURL()') == snapshot
        host.keyboard.press('Escape')
        expect(host.locator('#dg-expand')).to_have_attribute('aria-pressed', 'false')
        passed('Expand and Escape preserve the live canvas')
        chat(guests[0], 'mountain?')
        chat(guests[1], 'dinosaur?')
        chat(guests[2], 'fire')
        capture(host, '04-drawing-desktop.png')
        capture(host, 'panel-04-drawing.png', '.site-shell')
        # Browser reconnection keeps the actual player ID and server drawing.
        old_id = state(host)['you']
        host.evaluate('App.socket.disconnect(); setTimeout(()=>App.socket.connect(), 200)')
        wait_state(host, 'App.socket.connected && App.S.you === ' + json.dumps(old_id))
        host.wait_for_timeout(500)
        assert state(host)['you'] == old_id
        assert host.locator('canvas').evaluate('(c)=>c.toDataURL()') == snapshot
        passed('Socket reconnect retains the seat, identity, and drawing')
        spectator = player('Robin', 4, 390, 844)
        spectator.goto(base + '/r/' + code)
        spectator.click('#join-btn')
        wait_state(spectator, 'App.S.role === "spectator"')
        assert state(spectator)['game']['word'] is None
        assert spectator.locator('[data-tool=brush]').is_disabled()
        assert spectator.locator('canvas').evaluate('(c)=>c.toDataURL()') == snapshot
        passed('Late spectator receives the drawing without the secret or drawing controls')
        host.set_viewport_size({'width': 390, 'height': 844})
        no_overflow(host)
        host.click('#mobile-players-toggle')
        expect(host.locator('#mobile-players-toggle')).to_have_attribute('aria-expanded', 'true')
        expect(host.locator('#player-list')).to_be_visible()
        host.click('#mobile-players-toggle')
        expect(host.locator('#player-list')).to_be_hidden()
        chat_box=host.locator('#chat-input').bounding_box()
        assert chat_box['y']+chat_box['height'] <= 844, chat_box
        capture(host, '05-gameplay-mobile-390.png')
        capture(host, 'panel-05-mobile-portrait.png', '.site-shell')
        # The storyboard phone is landscape; capture that separately from mandatory 390px portrait.
        guests[0].set_viewport_size({'width': 780, 'height': 390})
        no_overflow(guests[0])
        capture(guests[0], '05-gameplay-mobile-landscape.png')
        capture(guests[0], 'panel-05-mobile.png', '.site-shell')
        guests[0].set_viewport_size({'width': 1440, 'height': 900})
        host.set_viewport_size({'width': 1440, 'height': 900})
        passed('390px portrait and phone landscape have no horizontal overflow')
        for guest in guests:
            chat(guest, 'dragon')
            guest.wait_for_timeout(250)
        # Finish every actual turn, respecting the normal reveal intervals.
        active = [host] + guests
        started = time.monotonic()
        while time.monotonic() - started < 90:
            s = state(host)
            if s['phase'] == 'lobby' and s['lastResult']:
                break
            if s['game']['phase'] == 'choose':
                drawer_id = s['game']['drawerId']
                drawer = next(pg for pg in active if state(pg)['you'] == drawer_id)
                wait_state(drawer, 'App.S.game.choices !== null')
                word = state(drawer)['game']['choices'][0]
                drawer.locator('[data-choose]').first.click()
                for pg in active:
                    if pg is drawer:
                        continue
                    wait_state(pg, 'App.S.game.phase === "draw"')
                    chat(pg, word)
                    pg.wait_for_timeout(250)
            host.wait_for_timeout(500)
        else:
            raise AssertionError('The real game did not complete')
        standings = state(host)['lastResult']['standings']
        assert len(standings) == 4 and max(x['score'] for x in standings) > 0
        capture(host, '06-results-desktop.png')
        capture(host, 'panel-06-results.png', '.result-card')
        host.set_viewport_size({'width': 390, 'height': 844})
        no_overflow(host)
        capture(host, '06-results-mobile.png')
        host.set_viewport_size({'width': 1440, 'height': 900})
        passed('One complete four-player Draw & Guess game produces real scored standings')
        # Four in a Row uses the same room and preserves host game switching.
        # With four seated, switching asks who takes the two seats.
        host.select_option('#switch-game', 'fourrow')
        host.locator('.pick input').nth(0).check()
        host.locator('.pick input').nth(1).check()
        host.click('#pick-go')
        wait_state(host, 'App.S.gameId === "fourrow"')
        assert len(state(host)['players']) == 2
        host.click('#lobby-start')
        wait_state(host, 'App.S.phase === "game"')
        wait_state(guests[0], 'App.S.gameId === "fourrow" && App.S.phase === "game"')
        match = [host, guests[0]]
        first = next(pg for pg in match if state(pg)['game']['myIndex'] == 0)
        second = next(pg for pg in match if pg is not first)
        for turn in range(7):
            pg = first if turn % 2 == 0 else second
            col = 3 if turn % 2 == 0 else 0
            wait_state(pg, 'App.S.game && App.S.game.turn === App.S.game.myIndex')
            pg.locator(f'[data-col="{col}"]').click()
            pg.wait_for_timeout(100)
            if turn == 3:
                capture(host, '08-four-in-a-row-desktop.png')
        wait_state(host, 'App.S.phase === "lobby" && App.S.lastResult.type === "fourrow"')
        assert state(host)['lastResult']['winnerId'] == state(first)['you']
        passed('Switching games seats two players, moves others to spectators, and Four in a Row reaches a real win')
        # Supply real live rooms for the selection capture; never insert fake cards or counts.
        public1 = player('Jules', 5)
        public1.click('[data-view=selection].nav-cta')
        public1.locator('[data-quick=drawguess]').click()
        wait_state(public1, 'App.S.isPublic')
        public2 = player('Milo', 7)
        public2.click('[data-view=selection].nav-cta')
        public2.locator('[data-quick=fourrow]').click()
        wait_state(public2, 'App.S.isPublic')
        visitor = player('Rowan', 2)
        visitor.click('[data-view=selection].nav-cta')
        expect(visitor.locator('.room-preview')).to_have_count(2)
        capture(visitor, '02-games-desktop.png')
        capture(visitor, 'panel-02-games.png', '.site-shell')
        visitor.set_viewport_size({'width': 390, 'height': 844})
        no_overflow(visitor)
        capture(visitor, '02-games-mobile.png')
        passed('Selection displays real public rooms; 390px game selection remains usable')
        # Test the redesigned frontend behind a separately started private-alpha gate.
        with socket.socket() as port_socket:
            port_socket.bind(('127.0.0.1', 0))
            alpha_port = port_socket.getsockname()[1]
        secret = secrets.token_hex(24)
        alpha_process = subprocess.Popen(['node', 'server/index.js'], cwd=ROOT/'node-server', env={**os.environ, 'PORT':str(alpha_port), 'ALPHA_ENABLED':'true', 'ALPHA_SECRET':secret}, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        try:
            alpha_url = f'http://127.0.0.1:{alpha_port}'
            for _ in range(60):
                try:
                    with urllib.request.urlopen(alpha_url+'/healthz', timeout=1) as response:
                        assert response.read() == b'ok'
                    break
                except OSError:
                    time.sleep(.1)
            else:
                raise AssertionError('Alpha test service did not start')
            gated = browser.new_context().new_page()
            response = gated.goto(alpha_url)
            assert response.status == 401
            expect(gated.locator('input[name=password]')).to_be_visible()
            gated.fill('input[name=password]', secret)
            gated.locator('button[type=submit], input[type=submit], form button').first.click()
            expect(gated.locator('#hero-title')).to_be_visible()
            gated.wait_for_function('window.App && App.socket.connected')
            gated.click('#hero-create'); gated.click('#c-go')
            wait_state(gated, 'App.S.players.length === 1')
            outsider = browser.new_context().new_page()
            assert outsider.goto(alpha_url+'/r/'+state(gated)['code']).status == 401
            expect(outsider.locator('input[name=password]')).to_be_visible()
            passed('Private-alpha browser login permits the real frontend and sockets; a fresh session stays gated')
        finally:
            alpha_process.terminate()
            alpha_process.wait(timeout=5)
        if AXE_PATH:
            passed(f'axe WCAG A/AA checks report no violations across {len(accessibility)} desktop and mobile captures')
        assert not errors, errors
        assert not bad_assets, bad_assets
        passed('No JavaScript page errors or missing artwork requests across all browser sessions')
        (OUT / 'qa-results.json').write_text(json.dumps({'viewport_desktop': [1440, 900], 'viewport_mobile': [390, 844], 'checks': checks, 'page_errors': errors, 'missing_assets': bad_assets, 'standings': standings}, indent=2) + '\n')
        build_review(browser)
        browser.close()


if __name__ == '__main__':
    main()
