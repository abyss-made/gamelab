"""Issue 61: refine the existing 32 authored bases; add three home-family foundation studies.
No raster/image-only substitutes or external/paid generation. Does not modify Issue 58 assets.
"""
from pathlib import Path
import json,copy,xml.etree.ElementTree as E,csv
P=Path(__file__).resolve().parent;OLD=P.parent/'playgrid-worldclass-58/avatar-studio';OUT=P/'avatar-studio';A=OUT/'assets/characters';A.mkdir(parents=True,exist_ok=True);(OUT/'assets/previews').mkdir(parents=True,exist_ok=True)
N='{http://www.w3.org/2000/svg}';E.register_namespace('','http://www.w3.org/2000/svg');catalog=json.loads((OLD/'catalog.json').read_text());characters=copy.deepcopy(catalog['characters']);INK='#101421'
def path(d,fill='none',stroke=INK,width=3):return E.fromstring(f'<path xmlns="http://www.w3.org/2000/svg" d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round" stroke-linecap="round"/>')
def layer(root,n):return root.find(f'{N}g[@data-layer="{n}"]')
def clear(e):
 for x in list(e):e.remove(x)
roots={}
for c in characters:
 root=E.parse(OLD/c['asset']).getroot();cid=c['id'];root.set('data-detail','signature');root.set('data-eye-style','default');c['revision']=2;c['origin']='Issue 58 original base, refined in Issue 61';c['isAdditional']=True
 # Additional anatomy pass: fox/dog/panda/raccoon and visor silhouettes are not palette clones.
 if cid in ['a09','a12','a13','a17','a19']:
  hb=layer(root,'head-back');clear(hb)
  if cid=='a09':
   hb.append(path('M59 103Q36 65 47 22Q76 29 102 70L157 67Q187 21 216 26L201 109Z','#cf834e',INK,5));hb.append(path('M57 72 55 39q23 11 32 36m88-2q12-26 30-32l-10 38','#e9a0a0',INK,2))
  elif cid=='a12':
   hb.append(path('M60 110 51 31Q76 24 104 69L154 67Q180 26 206 28L200 117Z','#8c9bad',INK,5));hb.append(path('M65 77 62 44 90 75M170 76l25-32-4 39','#e7d4cf',INK,2))
  elif cid=='a13':
   hb.append(path('M66 102Q51 69 64 42Q88 48 106 78L154 78Q172 48 194 47Q206 76 190 107Z','#ca9567',INK,5));hb.append(path('M73 74 73 55 92 78m73 0 18-21-1 22','#d89391',INK,2))
  else:
   fur='#bc7562' if cid=='a17' else '#999ca7';cream='#f8e4c8' if cid=='a17' else '#dfdfd7'
   for x in [68,190]:
    E.SubElement(hb,N+'circle',{'cx':str(x),'cy':'66','r':'25' if cid=='a17' else '21','fill':fur,'stroke':INK,'stroke-width':'4'});E.SubElement(hb,N+'circle',{'cx':str(x),'cy':'66','r':'15' if cid=='a17' else '11','fill':cream})
 if cid=='a22':
  face=layer(root,'face');list(face)[1].set('d','M66 91Q126 72 193 91L192 130Q172 151 131 152Q85 153 64 132Z');layer(root,'head-back').append(path('M53 95 37 100v36l19 8m145-49 18 6v34l-19 9','#7087a0',INK,3));c['silhouette']='wide-visor'
 if cid=='a27':layer(root,'head-back').append(path('M75 78Q48 54 60 23Q71 48 101 60M154 60q29-16 43-40 8 37-20 58','#d6c89d',INK,4))
 if c['family']=='animal' and c['silhouette']!='owl':
  m=layer(root,'mouth');curves=[x for x in list(m) if x.tag==N+'path']
  if len(curves)>1:
   m.remove(curves[1]);smile=E.SubElement(m,N+'g',{'class':'mouth-smile'});smile.append(curves[1]);sad=E.SubElement(m,N+'g',{'class':'mouth-sad'});sad.append(path('M112 165q16-13 32-1',stroke=INK,width=2.6));surprise=E.SubElement(m,N+'g',{'class':'mouth-surprise'});E.SubElement(surprise,N+'ellipse',{'cx':'128','cy':'165','rx':'7','ry':'9','fill':'#854e57','stroke':INK,'stroke-width':'2'})
 if c['family']=='robot':
  for e in layer(root,'mouth').iter():
   if e.get('d')=='M115 160h25':e.set('stroke','var(--accent)')
 # Retain actual anatomy/identity and module anchors; reduce sugary sparkle/oversized eye treatment.
 if c['family'] in ['human','animal','fantasy']:
  for group in layer(root,'eyes'):
   if group.get('class')=='eyes-normal':group.set('transform','translate(0 23) scale(1 .81)')
 if c['family']=='human':
  hair=root.find(f'.//*[@id="{cid}-hair"]');hair[0].set('stop-color','#3d3a4c');hair[1].set('stop-color',c['id'] in ['a01','a02','a04','a07'] and '#191b2b' or hair[1].get('stop-color'))
  smile=layer(root,'mouth').find(f'{N}g[@class="mouth-smile"]');clear(smile);smile.append(path('M109 156Q132 168 155 151Q143 175 120 167Z','#fff1df',INK,2.6));smile.append(path('M115 162q18 8 29-1',stroke='#d0a38f',width=1))
  layer(root,'markings').append(path('M80 101Q74 132 82 151L96 170Q80 158 75 143Z','#bd667829','none',0))
 # Joy has a real smiling mouth, not the surprised O reused in the earlier source.
 if c['silhouette'] not in ['owl','griffin']:
  joy=E.SubElement(layer(root,'mouth'),N+'g',{'class':'mouth-joy'})
  if c['family']=='robot':joy.append(path('M110 149q18 26 37 0',stroke='var(--accent)',width=4))
  else:
   joy.append(path('M109 154Q128 166 151 152Q144 180 128 179Q115 177 109 154Z','#713e4b',INK,2.5));joy.append(path('M113 157q18 10 33-1l-4 8q-15 6-26-1Z','#fff3dc','none',0));joy.append(path('M122 176q8-7 16-1','#cf9293','none',0))
 root.find(N+'style').text+='.mouth-joy{display:none}svg[data-expression="joy"] .mouth-surprise{display:none}svg[data-expression="joy"] .mouth-joy{display:inline}'
 rim=layer(root,'rim-light');rim.append(path('M59 87Q48 120 62 149',stroke='#f6bc6d',width=2.3));rim.append(path('M196 84q13 32 1 69',stroke='#8e53fa',width=3))
 detail=E.SubElement(root,N+'g',{'id':cid+'-detail','data-layer':'detail'})
 if c['family']=='robot':
  detail.append(path('M103 212h25m6 0h14',stroke='var(--accent)',width=3));detail.append(path('M70 171l8 4m105-3-7 5',stroke='#eff6eb',width=2));kind='panel-marks'
 elif c['family']=='human':
  detail.append(path('M87 224l7 7 7-7m61 8 6 8 6-8',stroke='#9ca2b3',width=1.2));kind='hoodie-stitch'
 else:
  detail.append(path('M109 210l8-7 8 7-8 8Z','var(--accent)',INK,1.4));detail.append(path('M130 209l5-4 5 4-5 5Z','#e4e1c0',INK,1));kind='scarf-pin'
 if c['id'] in ['a15','a16','a18']:c['compatibility']['hat']=['none','crown'];c['compatibility']['accessory']=['none','scarf']
 c['detailKind']=kind;c['layers'].append('detail');c['compatibility']['detail']=['signature','clean'];c['defaultLook']={'palette':'lime' if c['family']=='robot' else ['lime','cyan','violet','amber','rose','mint'][(int(cid[1:])-1)%6],'expression':'smile','eyes':'default','hat':'none','glasses':'sunglasses' if cid in ['a01','a09','a10'] else 'none','accessory':'none','detail':'signature'}
 c['fallback']={'e':0 if c['family']=='human' else 2 if c['family']=='animal' else 3,'c':3}
 roots[cid]=root
