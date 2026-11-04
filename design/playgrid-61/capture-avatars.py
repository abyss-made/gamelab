from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json,xml.etree.ElementTree as E
P=Path(__file__).resolve().parent;R=P.parents[1];S=P/'avatar-studio';chars=json.loads((S/'catalog.json').read_text())['characters']
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(R)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/design/playgrid-61'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium');q=b.new_page();q.goto(base+'/avatar-studio/index.html');q.wait_for_function('window.Studio2 && document.documentElement.dataset.studioReady==="true"')
 for c in chars:
  root=E.parse(S/c['asset']).getroot();assert len((S/c['asset']).read_bytes())<40000
  assert len(root.findall('.//*[@data-layer]'))==13
  for n in [24,32,48,128]:
   q.set_viewport_size({'width':n,'height':n});q.evaluate('''async ({id,n})=>{const c=Studio2.catalog.find(c=>c.id===id);const svg=await Studio2.compose(c,{v:3,id:c.id,...c.defaultLook},'thumbnail');document.body.replaceChildren(svg);document.body.style.cssText='margin:0;padding:0;width:100vw;height:100vh;min-height:0;background:transparent;display:block';svg.style.width=n+'px';svg.style.height=n+'px';}''',{'id':c['id'],'n':n});q.screenshot(path=str(S/f'assets/thumbnails/{c["id"]}-{n}.png'),omit_background=True)
 print('140 actual SVG thumbnail exports captured.',flush=True)
 for name,w,h in [('desktop',1440,900),('mobile',390,844),('narrow',360,740),('tablet',768,1024),('tablet-landscape',1024,768)]:
  ctx=b.new_context(viewport={'width':w,'height':h});q=ctx.new_page();q.goto(base+'/avatar-studio/index.html');q.wait_for_function('document.documentElement.dataset.studioReady==="true"');q.evaluate('document.fonts.ready');q.wait_for_timeout(100);q.screenshot(path=str(P/f'screenshots/studio-{name}.png'));print(name,'captured',flush=True);ctx.close()
 b.close()
server.shutdown();server.server_close()
