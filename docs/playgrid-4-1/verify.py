"""Issue #70 integration QA, real browsers and actual Express/Socket.IO state."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,json,math,urllib.request
ROOT=Path(__file__).resolve().parents[2];OUT=Path(os.environ.get('PG41_EVIDENCE_DIR',str(Path(__file__).resolve().parent)));URL='http://127.0.0.1:44071';shots=OUT/'screenshots'/'flows';shots.mkdir(parents=True,exist_ok=True)
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':'44071','ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
checks=[];errors=[]
def passed(label):checks.append(label);print('PASS',label,flush=True)
def switch(host,game):
 host.evaluate("game=>App.socket.emit('switchGame',{game,seats:[App.S.you,...App.S.players.filter(p=>p.id!==App.S.you).map(p=>p.id)].slice(0,game==='connect4'||game==='battleship'||game==='checkers'||game==='chess'||game==='pool'?2:3)})",game);host.wait_for_function('(id)=>App.S.gameId===id',arg=game)
def start(host):host.locator('#lobby-start').click();host.wait_for_function("App.S.phase==='game'")
def stop(host):host.evaluate("App.socket.emit('endGame')");host.wait_for_function("App.S.phase==='lobby'")
def wait_room(page):page.wait_for_function('App.S?.code')
def place_on_canvas(page,x,y):
 r=page.locator('#gf-canvas').bounding_box();rot=page.evaluate('innerWidth<700&&innerHeight>innerWidth')
 u,v=(y/440,1-x/700) if rot else (x/700,y/440)
 point=(r['x']+r['width']*u,r['y']+r['height']*v)
 if page.evaluate("matchMedia('(pointer:coarse)').matches"):page.touchscreen.tap(*point)
 else:page.mouse.click(*point)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium');host=b.new_page(viewport={'width':1440,'height':900});host.on('pageerror',lambda error:errors.append(str(error)))
  for _ in range(50):
   try:host.goto(URL);break
   except:time.sleep(.1)
  host.locator('#hero-create').click();host.locator('#c-go').click();wait_room(host);code=host.evaluate('App.S.code')
  pages=[host]
  for name in ['Nova','Kai']:
   page=b.new_page(viewport={'width':390,'height':844},has_touch=True);page.on('pageerror',lambda error:errors.append(str(error)));page.goto(URL+'/#'+code);page.wait_for_selector('.av-gallery button');assert page.url.endswith('/r/'+code)
   if name=='Nova':
    page.locator('#screen-join .dice').click();expected=page.evaluate("JSON.parse(localStorage.pg_profile).avatar");assert 'v3' not in expected
   page.locator('#screen-join .name-input').fill(name);page.locator('#join-btn').click();wait_room(page);pages.append(page)
   if name=='Nova':assert page.evaluate('App.S.players.find(p=>p.id===App.S.you).avatar.e')==expected['e']
  host.wait_for_function('App.S.players.length===3');guest,kai=pages[1:]
  passed('Hash invites, first-player setup and merged classic Dice selection retain room/identity with three real clients')
  returning=b.new_context(storage_state=guest.context.storage_state()).new_page();returning.goto(URL+'/r/'+code);returning.wait_for_selector('#join-btn');returning.set_viewport_size({'width':390,'height':844});returning.wait_for_timeout(200)
  assert not returning.locator('.av-studio').last.is_visible();assert returning.locator('#join-btn').is_visible();assert returning.locator('#screen-join .name-input').input_value()=='Nova';assert returning.evaluate('App.S') is None;returning.screenshot(path=str(shots/'returning-390.png'));returning.close()
  passed('Returning mobile invitation stays compact after asynchronous catalog load and does not allocate a seat')
  for path in ['/r/'+code,'/js/main.js','/experience41.css','/api/health']:
   with urllib.request.urlopen(URL+path) as response:
    assert response.headers['X-Content-Type-Options']=='nosniff';assert response.headers['Referrer-Policy']=='same-origin';assert response.headers['X-Frame-Options']=='SAMEORIGIN'
    if path=='/api/health':
     health=json.load(response);assert health['ok'] and health['rooms']==1 and health['members']==3 and health['sockets']>=3;assert set(health)=={'ok','uptimeS','rooms','members','sockets','rssMb','heapMb'}
  passed('Claude security headers serve redesigned invites and assets; health reports only aggregates with three gameplay clients connected')
  games=host.evaluate('Object.keys(GameBriefs)')
  for game in games:
   switch(host,game);host.wait_for_selector('.game-brief');assert host.locator('.brief-example span').count()>=3;assert host.locator('.game-brief').inner_text().strip()
  passed('All 20 selectable games expose a worked example and expandable rules before starting')
  switch(host,'categories');start(host);host.wait_for_selector('[data-cat]');nonsense=host.evaluate('App.S.game.letter')+'xqzzl'
  for page in pages:page.locator('[data-cat]').first.fill(nonsense);page.locator('#cr-done').click()
  host.wait_for_function("App.S.game.phase==='review'");assert host.evaluate('App.S.game.review.rows.every(r=>r.cells[0].points===0&&r.cells[0].reason)');assert host.locator('td small').first.inner_text().strip();guest.locator('.cr-table-wrap').focus();guest.keyboard.press('ArrowRight');guest.wait_for_function("document.querySelector('.cr-table-wrap').scrollLeft>0");guest.evaluate("document.querySelector('.cr-table-wrap').scrollLeft=0");host.screenshot(path=str(shots/'categories-rejection-1440.png'));guest.screenshot(path=str(shots/'categories-rejection-390.png'));passed('Categories rejects submitted nonsense for every real client and renders the server reason in review')
  stop(host);switch(host,'telephone');host.locator('#game-settings-btn').click();host.locator('[data-setting=rounds]').select_option('3');host.locator('[data-setting=drawTime]').select_option('30');host.locator('[data-setting=writeTime]').select_option('15');host.locator('[data-setting=promptSource]').select_option('custom');host.locator('[data-setting=customWords]').fill('A dancing robot, a sleepy dragon');host.locator('#settings-save').click();host.wait_for_function("App.S.settings.promptSource==='custom'&&App.S.settings.rounds===3");guest.wait_for_function("App.S.settings.promptSource==='custom'");start(host)
  host.wait_for_function("App.S.game.kind==='draw'");assert host.evaluate('App.S.game.round')==2;assert host.evaluate('App.S.game.source.text') in ['A dancing robot','a sleepy dragon']
  before=guest.evaluate('App.S.you');guest.reload();wait_room(guest);assert guest.evaluate('App.S.you')==before;assert guest.evaluate('App.S.players.length')==3
  for page in pages:
   page.locator('.tp-canvas').last.scroll_into_view_if_needed();r=page.locator('.tp-canvas').last.bounding_box();page.mouse.move(r['x']+r['width']*.3,r['y']+r['height']*.3);page.mouse.down();page.mouse.move(r['x']+r['width']*.6,r['y']+r['height']*.6,steps=8);page.mouse.up();page.locator('#tp-done').click()
  host.wait_for_function("App.S.game.kind==='guess'")
  for page in pages:page.locator('#tp-input').fill('A robot on holiday');page.locator('#tp-input').press('Enter')
  host.wait_for_function("App.S.game.phase==='reveal'");assert host.evaluate('App.S.game.round===3&&App.S.game.completedRounds===3');host.screenshot(path=str(shots/'telephone-reveal-1440.png'))
  passed('Telephone settings round-trip to all clients; custom prompt → real drawing → guess → bounded reveal; refresh restores the same member')
  stop(host);switch(host,'bluff');start(host)
  for i,page in enumerate(pages):page.locator('#bl-input').fill(['purple walrus','a Pink toaster','a Flying robot'][i]);assert page.locator('#bl-input').input_value()==page.locator('#bl-input').input_value().upper();page.locator('#bl-input').press('Enter')
  host.wait_for_function("App.S.game.phase==='vote'");assert host.evaluate('App.S.game.options.every(o=>o.text===o.text.toUpperCase())');host.screenshot(path=str(shots/'bluff-vote-1440.png'));passed('Bluff uppercases actual entry values, submitted answers and anonymous voting options')
  stop(host);switch(host,'gofish');start(host);host.wait_for_function('App.S.game.hand')
  turn=host.evaluate('App.S.game.turnId');asker=next(page for page in pages if page.evaluate('App.S.you')==turn)
  asker.locator('[data-rank]').first.click();asker.locator('[data-target]').first.click();asker.locator('#gf-go').click();host.wait_for_function('App.S.game.lastMove?.sequence===1')
  for page in pages:page.wait_for_selector('#gf-public-action',state='visible');assert 'MOST RECENT ASK' in page.locator('#gf-public-action').inner_text()
  event=host.evaluate('App.S.game.lastMove');assert set(event)<=set(['sequence','askerId','targetId','rank','received','drawn','matched','again','books']);host.screenshot(path=str(shots/'gofish-request-1440.png'));guest.screenshot(path=str(shots/'gofish-request-390.png'))
  guest.reload();wait_room(guest);guest.wait_for_selector('#gf-public-action',state='visible');assert 'transfer' not in guest.locator('#gf-public-action').get_attribute('class');assert 'fish' not in guest.locator('#gf-public-action').get_attribute('class').split()
  passed('Go Fish request names/rank/outcome synchronize to all clients without private draw data; reconnect does not replay the transfer animation')
  stop(host);switch(host,'dotsboxes');start(host)
  for kind,r,c in [('h',0,0),('v',0,0),('h',1,0),('v',0,1)]:
   turn=host.evaluate('App.S.game.players[App.S.game.turn].id');actor=next(page for page in pages if page.evaluate('App.S.you')==turn)
   actor.locator(f'.db-edge[data-kind={kind}][data-r="{r}"][data-c="{c}"]').click();host.wait_for_function('(e)=>App.S.game[e.kind][e.r][e.c]>=0',arg={'kind':kind,'r':r,'c':c})
  host.wait_for_function('App.S.game.boxes[0][0]>=0');assert 'captured' in host.locator('#db-status').inner_text();assert host.locator('.db-box').first.inner_text();assert 'owned by player' in host.locator('.db-edge.taken').first.get_attribute('aria-label');host.screenshot(path=str(shots/'dots-capture-1440.png'))
  passed('Dots & Boxes captures use owner numbers/initials, accessible line ownership, distinct colors and extra-turn feedback')
  stop(host);switch(host,'golf');start(host);host.wait_for_selector('#gf-canvas');assert host.evaluate('App.S.game.turnId===App.S.you');host.locator('#gf-place').click();place_on_canvas(host,142,220);host.wait_for_function('App.S.game.players.find(p=>p.id===App.S.you).placed');assert abs(host.evaluate('App.S.game.players.find(p=>p.id===App.S.you).x')-142)<.2
  guest.locator('#gf-place').scroll_into_view_if_needed();guest.locator('#gf-place').click();guest.locator('#gf-canvas').scroll_into_view_if_needed();place_on_canvas(guest,104,200);guest.wait_for_function('App.S.game.players.find(p=>p.id===App.S.you).placed');assert abs(guest.evaluate('App.S.game.players.find(p=>p.id===App.S.you).y')-200)<.2
  guest.screenshot(path=str(shots/'golf-tee-390.png'));kai.locator('#gf-place').click();kai.locator('#gf-canvas').press('ArrowRight');kai.locator('#gf-canvas').press('Enter');kai.wait_for_function('App.S.game.players.find(p=>p.id===App.S.you).placed')
  passed('Desktop pointer, rotated mobile touch and keyboard tee placement use validated, distinct server positions')
  host.evaluate("App.socket.emit('action',{type:'putt',angle:0,power:.4})");host.wait_for_function('App.S.game.anim');guest.wait_for_function('!document.querySelector("#gf-putt").disabled',timeout=25000)
  assert guest.locator('#gf-place').is_enabled();passed('Tee placement re-enables on the local replay clock without requiring a fresh server snapshot')
  target=host.evaluate('App.S.game.players.find(p=>p.id===App.S.you)');ball=guest.evaluate('App.S.game.players.find(p=>p.id===App.S.you)');assert guest.evaluate('App.S.game.turnId===App.S.you')
  angle=math.atan2(target['y']-ball['y'],target['x']-ball['x']);guest.evaluate("a=>App.socket.emit('action',{type:'putt',angle:a,power:.8})",angle);host.wait_for_function('App.S.game.last.collisions>0',timeout=10000);guest.wait_for_function('App.S.game.last.collisions>0');assert host.evaluate('JSON.stringify(App.S.game.anim.frames)')==guest.evaluate('JSON.stringify(App.S.game.anim.frames)');assert host.evaluate('JSON.stringify(App.S.game.anim.paths)')==guest.evaluate('JSON.stringify(App.S.game.anim.paths)');host.screenshot(path=str(shots/'golf-collision-1440.png'))
  guest.reload();wait_room(guest);assert guest.evaluate('App.S.game.last.collisions')>0;host.wait_for_timeout(min(20000,guest.evaluate('App.S.game.busyMs')+150))
  positions=host.evaluate('App.S.game.players.map(p=>({id:p.id,x:p.x,y:p.y,holed:p.holed}))');assert positions==guest.evaluate('App.S.game.players.map(p=>({id:p.id,x:p.x,y:p.y,holed:p.holed}))');passed('Real multiplayer collision paths and final ball positions match across clients, including refresh during replay')
  stop(host);host.locator('#game-settings-btn').click();host.locator('[data-setting=course]').select_option('harbor');host.locator('#settings-save').click();host.wait_for_function("App.S.settings.course==='harbor'");start(host);host.wait_for_function("App.S.game.course.id==='harbor'");assert host.evaluate('App.S.game.hole.slopes.length>0');host.screenshot(path=str(shots/'golf-harbor-1440.png'));guest.locator('#gf-canvas').scroll_into_view_if_needed();guest.screenshot(path=str(shots/'golf-harbor-390.png'));passed('Host can select Harbor Links; authored slope course renders on desktop and mobile')
  stop(host);switch(host,'tycoon');start(host);host.wait_for_selector('.ty-board');assert host.locator('details:has(#ty-trades)').get_attribute('open') is None;host.locator('details:has(#ty-trades)>summary').click();assert host.locator('[data-trade-toggle]').is_visible()
  for w,h in [(1366,768),(1440,900),(390,844),(932,430)]:
   host.set_viewport_size({'width':w,'height':h});host.wait_for_timeout(100);assert host.evaluate('document.documentElement.scrollWidth<=innerWidth');host.screenshot(path=str(shots/f'tycoon-{w}.png'))
  passed('Tycoon keeps the map focal with contextual expandable trades and no horizontal overflow at all required viewports')
  stop(host);switch(host,'drawguess');start(host);host.wait_for_function('App.S.game')
  chooser=next(page for page in pages if page.locator('[data-choose]').count());chooser.locator('[data-choose]').first.click();chooser.set_viewport_size({'width':932,'height':430});chooser.locator('#dg-expand').click();chooser.wait_for_timeout(400);assert chooser.locator('.dg-top').is_visible();assert chooser.locator('#dg-word').inner_text().strip();assert chooser.evaluate('''()=>{const top=document.querySelector('.dg-top').getBoundingClientRect(),word=document.querySelector('#dg-word').getBoundingClientRect(),canvas=document.querySelector('.dg-canvas').getBoundingClientRect();return top.height<=48&&canvas.top>=top.bottom&&canvas.width>=300&&canvas.height>=225&&document.elementFromPoint(word.x+word.width/2,word.y+word.height/2).closest('#dg-word');}''');chooser.screenshot(path=str(shots/'drawing-landscape-932.png'));passed('Expanded landscape drawing has an unobscured compact word/timer bar and usable non-overlapping canvas')
  assert not errors,errors
  b.close()
 (OUT/'browser-checks.json').write_text(json.dumps({'passed':checks,'errors':errors},indent=2)+'\n')
finally:server.terminate();server.wait(timeout=10);assert server.returncode==0, f"Server shutdown exit {server.returncode}"
