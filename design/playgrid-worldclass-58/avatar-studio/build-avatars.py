"""Original layered Playgrid character vectors. Standard library only, no paid API."""
from pathlib import Path
import json,math
P=Path(__file__).resolve().parent;A=P/'assets/characters';A.mkdir(parents=True,exist_ok=True)
INK='#141827'
def path(d,fill='none',stroke=INK,w=3,extra=''):return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'
def ellipse(x,y,rx,ry,c,stroke='none',w=1):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{c}" stroke="{stroke}" stroke-width="{w}"/>'
def circle(x,y,r,c,s='none',w=1):return ellipse(x,y,r,r,c,s,w)
def rect(x,y,w,h,c,r=0,s='none',sw=1):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{c}" stroke="{s}" stroke-width="{sw}"/>'
# 32 distinct silhouette/anatomy designs; palette variations do not count as additional characters.
ROWS=[
('a01','Ember','human','swept','#30233d','#ffd0aa','#aa795e','#64b9dc'),('a02','Juniper','human','curls','#302b45','#bf876b','#795544','#aacc77'),('a03','Sora','human','buns','#694167','#f1ba9c','#b17c71','#b899d2'),('a04','Orion','human','undercut','#1e283d','#946c52','#60473d','#d7ad64'),('a05','Mira','human','braids','#6c3c35','#dba383','#a36f58','#9ac48f'),('a06','Rowan','human','waves','#c39a68','#f3c6a6','#bc9276','#688bbd'),('a07','Zuri','human','puff','#241d35','#a96c51','#704e40','#cc965f'),('a08','Aster','human','pony','#676c9c','#e8b9a6','#aa7c76','#8bbfbf'),
('a09','Cinder','animal','fox','#cf834e','#ffe2b8','#ac634a','#8fc9a6'),('a10','Clover','animal','calico','#e5c5a0','#fff0d2','#bc8a68','#6f9bb7'),('a11','Pippin','animal','tabby','#aa7c59','#f5ddba','#765440','#9bbf73'),('a12','Tundra','animal','husky','#8c9bad','#e9eef0','#52627d','#80b9ec'),('a13','Maple','animal','shiba','#ca9567','#ffe6bf','#976945','#a998d0'),('a14','Mallow','animal','rabbit','#e3d8d0','#fff3e8','#b7a3ad','#caa1ca'),('a15','Bramble','animal','bear','#8f6352','#e2bb90','#634740','#a7bf8b'),('a16','Pebble','animal','panda','#e5e7d9','#fff5db','#9dafa1','#c8a877'),('a17','Sorrel','animal','redpanda','#bc7562','#f8e4c8','#854c4b','#a6c995'),('a18','Brook','animal','otter','#a28268','#ebd5af','#735646','#79bac8'),('a19','Bandit','animal','raccoon','#9c9ca1','#e6e2d3','#60677b','#ad9cd0'),('a20','Quill','animal','owl','#a28a69','#f5e8c6','#6b6161','#d6ab64'),
('a21','Bop','robot','bubble','#e4ebf0','#faf5d6','#7a90b4','#b7ff04'),('a22','Vela','robot','visor','#b8cbdc','#edf6f0','#627596','#67d8ee'),('a23','Pico','robot','antenna','#e7dcc1','#fff6de','#8f91b2','#d8b272'),('a24','Halo','robot','cyclops','#bfc8de','#f7e3d2','#6b739a','#b197ed'),('a25','Toggle','robot','box','#c4ddd6','#f6f5d9','#638d93','#9ce1b9'),('a26','Echo','robot','roundears','#d0d3e3','#f9efdc','#7d83a9','#e7a4b7'),
('a27','Sprig','fantasy','dragon','#7ba484','#dbdcb0','#456b6c','#d8bb73'),('a28','Nyx','fantasy','bat','#8e7ca5','#d8bfd1','#595879','#96bfdf'),('a29','Wisp','fantasy','cloud','#c9d4df','#f6ede4','#8fa7c5','#a6c8e3'),('a30','Ripple','fantasy','axolotl','#d7a3ae','#ffe1ce','#a16f8f','#b7d8a6'),('a31','Flick','fantasy','salamander','#a98a68','#f0d0a2','#6c687b','#b4d5a0'),('a32','Gale','fantasy','griffin','#b5aa8a','#eee1b5','#757c87','#a6b8e4')]
HAIR_BACK={
'swept':'M55 147Q32 98 58 58L43 48 74 43Q108 12 139 34Q174 12 197 58L214 73 201 107Q218 152 190 183L168 190H75Z',
'curls':'M58 156Q33 150 38 123Q21 107 39 86Q27 63 49 51Q46 28 74 30Q87 10 111 25Q135 12 153 29Q180 16 193 42Q222 44 214 71Q233 89 215 110Q229 139 204 151L185 185H74Z',
'buns':'M67 168Q40 100 70 53Q126 14 183 54Q213 110 186 172Z',
'undercut':'M59 155Q39 97 66 59Q105 21 154 31Q207 44 204 99L192 169Z',
'braids':'M55 129Q41 67 79 41Q130 17 180 45Q214 83 196 133L185 189H71Z',
'waves':'M48 168Q25 134 48 100Q24 62 66 42Q116 13 174 33Q215 44 207 84Q230 119 207 147Q222 181 185 215H66Q31 205 48 168Z',
'puff':'M62 161Q40 120 62 73Q83 34 128 36Q182 38 200 85L194 167Z',
'pony':'M55 166Q35 104 62 64Q105 24 159 32Q196 39 204 90Q202 133 191 170Z'}
HAIR_FRONT={
'swept':'M55 103Q45 57 91 44Q136 20 180 47L201 85 211 103 188 98 193 123Q171 112 151 68Q138 95 108 106L114 85Q81 116 51 123Z',
'curls':'M55 99Q38 89 51 69Q49 48 72 50Q79 28 99 43Q121 29 134 48Q157 29 172 49Q199 45 201 74L200 109Q181 99 171 83Q158 100 143 87Q125 104 112 88Q91 109 77 89L58 120Z',
'buns':'M57 106Q51 59 92 43Q141 25 182 54L198 103Q178 109 165 88L151 65Q136 100 110 111L116 92Q86 115 59 126Z',
'undercut':'M61 106L55 89Q58 43 106 38Q166 12 203 65L213 77Q176 80 151 57Q130 88 84 102L92 81Z',
'braids':'M59 109Q44 62 90 42Q128 28 168 44Q207 66 197 112L183 122Q181 79 152 59Q130 90 111 100L110 75Q91 109 59 130Z',
'waves':'M50 110Q38 63 80 45Q135 20 181 47Q214 72 200 116Q180 116 165 94Q154 78 145 58Q119 99 85 109L91 88Q72 117 53 137Z',
'puff':'M62 117Q42 94 62 72Q58 48 84 48Q99 25 117 44Q143 27 156 48Q184 36 194 64Q214 78 197 111Q175 108 162 89Q147 104 132 87Q109 113 91 92Z',
'pony':'M55 105Q51 57 95 42Q149 23 182 54L202 98 187 120Q163 103 146 64Q125 94 104 106L108 83Q82 111 54 128Z'}
def hoodie(accent):
 return path('M45 258Q46 208 84 189L105 178H151L175 190Q213 207 217 258Z','url(#C-cloth)',INK,5)+path('M83 190Q85 171 103 167L128 191 151 167Q175 172 177 192L153 219 128 203 103 221Z','#28304a',INK,4)+path('M99 209 111 236M158 207 147 237',stroke='#080f20',w=6)+path('M100 210 112 236M158 210 147 237',stroke='#5d6185',w=1.4)+path('M65 232Q128 218 196 235',stroke='#48536a',w=2)+path('M53 224Q51 240 53 255',stroke=accent,w=2)+path('M185 205Q207 223 207 250',stroke='#a16bf1',w=2)
