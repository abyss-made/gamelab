"""Stage B tablet, keyboard viewport, reduced-motion and component validation."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import os,shutil,json
P=Path(__file__).resolve().parent;R=P.parents[1]
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(R)));Thread(target=s.serve_forever,daemon=True).start();checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 for g in json.loads((P/'games.json').read_text()):
  q=b.new_page(viewport={'width':768,'height':1024})
  q.goto(f'http://127.0.0.1:{s.server_port}/design/playgrid-premium-rest/{g["id"]}/concept.html?state=active');q.wait_for_function('document.documentElement.dataset.stateReady==="true"');q.evaluate('document.fonts.ready')
  dims=q.evaluate('({sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight})');assert dims=={'sw':768,'sh':1024},(g['id'],dims)
  acts=q.locator('main button.primary').evaluate_all('es=>es.filter(e=>e.getClientRects().length).map(e=>{let r=e.getBoundingClientRect();return {right:r.right,bottom:r.bottom}})');assert all(a['right']<=768 and a['bottom']<=974 for a in acts),(g['id'],acts)
  q.screenshot(path=str(P/g['id']/'tablet.png'));checks.append({'game':g['id'],'viewport':'768x1024','activeLayout':True});q.close()
 keyboard=[('drawguess','guesser','.chat-compose input','.chat-compose button'),('wordscramble','active','.answer-form input','.answer-form button'),('wordchain','active','.answer-form input','.answer-form button'),('categories','active','.field-row input','.field-actions button'),('telephone','prompt','.answer-form input','.answer-form button'),('bluff','write','.answer-form input','.answer-form button'),('impostor','lastguess','.answer-form input','.answer-form button')]
 for game,st,inp,btn in keyboard:
  q=b.new_page(viewport={'width':390,'height':520});q.goto(f'http://127.0.0.1:{s.server_port}/design/playgrid-premium-rest/{game}/concept.html?state={st}');q.wait_for_function('document.documentElement.dataset.stateReady==="true"');q.evaluate('document.fonts.ready')
  field=q.locator(inp).last;field.focus();q.locator(btn).last.scroll_into_view_if_needed();field.focus()
  for el in [field,q.locator(btn).last]:
   assert el.evaluate('(e)=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===e||e.contains(hit)}'),(game,'keyboard control is covered')
   r=el.bounding_box();assert r['x']>=0 and r['x']+r['width']<=390.5 and r['y']>=47 and r['y']+r['height']<=471,(game,'keyboard control hidden',r)
  dims=q.evaluate('({sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight})');assert dims=={'sw':390,'sh':520},(game,dims)
  q.screenshot(path=str(P/game/'keyboard.png'));checks.append({'game':game,'state':st,'viewport':'390x520','keyboardEmulation':'Focused input and commit visible; not real-device evidence'});q.close()
 q=b.new_page(viewport={'width':1440,'height':1000});q.goto(f'http://127.0.0.1:{s.server_port}/design/playgrid-premium-rest/components.html');q.evaluate('document.fonts.ready');q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');q.screenshot(path=str(P/'components.png'),full_page=True)
 q.emulate_media(reduced_motion='reduce');q.locator('#play').click();assert q.locator('#disc').evaluate('(e)=>getComputedStyle(e).animationName')=='none';checks.append({'reducedMotionPreview':'Motion classes disabled under prefers-reduced-motion'})
 q.close();b.close()
s.shutdown();s.server_close();(P/'responsive-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
def luminance(c):
 v=[int(c[i:i+2],16)/255 for i in [1,3,5]];return sum((x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4)*w for x,w in zip(v,[.2126,.7152,.0722]))
pairs=[('Primary label','#17270e','#b3f84c'),('Shell text','#edf4ef','#06131d'),('Fieldbook helper','#50674f','#f3edda'),('Folder helper on darkest gradient end','#324e43','#b9bda7'),('Ballot number on darkest gradient end','#644653','#d7c4aa'),('Blue patch initial','#0c2028','#618ea5'),('Coral patch initial','#0c2028','#c9827a')];rows=[]
for name,fg,bg in pairs:
 lo,hi=sorted([luminance(fg),luminance(bg)]);ratio=(hi+.05)/(lo+.05);assert ratio>=4.5,(name,ratio);rows.append({'component':name,'foreground':fg,'background':bg,'contrast':round(ratio,2),'normalTextAA':True})
(P/'contrast-checks.json').write_text(json.dumps({'scope':'Representative solid pairs only; not whole-site WCAG certification','pairs':rows},indent=2)+'\n');print('13 tablet, 7 keyboard viewport, reduced-motion preview and 7 contrast pairs passed.')
