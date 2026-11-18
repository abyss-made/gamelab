"""Retry only programs blocked by missing browser executables, preserving original evidence.
Run after test-suite.py finishes. Functional test failures are never classified as setup failures.
"""
from pathlib import Path
import subprocess, os, json, shlex, time, shutil, sys
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent/'test-results'
results=json.loads((OUT/'suite.json').read_text())
assert len(results)==38,'Complete the initial package suite before retrying startup failures'
bad=lambda r:r['exitCode']!=0 or r['failLines'] or r['skipLines'] or r['startupError']
functional=[r for r in results if bad(r) and not r['startupError']]
if functional:raise SystemExit('Inspect functional failures first: '+', '.join(r['program'] for r in functional))
blocked=[r for r in results if r['startupError']]
if not blocked:print('No browser startup failures to retry');sys.exit(0)
for r in blocked:
    content=(OUT/(r['program']+'.log')).read_text()
    if "Executable doesn't exist" not in content and 'listen EADDRINUSE' not in content:raise SystemExit('Inspect unrelated startup failure: '+r['program'])
archive=OUT/'setup-attempt';archive.mkdir(exist_ok=True)
assert not (archive/'suite.json').exists(),'Preserve the existing retry history; do not overwrite it'
shutil.copy2(OUT/'suite.json',archive/'suite.json')
for r in blocked:shutil.copy2(OUT/(r['program']+'.log'),archive/(r['program']+'.log'))
with (archive/'cache-setup.json').open('w') as setup:
    subprocess.run(['python',str(Path(__file__).with_name('prepare-cloud-browser.py'))],cwd=ROOT,check=True,stdout=setup)
commands=json.loads((ROOT/'node-server/package.json').read_text())['scripts']['test'].split(' && ')
by_name={Path(shlex.split(c)[1]).stem:shlex.split(c) for c in commands};retries=[]
for r in blocked:
    name=r['program'];start=time.monotonic();print('RETRY browser startup',name,flush=True)
    with (OUT/(name+'.log')).open('w') as log:run=subprocess.run(by_name[name],cwd=ROOT/'node-server',env=os.environ,stdout=log,stderr=subprocess.STDOUT)
    content=(OUT/(name+'.log')).read_text();new={'program':name,'exitCode':run.returncode,'seconds':round(time.monotonic()-start,2),'passLines':sum(l.startswith('PASS') for l in content.splitlines()),'failLines':sum(l.startswith('FAIL') for l in content.splitlines()),'startupError':"Executable doesn't exist" in content or 'listen EADDRINUSE' in content,'skipLines':sum(l.startswith('SKIP') for l in content.splitlines()),'attempt':2,'setupRetry':True}
    results[results.index(r)]=new;retries.append(new);(OUT/'suite.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(new),flush=True)
(OUT/'setup-retry.json').write_text(json.dumps({'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'reason':'Cloud restart removed browser cache links; repository and Python Playwright require different revisions. Aborted startup tests also left local test servers occupying shared test ports; confirmed orphan servers were drained before retrying. No production source changed for these retries.','initialBlockedPrograms':[r['program'] for r in blocked],'retries':retries,'archive':'setup-attempt/'},indent=2)+'\n')
assert all(not bad(r) for r in results),'A retry failed; inspect the retained logs'
print('ALL 38 programs have passing final records; initial startup failures retained separately',flush=True)
