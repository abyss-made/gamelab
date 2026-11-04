from pathlib import Path
import zipfile,hashlib,json
P=Path(__file__).resolve().parent;R=P.parents[1];out=P/'playgrid-61-design.zip';files=sorted(f for f in P.rglob('*') if f.is_file() and f.suffix!='.zip' and f.name!='PACKAGE.json' and '__pycache__' not in f.parts)
canonical=[R/'node-server/public'/p for p in ['favicon.svg','assets/hero-mascots.png','assets/player-portraits.png','assets/fonts/inter-variable.ttf','assets/fonts/OFL.txt']]
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in files+canonical:z.write(f,f.relative_to(R))
 z.writestr('OPEN-PREVIEW.txt','Serve this extracted folder: python3 -m http.server 8765 --bind 127.0.0.1\nOpen http://127.0.0.1:8765/design/playgrid-61/\nDesign-only preview; no production game/server code included.\nRebuilding fixtures requires the full repository; generated fixtures are already included.\nRead CLAUDE-HANDOFF.md and VALIDATION.md before integration.\n')
with zipfile.ZipFile(out) as z:assert z.testzip() is None
(P/'PACKAGE.json').write_text(json.dumps({'archive':out.name,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'designFiles':len(files),'canonicalAssets':5,'productionCodeIncluded':False,'baseCount':{'additionalRefined':32,'homeFoundationStudies':3},'screenshotCount':len(list((P/'screenshots').glob('*.png')))},indent=2)+'\n');print('Archive integrity passed;',round(out.stat().st_size/1024**2,2),'MiB.')
