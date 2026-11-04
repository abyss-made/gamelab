from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import tempfile,zipfile,json
P=Path(__file__).resolve().parent
with tempfile.TemporaryDirectory(prefix='playgrid61-',dir='/tmp') as folder:
 with zipfile.ZipFile(P/'playgrid-61-design.zip') as z:
  assert not any(n.startswith('node-server/server/') or n.startswith('node-server/public/js/') for n in z.namelist());z.extractall(folder)
 class Q(SimpleHTTPRequestHandler):
  def log_message(self,*a):pass
 s=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=folder));Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}/design/playgrid-61';bad=[];errors=[]
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium');q=b.new_page(viewport={'width':1440,'height':900});q.on('response',lambda r:bad.append([r.status,r.url]) if r.status>=400 else None);q.on('pageerror',lambda e:errors.append(str(e)))
  for route in ['index.html','characters.html','style-delta.html','contexts.html']:
   q.goto(base+'/'+route);q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');q.evaluate('document.fonts.ready')
  q.goto(base+'/avatar-studio/index.html');q.wait_for_function('document.documentElement.dataset.studioReady==="true"');assert q.locator('.character-choice').count()==35;q.locator('#randomize').click();q.locator('#undo').click();q.wait_for_function('Studio2.getConfig().id==="h01"');q.locator('#save').click();q.locator('#confirm-save').click();assert q.evaluate('!!localStorage.getItem(Studio2.storageKey)')
  q.goto(base+'/game-feel/index.html?game=gofish');q.wait_for_function('document.documentElement.dataset.feelReady==="true"');q.get_by_role('button',name='Show Ace request',exact=True).click();q.locator('#ask').click();assert q.evaluate('Feel61.getDraft().rank')==14
  assert not bad,bad;assert not errors,errors;b.close()
 s.shutdown();s.server_close()
(P/'PACKAGE-CHECKS.json').write_text(json.dumps({'extractedArchive':True,'noProductionCode':True,'reviewAndCanonicalImages':True,'creator35AndSave':True,'ace14Component':True,'httpErrors':bad,'pageErrors':errors},indent=2)+'\n');print('Extracted ZIP preview, canonical assets, creator and component passed.')
