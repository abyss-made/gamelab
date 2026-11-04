"""Reuse approved materials/piece drawings for accurate new interaction-state fixtures."""
from pathlib import Path
import xml.etree.ElementTree as E,copy
P=Path(__file__).resolve().parent;A=P/'assets';N='{http://www.w3.org/2000/svg}';E.register_namespace('','http://www.w3.org/2000/svg')
for name in ['golf-dogleg','golf-dogleg-portrait']:
 root=E.parse(P/'reference/eight/assets'/(name+'.svg')).getroot()
 for parent in root.iter():
  for e in list(parent):
   if e.get('stroke-dasharray')=='3 7' or (e.tag==N+'circle' and e.get('cx')=='239' and e.get('cy')=='166'):parent.remove(e)
 E.ElementTree(root).write(A/(name+'-aimable.svg'),encoding='unicode')
root=E.parse(P/'reference/eight/assets/chess-walnut.svg').getroot();pieces={};base=copy.deepcopy(root)
for e in list(root):
 if e.tag==N+'svg':pieces[(round((float(e.get('x'))-26)/80),round((float(e.get('y'))-25)/80))]=e
for e in list(base):
 if e.tag==N+'svg' or e.tag==N+'circle' or (e.tag==N+'rect' and e.get('stroke')=='#d4e67b'):base.remove(e)
templates={'k':pieces[(4,0)],'r':pieces[(0,0)],'K':pieces[(4,7)],'P':pieces[(0,6)]}
# All fixture states have exactly one king per side. Check escape d1/f1 is legal; promotion starts at a7.
for name,positions in [('check',{'k':[(0,0)],'r':[(4,0)],'K':[(4,7)]}),('promotion',{'k':[(7,0)],'K':[(7,7)],'P':[(0,1)]})]:
 board=copy.deepcopy(base)
 for piece,locations in positions.items():
  for col,row in locations:
   e=copy.deepcopy(templates[piece]);e.set('x',str(26+col*80));e.set('y',str(25+row*80));board.append(e)
 if name=='check':
  E.SubElement(board,N+'rect',{'x':'340','y':'580','width':'80','height':'80','fill':'none','stroke':'#e88b7a','stroke-width':'4'})
  for col in [3,5]:E.SubElement(board,N+'circle',{'cx':str(60+col*80),'cy':'620','r':'8','fill':'#b5c76f'})
 E.ElementTree(board).write(A/f'chess-{name}.svg',encoding='unicode')
print('Approved-material check/promotion fixtures and aimable Dogleg artwork.')
