from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright,expect
import json,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent;R=P.parents[2];chars=json.loads((P/'catalog.json').read_text())['characters'];assert len(chars)==32
for c in chars:
 f=P/c['asset'];root=ET.parse(f).getroot();assert len(f.read_bytes())<32768
 for layer in c['layers']:assert root.find('.//*[@data-layer="'+layer+'"]') is not None,(c['id'],layer)
 assert not root.findall('.//{http://www.w3.org/2000/svg}script') and not root.findall('.//{http://www.w3.org/2000/svg}foreignObject')
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(R)));Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}/design/playgrid-worldclass-58/avatar-studio';checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium')
 q=b.new_page(viewport={'width':128,'height':128})
 for c in chars:
  q.goto(base+'/'+c['asset']);q.screenshot(path=str(P/c['thumbnail']),omit_background=True)
 q.close()
 for name,w,h in [('desktop',1440,900),('mobile',390,844),('narrow',360,740)]:
  ctx=b.new_context(viewport={'width':w,'height':h});q=ctx.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));q.goto(base+'/index.html');q.wait_for_function('document.documentElement.dataset.studioReady==="true"');q.evaluate('document.fonts.ready')
  dims=q.evaluate('({sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight})');assert dims=={'sw':w,'sh':h},(name,dims)
  assert q.locator('.character-choice').count()==32
  q.screenshot(path=str(P/f'studio-{name}.png'))
  q.get_by_role('tab',name='Looks',exact=True).click();q.locator('[data-slot=hat]').select_option('beanie');q.locator('[data-slot=glasses]').select_option('sunglasses');q.wait_for_function('!!document.querySelector("#portrait svg [data-layer=hat] use")');q.screenshot(path=str(P/f'looks-{name}.png'))
  q.get_by_role('tab',name='Classic 24',exact=False).click();assert q.locator('.legacy-choice').count()==24;q.locator('[data-legacy="23"]').click();assert q.evaluate('StudioDesign.getConfig().e')==23
  q.evaluate("localStorage.setItem('pg_profile','unchanged-fixture')");q.locator('#save').click();assert q.evaluate("localStorage.getItem('pg_profile')")=='unchanged-fixture'
  q.reload();q.wait_for_function('document.documentElement.dataset.studioReady==="true"');assert q.evaluate('StudioDesign.getConfig().e')==23
  q.evaluate("StudioDesign.setConfig({v:2,id:'a09',palette:'lime',hat:'cap',glasses:'sunglasses',accessory:'none',eyes:'bright',expression:'joy'})")
  assert q.evaluate('StudioDesign.getConfig().hat')=='none';assert q.locator('#portrait svg [data-layer=hat] use').count()==0
  q.evaluate("StudioDesign.setConfig({id:'<script>',palette:'__proto__',hat:'javascript:x'})");assert q.evaluate('StudioDesign.getConfig().id')=='a01'
  q.emulate_media(reduced_motion='reduce');q.get_by_role('tab',name='Reactions',exact=True).click();q.get_by_role('button',name='Win',exact=True).click();assert q.locator('#portrait').evaluate('(e)=>getComputedStyle(e).animationName')=='none'
  q.locator('#reference').click();assert q.locator('#style-dialog').is_visible();q.keyboard.press('Escape');expect(q.locator('#reference')).to_be_focused()
  assert not errors,errors;checks.append({'viewport':[w,h],'noPageOverflow':True,'characters':32,'legacyChoices':24,'localPersistence':True,'originalProfileUnchanged':True,'compatibilityGuard':True,'unknownConfigFallback':True,'reducedMotion':True,'dialogFocusReturn':True});ctx.close();print('Studio',name,'passed',flush=True)
 q=b.new_page(viewport={'width':1536,'height':1100});q.goto(base+'/character-review.html');q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');q.screenshot(path=str(P/'character-review.png'),full_page=True);b.close()
s.shutdown();s.server_close();(P/'studio-checks.json').write_text(json.dumps(checks,indent=2)+'\n');print('32 layered SVGs, 32 transparent thumbnails and studio interactions checked.')