# Foundation studies use the SAME visual vocabulary and actual three home archetypes, not three more "new characters".
for cid,old,name,description in [('h01','a01','Home Gamer','swept dark hair, angled sunglasses, asymmetric smile, navy hoodie'),('h02','a21','Home Robot','rounded white shell, glass face, lime eyes, pill-shaped chest light'),('h03','a10','Home Cat','orange-and-cream ears, dark sunglasses, lime bandana')]:
 c=copy.deepcopy(next(x for x in characters if x['id']==old));root=copy.deepcopy(roots[old]);raw=E.tostring(root,encoding='unicode').replace(old+'-',cid+'-').replace('data-character="'+old+'"','data-character="'+cid+'"');root=E.fromstring(raw);c.update(id=cid,name=name,isAdditional=False,origin='Issue 61 editable foundation study of owner-supplied home family',foundation=description,silhouette='home-'+c['silhouette']);c['defaultLook'].update(palette='lime',glasses='none' if cid=='h02' else 'sunglasses');root.find(N+'title').text=name+' · editable home-family foundation study'
 if cid=='h01':
  clear(layer(root,'hair-front'));layer(root,'hair-front').append(path('M45 106Q31 72 57 52L42 34Q69 45 88 31Q119 16 147 35L165 25Q164 37 182 42Q218 52 214 92L229 101 203 111 206 132 180 115Q162 98 155 67L134 103 111 115 115 88Q93 116 53 131L60 110Z','url(#h01-hair)',INK,4));layer(root,'hair-front').append(path('M47 99Q47 62 88 43L61 47 54 56M88 43q36-20 62-6',stroke='#ffc57c',width=2.7));layer(root,'hair-front').append(path('M162 41q43 12 47 43l11 13-24-10',stroke='#8c56f7',width=3));c['anchors']['glasses']['y']=104
 if cid=='h02':
  face=layer(root,'face');face.append(path('M69 78Q73 57 107 53l15 3Q91 60 81 81Z','#ffffffc4','none',0));layer(root,'body').append(path('M104 213h42q9 0 9 8t-9 8h-42q-9 0-9-8t9-8Z','var(--accent)',INK,3));c['compatibility']['hat']=['none','crown'];c['compatibility']['accessory']=['none','scarf']
 if cid=='h03':
  g=root.find(f'.//*[@id="{cid}-skin"]');g[0].set('stop-color','#fff0d1');g[1].set('stop-color','#f3be88');g[2].set('stop-color','#c88862')
  for e in layer(root,'head-back').iter():
   if e.get('fill')=='#e5c5a0':e.set('fill','#eab783')
  # Main calico patches become warm orange home-cat markings, never a recolor counted as a fourth character.
  for e in layer(root,'markings').iter():
   if e.get('fill')=='#4b4c60':e.set('fill','#e9ac78')
  c['anchors']['glasses']['y']=103
 c['layers']=list(dict.fromkeys(c['layers']));characters.insert(len([x for x in characters if not x['isAdditional']]),c);roots[cid]=root
