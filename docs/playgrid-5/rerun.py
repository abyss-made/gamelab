"""Repeat initial programs blocked by a missing local Chromium executable; retain both logs."""
from pathlib import Path
import subprocess,os,json,time,sys
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent/'test-results'
results=json.loads((OUT/'reruns.json').read_text()) if (OUT/'reruns.json').exists() else []
for name in sys.argv[1:] or ['avatarui','ui','phase15','batch2ui','batch1ui','batch3ui','batch4ui']:
 start=time.monotonic()
 with (OUT/(name+'-rerun.log')).open('w') as f:r=subprocess.run(['node','test/'+name+'.js'],cwd=ROOT/'node-server',env=os.environ,stdout=f,stderr=subprocess.STDOUT)
 content=(OUT/(name+'-rerun.log')).read_text();item={'program':name,'exitCode':r.returncode,'seconds':round(time.monotonic()-start,2),'passLines':sum(x.startswith('PASS') for x in content.splitlines()),'failLines':sum(x.startswith('FAIL') for x in content.splitlines()),'startupError': 'listen EADDRINUSE' in content or "Executable doesn't exist" in content,'skipLines':sum(x.startswith('SKIP') for x in content.splitlines())};results=[x for x in results if x['program']!=name];results.append(item);print(item,flush=True);(OUT/'reruns.json').write_text(json.dumps(results,indent=2)+'\n')
