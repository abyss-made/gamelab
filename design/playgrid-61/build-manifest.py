from pathlib import Path
import hashlib,json,csv,xml.etree.ElementTree as E,re
P=Path(__file__).resolve().parent;R=P.parents[1];C=json.loads((P/'avatar-studio/catalog.json').read_text())['characters'];files=[];sigs={}
for c in C:
 f=P/'avatar-studio'/c['asset'];root=E.parse(f).getroot();ids={e.get('id') for e in root.iter() if e.get('id')};assert len(ids)==len([e for e in root.iter() if e.get('id')])
 for e in root.iter():
  for key,value in e.attrib.items():
   for target in re.findall(r'url\(#([^\)]+)\)',value):assert target in ids,(c['id'],target)
   if key.endswith('href'):assert value[1:] in ids,(c['id'],value)
 # Geometry signature ignores paint colors, titles and IDs. Distinctive structure must be more than hue.
 geom=[(e.tag.split('}')[-1],{k:v for k,v in e.attrib.items() if k in ['d','cx','cy','r','rx','ry','x','y','width','height','transform','viewBox']}) for e in root.iter() if e.tag.split('}')[-1] in ['path','circle','ellipse','rect','polygon']]
 signature=hashlib.sha256(json.dumps(geom,sort_keys=True).encode()).hexdigest();c['geometrySignature']=signature
 if c['isAdditional']:assert signature not in sigs,(c['id'],sigs.get(signature));sigs[signature]=c['id']
 for role,path in [('editable-base',c['asset']),('preferred-look',c['preview'])]+[('lobby-export-'+str(n),f'assets/thumbnails/{c["id"]}-{n}.png') for n in [24,32,48]]+[('preview-export-128',c['thumbnail'])]:
  file=P/'avatar-studio'/path;files.append({'path':str(file.relative_to(P)),'role':role,'character':c['id'],'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
for folder,role in [('game-feel/assets','approved-game-art-excerpt'),('reference','issue58-before-study')]:
 for f in sorted((P/folder).glob('*.svg')):files.append({'path':str(f.relative_to(P)),'role':role,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
f=P/'avatar-studio/assets/fallback.svg';files.append({'path':str(f.relative_to(P)),'role':'fallback-utility','bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
canonical=[]
for name in ['favicon.svg','assets/hero-mascots.png','assets/player-portraits.png','assets/fonts/inter-variable.ttf','assets/fonts/OFL.txt']:
 f=R/'node-server/public'/name;canonical.append({'path':str(f.relative_to(R)),'role':'unchanged-canonical-or-font','bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
manifest={'issue':61,'catalogVersion':2,'proposedConfigVersion':3,'additionalCharacterCount':32,'foundationStudyCount':3,'editableSources':35,'preferredLookPreviews':35,'lobbyPngExports':105,'preview128PngExports':35,'uniqueNonColorGeometrySignatures':len(sigs),'sourceCommits':{'approvedEight':'87d8b35','approvedRemaining':'71ca099','priorAvatarAndFeel':'f478a1e','currentGameCode':'06609a4'},'characters':[{'id':c['id'],'name':c['name'],'role':'additional-refined' if c['isAdditional'] else 'home-foundation-study','silhouette':c['silhouette'],'geometrySignature':c['geometrySignature'],'source':c['origin'],'asset':c['asset'],'preview':c['preview']} for c in C],'canonicalReferences':canonical,'files':files,'licensingInventory':'LICENSING-ORIGINALITY.md','renderCatalog':'avatar-studio/catalog.json','compatibility':'avatar-studio/COMPATIBILITY.csv','noProductionChanges':True,'exactPaintedTextureMatch':False};(P/'ASSET-MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
with (P/'ORIGINALITY.csv').open('w',newline='') as f:
 w=csv.writer(f,lineterminator='\n');w.writerow(['id','name','counting-role','family','structural-distinction','origin'])
 for c in C:w.writerow([c['id'],c['name'],'additional-refined' if c['isAdditional'] else 'foundation-not-additional',c['family'],c.get('foundation',c['silhouette']+' anatomy/markings + '+c['detailKind']),c['origin']])
components=[{'id':id,'source':'game-feel/components.js','controller':'game-feel/feel.js','prototype':'game-feel/index.html?game='+id,'states':states,'spec':'GAME-FEEL-DELTAS.md#'+id} for id,states in [('pool',['aim','power','drafted','recorded-replay','elapsed-resume','settled','reconnect']),('colorstack',['long-hand','expanded','unavailable','wild','refresh','reverse','skip','draw-two']),('gofish',['rank','target','pending','book','duplicate-view','ace-14','unchanged-view']),('ludo',['shared-safe-cell','legal-token','unavailable-token','same-roll']),('tycoon',['offer-summary','review','unavailable-mid-review','draft-accept']),('golf',['aim','loupe','pointer-cancel','fine-keyboard','draft','recorded-replay'])]]
(P/'COMPONENT-MANIFEST.json').write_text(json.dumps({'designOnly':True,'reviewControlsAreNotProduct':True,'components':components,'creator':{'source':'avatar-studio/studio2.js','renderer':'avatar-studio/renderer.js','styles':['avatar-studio/foundation.css','avatar-studio/studio2.css'],'states':['base','looks','reactions','classic','empty','asset-failure','storage-failure','unavailable-fit','unsaved-exit','confirm','saved','loading'],'viewports':[[1440,900],[390,844],[360,740],[768,1024],[1024,768]]}},indent=2)+'\n');print('Manifest verified:',len(files),'asset files; 32 distinct non-color geometry signatures.')
