"""Render approved active review sheets and package original sources/previews for review."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import zipfile,os,shutil,json
P=Path(__file__).resolve().parent;R=P.parents[1]
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(R)));Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 for name in ['review-01','review-02','review-03','review-04']:
  q=b.new_page(viewport={'width':1536,'height':1100})
  q.goto(f'http://127.0.0.1:{s.server_port}/design/playgrid-premium-rest/{name}.html');q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');q.screenshot(path=str(P/(name+'.png')),full_page=True);q.close()
 q=b.new_page(viewport={'width':1440,'height':900});q.goto(f'http://127.0.0.1:{s.server_port}/design/playgrid-premium-rest/baseline-review.html');q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');assert q.locator('img').count()==26
 b.close()
s.shutdown();s.server_close()
with zipfile.ZipFile(P/'playgrid-premium-rest-approved.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in P.rglob('*'):
  if f.is_file() and f.suffix!='.zip' and '__pycache__' not in str(f):z.write(f,f.relative_to(R))
 for name in ['favicon.svg','assets/player-portraits.png','assets/fonts/inter-variable.ttf','assets/fonts/OFL.txt']:
  f=R/'node-server/public'/name;z.write(f,f.relative_to(R))
print('Four review sheets and portable ZIP created. All 26 baseline image references load.')
