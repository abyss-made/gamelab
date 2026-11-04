"""Fresh local current-client initial-state captures. No production/source mutations."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,socket,json
P=Path(__file__).resolve().parent;R=P.parents[1];out=P/'review/current-client';out.mkdir(exist_ok=True)
sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close();url=f'http://127.0.0.1:{port}'
# Deliberately local fixture credential, not the live/private-alpha credential.
secret='issue58-local-capture-fixture-only';env={**os.environ,'PORT':str(port),'ALPHA_ENABLED':'true','ALPHA_SECRET':secret}
proc=subprocess.Popen(['node','server/index.js'],cwd=R/'node-server',env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);checks=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium')
  for game in json.loads((P/'games.json').read_text()):
   ctx=b.new_context(viewport={'width':1440,'height':900});q=ctx.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   for attempt in range(30):
    try:q.goto(url);break
    except Exception:time.sleep(.1)
   q.locator('input[name=password]').fill(secret);q.get_by_role('button',name='Enter',exact=True).click();q.wait_for_selector('#hero-create');q.evaluate("localStorage.setItem('pg_profile',JSON.stringify({name:'Alex',avatar:{e:0,c:3}}))");q.reload();q.wait_for_selector('#hero-create')
   if not checks:
    for size,w,h in [('desktop',1440,900),('mobile',390,844)]:q.set_viewport_size({'width':w,'height':h});q.screenshot(path=str(out/f'home-{size}.png'))
    q.set_viewport_size({'width':1440,'height':900})
   q.locator('#hero-create').click();q.locator('#c-go').click();q.wait_for_function('window.App?.S?.code');code=q.evaluate('App.S.code');q.evaluate('(game)=>App.socket.emit("switchGame",{game})',game['id'])
   q.evaluate('''async code=>{window.__auditPeers=[];for(const [i,name] of ['Nova','Trouble','Kai'].entries()){await new Promise(resolve=>{const s=io({forceNew:true,transports:['websocket']});window.__auditPeers.push(s);s.on('connect',()=>s.emit('joinRoom',{code,token:crypto.randomUUID().replaceAll('-',''),profile:{name,avatar:{e:i+1,c:i}}},()=>resolve()));});}}''',code)
   q.wait_for_function('(id)=>App.S.gameId===id',arg=game['id']);q.evaluate('App.socket.emit("startGame")');q.wait_for_function('App.S.phase==="game"',timeout=7000)
   if game['id']=='drawguess' and q.locator('[data-choose]').count():q.locator('[data-choose]').first.click();q.wait_for_function('App.S.game.phase==="draw"')
   for size,w,h in [('desktop',1440,900),('mobile',390,844)]:
    q.set_viewport_size({'width':w,'height':h});q.evaluate('document.fonts.ready');q.wait_for_timeout(180);q.screenshot(path=str(out/f'{game["id"]}-{size}.png'));checks.append({'game':game['id'],'viewport':[w,h],'phase':q.evaluate('App.S.game?.phase||App.S.phase'),'pageErrors':errors.copy(),'scope':'Initial live local client only; non-playing fixture peers; not a full gameplay/AI/human-device test.'})
   q.evaluate('window.__auditPeers.forEach(s=>s.close())');ctx.close();print(game['id'],'fresh desktop/mobile current-client capture',flush=True)
  b.close()
finally:
 proc.terminate()
 try:proc.wait(timeout=5)
 except subprocess.TimeoutExpired:proc.kill()
(P/'review/current-client-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
print('Fresh current-client captures:',len(checks),'· local alpha gate remained enabled.',flush=True)
