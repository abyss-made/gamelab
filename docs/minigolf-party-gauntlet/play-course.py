"""Play the entire actual Party Gauntlet match through native UI; capture all six holes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,json,urllib.request,math,sys
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent;SHOTS=OUT/'screenshots';SHOTS.mkdir(exist_ok=True)
SOURCE_COMMIT=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
REPLAY=json.loads((OUT/'replay-actions.json').read_text())['actions'] if '--replay' in sys.argv else None
URL='http://127.0.0.1:45424';errors=[];shots=[];views=[]
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':'45424','ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
def capture(p,stem,overview=False):
 for w,h in [(1440,900),(390,844),(932,430)]:
  p.set_viewport_size({'width':w,'height':h});p.evaluate('scrollTo(0,0)');p.wait_for_timeout(100 if stem.endswith('-complete') else 300)
  actual=p.evaluate('({phase:App.S.phase,hole:App.S.game?.holeIndex??null,course:App.S.game?.course?.id??null})')
  if stem.startswith('hole-'):assert actual['hole']==int(stem.split('-')[1])-1,(stem,actual)
  assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(stem,w,'overflow')
  p.screenshot(path=str(SHOTS/f'{stem}-{w}.png'));views.append({'state':stem,'width':w,'height':h,'overflow':0,'actualState':actual})
 p.set_viewport_size({'width':1440,'height':900});p.wait_for_timeout(150)
try:
 for i in range(100):
  try:urllib.request.urlopen(URL+'/healthz').close();break
  except:
   if i==99:raise
   time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium');video_dir=OUT/'video';video_dir.mkdir(exist_ok=True);host_context=b.new_context(viewport={'width':1440,'height':900},record_video_dir=str(video_dir),record_video_size={'width':1440,'height':900});host=host_context.new_page();guest=b.new_page(viewport={'width':390,'height':844},has_touch=True);pages=[host,guest]
  for p in pages:p.on('pageerror',lambda e:errors.append(str(e)))
  host.goto(URL);host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('App.S?.code');code=host.evaluate('App.S.code');guest.goto(URL+'/r/'+code);guest.locator('#screen-join .name-input').fill('Nova');guest.locator('#join-btn').click();host.wait_for_function('App.S.players.length===2');host.evaluate("App.socket.emit('switchGame',{game:'golf',seats:App.S.players.map(p=>p.id)})");host.wait_for_function("App.S.gameId==='golf'");assert host.evaluate('App.S.settings.course')=='coastal';host.evaluate("App.socket.emit('hostUpdate',{settings:{course:'gauntlet',turnTime:60,maxStrokes:10}})");host.wait_for_function("App.S.settings.turnTime===60&&App.S.settings.course==='gauntlet'");host.locator('#lobby-start').click();host.wait_for_function("App.S.phase==='game'")
  for p in pages:p.wait_for_function("document.querySelector('.golf-club')?.dataset.renderer==='webgl'")
  seen=set();previousShot=0;water_tested=False;gate_checks=[]
  for step in range(120):
   state=host.evaluate('App.S');
   if state['phase']=='lobby':break
   g=state['game'];hole=g['holeIndex']
   if hole not in seen:
    seen.add(hole);host.wait_for_selector('.club-ball-label.active');host.wait_for_timeout(350);print('CAPTURE',hole+1,g['hole']['name'],flush=True)
    capture(host,f'hole-{hole+1:02}-follow')
    host.locator('#gf-view').click();host.wait_for_timeout(300);capture(host,f'hole-{hole+1:02}-overview');host.locator('#gf-center').click()
   if g['phase']=='between':
    host.wait_for_function('(i)=>App.S.phase===\'lobby\'||App.S.game.holeIndex!==i',arg=hole,timeout=25000);continue
   turn=g['turnId'];p=next(p for p in pages if p.evaluate('App.S.you')==turn);p.wait_for_function('!document.querySelector("#gf-putt").disabled',timeout=25000)
   g=p.evaluate('App.S.game')
   water_check=hole==3 and not water_tested
   if REPLAY:
    preset=REPLAY[len(shots)];assert preset['hole']==hole+1 and preset['playerSlot']==(0 if p is host else 1),(len(shots),preset,hole,turn)
    plan={'action':{'angle':preset['angleDegrees']*math.pi/180,'power':preset['power']},'simulations':0}
   else:plan={'action':{'angle':-.5,'power':.55},'simulations':0} if water_check else json.loads(subprocess.check_output(['node','docs/minigolf-club/solve-shot.js'],cwd=ROOT,input=json.dumps(g),text=True,timeout=90))
   a=plan['action'];before=next(v['strokes'] for v in g['players'] if v['id']==turn);print('PUTT',hole+1,before+1,plan['simulations'],'searches',flush=True)
   angle=(round(a['angle']*180/math.pi*4)/4)%360;p.locator('#gf-aim').fill(format(angle,'g'));p.locator('#gf-pow').fill(str(round(a['power']*100)));p.locator('#gf-putt').click();host.wait_for_function('([id,n])=>App.S.game.players.find(p=>p.id===id).strokes>n',arg=[turn,before]);after=host.evaluate('App.S.game');assert after['last']['note']!='limit',(hole,turn,'stroke limit reached');shots.append({'hole':hole+1,'player':turn,'angle':angle,'power':a['power'],'outcome':after['last']['outcome'],'strokes':after['last']['strokes']});host.wait_for_timeout(100)
   if REPLAY:assert after['last']['outcome']==preset['outcome'],(preset,after['last'])
   if g['hole'].get('gates'):
    old=g['hole']['gates'];assert after['anim']['gates']==old
    guest.wait_for_function('(shot)=>App.S.game.anim?.shot===shot',arg=after['anim']['shot'])
    peer=guest.evaluate('App.S.game');assert peer['anim']['gates']==old and peer['anim']['frames']==after['anim']['frames'] and peer['hole']['gates']==after['hole']['gates']
    gate_checks.append({'hole':hole+1,'shot':after['anim']['shot'],'lockedReplayGates':old,'nextGates':after['hole']['gates'],'sameForOpponent':True})
   if water_check:
    assert after['last']['outcome']=='water' and after['last']['strokes']==before+2
    water_tested=True;host.wait_for_function("document.querySelector('#gf-status').textContent.includes('slime')");capture(host,'water-penalty')
  host.wait_for_function("App.S.phase==='lobby'&&App.S.lastResult?.type==='golf'",timeout=20000);result=host.evaluate('App.S.lastResult');assert len(seen)==6;assert not result['forfeit'];assert all(r['played']==6 and not r['out'] for r in result['standings']);capture(host,'full-course-result')
  video=host.video;host_context.close();Path(video.path()).replace(video_dir/'full-course.webm');b.close()
 assert not errors,errors
 (OUT/'full-course-checks.json').write_text(json.dumps({'sourceCommit':SOURCE_COMMIT,'mode':'replayed native UI actions' if REPLAY else 'authoritative-physics shot search','views':views,'shots':shots,'result':result,'waterPenaltyVerified':water_tested,'gateChecks':gate_checks,'errors':errors},indent=2)+'\n');print('PASS: all six holes played through the actual UI; normal course result',flush=True)
finally:server.terminate();server.wait(timeout=10)
