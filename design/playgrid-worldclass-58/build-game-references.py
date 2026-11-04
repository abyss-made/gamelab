"""Reuse approved design compositions without creating a competing visual redesign."""
from pathlib import Path
import subprocess,json,re,shutil
P=Path(__file__).resolve().parent;R=P.parents[1]
EIGHT={'colorstack':'color-stack','pool':'pool','golf':'mini-golf','ludo':'ludo','tycoon':'property-tycoon','battleship':'battleship','gofish':'go-fish','chess':'chess'}
def approved(path):return subprocess.check_output(['git','show','87d8b35:design/playgrid-premium-games/'+path],cwd=R).decode()
def absolute_css(s):return s.replace("../../node-server/public/","/node-server/public/").replace("../../../node-server/public/","/node-server/public/")
for name in ['shared.css','revision.css']:(P/'reference/eight'/name).write_text(absolute_css(approved(name)))
assets=subprocess.check_output(['git','ls-tree','-r','--name-only','87d8b35','design/playgrid-premium-games/assets'],cwd=R).decode().splitlines()
for f in assets:
 if f.endswith('.svg'):(P/'reference/eight/assets'/Path(f).name).write_bytes(subprocess.check_output(['git','show','87d8b35:'+f],cwd=R))
rest=R/'design/playgrid-premium-rest'
for name in ['shared.css','state.css','state-preview.js']:
 s=(rest/name).read_text();(P/'reference/rest'/name).write_text(absolute_css(s))
(P/'reference/rest/assets').mkdir(exist_ok=True)
for f in (rest/'assets').glob('*.svg'):
 if not f.name.startswith('throw-'):shutil.copyfile(f,P/'reference/rest/assets'/f.name)
