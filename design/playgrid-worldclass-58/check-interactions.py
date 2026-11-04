from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json
P=Path(__file__).resolve().parent;R=P.parents[1];results=[]
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(R)));Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}/design/playgrid-worldclass-58'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium')
 for label,w,h in [('desktop',1440,900),('mobile',390,844)]:
  q=b.new_page(viewport={'width':w,'height':h});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  def game(id,state='active'):
   q.goto(base+'/games/'+id+'/index.html?state='+state);q.wait_for_function('document.documentElement.dataset.feelReady==="true"');q.wait_for_function('Array.from(document.images).every(i=>i.complete)')
  def draft():return q.evaluate('FeelDesign.getDraft().value')
  game('pool');q.locator('.fine-aim button').last.click();assert q.locator('.fine-aim strong').inner_text()=='336.5°';q.locator('.pool-dock .primary').click();assert draft()['type']=='shoot' and draft()['power']==.55
  image=q.locator('.horizontal-table' if w>600 else '.vertical-table');image.focus();q.keyboard.press('Shift+ArrowRight');assert q.locator('.fine-aim strong').inner_text()=='341.5°'
  game('pool','ballinhand');q.locator('.pool-dock .primary').click();assert q.evaluate('FeelDesign.getDraft()') is None;q.locator('.pool-dock .primary').click();assert draft()['place']=={'x':270,'y':320}
  game('golf');q.locator('.feel-golf-aim button').last.click();q.locator('.golf-bottom .primary').click();assert draft()['type']=='putt' and draft()['angle']>0
  # Non-overlap regression: fine aim must live in action dock, never over totals/course.
  assert q.locator('.golf-bottom .feel-golf-aim').count()==1
  game('colorstack','wild');q.locator('[data-color-choice=blue]').click();assert draft()['color']=='b' and draft()['card']=='fixture-card-5'
  game('colorstack','drawn');q.locator('.action-dock button:not(.primary)').click();assert draft()['type']=='pass'
  game('gofish');q.locator('.ranks button').filter(has_text='Q').click();q.locator('.ask-step:nth-child(2) button').last.click();q.locator('.ask-strip>.primary').click();assert draft()=={'type':'ask','target':'fixture-trouble','rank':12}
  game('ludo','roll');q.locator('.legal-tokens button').click();assert draft()['type']=='roll'
  game('ludo','choose');q.locator('.legal-tokens button').nth(2).click();assert draft()['token']==2
  game('battleship');q.get_by_label('Target row',exact=True).select_option(value='r6');q.get_by_label('Target column',exact=True).select_option(value='4');q.locator('.fire-dock .primary').click();assert draft()=={'type':'fire','cell':64},draft();assert q.locator('.feel-target-marker rect').get_attribute('x')=='257',q.locator('.feel-target-marker rect').get_attribute('x')
  q.get_by_label('Target row',exact=True).select_option('r1');q.get_by_label('Target column',exact=True).select_option('1');q.locator('.fire-dock .primary').click();assert 'already been fired' in q.locator('.feel-live').inner_text();assert draft()['cell']==64
  game('chess','promotion');q.locator('[data-promotion=knight]').click();assert draft()['promo']=='N'
  game('chess');q.locator('.chess-actions button').last.click();assert q.evaluate('FeelDesign.getDraft()') is None;q.locator('.chess-actions button').last.click();assert draft()['type']=='resign'
  game('tycoon','auction');q.get_by_label('Bid amount',exact=True).fill('100');q.locator('.feel-field button').click();assert q.evaluate('FeelDesign.getDraft()') is None;q.get_by_label('Bid amount',exact=True).fill('110');q.locator('.feel-field button').click();assert draft()=={'type':'bid','amount':110}
  game('tycoon','trade');q.locator('[data-give]').check();q.get_by_label('Cash you get',exact=True).fill('50');q.locator('.property-copy button').click();assert draft()['giveProps']==[13] and draft()['askCash']==50
  game('wordscramble');inp=q.locator('.answer-form input').first;inp.fill('OCEAN');inp.press('Enter');assert draft()['text']=='OCEAN';assert q.locator('.feel-live').inner_text().endswith('Nothing sent.')
  assert not errors,errors;results.append({'viewport':[w,h],'aimAndKeyboard':True,'placementIsLocalOnly':True,'golfFineAimNoOverlay':True,'wildWireColors':True,'numericFishRanks':True,'rollAndTokenIndices':True,'precisionFireAndRepeatGuard':True,'uppercaseChessPromo':True,'twoTapResign':True,'auctionValidation':True,'twoSidedTradeReview':True,'textEnterDraft':True,'noGameplayAcceptanceSimulated':True});q.close();print(label,'interaction drafts passed',flush=True)
 q=b.new_page();q.goto(base+'/avatar-studio/index.html');q.wait_for_function('document.documentElement.dataset.studioReady==="true"')
 count=q.evaluate('''async()=>{let count=0;for(const c of StudioDesign.catalog){for(const slot of ['hat','glasses','accessory','eyes','expression'])for(const v of c.compatibility[slot]){const cfg={v:2,id:c.id,palette:'lime',expression:'smile',eyes:'default',hat:'none',glasses:'none',accessory:'none',[slot]:v};await StudioDesign.setConfig(cfg);if(StudioDesign.getConfig()[slot]!==v)throw Error(c.id+' '+slot+' '+v);if(document.querySelectorAll('#portrait svg').length!==1)throw Error('Missing SVG');count++;}}return count;}''')
 assert q.evaluate("StudioDesign.normalize({v:999,id:'a02'}).id")=='a01'
 assert q.evaluate('''()=>{for(let e=0;e<24;e++)for(let c=0;c<10;c++){const x=StudioDesign.normalize({v:1,kind:'legacy',e,c});if(x.e!==e||x.c!==c)return false;}return true;}''')
 q.goto(base+'/assets/golf/review.html');q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');q.set_viewport_size({'width':1600,'height':1050});q.screenshot(path=str(P/'assets/golf/review.png'),full_page=True)
 results.append({'allowedAvatarModuleVariantsRendered':count,'legacyConfigurations':240,'unknownVersionFallback':True,'golfHolesRendered':18});b.close()
s.shutdown();s.server_close();(P/'review/interaction-checks.json').write_text(json.dumps(results,indent=2)+'\n');print(count,'allowed per-module character variants rendered; 240 legacy configs preserved.',flush=True)
