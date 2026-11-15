"""Final evidence checks: dimensions, local links and playback of actual browser recordings."""
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
import subprocess,json,hashlib,re,time,urllib.request
DOC=Path(__file__).resolve().parent;ROOT=DOC.parents[1];errors=[]
for f in DOC.glob('*.md'):
 for target in re.findall(r'\]\(([^)]+)\)',f.read_text()):
  if target=='test-results/artifacts.json':continue # This report is written after verification below.
  if not target.startswith(('http:','https:','#')) and not (DOC/target.split('#')[0]).exists():errors.append([f.name,target])
assert not errors,errors
images=[]
for f in sorted((DOC/'screenshots').rglob('*.png')):
 m=re.search(r'-(1440|390|932)\.png$',f.name);assert m,f
 w=int(m[1]);h={1440:900,390:844,932:430}[w]
 with Image.open(f) as im:assert im.size==(w,h),(f,im.size)
 images.append({'file':str(f.relative_to(DOC)),'width':w,'height':h,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
assert len(images)==74,len(images)
videos=[]
for f in sorted((DOC/'video').iterdir()):
 if f.suffix not in ['.mp4','.webm']:continue
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,width,height,r_frame_rate','-of','json',str(f)],text=True));assert float(info['format']['duration'])>1;videos.append({'file':str(f.relative_to(DOC)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),**info})
assert len(videos)==4,len(videos)
URL='http://127.0.0.1:45412';server=subprocess.Popen(['python','-m','http.server','45412','--bind','127.0.0.1','--directory',str(DOC)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 for i in range(100):
  try:urllib.request.urlopen(URL).close();break
  except:
   if i==99:raise
   time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium');p=b.new_page();p.goto(URL)
  for f in ['video/full-course.mp4','video/input-390.webm']:
   p.evaluate("f=>{document.querySelector('video')?.remove();const v=document.createElement('video');v.muted=true;v.controls=true;v.style='width:900px;max-width:100%';v.src=f;document.body.append(v);v.scrollIntoView({block:'center'})}",f);p.wait_for_function('document.querySelector("video").readyState>=2');start=p.evaluate('async()=>{const v=document.querySelector("video");await v.play();return v.currentTime}');p.wait_for_function('start=>document.querySelector("video").currentTime>start+.1',arg=start,timeout=15000);assert not p.evaluate('document.querySelector("video").error'),f;p.evaluate('document.querySelector("video").pause()')
  b.close()
finally:server.terminate();server.wait(timeout=10)
report={'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'localMarkdownLinksValid':True,'actualGamePNGs':images,'actualVideos':videos,'mp4AndPhoneWebmPlaybackVerified':True}
(DOC/'test-results/artifacts.json').write_text(json.dumps(report,indent=2)+'\n');(DOC/'video/index.json').write_text(json.dumps(videos,indent=2)+'\n');print('PASS: all local links, 74 native-size game PNGs, four valid recordings and actual MP4/WebM playback')
