"""Real mouse/CDP touch input against the authoritative multiplayer game."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,json,urllib.request
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent;SHOTS=OUT/'screenshots';SHOTS.mkdir(exist_ok=True)
URL='http://127.0.0.1:45422';checks=[];errors=[];VIDEO=OUT/'video';VIDEO.mkdir(exist_ok=True)
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':'45422','ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
def ball_point(p):
 return p.evaluate('''()=>{const b=App.S.game.players.find(p=>p.id===App.S.you);return GameUI.golf.project(b.x,b.y)}''')
def drag_mouse(p,b,end,release=True):
 p.mouse.move(b['x'],b['y']);p.mouse.down();p.mouse.move(end['x'],end['y'],steps=8)
 if release:p.mouse.up()
try:
 for i in range(100):
  try:urllib.request.urlopen(URL+'/healthz').close();break
  except:
   if i==99:raise
   time.sleep(.1)
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium')
  for w,h in [(1440,900),(390,844),(932,430)]:
   print('VIEW',w,flush=True);c=browser.new_context(viewport={'width':w,'height':h},has_touch=w!=1440);host=c.new_page();host.on('pageerror',lambda e:errors.append(str(e)));host.goto(URL);host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('App.S?.code');code=host.evaluate('App.S.code');guest=browser.new_page();guest.on('pageerror',lambda e:errors.append(str(e)));guest.goto(URL+'/r/'+code);guest.locator('#screen-join .name-input').fill('Nova');guest.locator('#join-btn').click();host.wait_for_function('App.S.players.length===2');host.evaluate("App.socket.emit('switchGame',{game:'golf',seats:App.S.players.map(p=>p.id)})");host.wait_for_function("App.S.gameId==='golf'");host.locator("#game-settings-btn").click();assert host.locator("[data-setting=course]").input_value()=="coastal";host.locator("[data-setting=course]").select_option("gauntlet");host.locator("[data-setting=turnTime]").select_option("60");host.locator("#settings-save").click();host.wait_for_function("App.S.settings.course==='gauntlet'&&App.S.settings.turnTime===60");host.locator('#lobby-start').click();host.wait_for_function("App.S.phase==='game' && App.S.game.turnId===App.S.you");host.wait_for_function("document.querySelector('.golf-club').dataset.renderer==='webgl'");host.wait_for_selector('.club-ball-label.active');host.wait_for_timeout(500)
   assert host.evaluate('''()=>{const pin=document.querySelector('.club-cup-marker');if(pin.hidden)return true;const a=pin.getBoundingClientRect();return ['.club-camera-controls','.club-standings'].every(s=>{const b=document.querySelector(s).getBoundingClientRect();return Math.min(a.right,b.right)-Math.max(a.left,b.left)<=0||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=0})}'''),(w,'cup guidance overlaps controls')
   box=host.locator('#gf-canvas').bounding_box();assert box and min(box['width'],box['height'])>=200,(w,box);assert host.evaluate('document.documentElement.scrollWidth<=innerWidth+1');host.screenshot(path=str(SHOTS/f'opening-{w}.png'))
   host.locator('#gf-canvas').scroll_into_view_if_needed();b=ball_point(host);host.mouse.click(b['x'],b['y']);assert host.evaluate('App.S.game.players[0].strokes')==0
   end={'x':b['x']-70,'y':b['y']};drag_mouse(host,b,end,False);assert host.locator('#gf-putt').inner_text()=='Release to putt';host.keyboard.press('Escape');host.mouse.up();assert host.evaluate('App.S.game.players[0].strokes')==0;assert host.locator('#gf-putt').inner_text()=='Putt'
   if w!=1440:
    cd=c.new_cdp_session(host);b=ball_point(host)
    cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':b['x'],'y':b['y'],'id':1}]});cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':b['x']+50,'y':b['y'],'id':1}]});cd.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});assert host.evaluate('App.S.game.players[0].strokes')==0
    b=ball_point(host);cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':b['x'],'y':b['y'],'id':1}]});cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':b['x'],'y':b['y'],'id':1},{'x':b['x']+50,'y':b['y']-40,'id':2}]});cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert host.evaluate('App.S.game.players[0].strokes')==0;cd.detach()
   b=ball_point(host);dy=90 if w==390 else 0;end={'x':b['x'] if w==390 else b['x']-90,'y':b['y']+dy}
   if w==1440:drag_mouse(host,b,end,False)
   else:
    cd=c.new_cdp_session(host);cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':b['x'],'y':b['y']}]})
    for i in range(1,9):cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':b['x']+(end['x']-b['x'])*i/8,'y':b['y']+(end['y']-b['y'])*i/8}]})
   assert host.evaluate('App.S.game.players[0].strokes')==0;assert 'Release to putt' in host.locator('#gf-status').inner_text();host.screenshot(path=str(SHOTS/f'held-pull-{w}.png'))
   if w==1440:host.mouse.up()
   else:cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cd.detach()
   host.wait_for_function('App.S.game.players[0].strokes===1');guest.wait_for_function('App.S.game.anim?.shot===1');assert host.evaluate('App.S.game.anim.frames')==guest.evaluate('App.S.game.anim.frames');host.screenshot(path=str(SHOTS/f'real-shot-{w}.png'));host.wait_for_function("!document.querySelector('#gf-status').textContent.includes('ball rolling')")
   trail=host.locator('#gf-trail');trail.wait_for(state='visible');assert trail.is_enabled();trail.click();assert trail.get_attribute('aria-pressed')=='true';assert host.evaluate('App.S.game.players[0].strokes')==1;host.screenshot(path=str(SHOTS/f'actual-trail-{w}.png'));trail.click();assert trail.get_attribute('aria-pressed')=='false'
   assert host.evaluate("App.S.game.turnOrder==='round-robin'&&App.S.game.turnId!==App.S.you")
   host.locator('#gf-scores-toggle').click();assert host.locator('#gf-score-details').evaluate('(e)=>e.open');assert host.locator('.gf-table tbody tr').count()==2;host.locator('#gf-scores-toggle').click();assert not host.locator('#gf-score-details').evaluate('(e)=>e.open');host.locator('#gf-room-toggle').click();assert host.locator('#room-chat').is_visible();host.locator('#gf-room-toggle').click();assert not host.locator('#room-chat').is_visible()
   own=host.evaluate('App.S.you');host.reload();host.wait_for_function('App.S?.game');assert host.evaluate('App.S.you')==own;assert host.evaluate('App.S.game.players[0].strokes')==1;host.wait_for_function("document.querySelector('.golf-club')?.dataset.renderer==='webgl'");host.wait_for_selector('.club-ball-label.active')
   gpu=host.locator('#gf-canvas').evaluate("c=>{const g=c.getContext('webgl2')||c.getContext('webgl'),e=g?.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable'}");checks.append({'viewport':[w,h],'gpu':gpu,'actualLobbyCoursePicker':True,'cupGuidanceClearsControls':True,'tapDoesNotShoot':True,'escapeCancels':True,'touchCancelAndMultitouch':w!=1440,'releaseSendsOneAuthoritativeShot':True,'sameReplayForOpponent':True,'actualTrailToggleDoesNotShoot':True,'partyTurnPassesToFriend':True,'scorecardAndChat':True,'reconnectKeepsStroke':True});guest.close();c.close()
  browser.close()
 assert not errors,errors
 (OUT/'input-checks.json').write_text(json.dumps({'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'browserVersion':browser.version,'checks':checks,'errors':errors,'status':'Angled 3D course and authoritative input checks'},indent=2)+'\n');print('PASS all real input/multiplayer scenarios',flush=True)
finally:server.terminate();server.wait(timeout=10)
