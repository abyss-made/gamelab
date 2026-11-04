"""Focused final regressions and review/manifest integrity; full creator checks are in check-design.py."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
from playwright.sync_api import sync_playwright,expect
import json,hashlib
P=Path(__file__).resolve().parent;R=P.parents[1];bad=[]
class Links(HTMLParser):
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k not in ['href','src'] or not v or v.startswith(('http:','https:','data:','#')):continue
   path=unquote(urlsplit(v).path)
   if not path:continue
   target=R/path.lstrip('/') if path.startswith('/') else self.file.parent/path
   if not target.exists() and target.name not in ['VALIDATION.md','playgrid-61-design.zip']:bad.append([str(self.file.relative_to(P)),v])
for file in P.rglob('*.html'):
 parser=Links();parser.file=file;parser.feed(file.read_text())
assert not bad,bad
manifest=json.loads((P/'ASSET-MANIFEST.json').read_text())
for f in manifest['files']:assert hashlib.sha256((P/f['path']).read_bytes()).hexdigest()==f['sha256']
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(R)));Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}/design/playgrid-61';report={'localHtmlLinks':True,'assetManifestHashes':len(manifest['files']),'focusedRegressions':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium')
 for name,w,h in [('desktop',1440,900),('mobile',390,844),('narrow',360,740)]:
  q=b.new_page(viewport={'width':w,'height':h});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  def game(id):
   q.goto(base+'/game-feel/index.html?game='+id);q.wait_for_function('document.documentElement.dataset.feelReady==="true"');q.evaluate('document.fonts.ready')
  game('pool');svg=q.locator('#aim-surface');rect=svg.bounding_box();portrait=w<=700;vw,vh=(600,1100) if portrait else (1100,600);scale=min(rect['width']/vw,rect['height']/vh);ox=rect['x']+(rect['width']-vw*scale)/2;oy=rect['y']+(rect['height']-vh*scale)/2
  # World target (350,250), relative to cue (250,250), should be zero degrees in either orientation.
  sx,sy=(300,700) if portrait else (400,300);q.mouse.move(ox+sx*scale,oy+sy*scale);q.mouse.down();q.mouse.up();assert q.locator('#angle').inner_text()=='0.0°';assert q.evaluate('Feel61.getDraft()') is None;q.locator('#commit').click();q.screenshot(path=str(P/f'screenshots/pool-pending-{name}.png'),full_page=True)
  q.get_by_role('button',name='Show reconnect',exact=True).click();assert q.locator('#commit').is_disabled() and q.locator('#plus').is_disabled() and q.locator('#power').is_disabled();q.screenshot(path=str(P/f'screenshots/pool-reconnect-{name}.png'),full_page=True)
  game('colorstack');q.locator('[data-card="1"]').focus();q.evaluate('[...document.querySelectorAll("#fixture-actions button")].find(b=>b.textContent==="Timer refresh / stable focus").click()');expect(q.locator('[data-card="1"]')).to_be_focused();q.locator('[data-card="12"]').click();q.locator('#play-card').click();assert q.locator('#wild').is_visible();q.evaluate('[...document.querySelectorAll("#fixture-actions button")].find(b=>b.textContent==="Timer refresh / stable focus").click()');assert q.locator('#wild').is_visible();q.screenshot(path=str(P/f'screenshots/colorstack-wild-{name}.png'),full_page=True)
  game('gofish');q.locator('[data-target="kai"]').click();q.locator('#ask').click();assert 'Kai' in q.locator('#ask-summary').inner_text();assert q.evaluate('Feel61.getDraft().target')=='kai';q.screenshot(path=str(P/f'screenshots/gofish-pending-{name}.png'),full_page=True)
  game('golf');svg=q.locator('#aim-surface');rect=svg.bounding_box();q.mouse.move(rect['x']+rect['width']*.25,rect['y']+rect['height']*.55);q.mouse.down();assert q.locator('#loupe').is_visible();assert q.locator('#loupe use').get_attribute('href')=='#world';q.screenshot(path=str(P/f'screenshots/golf-loupe-{name}.png'),full_page=True);q.mouse.up();assert not q.locator('#loupe').is_visible();assert q.evaluate('Feel61.getDraft()') is None
  q.mouse.move(rect['x']+rect['width']*.3,rect['y']+rect['height']*.5);q.mouse.down();svg.dispatch_event('pointercancel',{'pointerId':1});q.mouse.up();assert not q.locator('#loupe').is_visible()
  assert not errors,errors;report['focusedRegressions'].append({'viewport':[w,h],'portraitWorldMapping':True,'noReleaseCommit':True,'reconnectControlsDisabled':True,'sameCardFocus':True,'wildSurvivesRefresh':True,'pendingTargetName':True,'loupeMirrorsWorld':True,'pointerCancelCleanup':True});q.close()
 # Real delayed asset fetch: Save/reactions cannot race a loading source.
 q=b.new_page();pending=[];q.goto(base+'/avatar-studio/index.html');q.wait_for_function('document.documentElement.dataset.studioReady==="true"');q.route('**/assets/characters/a20-quill.svg',lambda route:pending.append(route));q.locator('button[data-character="a20"]').click();q.wait_for_function('document.body.dataset.avatarLoading==="true"');assert q.locator('#save').is_disabled();q.get_by_role('tab',name='Reactions',exact=True).click();q.get_by_role('button',name='Victory',exact=True).click();assert 'Wait for your character' in q.locator('#status').inner_text();assert pending
 file=P/'avatar-studio/assets/characters/a20-quill.svg';pending[0].fulfill(status=200,content_type='image/svg+xml',body=file.read_text());q.wait_for_function('document.body.dataset.avatarLoading==="false"');assert q.locator('#save').is_enabled();assert q.locator('#character-name').inner_text()=='Quill';report['loadingSaveAndReactionRaceGuard']=True;assert q.evaluate("typeof Studio2.normalize({v:3,id:'a02',palette:['lime']}).palette")=="string";assert q.evaluate("Studio2.normalize({v:3,id:'a02',palette:['lime']}).palette")=="cyan";report['palettePrimitiveGuard']=True;q.close()
 # Failure of classic sprite itself leaves the inline-styled bundled fallback, not ghost art behind loaded portraits.
 q=b.new_page();q.route('**/player-portraits.png',lambda route:route.fulfill(status=503,body='unavailable'));q.goto(base+'/avatar-studio/index.html');q.wait_for_function('document.documentElement.dataset.studioReady==="true"');q.get_by_role('tab',name='Classic',exact=False).click();q.locator('[data-legacy="23"]').click();q.wait_for_timeout(80);assert q.locator('#portrait .legacy-art.legacy-known').count()==0;assert 'fallback.svg' in q.locator('#portrait .legacy-art').evaluate('(e)=>getComputedStyle(e).backgroundImage');report['classicSpriteFailureFallback']=True;q.close()
 for name,w,h in [('desktop',1440,900),('mobile',390,844),('narrow',360,740),('tablet',768,1024),('tablet-landscape',1024,768)]:
  q=b.new_page(viewport={'width':w,'height':h});q.goto(base+'/avatar-studio/index.html');q.wait_for_function('document.documentElement.dataset.studioReady==="true"');q.get_by_role('tab',name='Looks',exact=True).click();assert 'behind the sunglasses' in q.locator('#look-controls').inner_text();assert q.evaluate('document.documentElement.scrollWidth')==w;q.close()
 for name,w,h in [('desktop',1440,900),('mobile',390,844)]:
  q=b.new_page(viewport={'width':w,'height':h});q.goto(base+'/avatar-studio/index.html');q.wait_for_function('document.documentElement.dataset.studioReady==="true"');q.get_by_role('tab',name='Reactions',exact=True).click();q.get_by_role('button',name='Victory',exact=True).click();q.wait_for_timeout(140);q.screenshot(path=str(P/f'screenshots/victory-{name}.png'));q.get_by_role('tab',name='Classic',exact=False).click();q.locator('[data-legacy="23"]').click();q.wait_for_function('!!document.querySelector("#portrait .legacy-known")');assert q.locator('#palette button').first.evaluate('(b)=>Math.abs(b.getBoundingClientRect().width-b.getBoundingClientRect().height)<1');q.screenshot(path=str(P/f'screenshots/classic-{name}.png'));q.close()
 report['classicAndReactionCaptureSizes']=[1440,390]
 for route in ['index.html','characters.html','style-delta.html','contexts.html','feel-board.html']:
  q=b.new_page(viewport={'width':390,'height':844});http=[];q.on('response',lambda r:http.append([r.status,r.url]) if r.status>=400 else None);q.goto(base+'/'+route);q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');q.evaluate('document.fonts.ready');assert not http,http;assert q.evaluate('document.documentElement.scrollWidth')==390,(route,q.evaluate('document.documentElement.scrollWidth'));q.close()
 q=b.new_page();q.goto(base+'/game-feel/index.html?game=colorstack');q.wait_for_function('document.documentElement.dataset.feelReady==="true"');assert q.evaluate('''async()=>{const {createFan}=await import('./components.js');const root=document.createElement('div');document.body.append(root);const fan=createFan(root,{onSelect:()=>{}});fan.update([{id:8,c:'b',v:'8'},{id:0,c:'r',v:'0'}],[0]);const ok=fan.getSelected()===0&&fan.isLegal();root.remove();return ok;}''');q.close();report['numericCardZeroSelection']=True
 report['reviewPagesAt390']=5;b.close()
s.shutdown();s.server_close();(P/'REVIEW-CHECKS.json').write_text(json.dumps(report,indent=2)+'\n');print('Manifest, links, loading/fallback, focus, portrait aim, pointer cleanup and review pages passed.')
