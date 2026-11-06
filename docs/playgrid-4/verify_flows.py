"""Integration regression checks against a local real Express/Socket.IO server."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os, subprocess, time, json
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
URL='http://127.0.0.1:43995'
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':'43995','ALPHA_ENABLED':''},stdout=subprocess.DEVNULL)
checks=[]
def passed(label):
 checks.append(label);print('PASS',label,flush=True)
def profile(page):
 page.evaluate("document.querySelector('[data-view=profile]').click()")
 page.wait_for_selector('#modal .av-studio.open')
def home(page):
 page.evaluate("history.pushState({},'', '/');dispatchEvent(new PopStateEvent('popstate'))")
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium')
  host=b.new_page(viewport={'width':1440,'height':900})
  for _ in range(50):
   try: host.goto(URL);break
   except: time.sleep(.1)
  profile(host);assert host.locator('#modal select[data-studio-field]:not([tabindex="-1"])').count()==0;host.locator('#modal .name-input').fill('Pixel Host');host.locator('#modal [data-character=a09]').click()
  assert host.evaluate("document.activeElement?.dataset.character==='a09'")
  host.locator('#modal [data-studio-tab=looks]').click();host.locator('#modal [data-look-key=palette][data-look-value=cyan]').click()
  host.locator('#modal [data-studio=save]').click();assert host.evaluate("localStorage.pg_identity_confirmed==='1'")
  host.locator('#modal [data-close]').first.click();passed('Explicit homepage identity save and gallery keyboard-focus preservation')
  host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('App.S?.code');code=host.evaluate('App.S.code')
  guest=b.new_page(viewport={'width':390,'height':844});guest.goto(URL+'/r/'+code);guest.wait_for_selector('#screen-join .av-gallery')
  guest.locator('#join-btn').click();assert guest.evaluate('App.S===null')
  guest.locator('#screen-join .name-input').fill('Nova');guest.locator('[data-character=a05]').last.click();guest.evaluate('scrollTo(0,0)');guest.screenshot(path=str(OUT/'screenshots'/'invite-new-390.png'));guest.set_viewport_size({'width':1440,'height':900});guest.evaluate('scrollTo(0,0)');guest.screenshot(path=str(OUT/'screenshots'/'invite-new-1440.png'));guest.set_viewport_size({'width':390,'height':844});guest.locator('#join-btn').click();guest.wait_for_function('App.S?.players.length===2');host.wait_for_function('App.S.players.length===2')
  passed('First invite requires a deliberate name and saves selected character before joining')
  home(guest);guest.reload();guest.wait_for_function('App.S?.code');assert guest.evaluate('document.body.dataset.screen')=='home';guest.locator('#nav-return').click();guest.wait_for_selector('#screen-room',state='visible');assert guest.evaluate('App.S.code')==code
  passed('Homepage refresh and compact mobile Return to Game restore the existing room')
  returner=b.new_context(storage_state=guest.context.storage_state()).new_page();returner.goto(URL+'/r/'+code);returner.wait_for_selector('#join-btn');assert returner.locator('#join-btn').inner_text()=='Confirm & Join';assert returner.locator('.name-input').last.input_value()=='Nova';returner.set_viewport_size({'width':1440,'height':900});returner.screenshot(path=str(OUT/'screenshots'/'invite-returning-1440.png'));returner.set_viewport_size({'width':390,'height':844});returner.screenshot(path=str(OUT/'screenshots'/'invite-returning-390.png'));returner.locator('#invite-edit').click();returner.wait_for_selector('.av-gallery');assert returner.locator('.name-input').last.is_visible();returner.close()
  passed('Returning invite confirms saved identity or opens visual editing without allocating a seat')
  profile(host);host.locator('#modal [data-studio=classic]').click();assert host.locator('#modal [data-av="1"]').is_visible();assert host.locator('#modal [data-color="0"]').is_visible();host.locator('#modal [data-close]').first.click();guest.wait_for_function("!App.S.players.find(p=>p.name==='Pixel Host').avatar.v3")
  passed('Classic avatar controls remain accessible and synchronize to the other client')
  failed=b.new_page();failed.route('**/assets/avatars/catalog.json',lambda r:r.abort());failed.goto(URL+'/r/'+code);failed.wait_for_selector('[data-studio=open]');failed.locator('#screen-join .name-input').fill('Retry Player');failed.locator('#join-btn').click();assert failed.evaluate('App.S===null');failed.unroute('**/assets/avatars/catalog.json');failed.locator('[data-studio=open]').last.click();failed.wait_for_selector('.av-gallery button');failed.close()
  passed('Catalog failure blocks accidental joining and Retry recovers without reloading the page')
  host.evaluate("App.socket.emit('switchGame',{game:'drawguess'})");host.wait_for_function("App.S.gameId==='drawguess'");host.evaluate("App.socket.emit('startGame')");host.wait_for_function("App.S.game?.phase==='choose'")
  drawer=host if host.locator('[data-choose]').count() else guest
  other=guest if drawer==host else host
  drawer.locator('[data-choose]').first.click();drawer.wait_for_function("App.S.game.phase==='draw'")
  for width,height in [(1366,768),(1440,900),(1920,1080),(2560,1440)]:
   drawer.set_viewport_size({'width':width,'height':height})
   for mode in ['default','expanded','focus']:
    if mode=='expanded':drawer.locator('#dg-expand').click()
    if mode=='focus':drawer.keyboard.press('Escape');drawer.locator('#focus-btn').click()
    drawer.wait_for_timeout(80);rect=drawer.locator('.dg-canvas').bounding_box();assert rect['y']+rect['height']<=height+1,(width,mode,rect)
    assert abs(rect['width']/rect['height']-4/3)<.02
    assert drawer.locator('.room > .side').is_visible() and drawer.locator('#room-chat').is_visible(),(width,mode)
    tools=drawer.locator('#dg-tools').bounding_box();clear=drawer.locator('#dg-tools [data-do=clear]').bounding_box();assert clear['y']+clear['height']<=tools['y']+tools['height']+1,(width,mode,'clear clipped',tools,clear)
    drawer.mouse.move(rect['x']+rect['width']*.25,rect['y']+rect['height']*.25);drawer.mouse.down();drawer.mouse.move(rect['x']+rect['width']*.5,rect['y']+rect['height']*.5,steps=8);drawer.mouse.up()
    other.wait_for_function("document.querySelector('.dg-canvas').getContext('2d').getImageData(300,225,1,1).data[0]<200")
    if mode=='expanded':drawer.screenshot(path=str(OUT/'screenshots'/f'focus-{width}.png'))

    drawer.locator('#dg-tools [data-do=undo]').click()
    other.wait_for_function("document.querySelector('.dg-canvas').getContext('2d').getImageData(300,225,1,1).data[0]===255")

   drawer.locator('#focus-btn').click()
  passed('Four desktop sizes: default, expanded and global focus retain players/chat, fit canvas and expose Clear')
  passed('Real mouse strokes map to expected 800×600 canvas pixels on the remote client at all desktop sizes')

  drawer.set_viewport_size({'width':390,'height':844});drawer.locator('#dg-expand').click();drawer.locator('#dg-chat-toggle').click();drawer.locator('#chat-input').fill('typing on phone');drawer.set_viewport_size({'width':390,'height':740});drawer.wait_for_timeout(100);assert drawer.locator('#room-chat').is_visible();assert drawer.locator('#chat-input').input_value()=='typing on phone';drawer.keyboard.press('Escape')
  passed('Phone focus chat and its unfinished message survive a viewport-height change')

  host.set_viewport_size({'width':1920,'height':1080});host.evaluate('PGAds.configure({preview:true})');host.wait_for_selector('.room > .pg-ad:not([hidden])');host.screenshot(path=str(OUT/'screenshots'/'ads-preview-1920.png'))
  ad=host.locator('.room > .pg-ad').bounding_box();chat=host.locator('#room-chat').bounding_box();assert ad['y']>=chat['y']+chat['height']-1
  host.set_viewport_size({'width':1366,'height':768});host.wait_for_function("document.querySelector('.room > .pg-ad').hidden");assert not host.locator('.room > .pg-ad').is_visible();host.evaluate('PGAds.configure({preview:false})');assert host.locator('ins.adsbygoogle').count()==0
  passed('Ad preview sits below chat on spacious monitors and collapses on laptops; default creates no ad request')
  host.set_viewport_size({'width':1920,'height':1080});host.evaluate('PGAds.configure({preview:true})');host.locator('.logo').click();host.locator('.main-nav [data-view=selection]').click();host.wait_for_selector('[data-ad-placement=games]:not([hidden])');host.locator('#game-search').fill('pool');assert host.locator('[data-ad-placement=games]').is_visible();host.locator('#game-search').fill('');assert host.locator('[data-ad-placement=games]').is_visible();host.evaluate('PGAds.configure({preview:false})')
  passed('Catalog ad survives navigation, search and catalog rerenders without occupying a game-card cell')

  assert not host.evaluate("performance.getEntriesByType('resource').some(r=>/googlesyndication|doubleclick/.test(r.name))")

  host.on('dialog',lambda dialog:dialog.accept());host.locator('.main-nav [data-view=rooms]').click();host.locator('#code-input').fill('#ZZZZZZ');host.locator('#code-input').press('Enter');host.wait_for_selector('#join-btn',state='visible');host.locator('#join-btn').click();host.wait_for_function("document.body.dataset.screen==='rooms'&&document.querySelector('#code-error').textContent.includes('No party with that code')");assert host.evaluate('App.S.code')==code;host.locator('#nav-return').click();host.wait_for_selector('#screen-room',state='visible')
  passed('Mistyped room-code join returns an inline Rooms error without losing the running-game seat')
  stale=b.new_context();stale.add_init_script("sessionStorage.setItem('pg_active_room','ZZZZZZ')");expired=stale.new_page();expired.goto(URL);expired.wait_for_function("!sessionStorage.getItem('pg_active_room')&&document.body.dataset.screen==='home'");assert not expired.locator('#nav-return').is_visible();stale.close()
  passed('Invalid remembered room is cleared gracefully without navigating away from the homepage')
  hashed=b.new_page(viewport={'width':360,'height':800});hashed.goto(URL+'/#'+code);hashed.wait_for_selector('#join-btn',state='visible');assert hashed.url.endswith('/r/'+code);assert hashed.evaluate('App.S') is None;hashed.close()
  passed('Hash invitation preserves the target code and requires identity confirmation without allocating a seat')

  host.evaluate("App.socket.emit('endGame')");host.wait_for_function("App.S.phase==='lobby'");host.evaluate("App.socket.emit('switchGame',{game:'tycoon'})");host.wait_for_function("App.S.gameId==='tycoon'");host.evaluate("App.socket.emit('startGame')");host.wait_for_function("App.S.phase==='game'");host.set_viewport_size({'width':1440,'height':900});host.wait_for_timeout(100);home(host);host.set_viewport_size({'width':1366,'height':768});host.wait_for_timeout(100);host.locator('#nav-return').click();host.wait_for_function("(()=>{const r=document.querySelector('.ty-board').getBoundingClientRect();return r.height>0&&r.bottom<=innerHeight})()");assert host.evaluate('App.S.code')==code
  passed('Tycoon refits immediately after navigating home, resizing, and returning to the same game')


  b.close()
 (OUT/'flow-checks.json').write_text(json.dumps({'passed':checks},indent=2)+'\n')
finally:
 server.terminate();server.wait(timeout=10)
