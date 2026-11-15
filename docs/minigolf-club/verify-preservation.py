"""Read-only preservation, original-level, asset and syntax verification against the parent revision."""
from pathlib import Path
from PIL import Image
import subprocess,json,hashlib,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent/'test-results';OUT.mkdir(exist_ok=True)
BASE='b4a7e9d8960d6387a0af19519f9f2c019d83f794'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
paths=['node-server/server/index.js','node-server/server/rooms.js','node-server/server/games/physics.js','node-server/server/data','node-server/public/js/avatar.js','node-server/public/js/games/drawguess.js','node-server/public/js/games/fourrow.js','node-server/package.json','node-server/package-lock.json']
# All server files except the two deliberately changed golf modules must be identical.
server_changes=git('diff','--name-only',BASE,'HEAD','--','node-server/server').splitlines();assert set(server_changes)=={'node-server/server/games/golf.js','node-server/server/games/golfcourses.js'},server_changes
checks=[{'path':p,'identical':git('rev-parse',BASE+':'+p)==git('rev-parse','HEAD:'+p)} for p in paths];assert all(c['identical'] for c in checks)
code="""const vm=require('vm'),cp=require('child_process'),old={exports:{}};vm.runInNewContext(cp.execFileSync('git',['show',process.argv[1]+':node-server/server/games/golfcourses.js'],{encoding:'utf8'}),{module:old});const current=require('./node-server/server/games/golfcourses');const ids=['meadow','canyon','skyline','harbor','tour'];const result=ids.map(id=>({course:id,identical:JSON.stringify(old.exports.BY_ID[id])===JSON.stringify(current.BY_ID[id])}));console.log(JSON.stringify(result));"""
levels=json.loads(subprocess.check_output(['node','-e',code,BASE],cwd=ROOT,text=True));assert all(c['identical'] for c in levels)
assets=[]
for p in sorted((ROOT/'node-server/public/assets/golf-club').iterdir()):
 if p.suffix=='.png':
  with Image.open(p) as im:im.verify()
 else:ET.parse(p)
 assets.append({'file':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
assert len(assets)==6
vendor=ROOT/'node-server/public/vendor/three/three.module.min.js';assert hashlib.sha256(vendor.read_bytes()).hexdigest()=='3e690ac7d180b0aadf0891bea39eec643e29e2d3e75c99b18689518665f69ba6';assert (vendor.parent/'LICENSE').is_file()
syntax=['node-server/public/js/games/golf.js','node-server/public/js/games/golf-scene.js','node-server/public/js/main.js','node-server/public/js/rules/rules-c.js','node-server/server/games/golf.js','node-server/server/games/golfcourses.js','node-server/test/batch5.js','node-server/test/batch5ui.js','node-server/test/experience41.js']
for p in syntax:subprocess.run(['node','--check',p],cwd=ROOT,capture_output=True,check=True)
report={'baseline':BASE,'sourceCommit':git('rev-parse','HEAD'),'preserved':checks,'originalCourses':levels,'serverChanges':server_changes,'assets':assets,'threeVersion':'0.160.1','vendorChecksumVerified':True,'syntaxPassed':syntax}
(OUT/'preservation.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS: unchanged backend outside golf, all established courses/tour, original assets, vendored license/checksum and syntax')
