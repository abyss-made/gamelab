"""Real app comparison captures. Usage: python capture.py before|after [port]."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,json,time,sys
ROOT=Path(__file__).resolve().parents[2];tag=sys.argv[1];port=sys.argv[2] if len(sys.argv)>2 else '44070';URL='http://127.0.0.1:'+port
if tag not in {'before','after'}:raise SystemExit('Use before or after.')
if tag=='before' and subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()!='a81444b4afc59bfbe1bf83213ba5f6fc4dd7ac76':raise SystemExit('Before captures require the untouched a81444b base checkout.')
OUT=Path(__file__).resolve().parent/'screenshots'/tag;OUT.mkdir(parents=True,exist_ok=True)
VP=[(1366,768),(1440,900),(390,844),(932,430)]
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':port,'ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium');host=browser.new_page(viewport={'width':1440,'height':900})
  for _ in range(50):
   try:host.goto(URL);break
   except:time.sleep(.1)
  host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('App.S?.code');code=host.evaluate('App.S.code')
  guest=browser.new_page();guest.goto(URL+'/r/'+code);guest.wait_for_selector('.av-gallery button')
  for w,h in VP:
   guest.set_viewport_size({'width':w,'height':h});guest.evaluate('scrollTo(0,0)');guest.wait_for_timeout(100);guest.screenshot(path=str(OUT/f'invite-new-{w}.png'))
  guest.locator('#screen-join .name-input').fill('Nova');guest.locator('#join-btn').click();guest.wait_for_function('App.S?.code');host.wait_for_function('App.S.players.length===2')
  returning=browser.new_context(storage_state=guest.context.storage_state()).new_page();returning.goto(URL+'/r/'+code);returning.wait_for_selector('#join-btn')
  for w,h in VP:
   returning.set_viewport_size({'width':w,'height':h});returning.evaluate('scrollTo(0,0)');returning.screenshot(path=str(OUT/f'invite-returning-{w}.png'))
  returning.close()
  host.evaluate("""async()=>await new Promise(done=>{window.peer=io({forceNew:true});peer.on('connect',()=>peer.emit('joinRoom',{code:App.S.code,token:crypto.randomUUID().replaceAll('-',''),profile:{name:'Kai',avatar:{e:2,c:3}}},done));})""");host.wait_for_function('App.S.players.length===3')
  for game in ['wordchain','categories','telephone','bluff','impostor','gofish','dotsboxes','golf','tycoon']:
   print(tag,game,flush=True);host.evaluate("game=>App.socket.emit('switchGame',{game})",game);host.wait_for_function('(g)=>App.S.gameId===g',arg=game)
   if game=='golf':
    for w,h in VP:
     host.set_viewport_size({'width':w,'height':h});host.wait_for_timeout(100);host.screenshot(path=str(OUT/f'lobby-intro-{w}.png'))
   host.evaluate("App.socket.emit('startGame')");host.wait_for_function("App.S.phase==='game'")
   for w,h in VP:
    host.set_viewport_size({'width':w,'height':h});host.evaluate('scrollTo(0,0)');host.wait_for_timeout(100);host.screenshot(path=str(OUT/f'{game}-{w}.png'))
   host.evaluate("App.socket.emit('endGame')");host.wait_for_function("App.S.phase==='lobby'")
  browser.close()
finally:server.terminate();server.wait(timeout=10)
