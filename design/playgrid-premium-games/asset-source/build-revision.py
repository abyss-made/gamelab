"""Original review artwork; no game runtime. Run with Python standard library."""
from pathlib import Path
from html import escape
import math,json,random
P=Path(__file__).resolve().parents[1];A=P/'assets'
def path(d,fill='none',stroke='none',sw=1,extra=''):return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'
def rect(x,y,w,h,c,r=0,stroke='none',sw=1):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{c}" stroke="{stroke}" stroke-width="{sw}"/>'
def circle(x,y,r,c,stroke='none',sw=1):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" stroke="{stroke}" stroke-width="{sw}"/>'
def text(x,y,t,sz=14,c='#edf6ef',weight=650):return f'<text x="{x}" y="{y}" text-anchor="middle" fill="{c}" font-size="{sz}" font-weight="{weight}" font-family="Inter,Arial,sans-serif">{escape(str(t))}</text>'
def svg(name,w,h,s,defs=''):
 (A/(name+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img"><title>{name.replace("-"," ")} · original Playgrid concept artwork</title><defs>{defs}</defs>{s}</svg>')
shadow='<filter id="shadow" x="-50%" y="-50%" width="200%" height="220%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#03272a" flood-opacity=".4"/></filter>'
# Physical card backs: bespoke geometric emboss, edge binding, consistent front/back proportions.
s=rect(3,3,174,250,'#121f3b',15,'#f5e8dc',5)+rect(12,12,156,232,'#374263',9,'#bfc0dc',1)
for i in range(-160,200,23):s+=path(f'M{i} 0L{i+240} 256',stroke='#c6b9f3',sw=1,extra='opacity=".15"')
for x,y,c in [(90,68,'#eb717f'),(135,128,'#e5c96e'),(90,188,'#75c7ad'),(45,128,'#75b0e5')]:s+=path(f'M{x} {y-23}l20 23-20 23-20-23Z',c,'#f9e9d8',1)
s+=path('M90 75L137 128 90 181 43 128Z','#111f36','#d9d3f4',2)+path('M82 106L107 123 82 145Z','#b4f54e')+text(90,219,'PLAYGRID',10,'#d9d7e9',700)
svg('stack-card-back',180,256,s)
# Engraved aquatic motif: articulated fins and scales, not a placeholder icon.
fish=path('M33 114Q46 69 102 78Q136 83 151 111Q126 146 83 142Q51 140 33 114L10 92Q18 115 10 137Z','#e8cf88','#fff0ba',2)
fish+=path('M73 82Q75 56 113 67L105 79M76 140Q86 160 115 146L107 139','#bc9d5f','#f2d897',1.5)
for x in range(48,116,12):
 for y in range(94,132,12):fish+=path(f'M{x} {y}q8-8 12 0q-4 9-12 0',stroke='#917c48',sw=.9)
fish+=path('M115 86Q101 110 117 137M24 103L36 114 22 125M52 115l-15-2',stroke='#8a7145',sw=2)+circle(132,106,4,'#123942')+circle(133,105,1,'#fff4c1')
s=rect(3,3,174,250,'#0b3c48',15,'#f3e1ad',5)+rect(12,12,156,232,'none',9,'#b5c2aa',1)+rect(19,19,142,218,'none',6,'#b5c2aa',.5)
for y in range(30,240,18):s+=path(f'M20 {y}q12-6 24 0t24 0t24 0t24 0t24 0t24 0',stroke='#638f88',sw=.7,extra='opacity=".4"')
s+=fish+text(90,51,'PLAYGRID',10,'#ecdfba')+text(90,204,'THE MARINE SALON',8,'#ecdfba')+text(90,224,'GO FISH',12,'#ecdfba')
svg('marine-card-back',180,256,s)
svg('marine-fish',180,220,fish+path('M43 159q42 18 88-2M55 167q30 11 66-2',stroke='#b5a36d',sw=1)+circle(140,65,4,'none','#b9a271')+circle(148,49,2,'#b9a271'))
# Garden course: same 700x440 Dogleg collision outline. All water/trees are outside it.
poly='M60 60H340V250H640V390H60Z'
defs=shadow+'''<linearGradient id="lawn" x2="0" y2="1"><stop stop-color="#88bd5e"/><stop offset="1" stop-color="#588b43"/></linearGradient><linearGradient id="green" x2="1" y2="1"><stop stop-color="#67bb68"/><stop offset="1" stop-color="#27845f"/></linearGradient><linearGradient id="water" x2="1" y2="1"><stop stop-color="#59b7b2"/><stop offset="1" stop-color="#267e8f"/></linearGradient><radialGradient id="ball" cx=".3" cy=".2"><stop stop-color="white"/><stop offset=".65" stop-color="#f6f6e7"/><stop offset="1" stop-color="#a0b3aa"/></radialGradient><clipPath id="fairway"><path d="'''+poly+'''"/></clipPath><pattern id="turf" width="13" height="13" patternUnits="userSpaceOnUse"><path d="M2 8l1-2m6 5 1-2" stroke="#d9efb1" stroke-opacity=".17" stroke-width=".7"/></pattern>'''
s=rect(3,7,694,430,'#102e29',27)+rect(5,0,690,425,'#a0bd79',25,'#d8e5b4',3)+rect(15,10,670,405,'url(#lawn)',19)
# Paving all around, jointed limestone.
s+=path('M34 29H666V404H34Z',stroke='#c8cfaa',sw=20)
for x in range(45,665,25):s+=path(f'M{x} 20v17M{x} 395v17',stroke='#889f7c',sw=1)
for y in range(45,395,25):s+=path(f'M25 {y}h18M658 {y}h17',stroke='#889f7c',sw=1)
# Reflecting pool in non-playable garden recess; no new water hazard.
s+=path('M390 110Q370 78 397 57Q431 38 468 61Q503 77 546 62Q611 48 634 95Q656 131 625 167Q608 190 556 178Q511 165 478 191Q440 211 404 185Q382 166 390 110Z','#d8d9b7','#a1b585',6)
s+=path('M399 111Q379 82 407 64Q435 49 469 71Q507 88 548 72Q606 58 626 99Q643 128 616 159Q599 179 555 168Q509 154 473 181Q443 198 411 176Q393 162 399 111Z','url(#water)')
for y in [90,113,137,160]:s+=path(f'M421 {y}q35-7 64 0t55 0t55 0',stroke='#bceae0',sw=1,extra='opacity=".35"')
for x,y in [(433,97),(580,143),(505,165)]:s+=circle(x,y,9,'#659555')+path(f'M{x} {y}l8-5',stroke='#a7c775',sw=1)+circle(x+2,y-4,2,'#f5c6c0')
s+=path('M483 44Q501 83 491 116',stroke='#e6cf9c',sw=25)+path('M483 44Q501 83 491 116',stroke='#9e8054',sw=1)
for x,y in [(489,62),(491,75),(493,88),(492,100)]:s+=path(f'M{x-12} {y}h24',stroke='#b49362',sw=1.5)
# Curbs never move the hit geometry. Shadows on outside edges only.
s+=path(poly,'#33583f','#355c41',18)+path(poly,'url(#green)','#e8e2bf',10)+path(poly,'url(#green)','#b5ce8d',1.5)
s+='<g clip-path="url(#fairway)">'
for x in range(55,650,40):s+=rect(x,55,20,340,'#d1edb40d')
s+=rect(60,60,580,330,'url(#turf)')+'</g>'
# Directional lawn detail, inset tile seams, a natural putting green around cup.
s+=path('M568 276q-43 11-31 51t62 34q34-14 22-49t-53-36Z','#8ace7d33')
for x,y in [(60,y) for y in range(80,390,28)]+[(x,390) for x in range(80,640,28)]+[(x,60) for x in range(80,340,28)]+[(340,y) for y in range(80,250,28)]+[(x,250) for x in range(360,640,28)]+[(640,y) for y in range(275,390,28)]:
 s+=path(f'M{x-3} {y-3}l6 6',stroke='#a8a68a',sw=1)
# Sculpted top-down canopies; keep crowns beyond course boundary.
def tree(x,y,r,c='#3b7850'):
 return '<g filter="url(#shadow)">'+circle(x+5,y+7,r,'#234b38')+circle(x,y,r,c)+circle(x-r*.35,y-r*.3,r*.7,'#609652')+circle(x+r*.25,y-r*.35,r*.55,'#80b061')+path(f'M{x-6} {y+4}q8-12 15-9',stroke='#94b96e',sw=2)+'</g>'
for x,y,r in [(370,45,20),(656,216,18),(553,35,17),(603,207,20),(448,221,17),(371,209,20),(652,43,22),(416,36,15)]:s+=tree(x,y,r)
for x,y in [(376,154),(545,214),(595,43),(652,180)]:
 s+=rect(x-12,y-6,26,13,'#527e46',5)
 for i in range(5):s+=circle(x-8+i*5,y+(i%2)*4,3,['#ffded5','#e8b2c7','#f8e9ae'][i%3])+circle(x-8+i*5,y+(i%2)*4,1,'#d4a955')
# A park bench and small stone details, no obstacles on fairway.
s+=rect(525,202,38,10,'#a97a4d',3)+path('M529 200v15m30-15v15M527 205h34',stroke='#594d37',sw=2)
s+=circle(590,320,12,'#133e32','#d6e9ad',2)+circle(590,320,7,'#061e22')+path('M590 320V280','#0000','#f4ecd5',2)+path('M590 280l29 9-29 10Z','#f6cd65','#8c784d',1)
s+=circle(112,114,10,'#174b3e66')+circle(110,110,9,'url(#ball)','#ecf2da',1)+circle(107,107,2,'#fff')
s+=path('M125 118L231 163',stroke='#fcf4cf',sw=2,extra='stroke-dasharray="3 7"')+circle(239,166,5,'none','#f6e9b7',1.5)
svg('golf-dogleg',700,440,s,defs)
svg('golf-dogleg-portrait',440,700,'<g transform="translate(440 0) rotate(90)">'+s+'</g>',defs)
# Warships: pointed hulls, wakes, recognizable deck plans, gun barrels, runway and aircraft.
shipdefs=shadow+'''<linearGradient id="steel" x2="0" y2="1"><stop stop-color="#d5e6e5"/><stop offset=".45" stop-color="#94b4be"/><stop offset="1" stop-color="#456c80"/></linearGradient><linearGradient id="deck" x2="0" y2="1"><stop stop-color="#748f9a"/><stop offset="1" stop-color="#405f71"/></linearGradient>'''
def ship(kind,n):
 w=n*54-10;h=42
 s=path(f'M5 12q-25 9 0 18M{w-5} 5q20 17 0 33',stroke='#bbe9ed',sw=2,extra='opacity=".25"')
 s+='<g filter="url(#shadow)">'+path(f'M4 7Q{w*.7} -4 {w-8} 10L{w} 21 {w-8} 32Q{w*.7} 45 4 35Q-2 21 4 7Z','url(#steel)','#c7e5e7',1)
 s+=path(f'M10 11H{w-22}L{w-9} 21 {w-22} 31H10Z','url(#deck)','#4d7282',.8)
 if kind=='carrier':
  s+=path(f'M15 15H{w-28}M15 25H{w-28}',stroke='#e6e6c7',sw=1,extra='stroke-dasharray="6 4"')+rect(75,4,68,9,'#a7c6cd',2,'#e7eee1')+rect(96,1,23,8,'#d5e6dd',1)+path('M108 1v-6m-6 0h13',stroke='#dae9e0',sw=1)
  for x in [37,66,153,184,213]:s+=path(f'M{x} 18l12 3-12 3 2-3Z','#e6e9d9')+path(f'M{x+4} 16v10',stroke='#e6e9d9',sw=1)
  s+=text(w-38,25,'01',7,'#fff3d9')
 elif kind=='submarine':
  s+=rect(18,12,w-42,18,'#567b8a',9,'#b6cdd1')+rect(57,12,32,17,'#accad0',6,'#315267')+path('M70 13v-5m10 6V4h5',stroke='#cce0db',sw=2)
  for x in [32,100,117]:s+=path(f'M{x} 16v10',stroke='#8daeb8',sw=1)
 else:
  s+=rect(w*.38,12,w*.25,18,'#beced0',3,'#385d72')+rect(w*.42,9,w*.13,16,'#e0e8df',2)+rect(w*.44,10,w*.08,4,'#224856',1)
  for x in [w*.2,w*.75]:s+=circle(x,21,6,'#aac6cd','#395e70',1)+rect(x-3,18,13,3,'#d5e4de',1)
  s+=path(f'M{w*.5} 12V4m-6 2h12',stroke='#d1e0d7',sw=1.5)
  for x in range(18,int(w)-20,18):s+=circle(x,32,1.3,'#dce5d5')
 s+='</g>'
 return s,w
for kind,n in [('carrier',5),('battleship',4),('destroyer',3),('submarine',3),('patrol',2)]:
 s,w=ship(kind,n);svg('ship-'+kind,w+14,58,'<g transform="translate(7 8)">'+s+'</g>',shipdefs)
def chart(friendly):
 defs=shipdefs+'''<radialGradient id="sea"><stop stop-color="#22677a"/><stop offset="1" stop-color="#0c344a"/></radialGradient><pattern id="ripples" width="65" height="55" patternUnits="userSpaceOnUse"><path d="M-10 27q18-5 34 0t38 0M10 43q12-4 26 0" fill="none" stroke="#67acb5" stroke-opacity=".15" stroke-width="1"/></pattern>'''
 s=rect(0,0,620,620,'#112c3f',18,'#548294',2)+rect(8,8,604,604,'#061f31',13,'#d2e1c630',1)+rect(40,40,540,540,'url(#sea)',2)+rect(40,40,540,540,'url(#ripples)')
 for i in range(11):s+=path(f'M40 {40+i*54}H580M{40+i*54} 40V580',stroke='#91c5ce',sw=.7,extra='opacity=".27"')
 for i in range(10):s+=text(67+i*54,27,chr(65+i),12,'#b5cfdb')+text(21,72+i*54,i+1,12,'#b5cfdb')
 # Ghosted sonar rings outside ship details keep targeting legible.
 s+=circle(310,310,170,'none','#b1e0d70a',1)+circle(310,310,260,'none','#b1e0d70a',1)
 if friendly:
  for x,y,n,horiz,kind in [(1,1,5,True,'carrier'),(7,2,4,False,'battleship'),(2,5,3,False,'destroyer'),(4,8,3,True,'submarine'),(5,3,2,True,'patrol')]:
   q,w=ship(kind,n)
   tr=f'translate({40+x*54+5} {40+y*54+6})' if horiz else f'translate({40+x*54+48} {40+y*54+5}) rotate(90)'
   s+=f'<g transform="{tr}">{q}</g>'
 else:
  for x,y in [(1,1),(2,1),(3,1),(5,5)]:
   xx=67+x*54;yy=67+y*54;s+=circle(xx,yy,19,'#ed8b6a18')+circle(xx,yy,12,'#211e24','#e99c72',2)+path(f'M{xx-8} {yy-8}l16 16m0-16-16 16',stroke='#ffbf83',sw=3)+circle(xx-3,yy-3,2,'#ffd9a1')
  for x,y in [(1,5),(6,3),(7,6),(2,8),(8,1)]:
   xx=67+x*54;yy=67+y*54;s+=circle(xx,yy,11,'none','#a4d4dc55',1)+circle(xx,yy,4,'#c6e9e6')
  xx=229;yy=229;s+=rect(xx-26,yy-26,52,52,'#bcff5310',2,'#c4f28c',2)+circle(xx,yy,16,'none','#d3f6ad',1)+path(f'M{xx-22} {yy}h10m24 0h10m-22-22v10m0 24v10',stroke='#d3f6ad',sw=1.5)
 svg('fleet-chart' if friendly else 'target-chart',620,620,s,defs)
chart(True);chart(False)
# Toy city property board. Tile order/names/economy remain existing Playgrid values.
data=json.loads((Path(__file__).parent/'board-reference.json').read_text())
citydefs=shadow+'''<linearGradient id="ivory" x2="0" y2="1"><stop stop-color="#fff7de"/><stop offset="1" stop-color="#d9c9a4"/></linearGradient><linearGradient id="park" x2="1" y2="1"><stop stop-color="#b1cf9f"/><stop offset="1" stop-color="#76aaa0"/></linearGradient><linearGradient id="gold" x2="0" y2="1"><stop stop-color="#f8dd90"/><stop offset="1" stop-color="#9a743c"/></linearGradient>'''
def building(x,y,w,h,c):
 s=path(f'M{x} {y}l{w*.25} {-w*.18} {w} 0 {-w*.25} {w*.18}Z','#ead5ba','#59736d',1)+path(f'M{x+w} {y}l{w*.25} {-w*.18}v{h}l{-w*.25} {w*.18}Z',c,'#59736d',1)+rect(x,y,w,h,c,2,'#59736d')
 s+=path(f'M{x+1} {y+4}h{w-2}',stroke='#fff5c4',sw=2)
 s+=path(f'M{x+w} {y+1}l{w*.25} {-w*.18}v{h-2}l{-w*.25} {w*.18}Z','#203b4c33')
 s+=path(f'M{x+4} {y-2}l{w*.18} {-w*.12}h{w*.65}l{-w*.18} {w*.12}Z','#739879','#c3d2ad',.7)
 s+=path(f'M{x+5} {y+h-3}h{w-10}',stroke='#ffe8ae',sw=2)
 for xx in range(int(x+6),int(x+w-4),12):
  for yy in range(int(y+12),int(y+h-6),14):s+=rect(xx,yy,5,7,'#fff0b1',1)+rect(xx,yy,5,2,'#7299a8',.5)+path(f'M{xx} {yy+7}h5',stroke='#728c7e',sw=.7)
 s+=rect(x+w*.42,y+h-13,w*.2,13,'#3a6571',1)+path(f'M{x-2} {y+h}h{w+6}',stroke='#557c70',sw=2)
 return s

def citycore():
 s=rect(89,89,542,542,'url(#park)',18,'#d4e2b6',3)
 # Blue canal, embankments, boulevards and crossing.
 s+=path('M120 480Q250 389 385 444T606 360',stroke='#d9e4bf',sw=49)+path('M120 480Q250 389 385 444T606 360',stroke='#55a4b2',sw=34)+path('M130 480Q250 395 385 449T604 365',stroke='#9ed5cf',sw=1.5)
 s+=path('M142 285L572 285M340 150V547',stroke='#deceaa',sw=31)+path('M142 285L572 285M340 150V547',stroke='#f4e8c3',sw=21)+path('M142 285L572 285M340 150V547',stroke='#a2b29a',sw=1,extra='stroke-dasharray="5 6"')
 s+=path('M311 402h58v70h-58Z','#d7b67d','#a68c5a',2)
 for y in range(409,468,8):s+=path(f'M312 {y}h56',stroke='#f4d9a4',sw=2)
 # Trees with clustered highlight, benches and plinths.
 for x,y in [(132,154),(581,164),(566,506),(180,535),(138,363),(421,536),(567,321),(258,158),(200,347),(471,337),(483,525)]:
  s+=circle(x+3,y+4,15,'#487c5b44')+circle(x,y,14,'#437a5a')+circle(x-4,y-4,11,'#78a45f')+circle(x+3,y-6,6,'#a4c47c')
 # Original skyline, courtyards and rooftop gardens; never a copied Monopoly city.
 for x,y,w,h,c in [(176,204,43,63,'#d98d7b'),(229,176,48,92,'#e7b87b'),(368,180,51,85,'#a4b7b4'),(437,142,53,123,'#83a7ad'),(501,206,36,60,'#b293af'),(178,360,42,54,'#94b6af'),(234,334,45,73,'#daa080'),(407,357,49,65,'#d9c692'),(484,458,42,50,'#b193a6')]:s+=building(x,y,w,h,c)
 s+=path('M463 138V105',stroke='#ebdeb7',sw=3)+circle(463,104,4,'#b4ef69')
 # Street furniture, pocket parks and tiny original cars enrich the city without altering tiles.
 for x,y,c in [(270,282,'#dc7f74'),(393,279,'#f1df9b'),(337,365,'#558fa7'),(339,494,'#dfad78')]:
  s+=rect(x,y,16,8,c,3,'#45656b',.7)+rect(x+5,y+1,6,5,'#a8d4d0',1)+circle(x+3,y+8,2,'#39555a')+circle(x+13,y+8,2,'#39555a')
 for x,y in [(153,227),(550,227),(450,494),(258,518)]:
  s+=rect(x-11,y-7,24,14,'#73956e',5)
  for k in range(5):s+=circle(x-8+k*4,y+(k%2)*3,2,['#f0be91','#df8fa4','#f3dfac'][k%3])
 for x,y in [(292,233),(393,320),(527,315)]:
  s+=path(f'M{x} {y}v-20q3-5 7-2',stroke='#4c7469',sw=2)+circle(x+6,y-22,3,'#f9e9ae')
 # Civic plaza and fountain.
 s+=circle(340,285,35,'#dfd0ab','#f3e6ba',3)+circle(340,285,22,'#6daeb4','#e6e4bd',3)+circle(340,285,8,'#e3e5c8')+path('M340 282v-18',stroke='#c7f1e6',sw=2)
 s+=rect(215,553,290,47,'#133f44',12,'#d5ce97',2)+text(360,575,'PLAYGRID PLAZA',19,'#fff1c4',800)+text(360,590,'A CITY WORTH PLAYING FOR',7.5,'#c3dcc2',600)
 return s

def board(compact=False):
 s=rect(1,5,718,713,'#122f38',25,'#b2a477',2)+rect(7,0,706,710,'url(#gold)',22)+rect(13,6,694,694,'#29474a',17,'#f4e3ad',1)+citycore()
 for i,t in enumerate(data['tiles']):
  if i<=9:r,c=9,9-i
  elif i<=18:r,c=18-i,0
  elif i<=27:r,c=0,i-18
  else:r,c=i-27,9
  x=17+c*69;y=10+r*69;w=65
  color=data['groups'].get(t.get('group'),{}).get('color','#87a6a2')
  s+=rect(x,y+3,w,65,'#9d9277',5)+rect(x,y,w,63,'url(#ivory)',5,'#f3e6c5',1)+rect(x+2,y+2,w-4,11,color,3)
  if compact:
   s+=text(x+32,y+29,f'{i:02}',16,'#264d55',800)
   if t['type']=='prop':s+=path(f'M{x+22} {y+44}l10-7 10 7v11h-20Z',color,'#657969',1)+rect(x+30,y+48,4,7,'#fff1ba',1)
   else:s+=text(x+32,y+52,{'launch':'GO','surprise':'?','tax':'$','station':'↗','util':'•','rest':'REST','timeout':'II','gototimeout':'→'}.get(t['type'],'•'),12,'#55726a')
  else:
   words=t['name'].split()
   for k,word in enumerate(words[:3]):s+=text(x+32,y+24+k*9,word,7,'#274a4c',750)
   if t.get('price'):s+=text(x+32,y+57,'$'+str(t['price']),8,'#426965')
   else:s+=text(x+32,y+57,{'launch':'START','surprise':'?','tax':'$100','station':'↗','util':'•','rest':'REST','timeout':'II','gototimeout':'→'}.get(t['type'],'•'),9,'#426965')
  # Owned sample lots: one marker per lot, not unearned buildings.
  if i in [1,3,6,7]:s+=circle(x+56,y+8,3,'#b2ef60','#2b5546',.5)
 # Alex on tile13, others sample positions; gem-like pawns, never a copied token set.
 for x,y,c,label in [(49,386,'#b6ed60','A'),(532,41,'#ef859f','N'),(670,386,'#7dc1e5','T')]:
  s+=f'<g filter="url(#shadow)">'+circle(x,y+11,12,'#2b54534d')+path(f'M{x} {y-15}l12 11-4 16h-16l-4-16Z',c,'#fff3d6',2)+text(x,y+9,label,10,'#1f4950',800)+'</g>'
 svg('tycoon-board-mobile' if compact else 'tycoon-board',720,720,s,citydefs)
board();board(True)
# Hero property card: same existing Rose property, original richer townhouse neighborhood.
s=rect(0,0,400,230,'#e2d8c3')+circle(328,43,38,'#f4e6ba')+path('M0 190Q150 160 400 190V230H0Z','#96b39a')
for x,y,w,h,c in [(45,92,66,109,'#c27d93'),(126,66,70,135,'#d89ab0'),(212,84,64,116,'#bd839d'),(290,105,54,96,'#dfa2ae')]:
 s+=building(x,y,w,h,c)+path(f'M{x-5} {y}l{w*.5+5} -22 {w*.5+5} 22Z','#526e78','#435b64',1)
 s+=rect(x+9,y+h-30,w-18,6,'#f1dfbb',2)+rect(x+10,y+h-25,w-20,5,'#6e9866',2)
for x in [26,365]:s+=circle(x,177,18,'#658b66')+circle(x-5,170,13,'#89ad73')+rect(x-2,187,4,16,'#73836a',1)
s+=path('M30 217H372',stroke='#f6e6c4',sw=12)+path('M50 220H352',stroke='#9aa88c',sw=1)
svg('blossom-avenue',400,230,s,citydefs)
print('Rebuilt original review SVGs: social cards, landscaped golf, detailed naval fleet, miniature city.')
