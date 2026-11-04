from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json,zipfile,tempfile
P=Path(__file__).resolve().parent
with tempfile.TemporaryDirectory(prefix='pg58-preview-',dir='/tmp') as root:
 with zipfile.ZipFile(P/'playgrid-issue-58-design.zip') as z:z.extractall(root)
 class Q(SimpleHTTPRequestHandler):
  def log_message(self,*a):pass
 s=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=root));Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}/design/playgrid-worldclass-58';bad=[];errors=[]
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium');q=b.new_page(viewport={'width':1440,'height':900});q.on('response',lambda r:bad.append([r.status,r.url]) if r.status>=400 else None);q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(base+'/index.html');q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');q.evaluate('document.fonts.ready');assert q.locator('.card').count()==20
  q.goto(base+'/explorer.html?game=pool');q.wait_for_function('document.querySelector("iframe").contentDocument?.documentElement?.dataset.feelReady==="true"');q.locator('#viewport').select_option('mobile');q.wait_for_function('document.querySelector("iframe").width==="390" && document.querySelector("iframe").contentDocument?.documentElement?.dataset.feelReady==="true"');assert q.locator('#state option').count()==13
  q.goto(base+'/comparison.html?game=battleship');q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');assert q.locator('#state-links a').count()==14
  q.goto(base+'/avatar-studio/index.html');q.wait_for_function('document.documentElement.dataset.studioReady==="true"');q.locator('#search').fill('Cinder');assert q.locator('.character-choice').count()==1;q.locator('#search').fill('');q.locator('#family').select_option('robot');assert q.locator('.character-choice').count()==6
  assert not bad,bad;assert not errors,errors;b.close()
 s.shutdown();s.server_close()
(P/'review/package-checks.json').write_text(json.dumps({'extractedArchive':True,'gameCards':20,'frameViewportSwitch':True,'comparisonLinks':14,'avatarSearch':True,'robotFilterCount':6,'httpErrors':bad,'pageErrors':errors},indent=2)+'\n');print('Extracted ZIP gallery, explorer, comparison and Studio passed; no HTTP/JS errors.')
