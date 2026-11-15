"""Real Batch 2 interactions, three viewports, reconnects and reduced-motion checks."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,json,urllib.request,sys
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent/'second';OUT.mkdir(exist_ok=True);SHOTS=OUT/'screenshots'/'played';SHOTS.mkdir(parents=True,exist_ok=True)
PORT=os.environ.get('B25_PORT','45200');URL='http://127.0.0.1:'+PORT;checks=[];errors=[]
def shot(p,game):
 for w,h in [(1440,900),(390,844),(932,430)]:
  p.set_viewport_size({'width':w,'height':h});p.evaluate('scrollTo(0,0)');p.wait_for_timeout(120);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(game,w,'overflow');p.screenshot(path=str(SHOTS/f'{game}-{w}.png'))
 p.set_viewport_size({'width':1440,'height':900})
def actor(pages):
 turn=pages[0].evaluate('App.S.game.turnId||App.S.game.players?.[App.S.game.turn]?.id')
 return next(p for p in pages if p.evaluate('App.S.you')==turn)
def drag(page,source,target,touch=False):
 source.scroll_into_view_if_needed();a=source.bounding_box();target.scroll_into_view_if_needed();b=target.bounding_box();x,y=a['x']+a['width']/2,a['y']+a['height']/2;xx,yy=b['x']+b['width']/2,b['y']+b['height']/2
 if touch:
  c=page.context.new_cdp_session(page);c.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for i in range(1,9):c.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+(xx-x)*i/8,'y':y+(yy-y)*i/8}]})
  c.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});c.detach()
 else:page.mouse.move(x,y);page.mouse.down();page.mouse.move(xx,yy,steps=8);page.mouse.up()
def draw_robot(page,canvas,touch=False):
 r=canvas.bounding_box();strokes=[[(.24,.2),(.76,.2),(.76,.65),(.24,.65),(.24,.2)],[(.35,.33),(.4,.33),(.4,.4),(.35,.4),(.35,.33)],[(.6,.33),(.65,.33),(.65,.4),(.6,.4),(.6,.33)],[(.38,.52),(.45,.57),(.55,.57),(.62,.52)],[(.5,.2),(.5,.1),(.56,.1)],[(.45,.65),(.45,.72),(.55,.72),(.55,.65)],[(.35,.72),(.65,.72),(.65,.9),(.35,.9),(.35,.72)],[(.35,.78),(.22,.7),(.15,.75)],[(.65,.78),(.76,.69),(.85,.71)],[(.42,.9),(.36,.97)],[(.58,.9),(.66,.97)]]
 c=page.context.new_cdp_session(page) if touch else None
 for points in strokes:
  coords=[(r['x']+x*r['width'],r['y']+y*r['height']) for x,y in points]
  if c:
   x,y=coords[0];c.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
   for x,y in coords[1:]:c.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y}]})
   c.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  else:
   page.mouse.move(*coords[0]);page.mouse.down()
   for point in coords[1:]:page.mouse.move(*point,steps=3)
   page.mouse.up()
 if c:c.detach()
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':PORT,'ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
 for attempt in range(100):
  try:
   with urllib.request.urlopen(URL+'/healthz',timeout=1) as r:assert r.status==200
   break
  except Exception:
   if attempt==99:raise
   time.sleep(.1)
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium')
  for game in sys.argv[1:] or ['battleship','colorstack','impostor','chess','telephone']:
   print('GAME',game,flush=True)
   contexts=[browser.new_context(record_video_dir=str(OUT/'video') if i==0 else None,viewport={'width':1440 if i==0 else 390,'height':900 if i==0 else 844},has_touch=i>0) for i in range(3)];pages=[c.new_page() for c in contexts];host,guest,kai=pages
   for p in pages:p.on('pageerror',lambda e:errors.append(str(e)))
   host.goto(URL);host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('App.S?.code');code=host.evaluate('App.S.code')
   for p,name in [(guest,'Nova'),(kai,'Kai')]:p.goto(URL+'/r/'+code);p.locator('#screen-join .name-input').fill(name);p.locator('#join-btn').click();p.wait_for_function('App.S?.code')
   host.wait_for_function('App.S.players.length===3');host.evaluate("game=>App.socket.emit('switchGame',{game,seats:App.S.players.map(p=>p.id).slice(0,['battleship','chess'].includes(game)?2:3)})",game);host.wait_for_function('g=>App.S.gameId===g',arg=game)
   if game=='telephone':host.evaluate("App.socket.emit('settings',{rounds:3,promptSource:'custom',customWords:'A dancing robot',drawTime:30,writeTime:15})")
   host.locator('#lobby-start').click();host.wait_for_function("App.S.phase==='game'")
   for p in pages:p.wait_for_function("App.S.phase==='game'")
   if game=='battleship':
    for i,p in enumerate([host,guest]):
     # Desktop mouse and real CDP touch dragging, with visible valid placement cells.
     p.set_viewport_size({'width':1440 if i==0 else 390,'height':900 if i==0 else 844})
     p.locator('#bs-rotate').click();assert 'vertical' in p.locator('#bs-rotate').inner_text();p.locator('#bs-rotate').click()
     for ship in range(5):drag(p,p.locator(f'[data-ship="{ship}"]'),p.locator(f'.bs-place [data-cell="{ship*20}"]'),touch=i==1)
     assert p.locator('.bs-ship.done').count()==5;p.locator('#bs-lock').click();print('Fleet locked',i,flush=True)
    host.wait_for_function("App.S.game.phase==='battle'")
    for move in range(10):
     p=actor(pages);n=p.evaluate('App.S.game.moves');cell=99 if move==0 else (move-1)//2
     p.locator(f'.pbs-enemy [data-cell="{cell}"]').click();assert p.evaluate('App.S.game.moves')==n;p.locator('#bs-fire').click();host.wait_for_function('(n)=>App.S.game.moves>n',arg=n)
    assert host.evaluate('App.S.game.players.some(p=>p.sunk.length>0)')
    checks.append('Battleship mouse/touch fleet dragging, explicit Fire, actual miss/hits and sunk ship')
   elif game=='colorstack':
    p=actor(pages);g=p.evaluate('App.S.game');cards=p.locator('#cs-hand .playable')
    if cards.count():
     before=p.evaluate('App.S.game.top.id');cards.first.click(position={'x':20,'y':35});assert p.evaluate('App.S.game.top.id')==before;p.locator('#cs-play').click()
     if p.locator('#cs-picker').is_visible():
      p.keyboard.press('Escape');assert not p.locator('#cs-picker').is_visible();p.locator('#cs-play').click();p.locator('[data-color="r"]').click()
     host.wait_for_function('(id)=>App.S.game.top.id!==id',arg=before)
    else:
     before=len(g['hand']);p.locator('#cs-draw').click();p.wait_for_function('(n)=>App.S.game.hand.length!==n',arg=before)
    checks.append('Color Stack select-before-Play, actual discard/draw and optional wild dialog cancel')
   elif game=='impostor':
    guest.wait_for_timeout(1100);before=guest.locator('#im-round [data-timer]').inner_text();guest.locator('#im-privacy').click();assert 'ROLE HIDDEN' in guest.locator('#im-role').inner_text();guest.locator('#im-privacy').click();assert int(guest.locator('#im-round [data-timer]').inner_text().rstrip('sS'))<=int(before.rstrip('sS'))
    for i in range(12):
     if host.evaluate('App.S.game.phase')!='clue':break
     p=actor(pages);p.locator('#im-input').fill('interesting');p.locator('#im-input').press('Enter');host.wait_for_timeout(120)
    host.wait_for_function("App.S.game.phase==='discuss'")
    for p in pages:p.locator('#im-ready').click()
    host.wait_for_function("App.S.game.phase==='vote'")
    for p in pages:
     p.locator('[data-vote]:not(:disabled)').first.click();assert not p.evaluate('App.S.game.myVote');p.locator('#im-confirm-vote').click()
    host.wait_for_function("['guess','result'].includes(App.S.game.phase)")
    if host.evaluate('App.S.game.phase')=='guess':
     p=next(p for p in pages if p.evaluate('App.S.game.role')=='impostor');p.locator('#im-guess').fill('banana');p.locator('#im-guess').press('Enter')
    host.wait_for_function("App.S.game.phase==='result'");checks.append('Impostor local concealment preserves countdown, legal clues, explicit vote confirmation and public reveal')
   elif game=='chess':
    p=actor(pages);drag(p,p.locator('[data-sq="12"]'),p.locator('[data-sq="28"]'));host.wait_for_function('App.S.game.moves.length===1')
    p=actor(pages);p.set_viewport_size({'width':390,'height':844});drag(p,p.locator('[data-sq="51"]'),p.locator('[data-sq="35"]'),touch=True);host.wait_for_function('App.S.game.moves.length===2')
    p=actor(pages);p.locator('[data-sq="28"]').click();p.locator('[data-sq="35"]').click();host.wait_for_function('App.S.game.moves.length===3');checks.append('Chess mouse drag, real touch drag, click-to-move capture and authoritative board update')
    host.evaluate("App.socket.emit('endGame')");host.wait_for_function("App.S.phase==='lobby'");host.evaluate("App.socket.emit('startGame')");host.wait_for_function("App.S.phase==='game'")
    for origin,dest in [(8,24),(55,39),(24,32),(39,31),(32,40),(31,23),(40,49),(23,14)]:
     p=actor(pages);count=p.evaluate('App.S.game.moves.length');p.locator(f'[data-sq="{origin}"]').click();p.locator(f'[data-sq="{dest}"]').click();host.wait_for_function('(n)=>App.S.game.moves.length>n',arg=count)
    p=actor(pages);p.locator('[data-sq="49"]').click();p.locator('[data-sq="56"]').click();assert p.evaluate('document.activeElement.dataset.promo')=='Q';shot(p,'chess-promotion');p.keyboard.press('Shift+Tab');assert p.evaluate('document.activeElement.id')=='ch-promo-cancel';p.keyboard.press('Tab');p.keyboard.press('Escape');assert not p.locator('#ch-promo').is_visible();assert p.evaluate('document.activeElement.dataset.sq')=='49'
    p.locator('[data-sq="56"]').click();p.locator('[data-promo="Q"]').click();host.wait_for_function("App.S.game.board[56]==='wQ'");checks.append('Chess legal promotion, Queen focus, Escape restoration and actual promoted position')
   elif game=='telephone':
    for step in range(3):
     if host.evaluate('App.S.game.phase')=='reveal':break
     kind=host.evaluate('App.S.game.kind')
     for p in pages:
      if kind=='draw':
       cv=p.locator('.tp-canvas').last;cv.scroll_into_view_if_needed();scroll=p.evaluate('scrollY');draw_robot(p,cv,touch=p!=host);assert p.evaluate('scrollY')==scroll;
       if p==host:shot(p,'telephone-drawing')
       p.locator('#tp-done').click()
      else:p.locator('#tp-input').fill('A dancing robot');p.locator('#tp-input').press('Enter')
     host.wait_for_timeout(200)
    host.wait_for_function("App.S.game.phase==='reveal'");host.wait_for_selector('.tp-entry');host.wait_for_function('App.S.game.rev.entries.some(e=>e.kind==="draw")');host.evaluate('window.entryBefore=document.querySelector(".tp-entry")')
    for p in pages:
     if p.locator('[data-like]:not(:disabled)').count():p.locator('[data-like]:not(:disabled)').first.click();break
    host.wait_for_timeout(100);assert host.evaluate('window.entryBefore===document.querySelector(".tp-entry")');host.locator('[data-reveal="latest"]').click();checks.append('Telephone real prompt/drawing/guess chain, preserved reveal DOM during likes and revealed-entry navigation')
   shot(host,game)
   old=guest.evaluate('App.S.you');guest.reload();guest.wait_for_function('App.S?.code');assert guest.evaluate('App.S.you')==old
   host.emulate_media(reduced_motion='reduce');host.wait_for_timeout(30);assert host.evaluate("document.querySelector('#stage').getAnimations({subtree:true}).filter(a=>a.playState==='running').length") == 0
   for p in [guest,kai]:p.evaluate("App.socket.emit('leaveRoom')")
   host.wait_for_function("App.S.phase==='lobby'&&App.S.lastResult");host.wait_for_timeout(400);shot(host,game+'-result')
   checks.append(game+': 3 viewports, identity reconnect, reduced motion and real departure result');print('PASS',game,flush=True)
   video=host.video
   for c in contexts:c.close()
   if video:Path(video.path()).rename(OUT/'video'/f'{game}-actual-play.webm')
  browser.close()
 assert not errors,errors
 (OUT/os.environ.get('B25_REPORT','browser-checks.json')).write_text(json.dumps({'checks':checks,'errors':errors},indent=2)+'\n')
finally:
 server.terminate();server.wait(timeout=10)
 (OUT/'browser-progress.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2)+'\n')
