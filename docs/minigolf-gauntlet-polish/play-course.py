"""Normal two-browser match: native controls, physical impacts and actual captures."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,json,urllib.request,math,sys
ROOT=Path(__file__).resolve().parents[2]; OUT=Path(__file__).resolve().parent
SHOTS=OUT/'screenshots';SHOTS.mkdir(exist_ok=True);VIDEO=OUT/'video';VIDEO.mkdir(exist_ok=True)
SOURCE=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
PRESETS=json.loads((OUT/'replay-actions.json').read_text())['actions']
FAST='--fast' in sys.argv
URL='http://127.0.0.1:45424';errors=[];shots=[];views=[];motor_checks=[];gate_checks=[]
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':'45424','ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)

def capture(page,stem):
 if FAST:return
 for w,h in [(1440,900),(390,844),(932,430)]:
  page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo(0,0)');page.wait_for_timeout(250)
  actual=page.evaluate('({phase:App.S.phase,hole:App.S.game?.holeIndex??null,course:App.S.game?.course?.id??null})')
  if stem.startswith('hole-'):assert actual['hole']==int(stem.split('-')[1])-1,(stem,actual)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(stem,w,'overflow')
  page.screenshot(path=str(SHOTS/f'{stem}-{w}.png'));views.append({'state':stem,'width':w,'height':h,'actualState':actual,'overflow':0})
 page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(150)

def renderer_probe(page):
 page.wait_for_function('window.__golfProbe && window.__actualGolfScene?.motors')
 probe=page.evaluate('window.__golfProbe')
 assert all(abs(m['actual']-m['expected'])<1e-7 for m in probe['rotors']),probe
 assert probe['elapsed']>=probe['serverElapsed']-.05,probe
 return probe

def native_putt(page,preset,touch=False):
 angle=round(preset['angleDegrees']*4)/4%360
 if touch:
  page.evaluate('scrollTo(0,0)')
  a=page.evaluate('()=>{const b=App.S.game.players.find(p=>p.id===App.S.you);return GameUI.golf.project(b.x,b.y)}')
  cd=page.context.new_cdp_session(page)
  assert a['visible'],a
  cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':a['x'],'y':a['y']}]})
  page.wait_for_function('window.__golfProbe?.aiming')
  frozen=page.evaluate('window.__golfProbe.camera')
  b=page.evaluate('([angle,power,start])=>{const scene=window.__actualGolfScene,origin=scene.toCourse({clientX:start.x,clientY:start.y}),target=power*100*1.45;const point=d=>scene.project(origin.x-Math.cos(angle)*d,origin.y-Math.sin(angle)*d,0),distance=d=>{const p=point(d);return Math.hypot(p.x-start.x,p.y-start.y)};let lo=0,hi=10;while(distance(hi)<target&&hi<1000)hi*=2;for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(distance(mid)<target)lo=mid;else hi=mid;}return point((lo+hi)/2)}',[angle*math.pi/180,preset['power'],a])
  assert 0<=b['x']<390 and 0<=b['y']<844,b
  for i in range(1,9):cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':a['x']+(b['x']-a['x'])*i/8,'y':a['y']+(b['y']-a['y'])*i/8}]})
  trace={'start':a,'end':b,'state':page.evaluate('({status:document.querySelector(\"#gf-status\").textContent,gesture:document.querySelector(\".golf-club\").dataset.gesture,you:App.S.you,turn:App.S.game.turnId,probe:window.__golfProbe})'),'atStart':page.evaluate('(p)=>{const e=document.elementFromPoint(p.x,p.y);return {tag:e?.tagName,id:e?.id,classes:e?.className}}',a)}
  (OUT/'touch-trace.json').write_text(json.dumps(trace,indent=2)+'\n')
  assert 'Release to putt' in page.locator('#gf-status').inner_text()
  assert all(abs(a-b)<1e-7 for a,b in zip(frozen,page.evaluate('window.__golfProbe.camera'))),'camera moved during aiming'
  actual=float(page.locator('#gf-aim').input_value());assert abs((actual-angle+180)%360-180)<.26,(actual,angle)
  assert int(page.locator('#gf-pow').input_value())==round(preset['power']*100)
  page.screenshot(path=str(SHOTS/'touch-aim-390.png'))
  cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cd.detach()
 else:
  if not page.locator('#gf-aim').is_visible():page.locator('#gf-fine-toggle').click()
  page.locator('#gf-aim').fill(format(angle,'g'));page.locator('#gf-pow').fill(str(round(preset['power']*100)))
  toggle=page.locator('#gf-fine-toggle')
  if toggle.is_visible() and toggle.get_attribute('aria-expanded')=='true':toggle.click()
  page.locator('#gf-putt').click()

try:
 for i in range(100):
  try:urllib.request.urlopen(URL+'/healthz').close();break
  except:
   if i==99:raise
   time.sleep(.1)
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium')
  hc=browser.new_context(viewport={'width':1440,'height':900},record_video_dir=str(VIDEO),record_video_size={'width':1440,'height':900})
  gc=browser.new_context(viewport={'width':390,'height':844},has_touch=True,record_video_dir=str(VIDEO),record_video_size={'width':390,'height':844})
  for context in [hc,gc]:context.add_init_script(path=str(OUT/'browser-probe.js'))
  host=hc.new_page();guest=gc.new_page();pages=[host,guest]
  for page in pages:page.on('pageerror',lambda e:errors.append(str(e)))
  host.goto(URL);host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('App.S?.code')
  guest.goto(URL+'/r/'+host.evaluate('App.S.code'));guest.locator('#screen-join .name-input').fill('Nova');guest.locator('#join-btn').click()
  host.wait_for_function('App.S.players.length===2');host.evaluate("App.socket.emit('switchGame',{game:'golf',seats:App.S.players.map(p=>p.id)})");host.wait_for_function("App.S.gameId==='golf'")
  host.locator('#game-settings-btn').click();host.locator('[data-setting=course]').select_option('gauntlet');host.locator('[data-setting=turnTime]').select_option('60');host.locator('#settings-save').click()
  host.wait_for_function("App.S.settings.course==='gauntlet'&&App.S.settings.turnTime===60");assert host.evaluate('App.S.settings.maxStrokes')==8
  guest.evaluate("()=>{const socket=App.socket,report=window.__golfNetwork={armed:true};socket.on('state',s=>{const a=s.game?.anim;if(report.armed&&a?.motion){report.armed=false;report.shot=a.shot;report.identity=s.you;report.initialElapsedMs=a.elapsedMs;setTimeout(()=>{report.disconnectedAt=performance.now();socket.disconnect();setTimeout(()=>socket.connect(),150)},50);}else if(report.disconnectedAt&&!report.rejoined&&socket.connected&&s.you===report.identity){report.rejoined=true;report.reconnectedAt=performance.now();report.serverElapsedMs=a?.elapsedMs??null;report.duringMotion=a?.shot===report.shot&&a.elapsedMs<a.motion.runFor*1000;}});} ")
  host.locator('#lobby-start').click()
  for page in pages:page.wait_for_function("document.querySelector('.golf-club')?.dataset.renderer==='webgl'")
  seen=set();water=False;touch=False;reconnect=None;impact_captured=False
  for step in range(150):
   state=host.evaluate('App.S')
   if state['phase']=='lobby':break
   g=state['game'];hole=g['holeIndex']
   if hole not in seen:
    seen.add(hole);host.wait_for_selector('.club-ball-label.active');print('CAPTURE',hole+1,g['hole']['name'],flush=True)
    if not FAST:
     capture(host,f'hole-{hole+1:02}-follow');host.locator('#gf-view').click();host.wait_for_timeout(200);capture(host,f'hole-{hole+1:02}-overview');host.locator('#gf-center').click()
   if g['phase']=='between':
    host.wait_for_function('(i)=>App.S.phase===\'lobby\'||App.S.game.holeIndex!==i',arg=hole,timeout=25000);continue
   turn=g['turnId'];slot=0 if host.evaluate('App.S.you')==turn else 1;page=pages[slot]
   page.wait_for_function('!document.querySelector("#gf-putt").disabled',timeout=25000)
   g=page.evaluate('App.S.game');preset=PRESETS[len(shots)]
   assert preset['hole']==hole+1 and preset['playerSlot']==slot,(len(shots),preset,hole,slot)
   before=next(p['strokes'] for p in g['players'] if p['id']==turn);use_touch=hole==1 and slot==1 and .15<=preset['power']<=.55 and not touch
   native_putt(page,preset,use_touch);touch=touch or use_touch
   host.wait_for_function('([id,n])=>App.S.game.players.find(p=>p.id===id).strokes>n',arg=[turn,before])
   after=host.evaluate('App.S.game');shot=after['anim']['shot'];guest.wait_for_function('(n)=>App.S.game.anim?.shot===n',arg=shot);peer=guest.evaluate('App.S.game')
   for key in ['frames','paths','impacts','motion']:assert after['anim'].get(key)==peer['anim'].get(key),(shot,key)
   assert after['last']['note']!='limit' and after['last']['outcome']==preset['outcome'],(preset,after['last'])
   shots.append({'hole':hole+1,'playerSlot':slot,'angle':preset['angleDegrees'],'power':preset['power'],'touch':use_touch,'outcome':after['last']['outcome'],'strokes':after['last']['strokes'],'impacts':after['anim']['impacts']});print('PUTT',hole+1,before+1,after['last']['outcome'],flush=True)
   if g['hole'].get('gates'):
    assert after['anim']['gates']==g['hole']['gates'] and peer['hole']['gates']==after['hole']['gates'];gate_checks.append({'shot':shot,'sameReplayAndNextState':True})
   if g['hole'].get('motors'):
    assert after['anim']['motion']['start']==g['hole']['motorTime'] and after['hole']['motorTime']==after['anim']['motion']['end']
    host.wait_for_function('(n)=>window.__golfProbe?.shot===n',arg=shot);motor_checks.append({'shot':shot,'motion':after['anim']['motion'],'probe':renderer_probe(host),'sameForOpponent':True})
    if reconnect is None:
     guest.wait_for_function('window.__golfNetwork?.rejoined')
     transport=guest.evaluate('window.__golfNetwork');assert transport['duringMotion'],transport
     identity=guest.evaluate('App.S.you');transport['probe']=renderer_probe(guest)
     guest.reload();guest.wait_for_function("document.querySelector('.golf-club')?.dataset.renderer==='webgl'");assert guest.evaluate('App.S.you')==identity
     reconnect={'transport':transport,'pageReload':{'identityPreserved':True,'probe':renderer_probe(guest)}}
    contacts=[e for e in after['anim']['impacts'] if e['type']=='motor']
    if contacts and not impact_captured:
     try:host.wait_for_function('(n)=>window.__golfImpacts.some(e=>e.shot===n&&e.type==="motor")',arg=shot,timeout=10000)
     except Exception:
      (OUT/'impact-failure.json').write_text(json.dumps([p.evaluate('({hidden:document.hidden,probe:window.__golfProbe,events:window.__golfImpacts,game:App.S.game})') for p in pages],indent=2)+'\n');raise
     host.screenshot(path=str(SHOTS/'motor-impact-1440.png'));guest.evaluate('scrollTo(0,0)');guest.screenshot(path=str(SHOTS/'motor-impact-390.png'));impact_captured=True
   if after['last']['outcome']=='water':
    assert after['last']['strokes']==before+2;water=True;host.wait_for_function("document.querySelector('#gf-status').textContent.includes('slime')");capture(host,'water-penalty')
  host.wait_for_function("App.S.phase==='lobby'&&App.S.lastResult?.type==='golf'",timeout=20000);result=host.evaluate('App.S.lastResult')
  assert len(seen)==6 and not result['forfeit'] and all(p['played']==6 and not p['out'] and all(n<8 for n in p['scores']) for p in result['standings'])
  assert touch and water and impact_captured and reconnect and motor_checks
  capture(host,'full-course-result');guest.evaluate('scrollTo(0,0)');guest.screenshot(path=str(SHOTS/'mobile-defeat-390.png'))
  hv=host.video;gv=guest.video;hc.close();gc.close();Path(hv.path()).replace(VIDEO/'full-course.webm');Path(gv.path()).replace(VIDEO/'mobile-course.webm');browser.close()
 assert not errors,errors
 report={'sourceCommit':SOURCE,'mode':'normal real-browser match, native controls, previously planned legal inputs','views':views,'shots':shots,'result':result,'slimePenaltyVerified':water,'gateChecks':gate_checks,'motorChecks':motor_checks,'nativeTouchOnMotorHole':touch,'reconnect':reconnect,'impactCaptured':impact_captured,'errors':errors}
 (OUT/('fast-course-checks.json' if FAST else 'full-course-checks.json')).write_text(json.dumps(report,indent=2)+'\n');print('PASS: normal six-hole match, physical motor hits, native touch and reconnect verified',flush=True)
except BaseException:
 try:
  diagnostic=[]
  for page in pages:
   diagnostic.append(page.evaluate('({hidden:document.hidden,probe:window.__golfProbe,events:window.__golfImpacts,game:App.S?.game,errors:[]})'))
  (OUT/'browser-failure.json').write_text(json.dumps(diagnostic,indent=2)+'\n')
 except Exception:pass
 raise
finally:server.terminate();server.wait(timeout=10)
