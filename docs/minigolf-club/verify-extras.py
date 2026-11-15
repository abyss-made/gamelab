"""Actual camera controls, six-player rooms, spectators, accessibility and no-WebGL recovery."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,json,urllib.request
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent;SHOTS=OUT/'screenshots';SHOTS.mkdir(exist_ok=True);URL='http://127.0.0.1:45430';checks=[];errors=[];peers=[]
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':'45430','ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
def passed(message):checks.append(message);print('PASS',message,flush=True)
def party(p):
 p.goto(URL);p.locator('#hero-create').click();p.locator('#c-go').click();p.wait_for_function('App.S?.code');return p.evaluate('App.S.code')
def helpers(code,n):
 proc=subprocess.Popen(['node','docs/minigolf-club/join-party.js',URL,code,str(n)],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);peers.append(proc);assert proc.stdout.readline().strip()=='READY';return proc
def start(p,n):
 p.wait_for_function('(n)=>App.S.players.length+App.S.spectators.length===n',arg=n);p.evaluate("App.socket.emit('switchGame',{game:'golf',seats:App.S.players.map(p=>p.id).slice(0,6)})");p.wait_for_function("App.S.gameId==='golf'");p.evaluate("App.socket.emit('hostUpdate',{settings:{turnTime:60}})");p.wait_for_function('App.S.settings.turnTime===60');p.locator('#lobby-start').click();p.wait_for_function("App.S.phase==='game'")
def projection(p):return p.evaluate('GameUI.golf.project(...App.S.game.hole.cup)')
try:
 for i in range(100):
  try:urllib.request.urlopen(URL+'/healthz').close();break
  except:
   if i==99:raise
   time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium');host=b.new_page(viewport={'width':1440,'height':900});host.on('pageerror',lambda e:errors.append(str(e)));code=party(host);helpers(code,5)
  viewer=b.new_page();viewer.on('pageerror',lambda e:errors.append(str(e)));viewer.goto(URL+'/r/'+code);viewer.locator('#screen-join .name-input').fill('Watching');viewer.locator('#join-btn').click();start(host,7);host.wait_for_function("document.querySelector('.golf-club').dataset.renderer==='webgl'");host.wait_for_selector('.club-ball-label.active');viewer.wait_for_function("App.S?.game?.myIndex===-1&&document.querySelector('.golf-club')?.dataset.renderer==='webgl'");assert not viewer.locator('#gf-controls').is_visible();viewer.locator('#gf-view').click();assert viewer.locator('#gf-view').get_attribute('aria-pressed')=='true';passed('Spectator has a real 3D camera and no shot controls');viewer.close()
  host.locator('#gf-view').click();host.wait_for_timeout(300)
  for w,h in [(1440,900),(390,844),(932,430)]:
   host.set_viewport_size({'width':w,'height':h});host.evaluate('scrollTo(0,0)');host.wait_for_timeout(200);assert host.evaluate('App.S.game.players.length')==6;assert host.locator('#gf-players .b2-player').count()==6;assert host.locator('.club-ball-label').count()==6;assert host.evaluate('document.documentElement.scrollWidth<=innerWidth+1');host.screenshot(path=str(SHOTS/f'six-players-{w}.png'))
  # A fresh match gives input checks a full turn clock after the multi-viewport captures.
  host.evaluate("App.socket.emit('endGame')");host.wait_for_function("App.S.phase==='lobby'");host.evaluate("App.socket.emit('startGame')");host.wait_for_function("document.querySelector('.golf-club')?.dataset.renderer==='webgl'");host.wait_for_selector('.club-ball-label.active')
  host.set_viewport_size({'width':1440,'height':900});host.locator('#gf-canvas').scroll_into_view_if_needed();host.wait_for_timeout(200)
  host.locator('#gf-view').click();host.wait_for_timeout(200)
  before=projection(host);host.locator('[data-camera-rotate="1"]').click();host.wait_for_timeout(120);after=projection(host);assert abs(before['x']-after['x'])+abs(before['y']-after['y'])>5;host.locator('[data-camera-rotate="-1"]').click();host.wait_for_function("b=>{const p=GameUI.golf.project(...App.S.game.hole.cup);return Math.abs(b.x-p.x)+Math.abs(b.y-p.y)<2}",arg=before,timeout=10000)
  before=projection(host);host.locator('[data-camera-zoom="1"]').click();host.wait_for_function("b=>{const p=GameUI.golf.project(...App.S.game.hole.cup);return Math.abs(b.x-p.x)+Math.abs(b.y-p.y)>5}",arg=before,timeout=10000);after=projection(host);host.locator('[data-camera-zoom="-1"]').click();host.locator('#gf-center').click();assert host.locator('#gf-view').get_attribute('aria-pressed')=='false';passed('Six-player scene at all three sizes; rotate, overview zoom and Center genuinely change the camera')
  host.evaluate("window.cameraPuttEvents=[];App.socket.onAnyOutgoing((name,payload)=>{if(name==='action'&&payload?.type==='putt')window.cameraPuttEvents.push(payload)})");r=host.locator('#gf-canvas').bounding_box();before=projection(host);host.mouse.move(r['x']+r['width']*.7,r['y']+r['height']*.4);host.mouse.down(button='right');host.mouse.move(r['x']+r['width']*.7+60,r['y']+r['height']*.4+10,steps=5);host.mouse.up(button='right');host.wait_for_function("b=>{const p=GameUI.golf.project(...App.S.game.hole.cup);return Math.abs(b.x-p.x)+Math.abs(b.y-p.y)>5}",arg=before,timeout=10000);after=projection(host);assert host.evaluate('window.cameraPuttEvents.length===0');passed('Right-drag rotates the actual camera without putting')
  # Shot cancellation is a separate fresh-turn case, not a race with the camera-test turn clock.
  host.evaluate("App.socket.emit('endGame')");host.wait_for_function("App.S.phase==='lobby'");host.evaluate("App.socket.emit('startGame')");host.wait_for_function("document.querySelector('.golf-club')?.dataset.renderer==='webgl'&&App.S.game.turnId===App.S.you");host.wait_for_selector('.club-ball-label.active');host.locator('#gf-canvas').scroll_into_view_if_needed();host.wait_for_timeout(150)
  point=host.evaluate('(()=>{const p=App.S.game.players.find(p=>p.id===App.S.you);return GameUI.golf.project(p.x,p.y)})()');host.mouse.move(point['x'],point['y']);host.mouse.down();host.mouse.move(point['x']-55,point['y'],steps=4);assert host.locator('.golf-club').get_attribute('data-gesture')=='pull';host.set_viewport_size({'width':390,'height':844});host.wait_for_timeout(200);host.mouse.up();assert host.locator('.golf-club').get_attribute('data-gesture')=='idle';assert host.evaluate('App.S.game.players.every(p=>p.strokes===0)');passed('Resizing during a held shot cancels without a stroke')
  host.emulate_media(reduced_motion='reduce');host.wait_for_timeout(500);a=host.locator('#gf-canvas').evaluate('(c)=>c.toDataURL()');host.wait_for_timeout(200);z=host.locator('#gf-canvas').evaluate('(c)=>c.toDataURL()');assert a==z;assert host.evaluate("document.querySelector('#stage').getAnimations({subtree:true}).filter(a=>a.playState==='running').length") == 0;host.screenshot(path=str(SHOTS/'reduced-motion-390.png'));passed('Reduced motion settles water, flag, camera and decorative effects')
  for i in range(3):
   host.evaluate("App.socket.emit('endGame')");host.wait_for_function("App.S.phase==='lobby'");host.evaluate("App.socket.emit('startGame')");host.wait_for_function("document.querySelector('.golf-club')?.dataset.renderer==='webgl'");host.wait_for_selector('.club-ball-label.active');assert host.locator('.club-ball-labels').count()==1;assert host.locator('#gf-canvas').count()==1
  passed('Three remounts retain one live scene and one label layer')
  ctx=b.new_context(viewport={'width':390,'height':844},has_touch=True);ctx.add_init_script("(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)}})()")
  fallback=ctx.new_page();fallback.on('pageerror',lambda e:errors.append(str(e)));fcode=party(fallback);helpers(fcode,1);start(fallback,2);fallback.wait_for_function("document.querySelector('.golf-club')?.dataset.renderer==='2d'");assert not fallback.locator('.club-camera-controls').is_visible();fallback.locator('#gf-pow').fill('40');fallback.locator('#gf-putt').click();fallback.wait_for_function('App.S.game.players[0].strokes===1');fallback.screenshot(path=str(SHOTS/'compatibility-390.png'));passed('Unavailable WebGL recovers to a working, explicitly labeled top-down renderer and accepts a real server putt')
  b.close()
 assert not errors,errors
 (OUT/'extra-checks.json').write_text(json.dumps({'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'checks':checks,'errors':errors,'fallback':'WebGL capability deliberately disabled for this failure-mode test'},indent=2)+'\n');print('PASS',len(checks),'camera/party/accessibility/compatibility groups')
finally:
 for p in peers:p.terminate();p.wait(timeout=10)
 server.terminate();server.wait(timeout=10)
