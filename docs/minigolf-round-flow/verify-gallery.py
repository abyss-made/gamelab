"""Check the published originals, local links, gallery controls and actual playback."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, json, time, urllib.request, struct

ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
photos=[]
for file in sorted((OUT/'screenshots').glob('*.png')):
    data=file.read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n'
    size=struct.unpack('>II',data[16:24]);expected={'1440':(1440,900),'390':(390,844),'932':(932,430)}[file.stem.rsplit('-',1)[1]]
    assert size==expected,(file.name,size)
    photos.append({'file':file.name,'width':size[0],'height':size[1]})
assert len(photos)==21
enc=json.loads((OUT/'video/encoding-checks.json').read_text());assert len(enc)==4
for record in enc:
    actual=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,width,height,r_frame_rate','-of','json',str(OUT/'video'/record['file'])],text=True))
    assert actual==record['publishedProbe']
errors=[];checks=[]
server=subprocess.Popen(['python','-m','http.server','45440','--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
    for _ in range(80):
        try:urllib.request.urlopen('http://127.0.0.1:45440',timeout=.3);break
        except Exception:time.sleep(.1)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        for width,height in [(1440,900),(390,844)]:
            page=browser.new_page(viewport={'width':width,'height':height})
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto('http://127.0.0.1:45440/docs/minigolf-round-flow/',wait_until='domcontentloaded')
            # Media can keep a streaming request open; inspect actual readiness.
            page.wait_for_function('Array.from(document.images).length===21&&Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)')
            assert page.locator('img').count()==21
            assert page.evaluate('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            for link in page.locator('a').evaluate_all('(links)=>links.map(a=>a.href)'):
                assert page.request.get(link).ok,link
            page.locator('[data-filter=scores]').click()
            assert page.locator('[data-group]:visible').count()==1
            assert page.locator('[data-group=scores]').is_visible()
            page.locator('[data-filter=all]').click();assert page.locator('[data-group]:visible').count()==4
            for video in page.locator('video').all():
                video.evaluate('(v)=>{v.muted=true;return v.play()}')
                page.wait_for_timeout(700);assert video.evaluate('(v)=>v.currentTime>0&&!v.error&&v.videoWidth>0')
                video.evaluate('(v)=>v.pause()')
            checks.append({'viewport':[width,height],'allImagesAndLinksLoad':True,'noPageOverflow':True,'filtersWork':True,'clipsActuallyPlay':True})
            page.close()
        browser.close()
    assert not errors,errors
finally:server.terminate();server.wait(timeout=10)
(OUT/'gallery-checks.json').write_text(json.dumps({'screenshots':photos,'videoCount':4,'checks':checks,'errors':errors},indent=2)+'\n')
print('PASS: 21 native captures, four recording files, gallery links/filters/playback at 1440 and 390')
