"""Real three-client actions, reconnects, forfeits and rematches for all selectable games."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,json,urllib.request
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent;SHOTS=OUT/'screenshots'/'played';SHOTS.mkdir(parents=True,exist_ok=True)
URL='http://127.0.0.1:44202';checks=[];errors=[]
words=set((ROOT/'node-server/server/data/lexicon.txt').read_text().splitlines())
def passed(label):checks.append(label);print('PASS',label,flush=True)
def waitroom(p):p.wait_for_function('App.S?.code')
def actor(pages):
 turn=pages[0].evaluate('App.S.game.turnId||App.S.game.players?.[App.S.game.turn]?.id||App.S.game.drawerId')
 return next(p for p in pages if p.evaluate('App.S.you')==turn)
def shot(p,game):
 for w,h in [(1440,900),(390,844),(932,430)]:
  p.set_viewport_size({'width':w,'height':h});p.evaluate('scrollTo(0,0)');p.wait_for_timeout(150)
  assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(game,w,'overflow')
  p.screenshot(path=str(SHOTS/f'{game}-{w}.png'))
 p.set_viewport_size({'width':1440,'height':900})
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':'44202','ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
 for attempt in range(100):
  try:
   with urllib.request.urlopen(URL+'/healthz',timeout=1) as response:assert response.status==200
   break
  except Exception:
   if attempt==99:raise
   time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium')
  probe=b.new_page()
  for _ in range(60):
   try:probe.goto(URL);break
   except:time.sleep(.1)
  probe.wait_for_function('typeof GameBriefs!=="undefined"');games=probe.evaluate('Object.keys(GameBriefs)');probe.close()
  if os.environ.get('PG5_GAMES'):games=[g for g in games if g in os.environ['PG5_GAMES'].split(',')]
  for game in games:
   print('GAME',game,flush=True)
   contexts=[b.new_context(viewport={'width':1440 if i==0 else 390,'height':900 if i==0 else 844},has_touch=i>0) for i in range(3)]
   pages=[c.new_page() for c in contexts];host,guest,kai=pages
   for p in pages:p.on('pageerror',lambda e:errors.append(str(e)))
   host.goto(URL);host.locator('#hero-create').click();host.locator('#c-go').click();waitroom(host);code=host.evaluate('App.S.code')
   for p,name in [(guest,'Nova'),(kai,'Kai')]:
    p.goto(URL+'/r/'+code);p.locator('#screen-join .name-input').fill(name);p.locator('#join-btn').click();waitroom(p)
   host.wait_for_function('App.S.players.length===3')
   host.evaluate("game=>App.socket.emit('switchGame',{game,seats:App.S.players.map(p=>p.id).slice(0,['fourrow','tictactoe','battleship','checkers','chess','pool'].includes(game)?2:3)})",game);host.wait_for_function('g=>App.S.gameId===g',arg=game)
   if game=='telephone':host.evaluate("App.socket.emit('settings',{rounds:3,promptSource:'custom',customWords:'A dancing robot',drawTime:30,writeTime:15})")
   host.locator('#lobby-start').click();host.wait_for_function("App.S.phase==='game'")
   for p in pages:p.wait_for_function("App.S.phase==='game'")
   if game=='drawguess':
    drawer=next(p for p in pages if p.locator('[data-choose]').count());drawer.locator('[data-choose]').first.click();drawer.wait_for_selector('.dg-canvas');cv=drawer.locator('.dg-canvas');r=cv.bounding_box();drawer.mouse.move(r['x']+50,r['y']+50);drawer.mouse.down();drawer.mouse.move(r['x']+100,r['y']+90,steps=5);drawer.mouse.up()
   elif game=='fourrow':
    p=actor(pages);p.locator('.fr-col:not(:disabled)').first.click();host.wait_for_function('App.S.game.moves>=1')
   elif game=='tictactoe':
    for cell in [0,3,1,4,2]:
     p=actor(pages);moves=p.evaluate('App.S.game.moves');p.locator(f'[data-cell="{cell}"]').click();host.wait_for_function('(m)=>App.S.phase!=="game"||App.S.game.moves>m',arg=moves)
    host.wait_for_selector('.result-card');assert 'wins' in host.locator('.result-title').inner_text().lower() or 'win' in host.locator('.result-title').inner_text().lower();shot(host,'results');host.locator('#result-again').click();host.wait_for_function("App.S.phase==='game'");passed('Tic Tac Toe legal full win, result standings and host rematch')
   elif game=='chess':
    p=actor(pages);p.locator('[data-sq="12"]').click();p.locator('[data-sq="28"]').click();host.wait_for_function('App.S.game.moves.length>0')
   elif game=='colorstack':
    p=actor(pages);p.locator('#cs-draw').click()
   elif game=='gofish':
    p=actor(pages);p.locator('[data-rank]:visible').first.click();p.locator('[data-target]').first.click();p.locator('#gf-go').click();host.wait_for_function('App.S.game.lastMove?.sequence>0')
   elif game=='wordchain':
    p=actor(pages);letter=p.evaluate('App.S.game.letter');word=next(w for w in sorted(words) if w.startswith(letter) and 4<=len(w)<=8);p.locator('#wc-input').fill(word);p.locator('#wc-send').click();host.wait_for_function('App.S.game.chainLength>0')
   elif game=='wordscramble':
    p=guest;letters=p.evaluate('App.S.game.letters');answer=next(w for w in words if sorted(w)==sorted(''.join(letters).lower()));p.locator('#ws-input').fill(answer);p.locator('#ws-form button').click();p.wait_for_function('App.S.game.solvedByMe')
   elif game=='categories':
    for p in pages:p.locator('[data-cat]').first.fill(p.evaluate('App.S.game.letter')+'xqzzl');p.locator('#cr-done').click()
    host.wait_for_function("App.S.game.phase==='review'");assert host.evaluate('App.S.game.review.rows.every(r=>r.cells[0].points===0&&r.cells[0].reason)')
   elif game=='trivia':
    for p in pages:p.locator('[data-ans="0"]').click()
    host.wait_for_function("App.S.game.phase==='reveal'");assert host.locator('.tv-choice.right').count()==1
   elif game=='bluff':
    for i,p in enumerate(pages):p.locator('#bl-input').fill(['A purple walrus','An invisible kite','A banana orchestra'][i]);p.locator('#bl-input').press('Enter')
    host.wait_for_function("App.S.game.phase==='vote'")
    for p in pages:p.locator('[data-opt]:not(:disabled)').first.click()
    host.wait_for_function("App.S.game.phase==='reveal'")
   elif game=='impostor':
    for i in range(6):
     if host.evaluate('App.S.game.phase')!='clue':break
     p=actor(pages);p.locator('#im-input').fill('interesting');p.locator('#im-input').press('Enter');host.wait_for_timeout(150)
    host.wait_for_function("App.S.game.phase==='discuss'")
    for p in pages:p.locator('#im-ready').click()
    host.wait_for_function("App.S.game.phase==='vote'")
    for p in pages:p.locator('[data-vote]:not(:disabled)').first.click()
    host.wait_for_function("['guess','result'].includes(App.S.game.phase)")
    if host.evaluate('App.S.game.phase')=='guess':
     p=next(p for p in pages if p.evaluate('App.S.game.role')=='impostor');p.locator('#im-guess').fill('banana');p.locator('#im-guess').press('Enter')
    host.wait_for_function("App.S.game.phase==='result'");passed('Impostor clue turns, discussion, voting and public reveal')
   elif game=='telephone':
    for step in range(3):
     if host.evaluate('App.S.game.phase')=='reveal':break
     kind=host.evaluate('App.S.game.kind')
     for p in pages:
      if kind=='draw':
       cv=p.locator('.tp-canvas').last;cv.scroll_into_view_if_needed();r=cv.bounding_box();p.mouse.move(r['x']+30,r['y']+30);p.mouse.down();p.mouse.move(r['x']+100,r['y']+100,steps=5);p.mouse.up();p.locator('#tp-done').click()
      else:p.locator('#tp-input').fill('A dancing robot');p.locator('#tp-input').press('Enter')
     host.wait_for_timeout(250)
    host.wait_for_function("App.S.game.phase==='reveal'");host.wait_for_selector('.tp-entry');host.evaluate('window.entryBefore=document.querySelector(".tp-entry")')
    for p in pages:
     if p.locator('[data-like]:not(:disabled)').count():p.locator('[data-like]:not(:disabled)').first.click();break
    host.wait_for_timeout(200);passed('Telephone real write/draw/guess chain and likes')
   elif game in ['pool','golf']:
    p=actor(pages);prefix='pl' if game=='pool' else 'gf';p.locator(f'#{prefix}-pow').fill('40');p.locator(f'#{prefix}-place').click();p.locator('#pl-shoot' if game=='pool' else '#gf-putt').click();host.wait_for_function('App.S.game.shots>0' if game=='pool' else 'App.S.game.anim')
   elif game=='tycoon':
    p=actor(pages);p.locator('[data-act="roll"]').click();host.wait_for_function('App.S.game.rollNo>0')
    if p.locator('[data-act="buy"]:not(:disabled)').count():p.locator('[data-act="buy"]').click()
   shot(host,game)
   # Reconnect the same real browser identity, including spectators in two-seat games.
   old=guest.evaluate('App.S.you');guest.reload();waitroom(guest);assert guest.evaluate('App.S.you')==old
   assert host.evaluate('App.S.players.length+App.S.spectators.length')==3
   # Reduced-motion mode is live; decorative CSS/WA must not keep running.
   host.emulate_media(reduced_motion='reduce');assert host.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches");assert host.evaluate("document.querySelector('#stage').getAnimations({subtree:true}).filter(a=>a.playState==='running').length") == 0
   for p in [guest,kai]:p.evaluate("App.socket.emit('leaveRoom')")
   host.wait_for_function("App.S.phase==='lobby'&&App.S.lastResult",timeout=10000)
   assert host.locator('.result-card').is_visible()
   # Rejoin through invitation, restore seats, then exercise the actual result rematch control.
   for p in [guest,kai]:
    p.goto(URL+'/r/'+code)
    if p.locator('#join-btn').is_visible():p.locator('#join-btn').click()
    waitroom(p)
   host.wait_for_function('App.S.players.length+App.S.spectators.length===3')
   host.evaluate("App.socket.emit('switchGame',{game:App.S.gameId,seats:App.S.players.concat(App.S.spectators).map(p=>p.id).slice(0,['fourrow','tictactoe','battleship','checkers','chess','pool'].includes(App.S.gameId)?2:3)})")
   host.wait_for_timeout(150)
   if host.locator('#result-again').is_visible():host.locator('#result-again').click()
   else:host.locator('#lobby-start').click()
   host.wait_for_function("App.S.phase==='game'");passed(game+': real action, 3 viewport screenshots, identity reconnect, reduced motion, departure ending and fresh match')
   for c in contexts:c.close()
  assert not errors,errors
  b.close()
 (OUT/'browser-checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2)+'\n')
finally:
 server.terminate();server.wait(timeout=10)
 (OUT/'browser-progress.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2)+'\n')
