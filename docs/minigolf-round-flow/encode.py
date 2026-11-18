"""Compress native recordings and select real-time excerpts; never edit gameplay."""
from pathlib import Path
import subprocess, json, hashlib

ROOT=Path(__file__).resolve().parent
def probe(p):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,width,height,r_frame_rate','-of','json',str(p)],text=True))
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
markers=json.loads((ROOT/'flow-checks.json').read_text())['markers']
records=[];sources=[]
for stem,clip,marker,lead in [('desktop-flow','aim-recovery-desktop','contextLossEpoch',5),('mobile-flow','scores-mobile','mobileRecapEpoch',8)]:
    src=ROOT/'video'/(stem+'.webm');dest=src.with_suffix('.mp4');before=probe(src)
    created=float(subprocess.check_output(['stat','-c','%W',str(src)],text=True))
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-map','0:v:0','-c:v','libx264','-crf','28','-preset','veryfast','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(dest)],check=True)
    after=probe(dest);a,b=before['streams'][0],after['streams'][0]
    assert (a['width'],a['height'],a['r_frame_rate'])==(b['width'],b['height'],b['r_frame_rate'])
    assert abs(float(before['format']['duration'])-float(after['format']['duration']))<.1
    records.append({'file':dest.name,'originalSha256':digest(src),'publishedSha256':digest(dest),'originalProbe':before,'publishedProbe':after,'transformation':'Codec compression only; native size, fps and timing retained. Silent browser recording. No gameplay or image edits.'})
    start=max(0,min(float(after['format']['duration'])-15,markers[marker]-created-lead))
    excerpt=ROOT/'video'/(clip+'.mp4')
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(start),'-i',str(dest),'-t','15','-c:v','libx264','-crf','25','-preset','veryfast','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(excerpt)],check=True)
    clipped=probe(excerpt);c=clipped['streams'][0]
    assert (c['width'],c['height'],c['r_frame_rate'])==(b['width'],b['height'],b['r_frame_rate'])
    records.append({'file':excerpt.name,'sourceFile':dest.name,'sourceSha256':digest(dest),'sourceStartSeconds':start,'selection':'15-second real-time excerpt selected using recorded UI-event/file timestamps; no frame, speed or image edits.','publishedProbe':clipped,'publishedSha256':digest(excerpt)})
    sources.append(src)
(ROOT/'video/encoding-checks.json').write_text(json.dumps(records,indent=2)+'\n')
for src in sources:src.unlink()
print('PASS: two native full-flow recordings and two real-time excerpts')
