"""Run every package.json test program and retain per-program exit codes, including failures."""
from pathlib import Path
import subprocess,json,os,shlex,sys,time
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent/'test-results';OUT.mkdir(exist_ok=True)
commands=json.loads((ROOT/'node-server/package.json').read_text())['scripts']['test'].split(' && ')
results=[]
for command in commands:
 name=Path(shlex.split(command)[1]).stem
 start=time.monotonic();print('RUN',name,flush=True)
 with (OUT/(name+'.log')).open('w') as log:
  run=subprocess.run(shlex.split(command),cwd=ROOT/'node-server',env=os.environ,stdout=log,stderr=subprocess.STDOUT)
 content=(OUT/(name+'.log')).read_text();r={'program':name,'exitCode':run.returncode,'seconds':round(time.monotonic()-start,2),'passLines':sum(x.startswith('PASS') for x in content.splitlines()),'failLines':sum(x.startswith('FAIL') for x in content.splitlines()),'skipLines':sum(x.startswith('SKIP') for x in content.splitlines())};results.append(r)
 (OUT/'suite.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(r),flush=True)
print('ALL PASS' if all(r['exitCode']==0 and r['skipLines']==0 for r in results) else 'FAILURES OR SKIPS',flush=True)
sys.exit(0 if all(r['exitCode']==0 and r['skipLines']==0 for r in results) else 1)
