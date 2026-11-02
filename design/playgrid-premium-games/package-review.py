"""Render review sheets and package design sources/previews with reused Playgrid assets."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import zipfile,os,shutil
P=Path(__file__).resolve().parent;R=P.parents[1]
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(R)));Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 for html,png in [('review-01','eight-concepts-01'),('review-02','eight-concepts-02'),('revised-tables','revised-tables'),('revised-boards','revised-boards')]:
  q=b.new_page(viewport={'width':1536,'height':1100})
  q.goto(f'http://127.0.0.1:{s.server_port}/design/playgrid-premium-games/{html}.html');q.evaluate('document.fonts.ready');q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');q.screenshot(path=str(P/(png+'.png')),full_page=True);q.close()
 b.close()
s.shutdown();s.server_close()
with zipfile.ZipFile(P/'playgrid-premium-stage-a.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in P.rglob('*'):
  if f.is_file() and f.suffix!='.zip' and '__pycache__' not in str(f):z.write(f,f.relative_to(R))
 for name in ['favicon.svg','assets/player-portraits.png','assets/fonts/inter-variable.ttf','assets/fonts/OFL.txt']:
  f=R/'node-server/public'/name;z.write(f,f.relative_to(R))
print('Updated overview sheets, five-game revision sheets and portable ZIP.')
