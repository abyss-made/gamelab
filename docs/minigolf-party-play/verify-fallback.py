"""Actual compatibility-mode match with WebGL unavailable; no app state injection."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, os, json, time, urllib.request
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent;URL='http://127.0.0.1:45432'
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':'45432','ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
errors=[]
try:
    for i in range(100):
        try:urllib.request.urlopen(URL+'/healthz').close();break
        except:
            if i==99:raise
            time.sleep(.1)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--disable-webgl'])
        context=browser.new_context(viewport={'width':390,'height':844},has_touch=True);host=context.new_page();guest=browser.new_page()
        for page in [host,guest]:page.on('pageerror',lambda e:errors.append(str(e)))
        host.goto(URL);host.locator('#hero-create').click();host.locator('#c-go').click();host.wait_for_function('App.S?.code')
        guest.goto(URL+'/r/'+host.evaluate('App.S.code'));guest.locator('#screen-join .name-input').fill('Nova');guest.locator('#join-btn').click();host.wait_for_function('App.S.players.length===2')
        host.evaluate("App.socket.emit('switchGame',{game:'golf',seats:App.S.players.map(p=>p.id)})");host.wait_for_function("App.S.gameId==='golf'")
        host.locator('#game-settings-btn').click();host.locator('[data-setting=course]').select_option('gauntlet');host.locator('[data-setting=turnTime]').select_option('60');host.locator('#settings-save').click();host.wait_for_function("App.S.settings.course==='gauntlet'");host.locator('#lobby-start').click()
        host.wait_for_function("document.querySelector('.golf-club')?.dataset.renderer==='2d'");guest.wait_for_function("document.querySelector('.golf-club')?.dataset.renderer==='2d'")
        host.locator('#gf-fine-toggle').click();host.locator('#gf-aim').fill('9');host.locator('#gf-pow').fill('70');host.locator('#gf-fine-toggle').click();host.locator('#gf-putt').click()
        host.wait_for_function('App.S.game.shotNumber===1');guest.wait_for_function('App.S.game.shotNumber===1')
        a=host.evaluate('App.S.game.anim');b=guest.evaluate('App.S.game.anim');assert a['frames']==b['frames'] and a['impacts']==b['impacts'];assert any(e['type']=='boost' for e in a['impacts'])
        host.wait_for_function('!document.querySelector("#gf-trail").disabled');host.locator('#gf-trail').click();assert host.locator('#gf-trail').get_attribute('aria-pressed')=='true'
        assert host.evaluate('document.documentElement.scrollWidth<=innerWidth+1');host.evaluate('scrollTo(0,0)');host.screenshot(path=str(OUT/'screenshots/fallback-trail-390.png'))
        browser.close()
    assert not errors,errors
    (OUT/'fallback-checks.json').write_text(json.dumps({'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'mode':'Native phone UI with WebGL explicitly unavailable','realTurboShot':True,'sameReplayForOpponent':True,'actualTrailToggle':True,'noOverflow':True,'errors':errors},indent=2)+'\n')
    print('PASS: actual 2D compatibility mode, turbo physics, multiplayer replay and phone trail toggle')
finally:server.terminate();server.wait(timeout=10)
