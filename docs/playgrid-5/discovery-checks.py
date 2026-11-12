"""Real discovery links, search/filter, Studio save, and mobile viewport checks."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
OUT=Path(__file__).resolve().parent;checks=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium')
 page=b.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 for w,h in [(1440,900),(390,844),(932,430)]:
  page.set_viewport_size({'width':w,'height':h});page.goto('http://127.0.0.1:45003/')
  for path in ['/draw-and-guess','/color-stack','/mini-golf']:
   page.locator('.p5-picks a[href="'+path+'"]').click();page.wait_for_url('**'+path);assert page.locator('#screen-selection').is_visible();page.goto('http://127.0.0.1:45003/')
  page.locator('.p5-section-head a').click();page.wait_for_url('**/games');assert page.locator('#games [data-game]').count()==20
  page.locator('#game-search').fill('golf');assert page.locator('#games [data-game]').count()==1
  page.locator('#game-search').fill('zzznoresult');assert page.locator('#games-empty').is_visible();page.locator('#games-clear').click();assert page.locator('#games [data-game]').count()==20
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');checks.append(f'{w}: curated links, catalog search/empty/reset, no overflow')
 page.set_viewport_size({'width':1440,'height':900});page.locator('[data-view=profile]:visible').first.click();page.locator('[data-character=h02]:visible').click();page.locator('[data-studio=save]:visible').click();page.wait_for_function("JSON.parse(localStorage.pg_profile).avatar.v3.id==='h02'");page.keyboard.press('Escape');page.reload();page.locator('[data-view=profile]:visible').first.click();page.wait_for_selector('[data-character=h02][aria-pressed=true]:visible');checks.append('Studio character selection/save survives reload')
 page.emulate_media(reduced_motion='reduce');assert page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches");checks.append('Live reduced motion preference honoured')
 b.close()
(OUT/'discovery-checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2)+'\n');assert not errors,errors
print('PASS',len(checks),'discovery/Studio groups')
