"""Real app comparison captures. Usage: python capture.py before|after [port]."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,json,time,sys,urllib.request
ROOT=Path(__file__).resolve().parents[2];tag=sys.argv[1];port=sys.argv[2] if len(sys.argv)>2 else '44200';URL='http://127.0.0.1:'+port
if tag not in {'before','after'}:raise SystemExit('Use before or after.')
if tag=='before' and subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()!='600d87bbfb0b2d29f1b3c8ed312cb3dbf44fe491':raise SystemExit('Before captures require the untouched 600d87b previous visual revision.')
OUT=Path(os.environ.get('PG41_EVIDENCE_DIR',str(Path(__file__).resolve().parent)))/'screenshots'/tag;OUT.mkdir(parents=True,exist_ok=True)
VP=[(1440,900),(390,844),(932,430)];errors=[];checks=[]
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':port,'ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
 for attempt in range(100):
  try:
   with urllib.request.urlopen(URL+'/healthz',timeout=1) as response:assert response.status==200
   break
  except Exception:
   if attempt==99:raise
   time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium');host=browser.new_page(viewport={'width':1440,'height':900});host.on('pageerror',lambda e:errors.append(str(e)))
  for _ in range(50):
   try:host.goto(URL);break
   except:time.sleep(.1)
  host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('App.S?.code');code=host.evaluate('App.S.code')
  guest=browser.new_page();guest.on('pageerror',lambda e:errors.append(str(e)));guest.goto(URL+'/r/'+code);guest.wait_for_selector('.av-gallery button:visible')
  guest.locator('#screen-join .name-input').fill('Nova');guest.locator('#join-btn').click();guest.wait_for_function('App.S?.code');host.wait_for_function('App.S.players.length===2')
  kai=browser.new_page();kai.on('pageerror',lambda e:errors.append(str(e)));kai.goto(URL+'/r/'+code);kai.locator('#screen-join .name-input').fill('Kai');kai.locator('#join-btn').click();kai.wait_for_function('App.S?.code');host.wait_for_function('App.S.players.length===3')
  for game in ['golf','pool','tycoon','gofish','ludo','battleship','colorstack','impostor','chess','telephone']:
   print(tag,game,flush=True);host.evaluate("game=>App.socket.emit('switchGame',{game,seats:App.S.players.map(p=>p.id).slice(0,['fourrow','tictactoe','battleship','checkers','chess','pool'].includes(game)?2:3)})",game);host.wait_for_function('(g)=>App.S.gameId===g',arg=game)
   host.evaluate("App.socket.emit('startGame')");host.wait_for_function("App.S.phase==='game'")
   if game=='drawguess':
    for page in [host,guest,kai]:
     if page.locator('[data-choose]').count():page.locator('[data-choose]').first.click();break
   # Capture the real shooter's ready state, including the actual cue and controls.
   view=host
   if tag=='after' and game in ['pool','golf']:
    view=next(p for p in [host,guest,kai] if p.evaluate('(App.S.game.turnId||App.S.game.players?.[App.S.game.turn]?.id)===App.S.you'))
    if game=='pool':view.locator('#pl-place').click()
   for w,h in VP:
    view.set_viewport_size({'width':w,'height':h});view.evaluate('scrollTo(0,0)');view.wait_for_timeout(150);view.screenshot(path=str(OUT/f'{game}-{w}.png'));layout=view.evaluate('''() => {const b=document.querySelector('.ty-board,.ld2-board.pld,.ch-board');return b?{boardWidth:b.getBoundingClientRect().width,boardHeight:b.getBoundingClientRect().height}:null}''');checks.append({'game':game,'width':w,'height':h,'overflow':view.evaluate('Math.max(0,document.documentElement.scrollWidth-innerWidth)'),'layout':layout})
    if w==932 and game in ['tycoon','ludo','chess']:assert layout and layout['boardWidth']>=300,(game,layout,'landscape board too small')
   host.evaluate("App.socket.emit('endGame')");host.wait_for_function("App.S.phase==='lobby'")
  browser.close()
 (OUT/'capture.json').write_text(json.dumps({'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'views':checks,'errors':errors},indent=2)+'\n')
 assert not errors,errors
 assert all(v['overflow']<=1 for v in checks),checks
finally:server.terminate();server.wait(timeout=10)
