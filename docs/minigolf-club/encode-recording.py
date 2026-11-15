"""Compress the actual full-course browser recording, preserving frames/dimensions/timing."""
from pathlib import Path
import subprocess,json,hashlib
ROOT=Path(__file__).resolve().parent;src=ROOT/'video/full-course.webm';dest=ROOT/'video/full-course.mp4'
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,width,height,r_frame_rate','-of','json',str(p)],text=True))
before=probe(src);original_sha=hashlib.sha256(src.read_bytes()).hexdigest()
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-map','0:v:0','-c:v','libx264','-preset','veryfast','-crf','28','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(dest)],check=True)
after=probe(dest);a,b=before['streams'][0],after['streams'][0];assert (a['width'],a['height'],a['r_frame_rate'])==(b['width'],b['height'],b['r_frame_rate']);assert abs(float(before['format']['duration'])-float(after['format']['duration']))<.1
report={'file':dest.name,'originalFile':src.name,'originalSha256':original_sha,'originalProbe':before,'publishedProbe':after,'publishedSha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'transformation':'Codec compression only; native dimensions, frame rate and duration preserved; no gameplay or image edits'}
(ROOT/'video/full-course-encoding.json').write_text(json.dumps(report,indent=2)+'\n');src.unlink()
for name in ['SCREENSHOTS.md','index.html']:
 p=ROOT/name;s=p.read_text().replace('video/full-course.webm','video/full-course.mp4');p.write_text(s)
print('PASS: full-course recording encoded to H.264 without changing native dimensions, frame rate or duration')
