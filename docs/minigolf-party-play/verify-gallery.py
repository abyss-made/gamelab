"""Check native screenshots, the actual comparison gallery, links and recordings."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import subprocess,json,time,urllib.request
ROOT=Path(__file__).resolve().parent;REPO=ROOT.parents[1];URL='http://127.0.0.1:45430/docs/minigolf-party-play/'
server=subprocess.Popen(['python','-m','http.server','45430','--bind','127.0.0.1','--directory',str(REPO)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 for _ in range(100):
  try:urllib.request.urlopen(URL).close();break
  except:time.sleep(.1)
 dimensions={'1440':(1440,900),'390':(390,844),'932':(932,430)};pngs=[]
 for file in sorted((ROOT/'screenshots').glob('*.png')):
  with Image.open(file) as im:assert im.size==dimensions[file.stem.split('-')[-1]],(file,im.size)
  pngs.append(file.name)
 assert len(pngs)>=46,len(pngs)
 videos=[]
 for name,w,h in [('turbo-desktop.mp4',1440,900),('turbo-finish-mobile.mp4',390,844),('desktop-match.mp4',1440,900),('mobile-match.mp4',390,844),('input-1440.webm',1440,900),('input-390.webm',390,844),('input-932.webm',932,430)]:
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,width,height','-of','json',str(ROOT/'video'/name)],text=True));v=probe['streams'][0];assert (v['width'],v['height'])==(w,h);assert float(probe['format']['duration'])>1;videos.append({'file':name,'probe':probe})
 for name in ['README.md','HANDOFF.md','VALIDATION.md','SCREENSHOTS.md','match-checks.json','input-checks.json','test-results/suite.json']:assert (ROOT/name).exists(),name
 cases=[];errors=[]
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium');page=b.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(URL)
  for w in ['1440','390']:
   page.locator('[data-size="'+w+'"]').click()
   for view in ['follow','overview']:
    page.locator('[data-view="'+view+'"]').click();page.locator('#layouts img').evaluate_all('(images)=>images.forEach(i=>i.loading="eager")');page.wait_for_function('Array.from(document.querySelectorAll("#layouts img")).every(i=>i.complete&&i.naturalWidth>0)')
    assert page.locator('#layouts img').count()==12;assert page.locator('#layouts img').evaluate_all('(images)=>images.every(i=>i.naturalWidth==='+w+')');cases.append({'width':int(w),'camera':view,'nativeBeforeAndAfterImages':12})
  page.locator('#hole').select_option('0');assert page.locator('.pair').count()==1
  for i in range(1,6):page.locator('#next').click();assert page.locator('#hole').input_value()==str(i)
  page.locator('#previous').click();assert page.locator('#hole').input_value()=='4'
  for width,height in [(1440,900),(390,844)]:page.set_viewport_size({'width':width,'height':height});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  for href in page.locator('a').evaluate_all('(links)=>links.map(a=>a.href)'):urllib.request.urlopen(href).close()
  for index in [0,1]:
   video=page.locator('video').nth(index);video.scroll_into_view_if_needed();video.evaluate('(v)=>{v.muted=true;return v.play()}');page.wait_for_function('(i)=>document.querySelectorAll("video")[i].currentTime>.5',arg=index);video.evaluate('(v)=>v.pause()')
  b.close()
 assert not errors,errors
 (ROOT/'gallery-checks.json').write_text(json.dumps({'nativeNewPngCount':len(pngs),'cases':cases,'singleHoleNavigation':True,'noOverflow':[1440,390],'recordings':videos,'bothMatchVideosPlay':True,'errors':errors},indent=2)+'\n');print('PASS: all native PNGs, all before/after comparisons, single-hole navigation and seven recordings')
finally:server.terminate();server.wait(timeout=10)
