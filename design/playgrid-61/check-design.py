"""Real Chromium preview verification. Does not claim production multiplayer coverage."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright,expect
import json,xml.etree.ElementTree as E
P=Path(__file__).resolve().parent;R=P.parents[1];S=P/'avatar-studio';C=json.loads((S/'catalog.json').read_text())['characters'];assert len(C)==35 and sum(c['isAdditional'] for c in C)==32
for c in C:
 root=E.parse(S/c['asset']).getroot();assert len(list(root.findall('.//*[@data-layer]')))==13;assert (S/c['asset']).stat().st_size<40000
 ids=[e.get('id') for e in root.iter() if e.get('id')];assert len(ids)==len(set(ids)),c['id']
 assert not root.findall('.//{http://www.w3.org/2000/svg}script') and not root.findall('.//{http://www.w3.org/2000/svg}foreignObject')
 for e in root.iter():
  for key,value in e.attrib.items():
   assert not key.lower().startswith('on')
   if key.endswith('href'):assert value.startswith('#')
 for n in [24,32,48,128]:assert (S/f'assets/thumbnails/{c["id"]}-{n}.png').exists()
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(R)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/design/playgrid-61';report={'avatars':[],'games':[],'assets':{'additionalBases':32,'foundationStudies':3,'layersPerBase':13,'lobbySizeExports':105,'previewSizeExports':35}};failures=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium')
 def dims(q):return q.evaluate('({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,iw:innerWidth,ih:innerHeight})')
 def ready(q):q.wait_for_function('document.documentElement.dataset.studioReady==="true" || document.documentElement.dataset.studioError');assert not q.evaluate('document.documentElement.dataset.studioError');q.evaluate('document.fonts.ready');q.wait_for_timeout(60)
 for name,w,h in [('desktop',1440,900),('mobile',390,844),('narrow',360,740),('tablet',768,1024),('tablet-landscape',1024,768)]:
  ctx=browser.new_context(viewport={'width':w,'height':h});q=ctx.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));q.goto(base+'/avatar-studio/index.html');ready(q);assert q.locator('.character-choice').count()==35;assert dims(q)['w']==w and dims(q)['h']==h,(name,dims(q))
  q.screenshot(path=str(P/f'screenshots/studio-{name}.png'))
  cfg=q.evaluate('Studio2.getConfig()');q.locator('#randomize').click();q.wait_for_timeout(50);assert q.evaluate('Studio2.isDirty()');q.locator('#undo').click();q.wait_for_timeout(50);assert q.evaluate('Studio2.getConfig()')==cfg
  q.get_by_role('tab',name='Looks',exact=True).click();q.locator('[data-slot=hat]').select_option('beanie');q.locator('[data-slot=glasses]').select_option('round');q.wait_for_function('Studio2.getConfig().hat==="beanie"');q.screenshot(path=str(P/f'screenshots/looks-{name}.png'))
  q.locator('#reset').click();q.wait_for_function('Studio2.getConfig().hat==="none"');q.locator('#undo').click();q.wait_for_function('Studio2.getConfig().hat==="beanie"')
  q.evaluate("localStorage.setItem('pg_profile','unchanged-original')");q.locator('#save').click();assert q.locator('#save-dialog').is_visible();q.screenshot(path=str(P/f'screenshots/save-confirm-{name}.png'));q.locator('#cancel-save').click();assert q.evaluate('localStorage.getItem(Studio2.storageKey)') is None
  q.locator('#save').click();q.locator('#confirm-save').click();assert not q.evaluate('Studio2.isDirty()');assert q.evaluate("localStorage.getItem('pg_profile')")=='unchanged-original';q.reload();ready(q);assert q.evaluate('Studio2.getConfig().hat')=='beanie'
  q.get_by_role('tab',name='Characters',exact=False).click();q.locator('#search').fill('no-such-character');assert q.locator('#empty').is_visible();q.screenshot(path=str(P/f'screenshots/empty-{name}.png'));q.locator('#clear-search').click();assert q.locator('.character-choice').count()==35
  q.locator('button[data-character=a09]').click();q.wait_for_function('Studio2.getConfig().id==="a09"');q.get_by_role('tab',name='Looks',exact=True).click();assert q.locator('[data-slot=hat] option[value=cap]').evaluate('(o)=>o.disabled'),q.locator('[data-slot=hat]').evaluate('(s)=>s.outerHTML');q.screenshot(path=str(P/f'screenshots/unavailable-{name}.png'))
  q.locator('#back').click();assert q.locator('#leave-dialog').is_visible();q.screenshot(path=str(P/f'screenshots/unsaved-{name}.png'));q.locator('#keep-editing').click();expect(q.locator('#back')).to_be_focused()
  q.get_by_role('tab',name='Reactions',exact=True).click();q.emulate_media(reduced_motion='reduce');q.get_by_role('button',name='Victory',exact=True).click();assert q.locator('#portrait').evaluate('(e)=>getComputedStyle(e).animationName')=='none'
  q.get_by_role('tab',name='Classic',exact=False).click();assert q.locator('.legacy-choice').count()==24;q.locator('[data-legacy="23"]').click();assert q.locator('#palette button').count()==10
  assert not errors,errors;report['avatars'].append({'size':name,'viewport':[w,h],'pageOverflow':False,'undoRandomizeReset':True,'saveConfirmCancelReload':True,'originalProfileUnchanged':True,'emptyRecovery':True,'compatibilityDisabled':True,'unsavedDialogFocus':True,'reducedMotion':True,'legacyChoices':24});ctx.close();print('Studio',name,'passed',flush=True)
 # Actual error states through real browser failure injection, not fake product controls.
 for kind in ['asset','storage']:
  for name,w,h in [('desktop',1440,900),('mobile',390,844)]:
   ctx=browser.new_context(viewport={'width':w,'height':h});q=ctx.new_page()
   if kind=='asset':q.route('**/assets/characters/h01-home-gamer.svg',lambda route:route.fulfill(status=503,body='unavailable'))
   else:q.add_init_script("const pgOriginalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='pg_avatar_studio2_design_v1')throw new DOMException('Fixture storage denial','QuotaExceededError');return pgOriginalSet.call(this,k,v);};")
   q.goto(base+'/avatar-studio/index.html');ready(q)
   if kind=='asset':assert q.locator('#asset-error').is_visible() and q.locator('#save').is_disabled()
   else:q.locator('#save').click();q.locator('#confirm-save').click();assert q.locator('#save-error').is_visible()
   q.screenshot(path=str(P/f'screenshots/{kind}-error-{name}.png'));ctx.close()
 q=browser.new_page();q.goto(base+'/avatar-studio/index.html');ready(q)
 variants=q.evaluate('''async()=>{let count=0;for(const c of Studio2.catalog)for(const slot of ['expression','eyes','hat','glasses','accessory','detail'])for(const value of c.compatibility[slot]){const cfg={v:3,id:c.id,...c.defaultLook,[slot]:value};const normalized=Studio2.normalize(cfg);if(normalized[slot]!==value)throw Error('Compatibility failed');const svg=await Studio2.compose(c,normalized,'variant-'+count);if(!svg.querySelector('[data-layer="detail"]'))throw Error('Missing layer');count++;}return count;}''')
 assert q.evaluate("Studio2.normalize({v:999,id:'a09'}).id")=='h01';assert q.evaluate("Studio2.normalize({v:2,id:'a01',palette:'cyan',expression:'smile',eyes:'default',hat:'none',glasses:'none',accessory:'none'}).v")==3
 assert q.evaluate("(()=>{for(let e=0;e<24;e++)for(let c=0;c<10;c++){const n=Studio2.normalize({v:1,kind:'legacy',e,c});if(n.e!==e||n.c!==c)return false;}return true;})()")
 assert q.evaluate("Studio2.normalize({v:3,id:'a02',hat:'cap',accessory:'headphones'}).accessory")=='none'
 report['assets']['crossSlotHeadwearGuard']=True;report['assets']['allowedSingleModuleVariantsComposed']=variants;report['assets']['legacyConfigurationsNormalized']=240
 # Component frame checks; document scrolling is allowed, horizontal overflow is not.
 for name,w,h in [('desktop',1440,900),('mobile',390,844),('narrow',360,740)]:
  for game in ['pool','colorstack','gofish','ludo','tycoon','golf']:
   q=browser.new_page(viewport={'width':w,'height':h});errors=[];q.on('pageerror',lambda e:errors.append(str(e)));q.goto(base+'/game-feel/index.html?game='+game);q.wait_for_function('document.documentElement.dataset.feelReady==="true" || document.documentElement.dataset.feelError');assert not q.evaluate('document.documentElement.dataset.feelError');q.evaluate('document.fonts.ready');q.wait_for_timeout(50);assert dims(q)['w']==w,(game,name,dims(q));q.screenshot(path=str(P/f'screenshots/{game}-{name}.png'),full_page=True)
   if game=='pool':q.locator('#plus').click();assert q.locator('#angle').inner_text()=='0.5°';q.locator('#commit').click();assert q.evaluate('Feel61.getDraft().type')=='shoot';q.get_by_role('button',name='Resume sample halfway',exact=True).click();assert q.locator('#commit').is_disabled();q.emulate_media(reduced_motion='reduce');q.wait_for_function('!document.querySelector("#commit").disabled');q.screenshot(path=str(P/f'screenshots/{game}-settled-{name}.png'),full_page=True)
   if game=='colorstack':q.locator('[data-card="1"]').focus();q.keyboard.press('ArrowRight');assert q.locator('[data-card="2"]').get_attribute('aria-pressed')=='true';assert q.locator('#play-card').is_disabled();q.locator('#expand').click();assert q.locator('#fan').get_attribute('class')=='fan expanded';q.screenshot(path=str(P/f'screenshots/{game}-expanded-{name}.png'),full_page=True);q.locator('[data-card="12"]').click();q.locator('#play-card').click();q.evaluate('[...document.querySelectorAll("#fixture-actions button")].find(b=>b.textContent==="Timer refresh / stable focus").click()');assert not q.locator('#wild').evaluate('(e)=>e.hidden');q.locator('[data-color="b"]').click();assert q.evaluate('Feel61.getDraft().color')=='b'
   if game=='gofish':q.locator('#ask').click();assert q.evaluate('Feel61.getDraft().rank')==7;q.get_by_role('button',name='Receive real book fixture',exact=True).click();assert q.locator('.book.new').count()==1;q.screenshot(path=str(P/f'screenshots/{game}-book-{name}.png'),full_page=True);q.get_by_role('button',name='Receive same view again',exact=True).click();assert q.locator('.book.new').count()==0;q.get_by_role('button',name='Show Ace request',exact=True).click();q.locator('#ask').click();assert q.evaluate('Feel61.getDraft().rank')==14
   if game=='ludo':q.locator('[data-token="0"]').click();q.locator('#move').click();assert q.evaluate('Feel61.getDraft().token')==0
   if game=='tycoon':q.locator('#review-offer').click();q.evaluate('document.querySelector("#fixture-actions button").click()');assert q.locator('#accept-offer').is_disabled();q.screenshot(path=str(P/f'screenshots/{game}-unavailable-{name}.png'),full_page=True);q.locator('#close-dialog').click();expect(q.locator('#review-offer')).to_be_focused()
   if game=='golf':q.locator('#aim-surface').focus();q.keyboard.press('Shift+ArrowRight');assert q.locator('#angle').inner_text()=='5.0°';q.locator('#commit').click();assert q.evaluate('Feel61.getDraft().type')=='putt'
   assert not errors,errors;report['games'].append({'game':game,'viewport':[w,h],'noHorizontalOverflow':True,'interactionDrafts':True,'pageErrors':errors});q.close()
  print('Components',name,'passed',flush=True)
 browser.close()
server.shutdown();server.server_close();(P/'CHECKS.json').write_text(json.dumps(report,indent=2)+'\n');print('Asset, responsive, creator state and targeted component checks complete.',flush=True)