def anime_eye(x,y,iris,scale=1):
 angle=-7 if x<128 else 7
 return f'<g transform="translate({x} {y}) rotate({angle}) scale({scale})">'+path('M-23-6Q-14-24 2-22Q18-20 23-7L20 9Q10 24-7 19Q-21 13-23-6Z','#fff5e8',INK,2.5)+ellipse(3,-1,12,19,'url(#C-iris)',INK,1.8)+ellipse(4,-3,5,12,INK)+path('M-5 9q8 12 16 0',stroke='#e1c28a',w=2)+circle(-2,-10,4.6,'#fff')+ellipse(10,5,2.4,4,'#d4f2ec')+path('M-25-8Q-16-27 2-25Q20-23 26-10L20-14Q2-31-18-12Z',INK,INK,1)+path('M-20-16l-5-6m11-2-2-5',stroke=INK,w=2.4)+path('M-11 23q13 4 22-2',stroke='#a77b73',w=1.1)+'</g>'
def eyes(c,kind):
 iris=c[7];one=kind=='cyclops';points=[128] if one else [96,161];normal=''
 if c[2]=='robot':
  for x in points:normal+=ellipse(x,119,12 if not one else 21,22 if not one else 25,'var(--accent)','none')+ellipse(x-3,112,3,7,'#f2ffbc')
 else:
  for x in points:normal+=anime_eye(x,123,iris,1.03 if kind=='owl' else .8 if c[2]!='human' else .94)
  normal+=path('M80 95q15-10 28-3M148 92q17-7 31 3',stroke=INK,w=3)
 joy=''.join(path(f'M{x-15} 123q15-21 30 0',stroke='var(--accent)' if c[2]=='robot' else INK,w=5) for x in points)
 sad=''.join(path(f'M{x-14} 125q14-8 28 0',stroke='var(--accent)' if c[2]=='robot' else INK,w=4) for x in points)
 surprise=''.join(ellipse(x,120,10,16,'var(--accent)' if c[2]=='robot' else '#fff6e4',INK,3)+circle(x+2,122,4,INK) for x in points)
 return f'<g class="eyes-normal">{normal}</g><g class="eyes-joy">{joy}</g><g class="eyes-sad">{sad}</g><g class="eyes-surprise">{surprise}</g>'
