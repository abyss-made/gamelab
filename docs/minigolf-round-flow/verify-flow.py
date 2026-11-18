"""Real room/UI checks for first shots, graphics recovery and persistent recaps.
Graphics-only faults are explicit. No game state, score, turn or clock is injected.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, os, time, json, math, urllib.request

ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
SHOTS=OUT/'screenshots';VIDEO=OUT/'video';SHOTS.mkdir(exist_ok=True);VIDEO.mkdir(exist_ok=True)
SOURCE=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
URL='http://127.0.0.1:45436';errors=[];checks=[];markers={}
presets=json.loads((ROOT/'docs/minigolf-party-play/replay-actions.json').read_text())['actions']
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':'45436','ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)

def hold_graphics(context):
    state={'held':[],'active':True}
    def route(request):
        if state['active']:state['held'].append(request)
        else:request.continue_()
    context.route('**/vendor/three/**',route)
    def release():
        state['active']=False
        for request in state['held']:request.continue_()
        state['held'].clear()
    return release

def start_party(browser,host_context,friend_context):
    host=host_context.new_page();friend=friend_context.new_page()
    for p in [host,friend]:p.on('pageerror',lambda e:errors.append(str(e)))
    host.goto(URL);host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('App.S?.code')
    friend.goto(URL+'/r/'+host.evaluate('App.S.code'));friend.locator('#screen-join .name-input').fill('Nova');friend.locator('#join-btn').click();host.wait_for_function('App.S.players.length===2')
    host.evaluate("App.socket.emit('switchGame',{game:'golf',seats:App.S.players.map(p=>p.id)})");host.wait_for_function("App.S.gameId==='golf'")
    host.locator('#game-settings-btn').click();host.locator('[data-setting=course]').select_option('gauntlet');host.locator('[data-setting=turnTime]').select_option('60');host.locator('#settings-save').click();host.wait_for_function("App.S.settings.course==='gauntlet'&&App.S.settings.turnTime===60")
    host.locator('#lobby-start').click();host.wait_for_function("App.S.phase==='game'&&document.querySelector('#gf-canvas')")
    return host,friend

def photo(page,name):
    page.evaluate('scrollTo(0,0)');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),name
    page.screenshot(path=str(SHOTS/(name+'.png')))

def aim_point(page):
    return page.evaluate('''()=>{
      const b=App.S.game.players.find(p=>p.id===App.S.you),origin=GameUI.golf.project(b.x,b.y);
      for(const [dx,dy] of [[100,0],[90,-30],[60,-70],[0,-90],[-80,-40]]){
        const p=GameUI.golf.project(b.x+dx,b.y+dy,0);
        if((p.visible??true)&&Math.hypot(p.x-origin.x,p.y-origin.y)>40&&document.elementFromPoint(p.x,p.y)?.id==='gf-canvas')return {...p,angle:(Math.atan2(dy,dx)*180/Math.PI+360)%360};
      }throw Error('No unobscured native aim target');
    }''')

def tap_aim(page,touch=False):
    point=aim_point(page);before=page.evaluate('({shot:App.S.game.shotNumber,power:document.querySelector("#gf-pow").value})')
    if touch:
        cdp=page.context.new_cdp_session(page)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':point['x'],'y':point['y']}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach()
    else:page.mouse.click(point['x'],point['y'])
    angle=float(page.locator('#gf-aim').input_value());assert abs((angle-point['angle']+180)%360-180)<.15,(angle,point)
    assert page.evaluate('App.S.game.shotNumber')==before['shot'];assert page.locator('#gf-pow').input_value()==before['power']

def native_putt(page,action):
    page.wait_for_function('!document.querySelector("#gf-putt").disabled',timeout=25000)
    if not page.locator('#gf-aim').is_visible():page.locator('#gf-fine-toggle').click()
    page.locator('#gf-aim').fill(format(action['angleDegrees'],'g'));page.locator('#gf-pow').fill(str(round(action['power']*100)))
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
        contexts=[browser.new_context(viewport={'width':w,'height':h},has_touch=i==1,record_video_dir=str(VIDEO),record_video_size={'width':w,'height':h}) for i,(w,h) in enumerate([(1440,900),(390,844)])]
        for c in contexts:c.add_init_script(path=str(OUT/'browser-probe.js'))
        releases=[hold_graphics(c) for c in contexts]
        host,phone=start_party(browser,*contexts)
        assert host.locator('.golf-club').get_attribute('data-renderer')=='loading'
        assert host.locator('#gf-putt').is_disabled() and host.locator('#gf-place').is_disabled()
        host.locator('#gf-canvas').focus();host.keyboard.press('Enter');host.wait_for_timeout(100);assert host.evaluate('App.S.game.shotNumber')==0
        photo(host,'loading-controls-1440')
        for release in releases:release()
        for p in [host,phone]:
            p.wait_for_function("document.querySelector('.golf-club').dataset.renderer==='webgl'")
            assert p.evaluate("document.querySelector('#gf-canvas').getAttribute('aria-busy')==='false'&&window.__actualGolfScene.renderer.info.render.calls>0")
        host.wait_for_function('!document.querySelector("#gf-putt").disabled');tap_aim(host);markers['desktopTapEpoch']=time.time();photo(host,'tap-aim-1440');photo(phone,'opening-390')
        identity=host.evaluate('App.S.you');room=host.evaluate('App.S.code')
        point=host.evaluate('()=>{const b=App.S.game.players.find(p=>p.id===App.S.you);return GameUI.golf.project(b.x,b.y)}')
        host.mouse.move(point['x'],point['y']);host.mouse.down();host.mouse.move(point['x']-55,point['y'],steps=8);assert host.locator('.golf-club').get_attribute('data-gesture')=='pull'
        markers['contextLossEpoch']=time.time()
        assert host.evaluate("()=>{const c=document.querySelector('#gf-canvas'),gl=c.getContext('webgl2')||c.getContext('webgl'),ext=gl.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();return true}")
        host.wait_for_function("document.querySelector('.golf-club').dataset.renderer==='2d'");host.mouse.up()
        assert host.evaluate('App.S.you')==identity and host.evaluate('App.S.code')==room and host.evaluate('App.S.game.shotNumber')==0
        assert host.locator('.golf-club').get_attribute('data-gesture')=='idle';assert host.locator('#gf-canvas').count()==1
        assert host.locator('.club-ball-labels').count()==0 and host.locator('.club-shot-result').count()==0
        assert host.locator('#gf-canvas').evaluate('(c)=>c===document.activeElement')
        assert host.locator('#gf-putt').is_enabled();tap_aim(host);photo(host,'recovered-course-1440')
        checks.append({'case':'loading-and-context-loss','controlsWaitForVisibleFrame':True,'enterDoesNotBlindPutt':True,'mouseTapAimsWithoutShooting':True,'heldPullCancelledOnLoss':True,'seatAndStrokePreserved':True,'noStale3dDom':True,'focusRestored':True,'actual2dRemainsPlayable':True})
        actions=[a for a in presets if a['hole']==1];shots=[];phone_tap=False
        for i,action in enumerate(actions):
            page=[host,phone][action['playerSlot']];page.wait_for_function('!document.querySelector("#gf-putt").disabled',timeout=25000)
            if action['playerSlot']==1 and not phone_tap:
                page.evaluate('scrollTo(0,0)');tap_aim(page,True);photo(page,'tap-aim-390');phone_tap=True
            native_putt(page,action)
            for p in [host,phone]:p.wait_for_function('(n)=>App.S.game.shotNumber===n',arg=i+1)
            a=host.evaluate('App.S.game');b=phone.evaluate('App.S.game')
            for key in ['frames','paths','impacts','motion','finishes']:assert a['anim'].get(key)==b['anim'].get(key)
            assert a['last']['outcome']==action['outcome'];shots.append({'slot':action['playerSlot'],'outcome':a['last']['outcome'],'angle':action['angleDegrees'],'power':action['power']})
        for p in [host,phone]:p.wait_for_function('App.S.game.holeIndex===1',timeout=25000)
        expected=host.evaluate('App.S.game.lastHole');assert expected['index']==0 and expected['name']=='Ribbon Run'
        assert expected==phone.evaluate('App.S.game.lastHole') and all(s['strokes']==3 for s in expected['summary'])
        for p,w in [(host,1440),(phone,390)]:
            p.locator('#gf-scores-toggle').click();assert p.locator('#gf-last-hole').is_visible();assert 'Ribbon Run' in p.locator('#gf-last-hole').inner_text()
            assert p.locator('#gf-last-hole li').count()==2
            for s in expected['summary']:assert s['finish']['title'] in p.locator('#gf-last-hole').inner_text()
            p.locator('#gf-last-hole').scroll_into_view_if_needed();p.screenshot(path=str(SHOTS/f'saved-recap-{w}.png'))
        markers['mobileRecapEpoch']=time.time()
        phone.locator('#gf-score-back').click();assert not phone.locator('#gf-score-details').evaluate('(d)=>d.open');assert phone.locator('#gf-canvas').evaluate('(c)=>c===document.activeElement')
        native_putt(phone,next(a for a in presets if a['hole']==2))
        host.wait_for_function('(n)=>App.S.game.shotNumber===n',arg=len(actions)+1)
        assert host.locator('#gf-score-details').evaluate('(d)=>d.open') and host.evaluate('App.S.game.lastHole')==expected
        assert host.locator('#gf-last-hole li').count()==2
        host.locator('#gf-score-back').click();assert not host.locator('#gf-score-details').evaluate('(d)=>d.open');photo(host,'back-to-course-1440')
        checks.append({'case':'actual-multiplayer-recap','realPutts':len(actions)+1,'firstHoleScores':[s['strokes'] for s in expected['summary']],'touchTapAimsWithoutShooting':phone_tap,'recapPersistsOnNextHole':True,'friendCanPuttWhileScoresOpen':True,'recapUnchangedByNewShot':True,'backButtonRestoresCanvasFocus':True,'sameAuthoritativeReplay':True})
        videos=[host.video,phone.video]
        for c in contexts:c.close()
        for v,name in zip(videos,['desktop-flow','mobile-flow']):Path(v.path()).replace(VIDEO/(name+'.webm'))
        print('PASS normal two-client flow: loading, mouse/touch aim, recovery and saved recap',flush=True)

        # A late module must not replace a working fallback or resurrect a left room.
        for leave in [False,True]:
            hc=browser.new_context(viewport={'width':390,'height':844},has_touch=True);gc=browser.new_context()
            hc.add_init_script(path=str(OUT/'browser-probe.js'));release=hold_graphics(hc);gc.route('**/vendor/three/**',lambda r:r.abort())
            host,guest=start_party(browser,hc,gc)
            if leave:
                host.once('dialog',lambda d:d.accept());host.locator('#leave-lobby-btn').click();host.wait_for_function('!document.querySelector(".golf-club")')
                release();host.wait_for_function('window.__actualGolfScene?.renderer')
                assert host.locator('.golf-club').count()==0 and host.locator('.club-ball-labels').count()==0
                assert host.evaluate('!window.__actualGolfScene.canvas.isConnected&&!window.__actualGolfScene.labelLayer.isConnected')
                photo(host,'left-during-loading-390');checks.append({'case':'leave-during-loading','actualLeaveUi':True,'lateRendererDisposed':True,'noResurrectedGameDom':True})
            else:
                host.wait_for_function("document.querySelector('.golf-club').dataset.renderer==='2d'",timeout=15000)
                assert host.locator('#gf-putt').is_enabled() and host.evaluate('App.S.game.shotNumber')==0
                tap_aim(host,True);saved_aim=host.locator('#gf-aim').input_value()
                release();host.wait_for_function('window.__actualGolfScene?.renderer')
                assert host.locator('.golf-club').get_attribute('data-renderer')=='2d' and host.locator('#gf-canvas').count()==1
                assert host.locator('.club-ball-labels').count()==0 and host.locator('.club-shot-result').count()==0
                assert host.evaluate('!window.__actualGolfScene.canvas.isConnected&&!window.__actualGolfScene.labelLayer.isConnected')
                assert host.locator('#gf-aim').input_value()==saved_aim
                photo(host,'delayed-load-recovery-390');checks.append({'case':'delayed-module','automaticFallbackPlayable':True,'nativeTouchAimsIn2d':True,'lateRendererDisposed':True,'aimPreservedAfterLateModule':True,'noStale3dDom':True,'noUnintendedStroke':True})
            hc.close();gc.close()
        browser.close()
    assert not errors,errors
    (OUT/'flow-checks.json').write_text(json.dumps({'sourceCommit':SOURCE,'mode':'Real rooms and normal controls, with explicit graphics/network fault cases. Not human playtesting.','checks':checks,'shots':shots,'markers':markers,'errors':errors},indent=2)+'\n')
    print('PASS delayed graphics and real leave/unmount lifecycle',flush=True)
finally:server.terminate();server.wait(timeout=10)
