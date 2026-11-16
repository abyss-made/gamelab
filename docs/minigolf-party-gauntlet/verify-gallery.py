"""Check original screenshot dimensions, gallery controls, links, and video playback."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import subprocess,json,urllib.request,time
ROOT=Path(__file__).resolve().parent
server=subprocess.Popen(['python','-m','http.server','45410','--bind','127.0.0.1','--directory',str(ROOT)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 for _ in range(100):
  try:urllib.request.urlopen('http://127.0.0.1:45410').close();break
  except:time.sleep(.1)
 dimensions={'1440':(1440,900),'390':(390,844),'932':(932,430)};pngs=[]
 for f in sorted((ROOT/'screenshots').glob('*.png')):
  with Image.open(f) as im:assert im.size==dimensions[f.stem.split('-')[-1]],(f,im.size)
  pngs.append(f.name)
 assert len(pngs)==51,len(pngs)
 for name in ['README.md','HANDOFF.md','full-course-checks.json','input-checks.json','test-results/suite.json','preservation-checks.json']:
  assert (ROOT/name).is_file(),name
 videos=[]
 for filename,width,height in [('full-course.mp4',1440,900),('input-1440.webm',1440,900),('input-390.webm',390,844),('input-932.webm',932,430)]:
  f=ROOT/'video'/filename;probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,width,height','-of','json',str(f)],text=True));stream=probe['streams'][0]
  assert (stream['width'],stream['height'])==(width,height),(filename,stream)
  assert float(probe['format']['duration'])>1
  videos.append({'file':filename,'probe':probe})
 errors=[];cases=[]
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium');page=browser.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:45410')
  for width in ['1440','390','932']:
   page.locator('[data-size="'+width+'"]').click()
   for view in ['follow','overview']:
    page.locator('[data-view="'+view+'"]').click();page.locator('#holes img').evaluate_all('(images)=>images.forEach(i=>i.loading="eager")');page.wait_for_function('Array.from(document.querySelectorAll("#holes img")).every(i=>i.complete&&i.naturalWidth>0)')
    assert page.locator('#holes img').count()==6
    assert page.locator('#holes img').evaluate_all('(images)=>images.every(i=>i.naturalWidth==='+width+')')
    for href in page.locator('#extras a').evaluate_all('(links)=>links.map(a=>a.href)'):urllib.request.urlopen(href).close()
    cases.append({'width':int(width),'camera':view,'nativeImages':6})
  for width,height in [(1440,900),(390,844)]:
   page.set_viewport_size({'width':width,'height':height});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  video=page.locator('video');video.scroll_into_view_if_needed();page.evaluate('document.querySelector("video").muted=true');page.evaluate('document.querySelector("video").play()');page.wait_for_function('document.querySelector("video").currentTime>0.5');assert page.locator('video').evaluate('(v)=>v.videoWidth===1440&&v.videoHeight===900')
  browser.close()
 assert not errors,errors
 (ROOT/'gallery-checks.json').write_text(json.dumps({'nativePngCount':len(pngs),'cases':cases,'noOverflow':[1440,390],'videoPlayback':True,'recordings':videos,'errors':errors},indent=2)+'\n');print('PASS: 51 native screenshots, six gallery views, evidence links, four native recordings and actual video playback')
finally:server.terminate();server.wait(timeout=10)
