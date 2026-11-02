"""Browser-render approved active concepts. Requires Python Playwright and Chromium."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json,shutil,os,sys
P=Path(__file__).resolve().parent;R=P.parents[1]
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(R)));Thread(target=s.serve_forever,daemon=True).start();checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 for g in json.loads((P/'games.json').read_text()):
  if sys.argv[1:] and g['id'] not in sys.argv[1:]:continue
  for name,w,h in [('desktop',1440,900),('mobile',390,844),('narrow',360,740)]:
   q=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   q.goto(f'http://127.0.0.1:{s.server_port}/design/playgrid-premium-rest/{g["id"]}/concept.html');q.evaluate('document.fonts.ready');q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)')
   dims=q.evaluate('({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight})')
   controls=q.locator('main button,main input').evaluate_all('es=>es.filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=="hidden").map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute("aria-label")||e.textContent,left:r.left,top:r.top,right:r.right,bottom:r.bottom,height:r.height}})')
   issues=[c for c in controls if c['left']<-.5 or c['right']>w+.5 or c['bottom']>h-49 or c['top']<48]
   if dims['sw']!=w or dims['sh']!=h:
    print(q.locator('body *').evaluate_all('es=>es.map(e=>({tag:e.tagName,cls:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})).filter(e=>e.right>innerWidth+.5||e.left<-.5).slice(0,15)'),flush=True)
    q.screenshot(path='/tmp/playgrid-rest-layout-failure.png')
   assert dims['sw']==w and dims['sh']==h,(g['id'],name,dims)
   assert not errors,(g['id'],errors)
   assert not issues,(g['id'],name,issues)
   for selector,ratio in [('.checkers-board',1),('.ceramic-board',1),('.quilt-board',1)]:
    if q.locator(selector).count():
     board=q.locator(selector).bounding_box();assert abs(board['width']/board['height']-ratio)<.01,(g['id'],name,'board aspect',board)
   if q.locator('.connect-board .slot').count():
    slot=q.locator('.connect-board .slot').first.bounding_box();assert abs(slot['width']-slot['height'])<1,('disc slot must stay round',slot)
   q.screenshot(path=str(P/g['id']/(name+'.png')))
   checks.append({'game':g['id'],'size':name,**dims,'errors':errors,'visibleControlCount':len(controls),'controlsFitViewport':not issues})
   print(g['id'],name,'passed',flush=True);q.close()
 b.close()
s.shutdown();s.server_close();(P/'layout-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
