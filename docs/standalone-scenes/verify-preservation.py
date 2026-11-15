"""Check preserved git objects, original scene asset integrity, and JavaScript syntax."""
from pathlib import Path
from PIL import Image
import subprocess, json, hashlib, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / 'test-results'
OUT.mkdir(exist_ok=True)
def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()
base = '8846f1514b2bbb8e807ba1b3954e136327b27fa4'
paths = ['node-server/server', 'node-server/server/data',
         'node-server/public/js/main.js', 'node-server/public/js/avatar.js',
         'node-server/public/js/games/drawguess.js', 'node-server/public/js/games/fourrow.js',
         'node-server/package.json', 'node-server/package-lock.json']
checks = [{'path': p, 'identical': git('rev-parse', base+':'+p) == git('rev-parse', 'HEAD:'+p)} for p in paths]
assert all(c['identical'] for c in checks), checks
preservation = {'baseline': base, 'sourceCommit': git('rev-parse', 'HEAD'), 'checks': checks}
(OUT/'preservation.json').write_text(json.dumps(preservation, indent=2)+'\n')
assets = []
for p in sorted((ROOT/'node-server/public/assets/scenes').iterdir()):
    r = {'file': p.name, 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
    if p.suffix == '.png':
        with Image.open(p) as im:
            im.verify()
        with Image.open(p) as im:
            r.update(width=im.width, height=im.height, mode=im.mode)
    elif p.suffix == '.svg':
        ET.parse(p)
    else:
        raise AssertionError(p)
    assets.append(r)
assert len(assets) == 57, len(assets)
syntax = []
for p in sorted((ROOT/'node-server/public/js/games').glob('*.js')):
    subprocess.run(['node', '--check', str(p)], check=True, capture_output=True)
    syntax.append(str(p.relative_to(ROOT)))
(OUT/'assets.json').write_text(json.dumps({'assets': assets, 'syntaxPassed': syntax}, indent=2)+'\n')
print(f'PASS: {len(checks)} preserved objects, {len(assets)} valid scene assets, {len(syntax)} JavaScript modules')
