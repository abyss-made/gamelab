"""Authored outfit/robot silhouette refinements; preserves IDs and every customization slot.
Run before refine_art.py to regenerate composed previews after changing a base.
"""
from pathlib import Path
import xml.etree.ElementTree as E,json
ROOT=Path(__file__).resolve().parents[2]/'node-server/public/assets/avatars'
N='{http://www.w3.org/2000/svg}';E.register_namespace('',N[1:-1]);catalog=json.loads((ROOT/'catalog.json').read_text())
# Clothing is drawn as material/construction, rather than repeating a colored character badge.
outfits={
 'a01': [('M83 207L105 221 119 204M173 206L153 222 137 204','#ca936c','none',3),('M128 216V256','#cf996e','none',2),('M159 226l5 11-8-2 4 10-12-8 7-1Z','#f2bf7c','#f2bf7c',1)],
 'a02': [('M81 201L95 249H110L98 204M160 202L147 249H162L177 207','#152e2c','#48766a',3),('M96 239H159V256H96Z','#17362f','#2b524b',3),('M102 245H155','#adc7a0','none',1.5)],
 'a03': [('M80 199L109 224 126 205 147 226 179 203 169 241 145 234 128 215 106 235 88 233Z','#332d45','#887799',2),('M90 241l17-4m43 1 18 4','#d6c5e3','none',2)],
 'a04': [('M78 204L104 218 128 210 152 218 179 204 171 233 151 232 129 222 106 230 85 229Z','#192b40','#597995',3),('M96 238H118m23 0h18','#b4cece','none',3)],
 'a05': [('M80 204L108 218 126 240 145 217 177 203 169 216 151 226 128 256 101 229 87 219Z','#392b43','#a86c86',2),('M111 237l4 4m8-1 4 4m8-9 4 4','#e5bbbd','none',2)],
 'a06': [('M77 199Q128 227 179 199L171 226Q129 250 85 225Z','#363d36','#70806a',3),('M88 209Q127 234 169 209M89 217Q127 241 169 217','#b3bea4','none',2)],
 'a07': [('M75 206L88 204 99 250H83ZM180 205L167 203 156 250H173Z','#263443','#e4cda3',2),('M106 211L127 224 149 210M128 228V256','#b69d6b','none',3)],
 'a08': [('M76 204Q129 222 181 203L169 253Q132 231 85 255Z','#282d51','#46506d',3),('M88 220L113 230 145 222 162 240M111 230L117 248','#b5b8d0','none',1),('M92 220h1m22 10h1m30-8h1m15 18h1m-46 8h1','#f0e0b7','none',4)],
}
# Species-specific clothing and construction keep the animal/fantasy crew distinct at portrait size.
outfits.update({
 'a09':[('M76 204L98 218 107 245 83 232Z M179 205L157 217 149 245 174 231Z','#432c28','#986b4e',3),('M93 226l10 4m53-2 8-4','#e2c0a0','none',2)],
 'a10':[('M82 210L96 229H161L176 210 165 255H92Z','#343341','#7f8a8b',3),('M102 240h52m-43-4v10m16-10v10m15-10v10','#d7d6b8','none',2)],
 'a11':[('M78 215Q96 229 115 225L119 255H84Z M178 214Q159 230 140 226L137 255H171Z','#62483c','#c0a184',3),('M86 229l22 6m-20 7 20 5m40-12 21-6m-20 18 18-5','#836449','none',4)],
 'a12':[('M77 205L88 201 96 208 106 204 113 214 125 209 138 216 147 206 159 211 168 202 180 205 171 227 152 230 128 226 105 231 87 225Z','#74858a','#e7e5d4',3),('M93 237L107 230 128 238 151 230 166 237V256H93Z','#254754','#547f87',2)],
 'a13':[('M78 207L109 218 128 207 148 218 178 207 164 238 146 231 128 252 111 231 91 238Z','#493a2e','#94684f',3),('M128 218V242M102 220l12 9m40-9-12 9','#d9b486','none',2)],
 'a14':[('M104 223Q83 214 88 235Q101 245 115 233L123 241 132 235Q151 250 166 235Q174 215 151 225L133 230 126 226 118 231Z','#5d5361','#d9b5c4',2),('M115 239l-8 17h17l4-16m8-2 6 18h14l-10-16','#887180','#d9b5c4',2)],
 'a15':[('M81 219Q127 237 175 219L169 255H87Z','#3e3638','#7b6360',3),('M96 233v20m13-16v17m13-14v14m13-14v14m13-17v17m13-20v20','#b49a88','none',2)],
 'a16':[('M81 211L107 225 127 221 148 226 178 211 169 255H88Z','#334953','#778b8d',3),('M128 227v29M113 235l-17-3m47 3 17-3','#cbd4c0','none',2)],
 'a17':[('M80 212L93 207 175 245 170 257Z','#482b33','#ad8160',3),('M125 236L150 235 154 254H122Z','#4a3435','#c8a47f',3),('M130 240h13','#e7d7ad','none',2)],
 'a18':[('M81 213L97 212 105 225 149 225 160 212 177 213 169 254H89Z','#264856','#548b95',3),('M97 237h62m-62 11h62','#adcebd','none',3)],
 'a19':[('M80 212L103 223 127 218 151 224 178 211 168 255H89Z','#242d3d','#59606d',3),('M93 234h67m-64 9h61m-58 9h54','#c6c4ba','none',4)],
 'a20':[('M80 210Q105 226 127 216Q150 227 178 210L169 241 153 235 146 252 128 242 109 253 101 236 86 241Z','#3b4147','#8c9389',3),('M94 224l11 12m10-9 11 15m9-15 11 15m6-17 8 9','#d1ccac','none',2)],
 'a27':[('M77 208L104 211 128 225 151 209 180 207 165 238 147 233 127 253 110 232 91 239Z','#34493a','#6b8562',3),('M128 226V247M101 216l10 13m45-14-10 14','#afc29b','none',2)],
 'a28':[('M76 211L110 217 127 235 146 218 179 209 169 240 150 234 128 255 104 234 86 242Z','#3c304b','#766080',3),('M91 218L110 228 128 246 147 227 168 217','#bb99be','none',1.8)],
 'a29':[('M79 213Q91 201 101 218Q113 205 125 219Q138 204 149 217Q166 204 179 211L170 235Q145 228 131 241Q107 230 88 238Z','#667584','#cbd3d9',3),('M93 225Q128 216 165 225','#f4efe4','none',2)],
 'a30':[('M80 211L100 217 116 211 131 221 149 212 177 212 170 234 150 228 133 240 113 229 93 235Z','#4f465c','#bd99ac',3),('M102 222l8 5 8-5m9 7 8 5 8-5m8-7 8 5 8-5','#eed3ce','none',2)],
 'a31':[('M77 209L101 215 108 204 126 226 143 207 149 216 179 209 167 247 149 237 132 255 113 236 90 246Z','#593b38','#b5865a',3),('M98 223l17 8 14 15 15-14 16-9','#f0cb91','none',2)],
 'a32':[('M78 210Q128 226 179 211L169 242 156 236 145 253 130 243 114 253 101 236 88 241Z','#374759','#73899a',3),('M92 223l12 12m10-9 15 16m12-16 11 12m7-15 10 10','#b6ccce','none',2)]
})
robots={
 'a21': {'palette':'amber','expression':'joy','chest': [('M85 233h86v23H85Z','#23303c','#435668',3),('M101 246v-4m13 8v-13m13 15v-20m13 18v-13m13 9v-4','var(--accent)','none',4)]},
 'a22': {'palette':'cyan','expression':'focused','visor':'M68 90L98 77H161L192 91 184 132 157 147H101L73 133Z','chest':[('M82 212L128 235 175 210 165 248H92Z','#1b2a3c','#466784',3),('M99 224L128 241 157 224','#a3d4db','none',2)]},
 'a23': {'palette':'mint','expression':'surprised','visor':'M78 76Q128 60 179 78L184 137Q128 179 73 137Z','chest':[('M82 222Q128 238 176 222V255H82Z','#303747','#5d6c71',3),('M96 238h13m-7-6v13M146 234h11v11h-11Z','var(--accent)','none',3)]},
 'a24': {'palette':'violet','expression':'smile','chest':[('M89 215Q128 238 167 215L156 255H100Z','#343648','#b4b2cc',3),('M110 232L128 245 146 232','#6d688c','none',3)]},
 'a25': {'palette':'rose','expression':'focused','visor':'M77 76H181L188 88V142H70V88Z','chest':[('M83 222H175V256H83Z','#27333f','#59606d',3),('M96 234h13v10H96ZM121 234h13v10h-13ZM147 234h13v10h-13Z','var(--accent)','#26303c',2)]},
 'a26': {'palette':'cyan','expression':'joy','chest':[('M86 219L105 229 128 225 151 230 171 220 168 256H90Z','#28374b','#455a73',3),('M103 240h50m-46 6h42m-37 6h32','#b1c0cf','none',2)]},
}
for c in catalog['characters']:
 cid=c['id'];file=ROOT/'characters'/Path(c['asset']).name;root=E.parse(file).getroot()
 old=root.find('.//*[@data-outfit-revision="4"]')
 if old is not None:root.find('.//*[@data-layer="body"]').remove(old)
 if cid in outfits or cid in robots:
  g=E.SubElement(root.find('.//*[@data-layer="body"]'),N+'g',{'data-outfit-revision':'4'})
  for d,stroke,fill,width in outfits.get(cid,robots.get(cid,{}).get('chest',[])):
   E.SubElement(g,N+'path',{'d':d,'stroke':stroke,'fill':fill,'stroke-width':str(width),'stroke-linejoin':'round','stroke-linecap':'round'})
 if cid in robots:
  spec=robots[cid];c['defaultLook'].update({k:spec[k] for k in ['palette','expression']})
  if spec.get('visor'):root.find('.//*[@data-layer="face"]')[1].set('d',spec['visor'])
  old=root.find('.//*[@data-halo-revision="4"]')
  if old is not None:root.find('.//*[@data-layer="head-back"]').remove(old)
  if cid=='a24':
   halo=E.SubElement(root.find('.//*[@data-layer="head-back"]'),N+'ellipse',{'cx':'128','cy':'26','rx':'43','ry':'8','fill':'none','stroke':'var(--accent)','stroke-width':'5','data-halo-revision':'4'})
  if cid=='a25':
   eyes=root.find('.//*[@class="eyes-normal"]')
   if eyes is not None:eyes.set('transform','translate(0 42) scale(1 .65)')
 E.ElementTree(root).write(file,encoding='unicode')
(ROOT/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
print('32 individually authored supporting-character outfit/robot refinements; all configuration slots retained.')
