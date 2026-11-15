"""Real maximum-player rooms, card-seat scrolling, meeting layout and token colors."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,json,urllib.request
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent/'stress';OUT.mkdir(exist_ok=True);url='http://127.0.0.1:45409';errors=[];checks=[]
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':'45409','ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
 for _ in range(60):
  try:urllib.request.urlopen(url+'/healthz',timeout=1);break
  except:time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium');host=b.new_page(viewport={'width':1440,'height':900});host.goto(url);host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('App.S?.code');code=host.evaluate('App.S.code');pages=[host]
  for i in range(9):
   g=b.new_page(viewport={'width':390,'height':844});g.goto(url+'/r/'+code);g.locator('#screen-join .name-input').fill('Player '+str(i+2));g.locator('#join-btn').click();g.wait_for_function('App.S?.code');pages.append(g)
  for page in pages:page.on('pageerror',lambda e:errors.append(str(e)))
  host.wait_for_function('App.S.players.length+App.S.spectators.length===10')
  for game,n in [('gofish',6),('colorstack',8),('ludo',4),('tycoon',6),('impostor',10)]:
   print('STRESS',game,n,flush=True);host.evaluate("([game,n])=>App.socket.emit('switchGame',{game,seats:App.S.players.concat(App.S.spectators).map(p=>p.id).slice(0,n)})",[game,n]);host.wait_for_function('(g)=>App.S.gameId===g',arg=game);host.locator('#lobby-start').click();host.wait_for_function("App.S.phase==='game'");assert host.evaluate('App.S.game.players.length')==n
   for w,h in [(1440,900),(390,844),(932,430)]:
    host.set_viewport_size({'width':w,'height':h});host.evaluate('scrollTo(0,0)');host.wait_for_timeout(150);assert host.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(game,w)
    if game in ['gofish','colorstack'] and w==390:
     selector='.pgf-opponents' if game=='gofish' else '.pcs-opponents';strip=host.locator(selector);assert strip.get_attribute('tabindex')=='0';strip.locator('[data-seat]').last.scroll_into_view_if_needed();assert strip.evaluate('(el)=>{let a=el.getBoundingClientRect(),b=el.lastElementChild.getBoundingClientRect();return b.right<=a.right+1&&b.left>=a.left-1}');host.evaluate('scrollTo(0,0)')
    if game=='impostor':assert host.locator('.scene-meeting-seat').count()==10
    if game=='ludo':assert host.locator('.ld2-tok').count()==16
    if game=='tycoon':assert host.locator('.ty-tok').count()==6
    host.screenshot(path=str(OUT/f'{game}-{w}.png'));checks.append({'game':game,'players':n,'width':w,'height':h,'overflow':0})
   host.evaluate("App.socket.emit('endGame')");host.wait_for_function("App.S.phase==='lobby'")
  b.close()
 assert not errors,errors
 (OUT/'checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2)+'\n')
finally:server.terminate();server.wait(timeout=10)
