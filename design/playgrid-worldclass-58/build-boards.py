from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json
P=Path(__file__).resolve().parent;R=P.parents[1];games=json.loads((P/'games.json').read_text());out=P/'review/boards';out.mkdir(exist_ok=True)
style='body{margin:0;padding:28px;background:#071c27;color:#f0f4e9;font:15px Arial}h1{font-size:30px;margin:0 0 8px}p{color:#bacdbd;margin:0 0 22px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}article{background:#0e2a35;border:1px solid #3e6266;border-radius:17px;padding:15px}h2{font-size:20px;margin:0 0 12px}.pair{display:flex;gap:13px;align-items:start}.desktop{width:604px}.mobile{width:166px}img{border-radius:9px;border:1px solid #5e8072}.labels{display:flex;justify-content:space-between;font-size:11px;color:#c6dbb1;padding-top:10px}a{color:#c8ed91}'
for start in range(0,len(games),4):
 gs=games[start:start+4];html='<!doctype html><html lang="en"><meta charset="utf-8"><title>Playgrid Issue 58 review board</title><style>'+style+'</style><h1>Playgrid / Game feel · '+str(start//4+1)+'</h1><p>Approved composition + Issue 58 interaction extension. Local browser screenshots · design only · not production implementation.</p><div class="grid">'
 for g in gs:html+=f'<article><h2>{g["name"]}</h2><div class="pair"><img class="desktop" src="../proposed/{g["id"]}-desktop.png" alt="{g["name"]} desktop"><img class="mobile" src="../proposed/{g["id"]}-mobile.png" alt="{g["name"]} mobile"></div><div class="labels"><span>1440 × 900</span><span>390 × 844</span></div></article>'
 html+='</div>';(out/f'games-{start//4+1}.html').write_text(html)
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(R)));Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}/design/playgrid-worldclass-58/review/boards'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium');q=b.new_page(viewport={'width':1700,'height':1100})
 for i in range(1,6):q.goto(base+f'/games-{i}.html');q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');q.screenshot(path=str(out/f'games-{i}.png'),full_page=True)
 b.close()
s.shutdown();s.server_close();print('Five visual review boards captured.')
