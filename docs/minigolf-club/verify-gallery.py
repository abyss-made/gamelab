"""Verify saved screenshot navigation and image dimensions; no production game state involved."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,time,json,urllib.request
DOC=Path(__file__).resolve().parent;URL='http://127.0.0.1:45410';errors=[];checks=[]
server=subprocess.Popen(['python','-m','http.server','45410','--bind','127.0.0.1','--directory',str(DOC)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 for i in range(100):
  try:urllib.request.urlopen(URL).close();break
  except:
   if i==99:raise
   time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium');p=b.new_page(viewport={'width':1440,'height':1000});p.on('pageerror',lambda e:errors.append(str(e)));p.goto(URL)
  def loaded(w):
   p.wait_for_function('Array.from(document.querySelectorAll("#review img")).every(i=>i.complete&&i.naturalWidth>0)');dims=p.locator('#review img').evaluate_all('(imgs)=>imgs.map(i=>[i.naturalWidth,i.naturalHeight])');assert dims and all(d==[int(w),{'1440':900,'390':844,'932':430}[w]] for d in dims),dims
  for w in ['1440','390','932']:
   p.select_option('#size',w)
   for hole in range(1,7):
    p.select_option('#hole',str(hole))
    for camera in ['follow','overview']:p.select_option('#camera',camera);loaded(w);checks.append({'mode':'course','hole':hole,'width':w,'camera':camera})
  p.select_option('#mode','compare')
  for course in ['meadow','harbor']:
   p.select_option('#legacy',course)
   for w in ['1440','390','932']:
    p.select_option('#size',w)
    for camera in ['follow','overview']:p.select_option('#camera',camera);loaded(w);checks.append({'mode':'comparison','course':course,'width':w,'camera':camera})
  for mode in ['result','water']:
   p.select_option('#mode',mode)
   for w in ['1440','390','932']:p.select_option('#size',w);loaded(w);checks.append({'mode':mode,'width':w})
  p.locator('#ref').click();p.wait_for_function('document.querySelector("#reference img").complete&&document.querySelector("#reference img").naturalWidth>0');p.locator('#ref').click();p.select_option('#mode','courses');p.select_option('#hole','6');p.locator('#next').click();assert p.locator('#hole').input_value()=='1';p.locator('#prev').click();assert p.locator('#hole').input_value()=='6';p.locator('h1').click();p.keyboard.press('ArrowRight');assert p.locator('#hole').input_value()=='1';p.locator('#review .zoom').click();assert p.locator('#zoom').evaluate('(e)=>e.open');p.keyboard.press('Escape');assert not p.locator('#zoom').evaluate('(e)=>e.open');assert p.evaluate('document.activeElement.classList.contains("zoom")')
  p.select_option('#mode','compare');p.select_option('#size','1440');p.screenshot(path=str(DOC/'gallery-desktop.png'));p.set_viewport_size({'width':390,'height':844});p.select_option('#mode','courses');p.select_option('#size','390');assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1');p.screenshot(path=str(DOC/'gallery-phone.png'));b.close()
 assert not errors,errors
 (DOC/'test-results/gallery.json').write_text(json.dumps({'states':checks,'errors':errors,'navigationZoomEscapeFocusAndMobile':True},indent=2)+'\n');print('PASS: 54 review states, correct capture dimensions, reference, navigation/zoom/focus and mobile layout')
finally:server.terminate();server.wait(timeout=10)