def mouth(kind,family):
 if family=='robot':return '<g class="mouth-smile">'+path('M112 153q16 15 32-1',stroke='var(--accent)',w=4)+'</g><g class="mouth-sad">'+path('M113 157q15-12 30 0',stroke='var(--accent)',w=3)+'</g><g class="mouth-surprise">'+ellipse(128,155,8,10,'var(--accent)')+'</g>'
 if kind in ['owl','griffin']:return path('M117 146l11-8 12 8-12 17Z','#d5ad69',INK,2.5)
 if family=='animal':
  return path('M121 143q7-4 14 0l-7 8Z','#b87d7f',INK,2)+path('M128 151q-10 17-22 2m22-2q9 17 22 2',stroke=INK,w=2.5)
 return '<g class="mouth-smile">'+path('M108 155q22 17 44-3-7 27-25 23-10-1-19-20Z','#fff5e8',INK,3)+path('M121 170q10-2 17 0',stroke='#cf8585',w=2)+'</g><g class="mouth-sad">'+path('M112 166q16-11 31 0',stroke=INK,w=3)+'</g><g class="mouth-surprise">'+ellipse(128,165,8,12,'#713e4b',INK,2)+'</g>'
def animals(c):
 kind=c[3];fur=c[4];light=c[5];shadow=c[6];back='';face='';mark=''
 if kind in ['fox','calico','tabby','husky','shiba','redpanda','raccoon']:
  back+=path('M58 97Q41 66 51 31Q74 31 100 69L159 68Q185 29 209 38L198 106Z',fur,INK,5)
  back+=path('M61 76 58 45q19 4 30 30M174 76q12-25 25-25l-6 32','#d998a0',INK,2)
 elif kind=='rabbit':
  back+=path('M80 92Q45 37 65 7Q92-4 105 81M145 82Q153 6 178 9Q203 25 179 94Z',fur,INK,5)+path('M80 68Q61 25 71 21Q82 23 89 70M158 68Q166 24 179 22Q188 37 170 74',stroke='#d2a0ac',w=10)
 elif kind in ['bear','panda','otter']:
  back+=circle(69,67,25 if kind!='otter' else 18,fur,INK,4)+circle(188,68,25 if kind!='otter' else 18,fur,INK,4)+circle(69,67,14,shadow)+circle(188,68,14,shadow)
 elif kind=='owl':back+=path('M58 101 51 43 100 61 154 61 204 41 198 110Z',fur,INK,5)
 outline='M58 112Q54 69 88 61Q124 48 166 64Q201 78 200 116L210 142 194 144 203 159 183 162Q171 191 130 197Q84 192 69 166L51 164 61 149 46 142Z'
 if kind=='otter':outline='M63 110Q57 71 95 62Q129 52 164 64Q203 80 195 121Q211 174 167 193Q128 211 87 191Q48 173 63 110Z'
 if kind=='owl':outline='M55 103Q51 65 84 56Q128 75 172 55Q207 69 201 109Q219 169 174 192L128 207 83 192Q40 170 55 103Z'
 face+=path(outline,'url(#C-skin)',INK,5)
 if kind in ['fox','husky','shiba','redpanda']:
  mark+=path('M66 112q21 8 36 35 26-7 50 0 15-25 43-35-1 60-66 81-65-10-63-81Z',light,'none',0)
 elif kind in ['calico','tabby','bear','otter','raccoon']:
  mark+=ellipse(128,156,42 if kind!='bear' else 37,26,light)
 if kind=='calico':mark+=path('M64 86q18-27 49-24l-10 49-35 8Z','#b78264','none',0)+path('M154 65q37 9 40 38l-33 2Z','#4b4c60','none',0)
 if kind=='tabby':
  for x in [104,125,147]:mark+=path(f'M{x} 65l-5 25 13-18Z',shadow,'none',0)
  mark+=path('M62 121l20 7-17 7m131-15-20 8 18 8',stroke=shadow,w=4)
 if kind in ['husky','raccoon','panda']:
  mark+=path('M67 102q20-27 43-6l5 43q-24 8-43-13Zm76-8q26-22 46 10l-8 31q-20 10-41 1Z',shadow,'none',0)
 if kind=='redpanda':mark+=path('M71 99q15-18 29-4l-9 28-18-2Zm87-4q17-14 28 6l-1 20-18 2Z',light,'none',0)
 if kind=='owl':mark+=ellipse(96,120,34,39,light,shadow,2)+ellipse(161,120,34,39,light,shadow,2)+path('M111 76l17 15 18-15',stroke=shadow,w=5)
 if kind in ['calico','tabby','fox','redpanda','raccoon','otter']:
  mark+=path('M84 148l-32-8m31 17-34 3m124-13 31-8m-31 18 33 3',stroke='#f2e1c5',w=2)
 return back,face,mark
