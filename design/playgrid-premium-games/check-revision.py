"""Verify revised concept layouts and local inspection controls; no multiplayer calls."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright,expect
import json,os,shutil
P=Path(__file__).resolve().parent;R=P.parents[1]
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(R)));Thread(target=s.serve_forever,daemon=True).start();checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
 for w,h in [(1440,900),(768,1024),(390,844),(360,740)]:
  q=b.new_page(viewport={'width':w,'height':h})
  for game,counts in [('color-stack',[4,6,3]),('go-fish',[6,4])]:
   q.goto(f'http://127.0.0.1:{s.server_port}/design/playgrid-premium-games/{game}/concept.html');q.evaluate('document.fonts.ready')
   actual=q.locator('.hidden-hand').evaluate_all('(hands)=>hands.map(h=>h.querySelectorAll("i").length)');assert actual==counts,(game,w,actual)
   label=q.locator('.pond small' if game=='go-fish' else '.deck small').bounding_box()
   if game=='go-fish':
    next_item=q.locator('.ask-strip').bounding_box()
    assert label['y']+label['height'] < next_item['y'],(game,w,label,next_item)
   else:
    for el in q.locator('.hand-zone p,.hand-zone .eyebrow,.hand-zone .person,.fan .playing-card').all():
     item=el.bounding_box()
     intersects=(label['x']<item['x']+item['width'] and label['x']+label['width']>item['x'] and label['y']<item['y']+item['height'] and label['y']+label['height']>item['y'])
     assert not intersects,(game,w,label,item)
   checks.append({'game':game,'width':w,'visibleOpponentBacks':actual,'deckLabelClearOfControls':True})
  q.close()
 q=b.new_page(viewport={'width':390,'height':844})
 q.goto(f'http://127.0.0.1:{s.server_port}/design/playgrid-premium-games/battleship/concept.html');q.evaluate('document.fonts.ready')
 expect(q.locator('.own-chart')).to_be_hidden();expect(q.locator('.enemy-chart')).to_be_visible()
 q.get_by_role('button',name='Your fleet · 5 ships').click();expect(q.locator('.own-chart')).to_be_visible();expect(q.locator('.enemy-chart')).to_be_hidden()
 expect(q.locator('.fire-dock .primary')).to_have_text('Return to enemy waters')
 q.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');q.screenshot(path=str(P/'battleship/mobile-fleet.png'))
 q.locator('.fire-dock .primary').click();expect(q.locator('.own-chart')).to_be_hidden();expect(q.locator('.enemy-chart')).to_be_visible()
 checks.append({'game':'battleship','width':390,'fleetSwitchAndReturn':True,'enemyChartHasNoVessels':True})
 q.goto(f'http://127.0.0.1:{s.server_port}/design/playgrid-premium-games/color-stack/concept.html')
 q.locator('.fan .playing-card').nth(0).click();expect(q.locator('.action-dock .primary')).to_be_disabled()
 q.locator('.fan .playing-card').nth(2).click();expect(q.locator('.action-dock .primary')).to_be_enabled()
 expect(q.locator('.selection-label')).to_contain_text('red 5')
 q.emulate_media(reduced_motion='reduce');assert q.locator('.playing-card').first.evaluate('(e)=>getComputedStyle(e).transitionDuration')=='0s'
 checks.append({'game':'color-stack','selectionFeedback':True,'reducedMotion':True})
 b.close()
s.shutdown();s.server_close();(P/'revision-checks.json').write_text(json.dumps(checks,indent=2)+'\n');print('Revised layout, card privacy/counts, fleet view switching, card inspection and reduced motion passed.')
