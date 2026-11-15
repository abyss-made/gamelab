"""Supplemental live Canyon course captures, selected through the real settings intent."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,urllib.request,json
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent/'screenshots/details';OUT.mkdir(parents=True,exist_ok=True);url='http://127.0.0.1:45408';errors=[];views=[]
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':'45408','ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
 for _ in range(100):
  try:urllib.request.urlopen(url+'/healthz',timeout=1);break
  except:time.sleep(.1)
 else:raise RuntimeError('Course capture server did not become ready: '+server.stderr.read().decode() if server.poll() is not None else 'Course capture health check timed out')
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium');host=b.new_page(viewport={'width':1440,'height':900});host.on('pageerror',lambda e:errors.append(str(e)));host.goto(url);host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('App.S?.code');code=host.evaluate('App.S.code');guest=b.new_page();guest.goto(url+'/r/'+code);guest.locator('#screen-join .name-input').fill('Nova');guest.locator('#join-btn').click();guest.wait_for_function('App.S?.code');host.wait_for_function('App.S.players.length===2');host.evaluate("App.socket.emit('switchGame',{game:'golf',seats:App.S.players.map(p=>p.id)})");host.wait_for_function("App.S.gameId==='golf'");host.evaluate("App.socket.emit('hostUpdate',{settings:{course:'canyon'}})");host.wait_for_function("App.S.settings.course==='canyon'");host.locator('#lobby-start').click();host.wait_for_function("App.S.phase==='game'");guest.wait_for_function("App.S.phase==='game'");view=next(x for x in [host,guest] if x.evaluate('App.S.game.turnId===App.S.you'))
  for w,h in [(1440,900),(390,844),(932,430)]:
   view.set_viewport_size({'width':w,'height':h});view.evaluate('scrollTo(0,0)');view.wait_for_timeout(200);view.screenshot(path=str(OUT/f'golf-canyon-{w}.png'));over=view.evaluate('document.documentElement.scrollWidth-innerWidth');assert over<=1;views.append({'width':w,'height':h,'course':view.evaluate('App.S.game.course.name'),'hole':view.evaluate('App.S.game.hole.name'),'overflow':over})
  b.close()
 assert not errors,errors
 (OUT/'course.json').write_text(json.dumps({'views':views,'errors':errors},indent=2)+'\n')
finally:server.terminate();server.wait(timeout=10)
