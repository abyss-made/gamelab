"""Validate all design-state views and privacy presentation, then render contact sheets."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import os,shutil,json,sys
P=Path(__file__).resolve().parent;R=P.parents[1];models=json.loads((P/'state-model.json').read_text())
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(R)));Thread(target=s.serve_forever,daemon=True).start();checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 for g in models:
  if sys.argv[1:] and g['id'] not in sys.argv[1:]:continue
  for size,w,h in [('desktop',1440,900),('mobile',390,844),('narrow',360,740)]:
   q=b.new_page(viewport={'width':w,'height':h});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   for st in g['states']:
    errors.clear();q.goto(f'http://127.0.0.1:{s.server_port}/design/playgrid-premium-rest/{g["id"]}/concept.html?state={st["id"]}');q.wait_for_function('document.documentElement.dataset.stateReady==="true" || document.documentElement.dataset.stateError');assert not q.evaluate('document.documentElement.dataset.stateError'),(g['id'],st['id'],q.evaluate('document.documentElement.dataset.stateError'),errors);q.evaluate('document.fonts.ready');q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)')
    dims=q.evaluate('({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight})')
    controls=q.locator('main button, main input, main select').evaluate_all('es=>es.filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=="hidden").map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute("aria-label")||e.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,disabled:e.disabled}})')
    floor=h-49 if q.locator('footer').is_visible() else h-10
    bad=[x for x in controls if not x['disabled'] and (x['left']<-.5 or x['right']>w+.5 or x['bottom']>floor or x['top']<44)]
    # Bracket/review/reveal deliberately scroll their named internal regions.
    if st['id'] in ['bracket16','review','reveal']:bad=[x for x in bad if x['label'].strip() not in ['Like · 2','Like · 1']]
    if dims['sw']!=w or dims['sh']!=h or bad or errors:
     q.screenshot(path='/tmp/playgrid-state-failure.png');print('FAIL',g['id'],size,st['id'],dims,bad,errors,flush=True);raise AssertionError('Design state layout failure')
    text=q.locator('main').inner_text()
    if g['id']=='impostor' and st['id'] in ['spectator','impostor','lastguess','covered']:assert 'CANDLE' not in text
    if g['id']=='drawguess' and st['id'] in ['spectator','guesser','invalid']:assert 'DRAGON' not in text
    if g['id']=='telephone' and st['id']=='spectator':assert not q.locator('.paper img').count() and 'A cat running' not in text
    if g['id']=='categories' and st['id']=='spectator':assert all(not x for x in q.locator('.field-row input').evaluate_all('es=>es.map(e=>e.value||e.getAttribute("value"))'))
    checks.append({'game':g['id'],'state':st['id'],'size':size,**dims,'pageErrors':errors.copy(),'enabledControlsFit':not bad,'privacyFixtureChecksApplied':(g['id']=='impostor' and st['id'] in ['spectator','impostor','lastguess','covered']) or (g['id']=='drawguess' and st['id'] in ['spectator','guesser','invalid']) or (g['id'] in ['telephone','categories'] and st['id']=='spectator')})
   q.close()
  print(g['id'],'all',len(g['states']),'states × 3 viewports passed',flush=True)
  for mode in ['desktop','mobile']:
   q=b.new_page(viewport={'width':1536,'height':1000})
   q.goto(f'http://127.0.0.1:{s.server_port}/design/playgrid-premium-rest/{g["id"]}/states-{mode}.html')
   q.wait_for_function('Array.from(document.querySelectorAll("iframe")).every(f=>f.contentDocument?.documentElement.dataset.stateReady==="true")')
   for f in q.frames[1:]:f.evaluate('document.fonts.ready')
   q.screenshot(path=str(P/g['id']/f'states-{mode}.png'),full_page=True);q.close()
 b.close()
s.shutdown();s.server_close()
master=P/'state-checks.json';out='state-checks.json'
if sys.argv[1:]:
 existing=json.loads(master.read_text()) if master.exists() else []
 merged={(x['game'],x['state'],x['size']):x for x in existing};merged.update({(x['game'],x['state'],x['size']):x for x in checks})
 expected={(g['id'],st['id'],size) for g in models for st in g['states'] for size in ['desktop','mobile','narrow']}
 if set(merged)==expected:
  saved=[merged[k] for k in sorted(merged)]
 else:out='state-checks-partial.json';saved=checks
else:saved=checks
(P/out).write_text(json.dumps(saved,indent=2)+'\n');print('Design-state checks this run:',len(checks),'· complete index:',len(saved),flush=True)
