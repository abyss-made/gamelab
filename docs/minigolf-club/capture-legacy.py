"""Capture identical legacy holes in the actual before/after app checkouts."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,json,urllib.request,sys
DOC=Path(__file__).resolve().parent;tag=sys.argv[1];ROOT=Path(sys.argv[2]).resolve();PORT='45428';URL='http://127.0.0.1:'+PORT;OUT=DOC/'screenshots'/tag;OUT.mkdir(exist_ok=True);errors=[];views=[]
assert tag in ['before','after'];source=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
if tag=='before':assert source=='b4a7e9d8960d6387a0af19519f9f2c019d83f794'
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':PORT,'ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
 for i in range(100):
  try:urllib.request.urlopen(URL+'/healthz').close();break
  except:
   if i==99:raise
   time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium');host=b.new_page(viewport={'width':1440,'height':900});guest=b.new_page()
  host.add_init_script("localStorage.setItem('pg_profile',JSON.stringify({name:'Alex',avatar:{e:1,c:1}}))")
  for p in [host,guest]:p.on('pageerror',lambda e:errors.append(str(e)))
  host.goto(URL);host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('App.S?.code');code=host.evaluate('App.S.code');guest.goto(URL+'/r/'+code);guest.locator('#screen-join .name-input').fill('Nova');guest.locator('#join-btn').click();host.wait_for_function('App.S.players.length===2');host.evaluate("App.socket.emit('switchGame',{game:'golf',seats:App.S.players.map(p=>p.id)})");host.wait_for_function("App.S.gameId==='golf'")
  for course in ['meadow','harbor']:
   host.evaluate("course=>App.socket.emit('hostUpdate',{settings:{course,turnTime:60}})",course);host.wait_for_function('(id)=>App.S.settings.course===id',arg=course);host.locator('#lobby-start').click();host.wait_for_function("App.S.phase==='game'")
   if tag=='after':host.wait_for_function("document.querySelector('.golf-club')?.dataset.renderer==='webgl'");host.wait_for_selector('.club-ball-label.active')
   for mode in (['follow','overview'] if tag=='after' else ['follow']):
    if mode=='overview':host.locator('#gf-view').click()
    for w,h in [(1440,900),(390,844),(932,430)]:
     host.set_viewport_size({'width':w,'height':h});host.evaluate('scrollTo(0,0)');host.wait_for_timeout(500);assert host.evaluate('document.documentElement.scrollWidth<=innerWidth+1');name=f'{course}-{mode}-{w}.png';host.screenshot(path=str(OUT/name));views.append({'file':name,'course':course,'width':w,'height':h,'overflow':0})
   host.evaluate("App.socket.emit('endGame')");host.wait_for_function("App.S.phase==='lobby'");host.set_viewport_size({'width':1440,'height':900})
  b.close()
 assert not errors,errors
 (OUT/'capture.json').write_text(json.dumps({'sourceCommit':source,'views':views,'errors':errors},indent=2)+'\n');print('PASS',tag,len(views),'actual same-course app captures')
finally:server.terminate();server.wait(timeout=10)