for c in characters:
 cid=c['id'];root=roots[cid];root.set('data-character',cid);root.set('style','--accent:#b7ff04');root.set('data-detail','signature');style=root.find(N+'style');style.text+='svg[data-detail="clean"] [data-layer="detail"]{display:none}';
 # Unique stable IDs including layers, safe to prefix again per inline instance.
 for e in root.iter():
  if e.get('id','').startswith('layer-'):e.set('id',cid+'-'+e.get('id'))
 filename=cid+'-'+c['name'].lower().replace(' ','-')+'.svg';c['asset']='assets/characters/'+filename;c['thumbnail']='assets/thumbnails/'+cid+'-128.png';c['lobbyThumbnails']={str(n):'assets/thumbnails/'+cid+'-'+str(n)+'.png' for n in [24,32,48]}
 # Round, glossy home-family sunglasses; no raster replacement for the modular accessory.
 symbol=root.find(f'.//*[@id="{cid}-sunglasses"]');clear(symbol)
 symbol.append(path('M6 12Q26 3 55 12L60 19 55 35Q50 49 32 48Q14 48 10 32Z M81 12Q108 3 135 12L131 34Q124 50 106 48Q88 46 84 32L78 19Z',f'url(#{cid}-lens)',INK,4.5))
 symbol.append(path('M57 17q12-9 24 0M7 15l-8-3m134 3 8-3',stroke=INK,width=5))
 symbol.append(path('M16 14q12-5 26-2L18 33Q13 26 16 14Z M91 14q13-5 26-2L93 31Q88 25 91 14Z','#e7e6ef88','none',0))
 symbol.append(path('M19 40q13 9 29 0m48 0q12 9 27-1',stroke='#7b78934d',width=1.4))
 E.ElementTree(root).write(A/filename,encoding='unicode')
 preview=copy.deepcopy(root);look=c['defaultLook'];preview.set('style','--accent:'+{'lime':'#b7ff04','cyan':'#62d5ee','violet':'#b49aee','amber':'#f2b16b','rose':'#e7a2bc','mint':'#a4dba8'}[look['palette']]);preview.set('data-expression',look['expression']);preview.set('data-eye-style',look['eyes']);preview.set('data-detail',look['detail'])
 for slot in ['hat','glasses','accessory']:
  item=look[slot]
  if item=='none':continue
  anchor=c['anchors']['scarf' if item=='scarf' else slot];E.SubElement(layer(preview,slot),N+'use',{'href':'#'+cid+'-'+('round-glasses' if item=='round' else item),**{k:str(anchor[k]) for k in ['x','y','width','height']}})
 c['preview']='assets/previews/'+cid+'.svg';E.ElementTree(preview).write(OUT/c['preview'],encoding='unicode')
(OUT/'catalog.json').write_text(json.dumps({'catalogVersion':2,'schemaVersion':3,'canonical':'../../../node-server/public/assets/hero-mascots.png','additionalCharacters':32,'foundationStudies':3,'globalConflicts':[{'hat':'not-none','accessory':'headphones','resolution':'keep-hat-reset-accessory'}],'characters':characters},indent=2)+'\n')
with (OUT/'COMPATIBILITY.csv').open('w',newline='') as f:
 w=csv.writer(f,lineterminator='\n');w.writerow(['id','name','counting','hat','glasses','accessory','expression','eyes','detail'])
 for c in characters:w.writerow([c['id'],c['name'],'additional' if c['isAdditional'] else 'foundation-study']+[','.join(c['compatibility'][k]) for k in ['hat','glasses','accessory','expression','eyes','detail']])
print('32 refined additional bases + 3 home-family foundation studies. No palette variants counted as characters.')
