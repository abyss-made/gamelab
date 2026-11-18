"""Reuse installed Linux Chromium/FFmpeg for both repository and Python Playwright.
Cloud-only setup: creates temporary cache links, installs no packages, changes no app files.
"""
from pathlib import Path
import os, subprocess, json
import playwright
ROOT=Path(__file__).resolve().parents[2]
CACHE=Path(os.environ.get('PLAYWRIGHT_BROWSERS_PATH','/tmp/pg42-browsers'))
for binary in ['/usr/bin/chromium','/usr/bin/ffmpeg']:
    if not Path(binary).exists():raise SystemExit('This helper needs existing Linux Chromium and FFmpeg; otherwise install Playwright browsers normally.')
node_registry=json.loads(subprocess.check_output(['node','-e',"const fs=require('fs'),p=require('path');process.stdout.write(fs.readFileSync(p.join(p.dirname(require.resolve('playwright-core/package.json')),'browsers.json'),'utf8'))"],cwd=ROOT/'node-server',text=True))
python_registry=json.loads((Path(playwright.__file__).parent/'driver/package/browsers.json').read_text())
links=[]
for registry in [node_registry,python_registry]:
    for b in registry['browsers']:
        rev=b['revision']
        entry={'chromium':(f'chromium-{rev}/chrome-linux64/chrome','/usr/bin/chromium'),'chromium-headless-shell':(f'chromium_headless_shell-{rev}/chrome-headless-shell-linux64/chrome-headless-shell','/usr/bin/chromium'),'ffmpeg':(f'ffmpeg-{rev}/ffmpeg-linux','/usr/bin/ffmpeg')}.get(b['name'])
        if not entry:continue
        file=CACHE/entry[0];file.parent.mkdir(parents=True,exist_ok=True)
        if file.is_symlink() and not file.exists():file.unlink()
        if not file.exists():file.symlink_to(entry[1])
        links.append(str(file))
print(json.dumps({'cache':str(CACHE),'availableExecutables':sorted(set(links))},indent=2))
