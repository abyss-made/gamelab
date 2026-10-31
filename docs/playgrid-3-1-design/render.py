"""Render design specimens only. Requires Python Playwright and Chromium, no app services."""
from pathlib import Path
import json, functools, http.server, threading, os, shutil
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent; ROOT=P.parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass

def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 games=json.loads((P/'games.json').read_text());(P/'images').mkdir(exist_ok=True);checks=[]
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
  for game in games:
   for mode,w,h in [('desktop',1440,900),('mobile',390,844)]:
    page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/docs/playgrid-3-1-design/mockups/{game["id"]}-{mode}.html')
    page.evaluate('document.fonts.ready');page.wait_for_function('Array.from(document.images).every(i=>i.complete && i.naturalWidth>0)')
    size=page.evaluate('({width:innerWidth,viewportHeight:innerHeight,scrollWidth:document.documentElement.scrollWidth,contentHeight:document.documentElement.scrollHeight})')
    assert size['scrollWidth']==w,(game['id'],mode,size)
    assert not errors,errors
    page.screenshot(path=str(P/'images'/f'{game["id"]}-{mode}.png'),full_page=True)
    checks.append({'game':game['id'],'mode':mode,**size,'pageErrors':errors})
    page.close()
  # Review sheets use actual rendered mockups, fitted without distortion.
  for name,ids in [('01-hero-games',['drawguess','fourrow','chess','checkers','ludo','pool','colorstack']),('02-word-party',['wordchain','categories','wordscramble','trivia','telephone','bluff','impostor','rps']),('03-board-card-skill',['gofish','tictactoe','dotsboxes','battleship','golf','tycoon'])]:
   html='<!doctype html><meta charset="utf-8"><style>body{background:#06131d;color:#eef5fa;font:16px Arial;margin:0;padding:24px}h1{font-size:24px}main{display:grid;grid-template-columns:repeat(2,1fr);gap:22px}figure{margin:0;border-top:1px solid #304757;padding-top:12px}h2{font-size:17px}section{display:grid;grid-template-columns:1fr 145px;gap:10px}img{width:100%;height:280px;object-fit:contain;object-position:center top;background:#030d17}p{color:#aac0d0;font-size:12px}</style><h1>PLAYGRID 3.1 / '+name.replace('-',' ').upper()+'</h1><p>Design proposals · each game has a 1440px desktop and 390px mobile source capture. Not production screenshots.</p><main>'
   for id in ids:html+=f'<figure><h2>{next(g["name"] for g in games if g["id"]==id)}</h2><section><img src="images/{id}-desktop.png"><img src="images/{id}-mobile.png"></section></figure>'
   html+='</main>';(P/(name+'.html')).write_text(html)
   page=browser.new_page(viewport={'width':1536,'height':1000});page.goto(f'http://127.0.0.1:{server.server_port}/docs/playgrid-3-1-design/{name}.html');page.wait_for_function('Array.from(document.images).every(i=>i.complete)');page.screenshot(path=str(P/'images'/(name+'.png')),full_page=True);page.close()
  for mode,w,h in [('desktop',1440,900),('mobile',390,844)]:
   page=browser.new_page(viewport={'width':w,'height':h})
   page.goto(f'http://127.0.0.1:{server.server_port}/docs/playgrid-3-1-design/states.html')
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
   page.locator('button',has_text='Replay disc drop').click();page.wait_for_timeout(350)
   assert page.locator('.example.run').count()==1
   page.screenshot(path=str(P/'images'/f'04-states-{mode}.png'),full_page=True)
   page.emulate_media(reduced_motion='reduce')
   page.locator('button',has_text='Replay piece travel').click();page.wait_for_timeout(30)
   assert page.locator('.piece').evaluate('(e)=>parseFloat(getComputedStyle(e).animationDuration) <= .001')
   page.close()
  browser.close()
 server.shutdown();server.server_close();(P/'render-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
 print(f'{len(checks)} designs rendered; no horizontal overflow, missing images or page errors.')
if __name__=='__main__':main()
