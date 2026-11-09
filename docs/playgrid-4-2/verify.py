"""Real three-client actions, reconnects, forfeits and rematches for all selectable games."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,json,urllib.request
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent;SHOTS=OUT/'screenshots'/'played';SHOTS.mkdir(parents=True,exist_ok=True)
URL='http://127.0.0.1:44202';checks=[];errors=[]
words=set((ROOT/'node-server/server/data/lexicon.txt').read_text().splitlines())|set((ROOT/'node-server/server/data/lexicon-esdb.txt').read_text().splitlines())
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
  if os.environ.get('PG42_GAMES'):games=[g for g in games if g in os.environ['PG42_GAMES'].split(',')]
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
    for origin,target in [(8,24),(55,39),(24,32),(39,31),(32,40),(31,23),(40,49),(23,14)]:
     p=actor(pages);count=p.evaluate('App.S.game.moves.length');p.locator(f'[data-sq="{origin}"]').click();p.locator(f'[data-sq="{target}"]').click();host.wait_for_function('(n)=>App.S.game.moves.length>n',arg=count)
    p=actor(pages);p.locator('[data-sq="49"]').click();p.locator('[data-sq="56"]').click();assert p.evaluate('document.activeElement.dataset.promo')=='Q';p.keyboard.press('Escape');assert not p.locator('#ch-promo').is_visible();assert p.evaluate('document.activeElement.dataset.sq')=='49'
    p.locator('[data-sq="49"]').click();p.locator('[data-sq="56"]').click();p.keyboard.press('Shift+Tab');assert p.evaluate('document.activeElement.id')=='ch-promo-cancel';p.keyboard.press('Tab');assert p.evaluate('document.activeElement.dataset.promo')=='Q';p.keyboard.press('Enter');host.wait_for_function("App.S.game.board[56]==='wQ'");passed('Real Chess promotion: focused dialog, Escape restoration, Tab containment and legal queen promotion')
   elif game=='checkers':
    p=actor(pages);first=p.locator('.ck-sq:not(:disabled)').first;first.focus();p.keyboard.press('End');assert p.evaluate('document.activeElement.tagName')=='BUTTON';first.click();p.locator('.ck-sq.target').first.click();host.wait_for_function('App.S.game.last')
   elif game=='dotsboxes':
    for kind,r,c in [('h',0,0),('v',0,0),('h',1,0),('v',0,1)]:
     p=actor(pages);p.locator(f'[data-kind="{kind}"][data-r="{r}"][data-c="{c}"]').click();host.wait_for_function('(a)=>App.S.game[a[0]][a[1]][a[2]]>=0',arg=[kind,r,c])
    assert host.evaluate('App.S.game.boxes[0][0]>=0')
   elif game=='ludo':
    p=actor(pages);p.locator('[data-roll]').click();host.wait_for_function('App.S.game.rolls>0')
    if p.locator('[data-token]:not(:disabled)').count():p.locator('[data-token]:not(:disabled)').first.click()
   elif game=='battleship':
    for p in [host,guest]:p.locator('#bs-random').click()
    host.wait_for_function("App.S.game.phase==='battle'");p=actor(pages);p.locator('.pbs-enemy [data-cell]:not(:disabled)').first.click();p.locator('#bs-fire').click();host.wait_for_function('App.S.game.moves>0')
   elif game=='colorstack':
    p=actor(pages);cards=p.locator('#cs-hand .playable');
    if cards.count():
     cards.first.click();p.locator('#cs-play').click()
     if p.locator('#cs-picker').is_visible():
      p.locator('[data-color="r"]').focus();p.keyboard.press('Shift+Tab');assert p.evaluate('document.activeElement.dataset.color')=='';p.keyboard.press('Escape');assert not p.locator('#cs-picker').is_visible();p.locator('#cs-play').click();p.locator('[data-color="r"]').click()
    else:p.locator('#cs-draw').click()
   elif game=='gofish':
    p=actor(pages);p.locator('#gf-hand [data-hand-card]').first.click();assert p.locator('#gf-hand [aria-pressed=true]').count()>0;p.locator('[data-target]').first.click();p.locator('#gf-go').click();host.wait_for_function('App.S.game.lastMove?.sequence>0');passed('Go Fish actual hand card chooses rank and named Ask synchronizes')
   elif game=='wordchain':
    p=actor(pages);letter=p.evaluate('App.S.game.letter');p.locator('#wc-input').fill(letter+'xqzzl');p.locator('#wc-send').click();p.wait_for_selector('.word-feedback:not(:empty)');assert p.locator('#wc-input').input_value()==letter+'xqzzl'
    word=next(w for w in sorted(words) if w.startswith(letter) and 4<=len(w)<=8);p.locator('#wc-input').fill(word);p.locator('#wc-send').click();host.wait_for_function('App.S.game.chainLength>0');passed('Word Chain retains rejection then accepts a real broad-list word')
   elif game=='wordscramble':
    p=guest;p.locator('#ws-tiles button').first.click();assert len(p.locator('#ws-input').input_value())==1;p.locator('#ws-undo').click();assert not p.locator('#ws-input').input_value();p.locator('#ws-shuffle').click()
    p.locator('#ws-input').fill('xxzplqq');p.locator('#ws-form button').click();p.wait_for_selector('.word-feedback:not(:empty)');assert p.locator('#ws-input').input_value()=='xxzplqq'
    letters=p.evaluate('App.S.game.letters');answer=next(w for w in words if sorted(w)==sorted(''.join(letters).lower()));p.locator('#ws-input').fill(answer);p.locator('#ws-form button').click();p.wait_for_function('App.S.game.solvedByMe');passed('Scramble touch tiles, undo/shuffle, retained invalid guess and valid anagram scoring')
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
    guest.wait_for_timeout(1300);before=int(guest.locator('#im-round [data-timer]').inner_text().rstrip('sS'));secret=guest.locator('#im-role').inner_text();guest.locator('#im-privacy').click();assert 'ROLE HIDDEN' in guest.locator('#im-role').inner_text();guest.locator('#im-privacy').click();assert guest.locator('#im-role').inner_text()==secret;assert int(guest.locator('#im-round [data-timer]').inner_text().rstrip('sS'))<=before
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
    host.wait_for_function("App.S.game.phase==='result'");passed('Impostor hide/show, clue turns, discussion, voting and public reveal')
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
    host.wait_for_timeout(200);assert host.evaluate('window.entryBefore===document.querySelector(".tp-entry")');passed('Telephone real write/draw/guess chain, stable reveal entry during likes')
   elif game in ['pool','golf']:
    p=actor(pages);prefix='pl' if game=='pool' else 'gf';p.locator('[data-power="20"]').click();assert p.locator(f'#{prefix}-pow').input_value()=='20'
    if game=='pool':p.locator('#pl-place').click();p.locator('#pl-shoot').click();host.wait_for_function('App.S.game.shots>0')
    else:
     p.set_viewport_size({'width':390,'height':844});old=p.evaluate('App.S.game.players.find(p=>p.id===App.S.you)');p.locator('#gf-place').click();p.locator('#gf-canvas').press('ArrowRight');p.locator('#gf-canvas').press('Enter');p.wait_for_function('App.S.game.players.find(p=>p.id===App.S.you).placed');new=p.evaluate('App.S.game.players.find(p=>p.id===App.S.you)');assert new['y']>old['y'];p.locator('#gf-putt').click();host.wait_for_function('App.S.game.anim');passed('Portrait Golf tee arrows follow screen direction; preset Putt uses authoritative replay')
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