catalog=[]
for c in ROWS:
 cid,name,family,kind,base,light,shade,iris=c;accent=['#b7ff04','#62d5ee','#b49aee','#f2b16b','#e7a2bc','#a4dba8'][len(catalog)%6]
 defs=f'''<linearGradient id="C-skin" x1=".15" y1=".1" x2=".9" y2=".95"><stop stop-color="{light}"/><stop offset=".4" stop-color="{base if family!='human' else light}"/><stop offset="1" stop-color="{shade}"/></linearGradient><linearGradient id="C-hair" x1=".1" y1="0" x2=".9" y2="1"><stop stop-color="#615371"/><stop offset=".32" stop-color="{base}"/><stop offset="1" stop-color="#171c30"/></linearGradient><linearGradient id="C-cloth" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#343c59"/><stop offset=".5" stop-color="#171f33"/><stop offset="1" stop-color="#0a1527"/></linearGradient><linearGradient id="C-lens" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#aeb2d0"/><stop offset=".22" stop-color="#202a3c"/><stop offset="1" stop-color="#070f22"/></linearGradient><radialGradient id="C-back"><stop stop-color="#30384f"/><stop offset="1" stop-color="#0a1527"/></radialGradient><filter id="C-glow"><feGaussianBlur stdDeviation="2"/></filter>'''
 back=circle(128,128,120,'url(#C-back)')+circle(128,128,119,'none','var(--accent)',5)+path('M29 111Q30 37 108 16',stroke='#fff4b7',w=2)+path('M157 18q75 17 83 104',stroke='#9764ef',w=3)
 for x,y,r in [(36,153,3),(213,169,3),(202,49,2),(45,71,2)]:back+=circle(x,y,r,'var(--accent)')
 back+=path('M211 79l3 7 7 2-7 2-3 7-2-7-7-2 7-2Z','var(--accent)','none',0)
 body=hoodie(accent);headback='';face='';marks='';hair=''
 if family=='human':
  headback=path(HAIR_BACK[kind],'url(#C-hair)',INK,5)
  if kind=='buns':
   headback+=circle(61,48,28,'url(#C-hair)',INK,4)+circle(195,49,28,'url(#C-hair)',INK,4)+path('M43 41q15-17 34 4m103-3q15-14 31 6',stroke='#ab75c1',w=3)
  if kind=='puff':
   for x,y,r in [(67,39,23),(90,25,24),(117,19,22),(145,24,23),(169,38,25)]:headback+=circle(x,y+8,r,'url(#C-hair)',INK,3)
  if kind=='pony':headback+=path('M184 69q47-47 57-10 14 42-10 70l-3 23-25-16 12-15-16 2 8-22Z','url(#C-hair)',INK,4)+path('M207 65q21 12 16 39',stroke='#aca4dc',w=3)
  if kind=='braids':
   for x in [57,195]:
    for y in [139,155,170,184]:headback+=ellipse(x,y,13,15,'url(#C-hair)',INK,2)
   headback+=path('M49 196h15m124 0h16',stroke='var(--accent)',w=5)
  face+=ellipse(65,131,14,22,'url(#C-skin)',INK,4)+ellipse(190,132,14,22,'url(#C-skin)',INK,4)+path('M62 122q11-4 10 15m113-15q-8-3-9 15',stroke='#a8796d',w=2)
  face+=path('M69 96Q75 57 125 56Q176 53 190 98L187 148Q179 179 130 195Q85 180 73 151Z','url(#C-skin)',INK,4)
  marks+=ellipse(81,145,14,7,'#ee8c8a55')+ellipse(175,146,14,7,'#ee8c8a55')+path('M126 139l-3 8 6 2',stroke='#aa7565',w=2)
  for x,y in [(76,145),(83,147),(176,146),(183,147)]:marks+=path(f'M{x} {y}l-1 5',stroke='#cd8180',w=1)
  hair=path(HAIR_FRONT[kind],'url(#C-hair)',INK,4)
  hair+=path('M61 83Q82 48 125 43Q96 54 81 76L66 91Z','#c5b2a64d','none',0)+path('M145 46Q178 45 195 85Q179 66 164 61Z','#ae7bec55','none',0)+path('M70 71Q98 44 123 44M172 61q17 14 23 32',stroke='#d4b7c5',w=1.4)
  defs+=f'<clipPath id="C-hairclip"><path d="{HAIR_FRONT[kind]}"/></clipPath>'
  hair+='<g clip-path="url(#C-hairclip)">'
  for xx in [69,88,109,144,165,181]:
   hair+=path(f'M{xx} 47Q{xx-18} 72 {xx-11} 116Q{xx-1} 81 {xx+9} 54Z','#080f203d','none',0)
   hair+=path(f'M{xx+2} 47Q{xx-10} 65 {xx-6} 86',stroke='#9a85a54d',w=1.2)
  hair+='</g>'
  if kind=='undercut':hair+=path('M63 107l3-24m3 27 2-20m-1 26 7-20',stroke='#85819a',w=2)
 elif family=='animal':
  headback,face,marks=animals(c)
  body=path('M49 260q-1-47 39-70h81q40 18 41 70Z','url(#C-cloth)',INK,5)+path('M76 184q54 33 103 1l-5 35-46 29-45-24Z','var(--accent)',INK,4)+path('M84 198q44 30 85 1l-11 21-31 17-31-14Z','#2d4a4c55','none',0)+circle(128,218,6,'#f1e9c433')
 elif family=='robot':
  body=path('M62 260v-47q1-27 35-33h63q35 8 34 33v47Z','url(#C-skin)',INK,5)+path('M76 226q52 19 105-1v35H76Z','#334760',INK,3)+rect(107,212,44,14,'var(--accent)',7,INK,3)
  hull='M58 66Q71 41 125 42Q183 40 201 70L204 143Q201 183 131 192Q64 183 55 149Z'
  if kind=='visor':hull='M51 80Q66 47 128 48Q188 49 207 81L200 152Q181 190 130 191Q80 188 56 154Z'
  if kind=='box':hull='M60 49H192Q207 49 207 68V151Q205 183 176 189H77Q51 180 51 151V68Q50 49 60 49Z'
  if kind=='cyclops':hull='M63 69Q77 38 128 39Q180 39 195 70Q214 111 196 157Q176 190 129 195Q79 191 61 158Q44 111 63 69Z'
  if kind=='roundears':headback+=circle(49,111,25,'url(#C-skin)',INK,4)+circle(208,111,25,'url(#C-skin)',INK,4)+circle(49,111,12,'#6c7e9d')+circle(208,111,12,'#6c7e9d')
  if kind=='antenna':headback+=path('M129 55V25m-14 2h28',stroke='#aebad2',w=5)+circle(128,18,10,'var(--accent)',INK,3)
  if kind=='bubble':headback+=path('M67 70q-7-30 20-35',stroke='var(--accent)',w=5)
  face+=path(hull,'url(#C-skin)',INK,5)+path('M77 76Q126 58 179 78Q194 88 190 129Q186 164 131 171Q74 163 68 133Q62 95 77 76Z','#101d2d',INK,4)
  marks+=path('M76 90q15-16 41-17l-23 20Z','#76bedc55','none',0)+path('M160 75q25 2 26 17l-9 33-7-39Z','#d7ecff55','none',0)
  marks+=path('M62 82Q76 55 107 53M196 99l1 32',stroke='#f8f7e8',w=3)+path('M67 157q22 21 53 25M154 182q30-7 43-24',stroke='#8b68dd',w=2)
  for x in [63,195]:marks+=circle(x,148,3,'#475a77','#dfe5e0',1)
 else:
  if kind=='dragon':
   headback+=path('M60 107 37 77l19-8-2-18 35 23 16-38 17 24 24-29 11 38 43-24-7 28 24 3-24 32Z',shade,INK,4)
   face+=path('M61 102Q60 65 109 62Q155 54 189 84L202 126Q209 158 178 182Q132 213 83 185Q49 162 61 102Z','url(#C-skin)',INK,5)
   marks+=ellipse(129,155,41,26,light)+path('M77 85l9 15m38-29 1 14m43 0-8 14',stroke=shade,w=5)
  elif kind=='bat':
   headback+=path('M67 94Q28 69 35 12l64 59 57 1 64-60q7 56-31 84Z',base,INK,5)+path('M67 68 47 31l36 41m89-1 35-39-19 40','#be9bb5',INK,2)
   face+=path('M62 108Q62 63 128 61Q192 62 195 112Q205 167 129 200Q52 169 62 108Z','url(#C-skin)',INK,5)
   marks+=path('M110 159l7 14 7-13m9 0 7 13 7-16','#fff0ce',INK,2)
  elif kind=='cloud':
   for x,y,r in [(59,94,25),(64,64,25),(91,48,25),(128,39,29),(166,48,25),(193,66,25),(201,99,24)]:headback+=circle(x,y,r,'url(#C-skin)',INK,3)
   face+=path('M64 103Q58 71 96 67Q126 54 157 69Q194 67 192 111L189 158Q171 188 130 195Q87 189 66 159Z','url(#C-skin)',INK,4)
   marks+=path('M84 78q17-15 32-10M153 70q14-1 25 11',stroke='#f4f0e2',w=3)
  elif kind=='axolotl':
   for x,sgn in [(57,-1),(199,1)]:
    headback+=path(f'M{x} 93l{sgn*26}-37m{-sgn*26} 52 {sgn*38}-7m{-sgn*38} 24 {sgn*30} 20',stroke=shade,w=10)
    for yy in [61,100,142]:headback+=ellipse(x+sgn*22,yy,9,15,'#e9b4b9',INK,2)
   face+=path('M60 98Q66 62 128 61Q189 62 197 101Q214 157 166 186Q128 202 89 186Q43 159 60 98Z','url(#C-skin)',INK,5)
   marks+=ellipse(78,148,13,7,'#bb718d77')+ellipse(177,148,13,7,'#bb718d77')
  elif kind=='salamander':
   headback+=path('M56 102 38 85 63 79 57 52 87 65 98 36 118 61 144 35 153 65 185 49 182 80 209 82 191 108Z',shade,INK,4)
   face+=path('M59 111Q57 69 102 65Q147 49 185 80Q206 102 199 143Q192 188 131 199Q69 193 57 153Z','url(#C-skin)',INK,5)
   marks+=ellipse(128,156,41,28,light)
   for x,y in [(81,85),(160,86),(183,143),(72,146)]:marks+=circle(x,y,5,shade)
  else:
   headback+=path('M58 106 43 52 84 72 100 37 128 66 156 36 172 69 210 50 198 108Z',shade,INK,4)
   face+=path('M59 105Q61 64 102 66L129 77 155 65Q196 65 199 111Q211 165 172 190L129 205 85 190Q48 164 59 105Z','url(#C-skin)',INK,5)
   marks+=path('M67 116q12-35 35-28l26 28 25-28q28-6 40 29-15 21-38 22l-27-14-27 13-28-11Z',light,'none',0)
  if kind not in ['griffin']:marks+=path('M122 144l6 5 6-5',stroke=shade,w=2)
 # Material detailing stays inside anatomy; richer vector ink without raster tracing.
 if family=='human':
  marks+=path('M81 95Q128 80 178 97L176 106Q127 91 80 107Z','#784e5d16','none',0)+path('M124 134l3 4',stroke='#fff0cc',w=2)
  body+=path('M53 256Q55 219 78 205L65 255Z','#060f204d','none',0)+path('M102 211 115 224 104 235Z','#070f2277','none',0)+path('M152 217l18 17 21 22-26-14Z','#6e679426','none',0)+path('M84 197q-17 15-18 36m121-21 13 27',stroke='#65718a66',w=1.5)
 if family=='animal':
  marks+=path('M66 100q11-16 26-20m74 0q19 10 25 27',stroke='#f5dec180',w=2)+path('M86 175q36 21 78-3',stroke='#784c4b33',w=2)
  for xx,yy in [(67,130),(72,164),(187,135),(182,165)]:marks+=path(f'M{xx} {yy}l5 5-1-9','#f3dec355','none',0)
 if family=='robot':
  marks+=path('M61 84Q84 52 119 51L105 63Q76 67 67 90Z','#f9ffffb3','none',0)+path('M171 55q23 6 29 28l-4 38-8-44Z','#a4a9d280','none',0)+path('M79 151q23 18 54 19l-10 9q-29-4-43-19Z','#fff8dc77','none',0)
  body+=path('M75 194q12-7 25-9l4 20-18 14Z','#eff3f3aa','#2d3a50',2)+path('M161 185q14 3 23 12l-12 22-18-14Z','#99b2cd88','#2d3a50',2)+path('M72 238v16m112-16v16',stroke='#cbd8d7',w=2)
 # Rim highlights support the canonical warm-left / violet-right ink family.
 fx=path('M58 94q-7 35 13 59',stroke='var(--accent)',w=1.5)+path('M192 101q9 31-1 50',stroke='#b189f3',w=2)
 # Optional modules use attachment anchors, not a one-silhouette assumption.
 symbols='''<symbol id="C-sunglasses" viewBox="0 0 140 55"><path d="M5 12q22-12 54 0l-3 28q-10 14-30 5L12 31Zm76 0q29-12 54 0l-7 23q-19 20-39 6Z" fill="url(#C-lens)" stroke="#111827" stroke-width="5"/><path d="M57 16q14-10 26 0M4 16l-9-4m139 4 11-5" fill="none" stroke="#111827" stroke-width="5"/><path d="m15 13 23-3-19 18m73-14 25-2-21 18" fill="#dee4f077"/></symbol><symbol id="C-round-glasses" viewBox="0 0 140 55"><g fill="#acbedb22" stroke="#202739" stroke-width="5"><circle cx="32" cy="27" r="24"/><circle cx="108" cy="27" r="24"/><path d="M56 22q14-10 28 0M8 22 0 18m132 4 8-4" fill="none"/></g></symbol><symbol id="C-beanie" viewBox="0 0 150 90"><path d="M13 63Q10 6 73 4q64 0 64 60Z" fill="#27334d" stroke="#141827" stroke-width="4"/><path d="M14 53h123l5 26H8Z" fill="var(--accent)" stroke="#141827" stroke-width="4"/><path d="M29 48q4-25 17-31m22 29V15m25 33-7-31m29 32-13-23" fill="none" stroke="#7f8aa166" stroke-width="2"/></symbol><symbol id="C-cap" viewBox="0 0 160 85"><path d="M21 63q-2-55 65-56 61 2 52 59Z" fill="#26334c" stroke="#141827" stroke-width="4"/><path d="M15 59q60-12 126 3l14 16q-70 10-140-2Z" fill="var(--accent)" stroke="#141827" stroke-width="4"/><path d="M80 12V56" stroke="#8b92a4" stroke-width="2"/></symbol><symbol id="C-crown" viewBox="0 0 130 80"><path d="m10 17 30 22L65 7l24 31 30-22-12 54H22Z" fill="var(--accent)" stroke="#141827" stroke-width="5"/><path d="M23 58h84" stroke="#f3e6ad" stroke-width="3"/><circle cx="65" cy="43" r="7" fill="#73529b"/></symbol><symbol id="C-headphones" viewBox="0 0 180 130"><path d="M14 91Q3 9 88 9q85 0 79 82" fill="none" stroke="#111827" stroke-width="18"/><path d="M14 72Q14 11 88 10q70 0 79 62" fill="none" stroke="var(--accent)" stroke-width="7"/><rect x="4" y="69" width="26" height="52" rx="12" fill="#26334d" stroke="#111827" stroke-width="4"/><rect x="148" y="69" width="26" height="52" rx="12" fill="#26334d" stroke="#111827" stroke-width="4"/></symbol><symbol id="C-scarf" viewBox="0 0 150 75"><path d="M10 8q64 27 131 0l-4 34q-56 28-123 1Z" fill="var(--accent)" stroke="#141827" stroke-width="4"/><path d="m91 34 36 4-4 34-37-11Z" fill="var(--accent)" stroke="#141827" stroke-width="4"/></symbol>'''
 defs+=f'<radialGradient id="C-iris" cx=".35" cy=".7"><stop stop-color="#f1dfbc"/><stop offset=".35" stop-color="{iris}"/><stop offset=".7" stop-color="{iris}"/><stop offset="1" stop-color="#17223d"/></radialGradient>'+symbols
 css='''.eyes-joy,.eyes-sad,.eyes-surprise,.mouth-sad,.mouth-surprise,.mouth-focused{display:none}svg[data-expression="joy"] .eyes-normal,svg[data-expression="joy"] .mouth-smile,svg[data-expression="sad"] .eyes-normal,svg[data-expression="sad"] .mouth-smile,svg[data-expression="surprised"] .eyes-normal,svg[data-expression="surprised"] .mouth-smile{display:none}svg[data-expression="joy"] .eyes-joy,svg[data-expression="sad"] .eyes-sad,svg[data-expression="sad"] .mouth-sad,svg[data-expression="surprised"] .eyes-surprise,svg[data-expression="surprised"] .mouth-surprise{display:inline}svg[data-expression="joy"] .mouth-surprise{display:inline}svg[data-eye-style="bright"] .eyes-normal{filter:drop-shadow(0 0 1px var(--accent))}svg[data-eye-style="sleepy"] .eyes-normal{transform:translateY(4px) scaleY(.7);transform-origin:128px 119px}svg[data-expression="focused"] .eyes-normal{transform:scaleY(.85);transform-origin:128px 119px}svg[data-expression="focused"] .mouth-smile{display:none}svg[data-expression="focused"] .mouth-focused{display:inline}'''
 layers=[('backdrop',back),('body',body),('head-back',headback),('face',face),('markings',marks),('eyes',eyes(c,kind)),('mouth',mouth(kind,family)+'<g class="mouth-focused">'+path('M115 160h25',stroke=INK,w=2.5)+'</g>'),('hair-front',hair),('rim-light',fx),('hat',''),('glasses',''),('accessory','')]
 content=''.join(f'<g id="layer-{n}" data-layer="{n}">{v}</g>' for n,v in layers)
 # Prefix every paint-server/symbol reference; layer IDs stay stable within each SVG root.
 defs=defs.replace('C-',cid+'-');content=content.replace('C-',cid+'-')
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-labelledby="{cid}-title" data-character="{cid}" data-expression="smile" data-eye-style="default" style="--accent:{accent}"><title id="{cid}-title">{name}, original Playgrid {kind} character</title><defs>{defs}</defs><style>{css}</style>{content}</svg>'
 (A/f'{cid}-{name.lower()}.svg').write_text(svg)
 tall=kind in ['fox','calico','tabby','husky','shiba','redpanda','raccoon','owl','rabbit','bat','dragon','griffin','salamander','antenna'];wide=kind in ['roundears','axolotl'];hats=['none','crown'] if tall else ['none','beanie','cap','crown'];glasses=['none'] if kind=='cyclops' else ['none','sunglasses','round'];accessories=['none','scarf'] if tall or wide else ['none','scarf','headphones']
 catalog.append({'id':cid,'name':name,'family':family,'silhouette':kind,'asset':f'assets/characters/{cid}-{name.lower()}.svg','thumbnail':f'assets/thumbnails/{cid}.png','defaultAccent':accent,'layers':[n for n,_ in layers],'compatibility':{'hat':hats,'glasses':glasses,'accessory':accessories,'expression':['smile','joy','focused','surprised','sad'],'eyes':['default','bright','sleepy']},'anchors':{'hat':{'x':54,'y':21 if family=='human' else 24,'width':150,'height':90},'glasses':{'x':56,'y':101 if family=='human' else 98,'width':143,'height':57},'accessory':{'x':39 if family=='robot' else 38,'y':56 if family=='robot' else 49,'width':180,'height':130},'scarf':{'x':56,'y':179,'width':150,'height':75}},'fallback':{'e':0 if family=='human' else 2 if family=='animal' else 3,'c':0}})
(P/'catalog.json').write_text(json.dumps({'version':1,'canonical':'../../../node-server/public/assets/hero-mascots.png','characters':catalog},indent=2)+'\n')
print('Built',len(catalog),'distinct original layered character SVGs.')
