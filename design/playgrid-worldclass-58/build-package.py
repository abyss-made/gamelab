"""Review archive. Only design sources + exact minimal existing brand assets; no production code."""
from pathlib import Path
import zipfile,hashlib,json
P=Path(__file__).resolve().parent;R=P.parents[1];archive=P/'playgrid-issue-58-design.zip'
files=sorted(f for f in P.rglob('*') if f.is_file() and f.suffix!='.zip' and '__pycache__' not in f.parts and f.name not in ['PACKAGE.json'])
assets=[R/'node-server/public'/name for name in ['favicon.svg','assets/hero-mascots.png','assets/player-portraits.png','assets/fonts/inter-variable.ttf','assets/fonts/OFL.txt']]
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in files+assets:z.write(f,f.relative_to(R))
 z.writestr('OPEN-PREVIEW.txt','Serve this extracted directory: python3 -m http.server 8765 --bind 127.0.0.1\nOpen http://127.0.0.1:8765/design/playgrid-worldclass-58/\nDesign preview only; no production game/server source is included.\nRead HANDOFF.md and VALIDATION.md before implementation.\n')
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
(P/'PACKAGE.json').write_text(json.dumps({'archive':archive.name,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'previewRoot':'design/playgrid-worldclass-58/index.html','designFiles':len(files),'canonicalAssets':5,'productionCodeIncluded':False},indent=2)+'\n')
print(archive.name,round(archive.stat().st_size/1024**2,2),'MiB; archive integrity passed.')
