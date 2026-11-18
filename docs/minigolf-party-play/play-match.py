"""A normal three-browser match, actual controls and unchanged native captures.
Offline-planned angles are replayed; no game state, turn or clock is injected.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, os, time, json, urllib.request, math

ROOT=Path(__file__).resolve().parents[2]; OUT=Path(__file__).resolve().parent
SHOTS=OUT/'screenshots'; SHOTS.mkdir(exist_ok=True)
VIDEO=OUT/'video'; VIDEO.mkdir(exist_ok=True)
URL='http://127.0.0.1:45428'
SOURCE=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
subprocess.run(['git','diff','--quiet','--','node-server'],cwd=ROOT,check=True)
plan=json.loads((OUT/'planned-3-player.json').read_text())
errors=[]; shots=[]; captures=[]; recaps=[]; trail_checked=False; touch_checked=False
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':'45428','ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)

def photo(page, name, phase=None, hole=None):
    page.evaluate('scrollTo(0,0)')
    actual=page.evaluate('({phase:App.S.game?.phase,hole:App.S.game?.holeIndex})')
    if phase is not None and (actual['phase']!=phase or actual['hole']!=hole):return False
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),name
    file=SHOTS/(name+'.png');page.screenshot(path=str(file))
    actual=page.evaluate('({phase:App.S.game?.phase,hole:App.S.game?.holeIndex})')
    if phase is not None and (actual['phase']!=phase or actual['hole']!=hole):file.unlink();return False
    captures.append({'file':name+'.png','viewport':page.viewport_size,'phase':page.evaluate('App.S.phase'),'hole':page.evaluate('App.S.game?.holeIndex??null')})
    return True

def putt(page, action, touch=False):
    angle=round(action['angleDegrees']*4)/4%360
    if not touch:
        if not page.locator('#gf-aim').is_visible(): page.locator('#gf-fine-toggle').click()
        page.locator('#gf-aim').fill(format(angle,'g'))
        page.locator('#gf-pow').fill(str(round(action['power']*100)))
        toggle=page.locator('#gf-fine-toggle')
        if toggle.is_visible() and toggle.get_attribute('aria-expanded')=='true': toggle.click()
        page.locator('#gf-putt').click(); return time.time()
    page.evaluate('scrollTo(0,0)')
    start=page.evaluate('()=>{const b=App.S.game.players.find(p=>p.id===App.S.you);return GameUI.golf.project(b.x,b.y)}')
    assert start['visible'],start
    cdp=page.context.new_cdp_session(page)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':start['x'],'y':start['y']}]})
    page.wait_for_function('window.__golfProbe?.aiming')
    frozen=page.evaluate('window.__golfProbe.camera')
    end=page.evaluate('''([angle,power,start])=>{
      const scene=window.__actualGolfScene,origin=scene.toCourse({clientX:start.x,clientY:start.y}),target=power*145;
      const point=d=>scene.project(origin.x-Math.cos(angle)*d,origin.y-Math.sin(angle)*d,0);
      const distance=d=>{const p=point(d);return Math.hypot(p.x-start.x,p.y-start.y)};
      let lo=0,hi=10;while(distance(hi)<target&&hi<1000)hi*=2;
      for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(distance(mid)<target)lo=mid;else hi=mid;}
      return point((lo+hi)/2);
    }''',[angle*math.pi/180,action['power'],start])
    assert 0<=end['x']<390 and 0<=end['y']<844,end
    for i in range(1,9): cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':start['x']+(end['x']-start['x'])*i/8,'y':start['y']+(end['y']-start['y'])*i/8}]})
    page.wait_for_function('(p)=>Number(document.querySelector("#gf-pow").value)===p',arg=round(action['power']*100))
    actual=float(page.locator('#gf-aim').input_value());assert abs((actual-angle+180)%360-180)<.26
    assert all(abs(a-b)<1e-7 for a,b in zip(frozen,page.evaluate('window.__golfProbe.camera')))
    photo(page,'native-touch-390')
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach()
    return time.time()

try:
    for i in range(100):
        try: urllib.request.urlopen(URL+'/healthz').close();break
        except:
            if i==99: raise
            time.sleep(.1)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium')
        contexts=[browser.new_context(viewport={'width':w,'height':h},has_touch=i==1,**({'record_video_dir':str(VIDEO),'record_video_size':{'width':w,'height':h}} if i<2 else {})) for i,(w,h) in enumerate([(1440,900),(390,844),(932,430)])]
        # Explicit graphics-unavailable test for the third seat. The two recorded
        # players remain in real 3D; the third uses the application's actual 2D
        # fallback, including all controls and the same authoritative physics.
        contexts[2].route('**/vendor/three/**',lambda route:route.abort())
        for c in contexts: c.add_init_script(path=str(OUT/'browser-probe.js'))
        pages=[c.new_page() for c in contexts];host,phone,landscape=pages
        for page in pages: page.on('pageerror',lambda e: errors.append(str(e)))
        host.goto(URL);host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('App.S?.code')
        code=host.evaluate('App.S.code')
        for page,name in [(phone,'Nova'),(landscape,'Kai')]:
            page.goto(URL+'/r/'+code);page.locator('#screen-join .name-input').fill(name);page.locator('#join-btn').click()
        host.wait_for_function('App.S.players.length===3')
        host.evaluate("App.socket.emit('switchGame',{game:'golf',seats:App.S.players.map(p=>p.id)})")
        host.wait_for_function("App.S.gameId==='golf'")
        host.locator('#game-settings-btn').click();host.locator('[data-setting=course]').select_option('gauntlet');host.locator('[data-setting=turnTime]').select_option('60');host.locator('#settings-save').click()
        host.wait_for_function("App.S.settings.course==='gauntlet'&&App.S.settings.turnTime===60")
        host.locator('#lobby-start').click()
        for i,page in enumerate(pages):page.wait_for_function('(mode)=>document.querySelector(\'.golf-club\')?.dataset.renderer===mode',arg='2d' if i==2 else 'webgl')
        ids=[p.evaluate('App.S.you') for p in pages]
        seen=set(); boost_photo=False; motor_photo=False; early_recap_checks=0; rolling_actor_checks=0
        for index,action in enumerate(plan['actions']):
            hole=action['hole']-1;slot=action['playerSlot'];page=pages[slot]
            host.wait_for_function('(h)=>App.S.game?.holeIndex===h&&App.S.game.phase===\'play\'',arg=hole,timeout=30000)
            if hole not in seen:
                seen.add(hole);print('HOLE',hole+1,flush=True)
                for p,width in [(host,1440),(phone,390)]:
                    p.wait_for_function('(h)=>window.__actualGolfScene?.key==="gauntlet:"+h',arg=hole)
                    photo(p,f'hole-{hole+1:02}-follow-{width}');p.locator('#gf-view').click();p.wait_for_timeout(150);photo(p,f'hole-{hole+1:02}-overview-{width}');p.locator('#gf-center').click()
                if hole==0:photo(landscape,'three-player-932')
                assert all(p.locator('#gf-trail').is_disabled() for p in pages),'previous-hole trail leaked'
            page.wait_for_function('!document.querySelector("#gf-putt").disabled',timeout=30000)
            before=page.evaluate('App.S.game');assert before['turnId']==ids[slot]
            count=next(p['strokes'] for p in before['players'] if p['id']==ids[slot])
            use_touch=slot==1 and hole==1 and action['power']<=.55 and not touch_checked
            action_epoch=putt(page,action,use_touch);touch_checked=touch_checked or use_touch
            host.wait_for_function('(n)=>App.S.game.shotNumber===n',arg=index+1)
            after=host.evaluate('App.S.game');anim=after['anim'];assert anim and after['last']['outcome']==action['outcome'],(index,action,after['last'])
            assert after['last']['note']!='limit'
            ui=host.evaluate('''()=>({rolling:document.querySelector('#gf-status').textContent.includes('ball rolling'),active:document.querySelector('#gf-players .active b')?.textContent,actor:App.S.game.players.find(p=>p.id===App.S.game.anim.by).name,timers:document.querySelectorAll('#gf-players [data-timer]').length})''')
            if ui['rolling']:assert ui['active']==ui['actor'] and ui['timers']==0,ui;rolling_actor_checks+=1
            for peer in pages[1:]:
                peer.wait_for_function('(n)=>App.S.game.shotNumber===n',arg=index+1)
                other=peer.evaluate('App.S.game')
                for key in ['frames','paths','impacts','motion','finishes']:assert anim.get(key)==other['anim'].get(key),(index,key)
                assert after['turnId']==other['turnId']
            if after['phase']=='play':
                expected=next(ids[(slot+i)%3] for i in range(1,4) if any(p['id']==ids[(slot+i)%3] and not p['out'] and not p['holed'] for p in after['players']))
                assert after['turnId']==expected,'turn did not rotate to next active player'
            else:
                check=host.evaluate('({elapsed:window.__golfProbe?.elapsed??100,hidden:document.querySelector("#gf-between").hidden})')
                if check['elapsed']<anim['duration']-.05:assert check['hidden'],'recap covered final rolling shot';early_recap_checks+=1
            events=anim['impacts'];shots.append({'hole':hole+1,'slot':slot,'angleDegrees':action['angleDegrees'],'power':action['power'],'touch':use_touch,'uiActionEpoch':action_epoch,'outcome':after['last']['outcome'],'events':events,'finishes':anim['finishes'],'turnPassed':True})
            print('PUTT',index+1,'slot',slot,after['last']['outcome'],'boosts',sum(e['type']=='boost' for e in events),flush=True)
            event_type='boost' if not boost_photo and any(e['type']=='boost' for e in events) else 'motor' if not motor_photo and any(e['type']=='motor' for e in events) else None
            if event_type:
                try:host.wait_for_function('([n,t])=>window.__golfImpacts.some(e=>e.shot===n&&e.type===t)',arg=[index+1,event_type],timeout=10000)
                except Exception:
                    (OUT/'impact-diagnostic.json').write_text(json.dumps([p.evaluate('({state:App.S,hidden:document.hidden,probe:window.__golfProbe,impacts:window.__golfImpacts})') for p in pages],indent=2)+'\n');raise
                photo(host,event_type+'-1440');photo(phone,event_type+'-390')
                if event_type=='boost':boost_photo=True
                else:motor_photo=True
            if slot==0 and not trail_checked:
                host.locator('#gf-trail').wait_for(state='visible');host.wait_for_function('!document.querySelector("#gf-trail").disabled')
                host.locator('#gf-trail').click();assert host.locator('#gf-trail').get_attribute('aria-pressed')=='true'
                host.wait_for_function('window.__actualGolfScene.trailLine.visible')
                points=host.evaluate('Array.from(window.__actualGolfScene.trailLine.geometry.attributes.position.array)')
                frames=[f for f in anim['frames'] if f[1] is not None];assert len(points)==len(frames)*3
                for i,f in enumerate(frames):assert abs(points[i*3]+350-f[1])<.001 and abs(points[i*3+2]+220-f[2])<.001
                photo(host,'learn-from-shot-1440');host.locator('#gf-trail').click();trail_checked=True
            if after['phase']=='between':
                try:
                    for p in [host,phone]:p.wait_for_function('(h)=>window.__golfRecaps.some(r=>r.hole===h)',arg=hole,timeout=10000)
                except Exception:
                    snapshots=[p.evaluate('''()=>{const e=document.querySelector('#gf-between');return {state:App.S,probe:window.__golfProbe,now:performance.now(),panel:e?{hidden:e.hidden,display:getComputedStyle(e).display,rect:e.getBoundingClientRect().toJSON(),text:e.textContent}:null,status:document.querySelector('#gf-status')?.textContent}}''') for p in pages]
                    (OUT/'recap-diagnostic.json').write_text(json.dumps(snapshots,indent=2)+'\n')
                    for p,width in [(host,1440),(phone,390)]:p.screenshot(path=str(OUT/('recap-diagnostic-'+str(width)+'.png')))
                    raise
                observed=[p.evaluate('(h)=>window.__golfRecaps.find(r=>r.hole===h)',hole) for p in [host,phone]]
                assert all(r['rendered'] for r in observed)
                assert all(r['toastSuppressed'] for r in observed),'finish banner overlaps recap'
                assert all(r['duration'] is None or r['elapsed'] is None or r['elapsed']>=r['duration'] for r in observed),observed
                recaps.append({'hole':hole+1,'data':after['recap'],'observed':observed})
                photo(host,f'recap-{hole+1:02}-1440',phase='between',hole=hole);photo(phone,f'recap-{hole+1:02}-390',phase='between',hole=hole)
        host.wait_for_function("App.S.phase==='lobby'&&App.S.lastResult?.type==='golf'",timeout=20000)
        result=host.evaluate('App.S.lastResult');assert not result['forfeit'];assert len(result['standings'])==3
        actual={ids.index(p['id']):p['scores'] for p in result['standings']}
        expected={int(p['id'][1:]):p['scores'] for p in plan['result']['standings']};assert actual==expected,(actual,expected)
        assert all(p['played']==6 and not p['out'] and all(s<8 for s in p['scores']) for p in result['standings'])
        assert len(seen)==6 and len(recaps)==6 and touch_checked and trail_checked and boost_photo and motor_photo and rolling_actor_checks>0
        photo(host,'normal-result-1440');photo(phone,'normal-result-390');photo(landscape,'normal-result-932')
        videos=[host.video,phone.video]
        for c in contexts:c.close()
        for v,name in zip(videos,['desktop-match','mobile-match']):Path(v.path()).replace(VIDEO/(name+'.webm'))
        browser.close()
    assert not errors,errors
    report={'sourceCommit':SOURCE,'mode':'Normal three-browser six-hole match through native UI controls: desktop/phone 3D, third seat in actual 2D fallback with the Three.js resource explicitly unavailable. Automation is not human feedback.','captures':captures,'shots':shots,'result':result,'recaps':recaps,'earlyRecapChecks':early_recap_checks,'rollingActorChecks':rolling_actor_checks,'nativeTouch':touch_checked,'exactActualTrail':trail_checked,'errors':errors}
    (OUT/'match-checks.json').write_text(json.dumps(report,indent=2)+'\n')
    print('PASS',len(shots),'putts; three players; six holes; real boosts, motor contacts, native touch and actual trail',flush=True)
except BaseException:
    try:
        (OUT/'browser-failure.json').write_text(json.dumps([p.evaluate('({state:App.S,probe:window.__golfProbe,events:window.__golfImpacts})') for p in pages],indent=2)+'\n')
    except Exception:pass
    raise
finally:
    server.terminate();server.wait(timeout=10)
