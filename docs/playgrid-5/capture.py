"""Real app comparison captures. Usage: python capture.py before|after [port]."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,json,time,sys
ROOT=Path(__file__).resolve().parents[2];tag=sys.argv[1];port=sys.argv[2] if len(sys.argv)>2 else '44200';URL='http://127.0.0.1:'+port
if tag not in {'before','after'}:raise SystemExit('Use before or after.')
if tag=='before' and subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()!='8846f1514b2bbb8e807ba1b3954e136327b27fa4':raise SystemExit('Before captures require the untouched 8846f15 base checkout.')
OUT=Path(os.environ.get('PG41_EVIDENCE_DIR',str(Path(__file__).resolve().parent)))/'screenshots'/tag;OUT.mkdir(parents=True,exist_ok=True)
VP=[(1440,900),(390,844),(932,430)];errors=[];checks=[]
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':port,'ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium');host=browser.new_page(viewport={'width':1440,'height':900});host.on('pageerror',lambda e:errors.append(str(e)))
  for _ in range(50):
   try:host.goto(URL);break
   except:time.sleep(.1)
  for path,name in [('/', 'home'),('/games','catalog')]:
   host.goto(URL+path)
   for w,h in VP:
    host.set_viewport_size({'width':w,'height':h});host.wait_for_timeout(150);host.screenshot(path=str(OUT/f'{name}-{w}.png'),full_page=True)
  host.goto(URL);host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('App.S?.code');code=host.evaluate('App.S.code')
  guest=browser.new_page();guest.goto(URL+'/r/'+code);guest.wait_for_selector('.av-gallery button:visible')
  for w,h in VP:
   guest.set_viewport_size({'width':w,'height':h});guest.evaluate('scrollTo(0,0)');guest.wait_for_timeout(100);guest.screenshot(path=str(OUT/f'invite-new-{w}.png'))
  guest.locator('#screen-join .name-input').fill('Nova');guest.locator('#join-btn').click();guest.wait_for_function('App.S?.code');host.wait_for_function('App.S.players.length===2')
  returning=browser.new_context(storage_state=guest.context.storage_state()).new_page();returning.goto(URL+'/r/'+code);returning.wait_for_selector('#join-btn')
  for w,h in VP:
   returning.set_viewport_size({'width':w,'height':h});returning.evaluate('scrollTo(0,0)');returning.screenshot(path=str(OUT/f'invite-returning-{w}.png'))
  returning.close()
  kai=browser.new_page();kai.goto(URL+'/r/'+code);kai.locator('#screen-join .name-input').fill('Kai');kai.locator('#join-btn').click();kai.wait_for_function('App.S?.code');host.wait_for_function('App.S.players.length===3')
  for w,h in VP:
   host.set_viewport_size({'width':w,'height':h});host.screenshot(path=str(OUT/f'party-{w}.png'),full_page=True)
  host.set_viewport_size({'width':1440,'height':900});host.locator('[data-view=profile]:visible').first.click();host.wait_for_selector('.av-gallery button:visible')
  for w,h in VP:
   host.set_viewport_size({'width':w,'height':h});host.wait_for_timeout(100);host.screenshot(path=str(OUT/f'avatar-{w}.png'))
  host.keyboard.press('Escape');host.wait_for_function('window.GameBriefs&&Object.keys(GameBriefs).length===20')
  for game in host.evaluate('Object.keys(GameBriefs)'):
   print(tag,game,flush=True);host.evaluate("game=>App.socket.emit('switchGame',{game,seats:App.S.players.map(p=>p.id).slice(0,['fourrow','tictactoe','battleship','checkers','chess','pool'].includes(game)?2:3)})",game);host.wait_for_function('(g)=>App.S.gameId===g',arg=game)
   if game=='golf':
    for w,h in VP:
     host.set_viewport_size({'width':w,'height':h});host.wait_for_timeout(100);host.screenshot(path=str(OUT/f'lobby-intro-{w}.png'))
   host.evaluate("App.socket.emit('startGame')");host.wait_for_function("App.S.phase==='game'")
   if game=='drawguess':
    for page in [host,guest,kai]:
     if page.locator('[data-choose]').count():page.locator('[data-choose]').first.click();break
   for w,h in VP:
    host.set_viewport_size({'width':w,'height':h});host.evaluate('scrollTo(0,0)');host.wait_for_timeout(100);host.screenshot(path=str(OUT/f'{game}-{w}.png'));checks.append({'game':game,'width':w,'height':h,'overflow':host.evaluate('Math.max(0,document.documentElement.scrollWidth-innerWidth)')})
   host.evaluate("App.socket.emit('endGame')");host.wait_for_function("App.S.phase==='lobby'")
  browser.close()
 (OUT/'capture.json').write_text(json.dumps({'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'views':checks,'errors':errors},indent=2)+'\n')
 assert not errors,errors
 assert all(v['overflow']<=1 for v in checks),checks
finally:server.terminate();server.wait(timeout=10)