# Rewrite illustration paths inside the inherited state reference controller for the new location.
f=P/'reference/rest/state-preview.js';s=f.read_text().replace('../assets/','../../reference/rest/assets/');f.write_text(s)
models=[g for g in json.loads((rest/'state-model.json').read_text()) if g['id']!='rps']
common=[('waiting','Waiting'),('active','Active / controls'),('spectator','Spectator'),('invalid','Unavailable / invalid'),('reconnect','Reconnect / resync'),('result','Result / host'),('rematch','Result / participant')]
extras={
'colorstack':[('deal','Dealing'),('opponent','Opponent turn'),('drawn','Drawn playable card / keep-pass'),('wild','Wild color choice'),('penalty','Penalty draw receipt'),('long','Long hand'),('out','Out / spectating')],
'pool':[('aim','Aiming'),('resolving','Balls in motion'),('ballinhand','Ball in hand'),('foul','Foul / next turn'),('opponent','Opponent turn'),('resign','Resign confirmation')],
'golf':[('aim','Aim and power'),('rolling','Ball rolling'),('sand','Existing sand'),('water','Existing water penalty'),('hole','Hole complete'),('scorecard','Scorecard')],
'ludo':[('roll','Waiting to roll'),('choose','Rolled six / legal choices'),('stack','Stacked tokens / safe cell'),('capture','Capture return'),('bonus','Bonus turn'),('opponent','Opponent turn')],
 'tycoon':[('roll','Roll / travel'),('auction','Auction / bid'),('rent','Rent receipt'),('build','Owned property / build'),('trade','Trade offer / review'),('debt','Debt / sell'),('bankrupt','Bankrupt / watching')],
'battleship':[('placement','Manual placement'),('random','Random & Lock meaning'),('fleet','Friendly fleet'),('hit','Hit / miss receipt'),('sunk','Public sunk receipt'),('opponent','Opponent turn'),('resign','Resign confirmation')],
'gofish':[('deal','Dealing'),('rank','Choose held rank'),('target','Choose opponent'),('locked','Ask pending'),('draw','Go Fish draw'),('book','Book complete'),('long','Long hand'),('opponent','Opponent turn')],
'chess':[('selected','Piece / legal targets'),('check','Check'),('promotion','Promotion choice'),('draw','Draw offer / response'),('resign','Resign confirmation'),('opponent','Opponent turn'),('clock','Time up')]
}
names={'colorstack':'Color Stack','pool':'Pool','golf':'Mini Golf','ludo':'Ludo','tycoon':'Property Tycoon','battleship':'Battleship','gofish':'Go Fish','chess':'Chess'}
for id,folder in EIGHT.items():models.append({'id':id,'name':names[id],'direction':'Approved premium direction · interaction extension','states':[{'id':k,'label':v,'trigger':'Illustrative fixture; see AUDIT.md for authoritative mapping','copy':v,'focus':'Stable focus and eligibility from actual game view'} for k,v in common+extras[id]]})
models=sorted(models,key=lambda g:list(EIGHT).index(g['id']) if g['id'] in EIGHT else 8+[x['id'] for x in models if x['id'] not in EIGHT].index(g['id']))
for g in models:
 id=g['id'];d=P/'games'/id;d.mkdir(exist_ok=True)
 if id in EIGHT:
  source=approved(EIGHT[id]+'/concept.html');family='eight'
  source=source.replace('../shared.css','../../reference/eight/shared.css').replace('../revision.css','../../reference/eight/revision.css').replace('../assets/','../../reference/eight/assets/')
 else:
  source=(rest/id/'concept.html').read_text();family='rest'
  source=source.replace('../shared.css','../../reference/rest/shared.css').replace('../state.css','../../reference/rest/state.css').replace('../assets/','../../reference/rest/assets/')
 source=re.sub(r'<script\b[^>]*>.*?</script>','',source,flags=re.S)
 source=source.replace('../../../node-server/public/','/node-server/public/')
 source=source.replace('<body class=',f'<body data-game="{id}" class=')
 source=source.replace('</head>','<link rel="stylesheet" href="../../feel.css"></head>')
 state_src='../../eight-states.js' if family=='eight' else '../../reference/rest/state-preview.js'
 source=source.replace('</body>',f'<script src="{state_src}"></script><script src="../../feel.js"></script></body>')
 # Template is explicitly a reused approved reference, not a new approved redesign.
 source=source.replace('Stage A creative direction','Approved composition · Issue 58 interaction preview')
 if id=='battleship':source=source.replace('alt="Destroyer"><span>Destroyer<small>3 cells','alt="Cruiser"><span>Cruiser<small>3 cells').replace('alt="Patrol boat"><span>Patrol<small>2 cells','alt="Destroyer"><span>Destroyer<small>2 cells')
 if id=='pool':source=source.replace('Drag away from the cue ball to aim','Drag on the cloth to set the aim')
 (d/'index.html').write_text(source)
(P/'games/state-model.json').write_text(json.dumps(models,indent=2)+'\n')
(P/'games.json').write_text(json.dumps([{'id':g['id'],'name':g['name'],'states':len(g['states']),'approvedSource':'87d8b35' if g['id'] in EIGHT else '71ca099'} for g in models],indent=2)+'\n')
(P/'reference/PROVENANCE.md').write_text('''# Reused approved source

Eight-game HTML/CSS/SVG reference excerpts are from codex/playgrid-premium-directions @ 87d8b35, as required by Issue #58. Twelve other approved compositions/state-reference helpers are from Issue #55 @ 71ca099, excluding RPS pages/illustrations. These are portable source excerpts so the interaction extension can be reviewed without a second checkout. They do not replace, duplicate approval of, or change the earlier creative directions. Historical shared styles/helpers may contain unused selectors; no RPS game page, state entry, artwork or new design is exposed here.

Current homepage hero/mark/portraits are reused directly from node-server/public. New files in this package do not alter those assets. Game code and server code remain unchanged.
''')
print('Reused 20 approved compositions;',sum(len(g['states']) for g in models),'major state references; no RPS entry.')
