"""Render Stage A visual concepts only; requires Python Playwright and system Chromium."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json, os, shutil
P=Path(__file__).resolve().parent;R=P.parents[1]
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(R)));Thread(target=s.serve_forever,daemon=True).start()
games=['color-stack','pool','mini-golf','ludo','property-tycoon','battleship','go-fish','chess'];checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 for game in games:
  for name,w,h in [('desktop',1440,900),('tablet',768,1024),('mobile',390,844),('narrow',360,740)]+([('landscape',844,390)] if game=='pool' else []):
   q=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   q.goto(f'http://127.0.0.1:{s.server_port}/design/playgrid-premium-games/{game}/concept.html');q.evaluate('document.fonts.ready');q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)')
   dims=q.evaluate('({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight})')
   buttons=q.locator('main button.primary').evaluate_all('(a)=>a.map(e=>({label:e.textContent,bottom:e.getBoundingClientRect().bottom,right:e.getBoundingClientRect().right}))')
   assert dims['sw']==w and dims['sh']==h,(game,name,dims)
   assert not errors,errors
   assert all(x['right']<=w and x['bottom']<=h-40 for x in buttons),(game,name,buttons)
   q.screenshot(path=str(P/game/(name+'.png')))
   checks.append({'game':game,'size':name,**dims,'primaryActions':buttons,'errors':errors})
   print(game,name,dims,buttons,flush=True);q.close()
 b.close()
s.shutdown();s.server_close();(P/'layout-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
