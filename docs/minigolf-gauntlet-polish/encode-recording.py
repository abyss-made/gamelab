"""Codec compression only; retain the actual native frames, size, fps and timing."""
from pathlib import Path
import subprocess,json,hashlib
OUT=Path(__file__).resolve().parent
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,width,height,r_frame_rate','-of','json',str(p)],text=True))
reports=[]
for stem in ['full-course','mobile-course']:
 src=OUT/'video'/(stem+'.webm');dest=OUT/'video'/(stem+'.mp4');before=probe(src);digest=hashlib.sha256(src.read_bytes()).hexdigest();created=float(subprocess.check_output(['stat','-c','%W',str(src)],text=True))
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-map','0:v:0','-c:v','libx264','-preset','veryfast','-crf','28','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(dest)],check=True)
 after=probe(dest);a,b=before['streams'][0],after['streams'][0]
 assert (a['width'],a['height'],a['r_frame_rate'])==(b['width'],b['height'],b['r_frame_rate'])
 assert abs(float(before['format']['duration'])-float(after['format']['duration']))<.1
 published=hashlib.sha256(dest.read_bytes()).hexdigest()
 reports.append({'file':dest.name,'originalSha256':digest,'originalProbe':before,'publishedProbe':after,'publishedSha256':published,'transformation':'Codec compression only; no frame, gameplay, aspect, timing or image edits'})
 # Short, unaltered real-time excerpts around the actual impact screenshot.
 image=OUT/'screenshots'/('motor-impact-1440.png' if stem=='full-course' else 'motor-impact-390.png')
 start=max(0,min(float(after['format']['duration'])-15,image.stat().st_mtime-created-5))
 clip=OUT/'video'/('highlight-desktop.mp4' if stem=='full-course' else 'highlight-mobile.mp4')
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(start),'-i',str(dest),'-t','15','-c:v','libx264','-preset','veryfast','-crf','25','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(clip)],check=True)
 cp=probe(clip);c=cp['streams'][0];assert(c['width'],c['height'],c['r_frame_rate'])==(b['width'],b['height'],b['r_frame_rate'])
 reports.append({'file':clip.name,'sourceFile':dest.name,'sourceSha256':published,'sourceStartSeconds':start,'timingNote':'Excerpt location selected from actual screenshot/file timestamps; no speed or frame changes','publishedProbe':cp,'publishedSha256':hashlib.sha256(clip.read_bytes()).hexdigest()})
 src.unlink()
(OUT/'video/encoding-checks.json').write_text(json.dumps(reports,indent=2)+'\n');print('PASS: both normal-match recordings encoded with native dimensions, fps and duration preserved')
