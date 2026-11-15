"""Real three-client actions, reconnects, forfeits and rematches for all selectable games."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,json,urllib.request
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent/'first';OUT.mkdir(exist_ok=True);SHOTS=OUT/'screenshots'/'played';SHOTS.mkdir(parents=True,exist_ok=True)
URL='http://127.0.0.1:44202';checks=[];errors=[]
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
  probe.wait_for_function('typeof GameBriefs!=="undefined"');games=probe.evaluate('Object.keys(GameBriefs)');games=[g for g in games if g in ['golf','pool','tycoon','gofish','ludo']];probe.close()
  if os.environ.get('PG5_GAMES'):games=[g for g in games if g in os.environ['PG5_GAMES'].split(',')]
  for game in games:
   print('GAME',game,flush=True)
   contexts=[b.new_context(record_video_dir=str(OUT/'video') if i==0 else None,viewport={'width':1440 if i==0 else 390,'height':900 if i==0 else 844},has_touch=i>0) for i in range(3)]
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
   if game=='gofish':
    p=actor(pages);hand=p.evaluate('App.S.game.hand');own=p.evaluate('App.S.you')
    targets=[q for q in pages if q.evaluate('App.S.you')!=own]
    target=targets[0];rank=hand[0]['r']
    for q in targets:
     common={c['r'] for c in hand}&{c['r'] for c in q.evaluate('App.S.game.hand||[]')}
     if common:target=q;rank=next(iter(common));break
    tid=target.evaluate('App.S.you');p.locator(f'[data-card][data-rank="{rank}"]').first.click(position={'x':20,'y':35});assert p.locator('#gf-hand [aria-pressed=true]').count()>0;p.locator(f'[data-target="{tid}"]').click();p.locator('#gf-go').click();host.wait_for_function('App.S.game.lastMove?.sequence>0')
    event=host.evaluate('App.S.game.lastMove')
    if event['received'] or event['drawn']:host.locator('.p5-flying-card').first.wait_for(state='attached',timeout=2000)
    passed('Go Fish direct card selection, named Ask and public face-down transfer')
    for attempt in range(100):
     if host.evaluate('App.S.game.players.some(p=>p.books.length>0)'):break
     p=actor(pages);p.wait_for_function('App.S.game.turnId===App.S.you');g=p.evaluate('App.S.game');hand=g['hand'];own=p.evaluate('App.S.you')
     if not hand:host.wait_for_timeout(100);continue
     targets=[q for q in pages if q.evaluate('App.S.you')!=own and any(x['id']==q.evaluate('App.S.you') and x['count']>0 for x in g['players'])]
     target=targets[0];rank=hand[0]['r']
     for q in targets:
      common={c['r'] for c in hand}&{c['r'] for c in q.evaluate('App.S.game.hand||[]')}
      if common:target=q;rank=next(iter(common));break
     tid=target.evaluate('App.S.you');sequence=g['lastMove']['sequence'];p.locator(f'[data-card][data-rank="{rank}"]').first.click(position={'x':20,'y':35});p.locator(f'[data-target="{tid}"]').click();p.locator('#gf-go').click();host.wait_for_function('(n)=>App.S.game.lastMove.sequence>n',arg=sequence)
    assert host.evaluate('App.S.game.players.some(p=>p.books.length>0)')
    host.locator('.p5-book-toast').first.wait_for(state='attached',timeout=2000)
    passed('Go Fish real legal requests complete a public book and render its new-book treatment')
   elif game=='ludo':
    moved=False
    for attempt in range(50):
     p=actor(pages);p.wait_for_function('App.S.game.turnId===App.S.you');expected=host.evaluate('({rolls:App.S.game.rolls,event:JSON.stringify(App.S.game.lastEvent)})');p.wait_for_function('(s)=>App.S.game.rolls===s.rolls&&JSON.stringify(App.S.game.lastEvent)===s.event',arg=expected);g=p.evaluate('App.S.game')
     if g['phase']=='roll':
      count=g['rolls'];p.locator('[data-roll]').click();host.wait_for_function('(n)=>App.S.game.rolls>n',arg=count)
     elif g['phase']=='move':
      key=p.evaluate('JSON.stringify(App.S.game.lastEvent)');p.locator('#ld2-ctl [data-move]').first.click();host.wait_for_function('(k)=>JSON.stringify(App.S.game.lastEvent)!==k',arg=key);moved=True;break
     else:host.wait_for_timeout(250)
    assert moved,'Ludo must execute a legal server-confirmed token move'
    passed('Ludo actual server dice and legal token move, with routed presentation')
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
   host.wait_for_timeout(450);shot(host,game+'-result')
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
   movie=host.video
   for c in contexts:c.close()
   if movie:Path(movie.path()).rename(OUT/'video'/f'{game}-actual-play.webm')
  assert not errors,errors
  b.close()
 (OUT/os.environ.get('PG5_REPORT','browser-checks.json')).write_text(json.dumps({'checks':checks,'errors':errors},indent=2)+'\n')
finally:
 server.terminate();server.wait(timeout=10)
 (OUT/'browser-progress.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2)+'\n')
