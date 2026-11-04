from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json,time
P=Path(__file__).resolve().parent;R=P.parents[1];models=json.loads((P/'games/state-model.json').read_text());(P/'review/proposed').mkdir(exist_ok=True);checks=[]
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(R)));Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}/design/playgrid-worldclass-58';fails=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium')
 for g in models:
  out=P/'review/states'/g['id'];out.mkdir(parents=True,exist_ok=True)
  for label,w,h in [('desktop',1440,900),('mobile',390,844),('narrow',360,740)]:
   ctx=b.new_context(viewport={'width':w,'height':h});q=ctx.new_page();q.emulate_media(reduced_motion='reduce')
   for st in g['states']:
    errors=[];handler=lambda e:errors.append(str(e));q.on('pageerror',handler)
    q.goto(base+f'/games/{g["id"]}/index.html?state={st["id"]}');q.wait_for_function('document.documentElement.dataset.feelReady==="true" || document.documentElement.dataset.feelError || document.documentElement.dataset.stateError');q.evaluate('document.fonts.ready');q.wait_for_function('Array.from(document.images).every(i=>i.complete)');q.wait_for_timeout(35)
    dims=q.evaluate('({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,stateError:document.documentElement.dataset.stateError||null,feelError:document.documentElement.dataset.feelError||null,missing:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src)})')
    if label!='narrow':q.screenshot(path=str(out/f'{st["id"]}-{label}.jpg'),type='jpeg',quality=70)
    if st['id']=='active':q.screenshot(path=str(P/f'review/proposed/{g["id"]}-{label}.png'))
    clipped=q.evaluate('''()=>[...document.querySelectorAll('main button,main input,main select,main textarea')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').filter(e=>{const r=e.getBoundingClientRect();for(let a=e.parentElement;a;a=a.parentElement){const c=getComputedStyle(a);if(['auto','scroll'].includes(c.overflowY)||['auto','scroll'].includes(c.overflowX))return false;const b=a.getBoundingClientRect();if((c.overflowY==='hidden'&&(r.top<b.top-2||r.bottom>b.bottom+2))||(c.overflowX==='hidden'&&(r.left<b.left-2||r.right>b.right+2)))return true;}return r.top<0||r.bottom>innerHeight+2||r.left<0||r.right>innerWidth+2;}).map(e=>(e.getAttribute('aria-label')||e.textContent||e.tagName).trim().slice(0,80))''')
    entry={'clippedControls':clipped,'game':g['id'],'state':st['id'],'viewport':[w,h],**dims,'pageErrors':errors.copy()};checks.append(entry)
    if clipped or errors or dims['stateError'] or dims['feelError'] or dims['missing'] or dims['width']>w or dims['height']>h+2:fails.append(entry)
    q.remove_listener('pageerror',handler)
   ctx.close()
  for st in g['states']:
   (out/f'{st["id"]}.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+g['name']+' · '+st['label']+'</title><style>body{background:#081e29;color:#eef3e4;font:15px Arial;padding:24px}a{color:#c9ee91}img{display:block;max-width:100%;border:1px solid #567465;border-radius:12px;margin:20px 0}</style><a href="../../../comparison.html?game='+g['id']+'">← Compare '+g['name']+'</a><h1>'+st['label']+'</h1><p>Local design fixture, not a captured multiplayer acknowledgement.</p><img src="'+st['id']+'-desktop.jpg" alt="Desktop '+st['label']+'"><img src="'+st['id']+'-mobile.jpg" alt="Mobile '+st['label']+'">')
  print(g['id'],len(g['states']),'states × 3 sizes',flush=True)
 b.close()
s.shutdown();s.server_close();(P/'review/game-checks.json').write_text(json.dumps(checks,indent=2)+'\n');(P/'review/game-failures.json').write_text(json.dumps(fails,indent=2)+'\n');print(len(checks),'frames;',len(fails),'need review',flush=True)
