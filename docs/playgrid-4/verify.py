from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,json,time
R=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent/'screenshots';OUT.mkdir(exist_ok=True);url='http://127.0.0.1:43994'
srv=subprocess.Popen(['node','server/index.js'],cwd=R/'node-server',env={**os.environ,'PORT':'43994','ALPHA_ENABLED':''},stdout=subprocess.PIPE,stderr=subprocess.PIPE)
report=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium');host=b.new_page(viewport={'width':1440,'height':900});errors=[];host.on('pageerror',lambda e:errors.append(str(e)))
  for i in range(40):
   try:host.goto(url);break
   except:time.sleep(.1)
  host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('window.App?.S?.code');code=host.evaluate('App.S.code')
  guest=b.new_page(viewport={'width':390,'height':844});guest.goto(url+'/r/'+code);guest.wait_for_selector('.av-gallery button');assert guest.evaluate('App.S') is None
  guest.locator('#screen-join .name-input').fill('Nova');guest.locator('#screen-join [data-character=a05]').click();guest.locator('#join-btn').click();guest.wait_for_function('App.S?.players?.length===2');host.wait_for_function('App.S.players.length===2');assert host.evaluate("App.S.players.some(p=>p.name==='Nova'&&p.avatar.v3?.id==='a05')")
  guest.reload();guest.wait_for_function('App.S?.code');returner=b.new_context(storage_state=guest.context.storage_state()).new_page();returner.goto(url+'/r/'+code);returner.wait_for_selector('#join-btn');assert returner.locator('#join-btn').inner_text()=='Confirm & Join';returner.close();assert guest.evaluate('App.S.players.find(p=>p.id===App.S.you).avatar.v3.id')=='a05'
  report.append({'flow':'new invite, saved identity, remote sync, refresh and returning confirmation','passed':True})
  host.locator('[data-nav="/"]').first.click() if host.locator('[data-nav="/"]').count() else host.evaluate("history.pushState({},'', '/');dispatchEvent(new PopStateEvent('popstate'))")
  assert host.locator('#nav-return').is_visible();host.locator('#nav-return').click();host.wait_for_selector('#screen-room',state='visible');assert host.evaluate('App.S.code')==code
  for w,h in [(1366,768),(1440,900),(1920,1080),(2560,1440),(390,844),(360,800)]:
   host.set_viewport_size({'width':w,'height':h});host.locator('[data-view=profile]').first.click() if host.locator('[data-view=profile]:visible').count() else host.evaluate("document.querySelector('[data-view=profile]').click()")
   host.wait_for_selector('#modal .av-gallery');assert host.locator('#modal .av-gallery button').count()==35;host.screenshot(path=str(OUT/f'studio-{w}.png'));host.locator('#modal [data-close]').first.click();report.append({'creator':[w,h],'characters':35,'horizontalOverflow':host.evaluate('document.documentElement.scrollWidth>innerWidth')})
  for w,h in [(1440,900),(390,844)]:
   host.set_viewport_size({'width':w,'height':h});host.evaluate("document.querySelector('[data-view=profile]').click()");host.wait_for_selector('#modal .av-studio.open');host.locator('#modal [data-studio-tab=looks]').click();host.wait_for_timeout(150);host.screenshot(path=str(OUT/f'studio-looks-{w}.png'));host.locator('#modal [data-studio-tab=characters]').click();host.locator('#modal [data-close]').first.click()
  host.evaluate("App.socket.emit('switchGame',{game:'drawguess'})");host.wait_for_function("App.S.gameId==='drawguess'");host.evaluate("App.socket.emit('startGame')");host.wait_for_function("App.S.phase==='game'")
  if host.locator('[data-choose]').count():host.locator('[data-choose]').first.click()
  else:
   if guest.locator('[data-choose]').count():guest.locator('[data-choose]').first.click()
  for w,h in [(1366,768),(1440,900),(1920,1080),(2560,1440),(390,844),(360,800)]:
   host.set_viewport_size({'width':w,'height':h});host.wait_for_timeout(150);host.screenshot(path=str(OUT/f'drawing-{w}.png'));rect=host.locator('.dg-canvas').bounding_box();dims=host.evaluate('({height:document.documentElement.scrollHeight,viewport:innerHeight,width:document.documentElement.scrollWidth})');assert w<901 or (rect['y']>=0 and rect['y']+rect['height']<=h and dims['height']<=h)
   report.append({'drawing':[w,h],'canvas':rect,'document':dims})
  # Audit every selectable game against all six requested device sizes, using real room state.
  host.evaluate("App.socket.emit('endGame')");host.wait_for_function("App.S.phase==='lobby'")
  host.evaluate("""async()=>{window.pg4Peers=[];for(const name of ['Kai','Mia'])await new Promise(resolve=>{const peer=io({forceNew:true});pg4Peers.push(peer);peer.on('connect',()=>peer.emit('joinRoom',{code:App.S.code,token:crypto.randomUUID().replaceAll('-',''),profile:{name,avatar:{e:2,c:3}}},()=>resolve()));});}""")
  host.wait_for_function('App.S.players.length+App.S.spectators.length===4');
  games=json.loads(subprocess.check_output(['node','-e',"const {GAMES,selectable}=require('./server/games');console.log(JSON.stringify(Object.values(GAMES).filter(g=>selectable(g.meta.id)).map(g=>({id:g.meta.id,max:g.meta.maxPlayers}))))"],cwd=R/'node-server',text=True))
  for entry in games:
   game=entry['id'];print('Audit',game,flush=True);host.evaluate("e=>{const ids=[App.S.you,...[...App.S.players,...App.S.spectators].map(p=>p.id).filter(id=>id!==App.S.you)];App.socket.emit('switchGame',{game:e.id,seats:ids.slice(0,e.max)});} ",entry);host.wait_for_function('(g)=>App.S.gameId===g',arg=game);host.evaluate("App.socket.emit('startGame')");host.wait_for_function("App.S.phase==='game'")
   for w,h in [(1366,768),(1440,900),(1920,1080),(2560,1440),(390,844),(360,800)]:
    host.set_viewport_size({'width':w,'height':h});host.wait_for_timeout(50);host.screenshot(path=str(OUT/f'{game}-{w}.png'));report.append({'game':game,'viewport':[w,h],'horizontalOverflow':host.evaluate('document.documentElement.scrollWidth>innerWidth')})
   # Primary desktop boards and their action controls must fit without page scrolling.
   for w,h in [(1366,768),(1440,900),(1920,1080),(2560,1440)]:
    host.set_viewport_size({'width':w,'height':h});host.wait_for_timeout(60)
    targets={'pool':['#pl-canvas','#pl-controls'],'golf':['#gf-canvas','#gf-controls'],'tycoon':['.ty-board','#ty-actions'],'battleship':['.bs-grid','#bs-lock'],'chess':['.ch-board'],'ludo':['.ld2-board']}.get(game,[])
    for target in targets:
     if host.locator(target).count() and host.locator(target).first.is_visible():
      box=host.locator(target).first.bounding_box();report.append({'game':game,'viewport':[w,h],'primaryControl':target,'bounds':box});assert box['y']>=0 and box['y']+box['height']<=h+1,(game,w,target,box)
   host.evaluate("App.socket.emit('endGame')");host.wait_for_function("App.S.phase==='lobby'")
  assert not errors,errors
  assert not any(x.get("horizontalOverflow") for x in report), "Horizontal overflow in audit"
  b.close()
 (OUT.parent/'checks.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
finally:srv.terminate();srv.wait(timeout=10)
