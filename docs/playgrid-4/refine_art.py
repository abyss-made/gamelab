"""Deterministic material pass over all existing character bases; IDs/anatomy/config stay compatible."""
from pathlib import Path
import xml.etree.ElementTree as E,copy,json
R=Path(__file__).resolve().parents[2];P=R/'node-server/public/assets/avatars';N='{http://www.w3.org/2000/svg}';E.register_namespace('','http://www.w3.org/2000/svg')
cat=json.loads((P/'catalog.json').read_text());colors={'lime':'#b7ff04','cyan':'#62d5ee','violet':'#b49aee','amber':'#f2b16b','rose':'#e7a2bc','mint':'#a4dba8'}
for c in cat['characters']:
 f=P/'characters'/Path(c['asset']).name;root=E.parse(f).getroot();cid=c['id'];defs=root.find(N+'defs')
 if root.get('data-art-revision')!='4':
  face=root.find('.//*[@data-layer="face"]');clip=E.SubElement(defs,N+'clipPath',{'id':cid+'-v4-face'})
  for e in face:
   if e.tag in [N+'path',N+'ellipse',N+'circle',N+'rect']:
    shape=copy.deepcopy(e);shape.set('fill','white');shape.set('stroke','none');clip.append(shape)
  light=E.SubElement(defs,N+'linearGradient',{'id':cid+'-v4-light','x1':'0','y1':'0','x2':'1','y2':'1'})
  for offset,color,alpha in [('0','#ffd3a0','.25'),('.45','#fff6df','0'),('1','#7653bb','.28')]:E.SubElement(light,N+'stop',{'offset':offset,'stop-color':color,'stop-opacity':alpha})
  marks=root.find('.//*[@data-layer="markings"]');g=E.SubElement(marks,N+'g',{'clip-path':f'url(#{cid}-v4-face)','data-material-pass':'4'})
  E.SubElement(g,N+'rect',{'x':'35','y':'35','width':'190','height':'180','fill':f'url(#{cid}-v4-light)'})
  E.SubElement(g,N+'path',{'d':'M67 105Q57 147 88 174L105 188Q72 171 64 147Z','fill':'#26364c','opacity':'.12'})
  E.SubElement(g,N+'path',{'d':'M78 91Q101 70 126 72L115 78Q93 79 78 95Z','fill':'#fff3d6','opacity':'.2'})
  root.set('data-art-revision','4');E.ElementTree(root).write(f,encoding='unicode')
 # Ember is intentionally separated from the original Home Gamer, which used the same default face.
 if cid=='a01':
  c['defaultLook'].update({'palette':'amber','glasses':'none','expression':'focused'})
  hair=root.find('.//*[@id="a01-hair"]')
  for stop,color in zip(hair,['#c96838','#783724','#30202a']):stop.set('stop-color',color)
  cloth=root.find('.//*[@id="a01-cloth"]')
  for stop,color in zip(cloth,['#554039','#292531','#141d2a']):stop.set('stop-color',color)
  E.ElementTree(root).write(f,encoding='unicode')
 preview=copy.deepcopy(root);look=c['defaultLook'];preview.set('style','--accent:'+colors[look['palette']]);preview.set('data-expression',look['expression']);preview.set('data-eye-style',look['eyes']);preview.set('data-detail',look['detail'])
 for slot in ['hat','glasses','accessory']:
  target=preview.find('.//*[@data-layer="'+slot+'"]');target.clear();target.set('data-layer',slot);item=look[slot]
  if item!='none':
   anchor=c['anchors']['scarf' if item=='scarf' else slot];E.SubElement(target,N+'use',{'href':'#'+cid+'-'+('round-glasses' if item=='round' else item),**{k:str(anchor[k]) for k in ['x','y','width','height']}})
 E.ElementTree(preview).write(P/'previews'/(cid+'.svg'),encoding='unicode')
(P/'catalog.json').write_text(json.dumps(cat,indent=2)+'\n')
print('35 compatible source/previews refined; no character IDs or options removed.')
