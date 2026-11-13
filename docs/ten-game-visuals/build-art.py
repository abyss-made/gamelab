"""Original Playgrid vector art; standard library only. All geometry is decorative."""
from pathlib import Path
import math
OUT=Path(__file__).resolve().parents[2]/'node-server/public/assets/ten';OUT.mkdir(parents=True,exist_ok=True)
def svg(name,w,h,body,defs=''):
 (OUT/(name+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" fill="none"><defs>{defs}</defs>{body}</svg>\n')
# Ocean's current lines deliberately contain no solid islands/hidden gameplay obstacles.
lines=''.join(f'<path d="M{-80+i*12} 560C{40+i*16} 350 {160+i*7} 440 {310+i*6} 210S{620+i*6} 90 {700+i*9} -80" stroke="#74c4bc" stroke-opacity="{.08+(i%3)*.025}" stroke-width="{1 if i%4 else 2}"/>' for i in range(28))
svg('ocean-chart',700,560,'<rect width="700" height="560" fill="#073a4c"/>'+lines+'<circle cx="590" cy="95" r="52" stroke="#bde2d2" stroke-opacity=".15"/><path d="m590 37 9 49 49 9-49 9-9 49-9-49-49-9 49-9Z" fill="#bde2d2" fill-opacity=".08"/><circle cx="590" cy="95" r="8" stroke="#bde2d2" stroke-opacity=".2"/>')
# Detailed fleet miniatures, with carrier landing lanes, turrets, lifeboats and deck railings.
for i,(name,length) in enumerate([('carrier',360),('battleship',300),('destroyer',250),('submarine',220),('patrol',170)]):
 L=length
 hull=f'<path d="M15 12Q{L*.65} 0 {L-24} 16L{L-5} 40 {L-24} 64Q{L*.65} 80 15 68L5 55V25Z" fill="url(#hull)" stroke="#e1ece8" stroke-width="2"/><path d="M22 20H{L-35}L{L-15} 40 {L-35} 60H22Z" fill="#365263" stroke="#162f42" stroke-width="2"/>'
 if i==0:
  detail=f'<path d="M22 31H{L-42}M22 49H{L-42}" stroke="#f3ddb0" stroke-width="2" stroke-dasharray="11 6"/><path d="M{L*.42} 17h70v12h-70z" fill="#cfdbd6"/><rect x="{L*.5}" y="10" width="22" height="15" rx="3" fill="#edf1e5"/>'
  for x in [42,88,134,222,268]:detail+=f'<path d="m{x} 39 18-3 8 4-8 4-18-3 8-1Z" fill="#dbe8e1"/><path d="M{x+12} 33v14" stroke="#afc0c0"/>'
 elif i==3:
  detail=f'<rect x="18" y="23" width="{L-43}" height="34" rx="17" fill="#708c91"/><rect x="{L*.45}" y="19" width="35" height="42" rx="12" fill="#c0d4cb"/><path d="M{L*.55} 28v22" stroke="#244351" stroke-width="4"/>'
 else:
  detail=f'<path d="M{L*.38} 19h48v42h-48z" fill="#c2d8d1"/><rect x="{L*.42}" y="26" width="18" height="28" rx="3" fill="#183a50"/>'
  for x in [L*.2,L*.72]:detail+=f'<circle cx="{x}" cy="40" r="12" fill="#acc7c1" stroke="#243e4e" stroke-width="3"/><path d="M{x-2} 37h24M{x-2} 43h24" stroke="#e5e9db" stroke-width="3"/>'
 railing=''.join(f'<path d="M{x} 14v7m0 38v7" stroke="#dce9db" stroke-opacity=".65"/>' for x in range(24,L-28,16))
 svg('fleet-'+name,L,80,'<path d="M4 5Q-12 40 4 75M'+str(L-4)+' 5q20 35 0 70" stroke="#a2e9dc" stroke-opacity=".3" stroke-width="3"/>'+hull+detail+railing+'<rect x="12" y="29" width="8" height="22" rx="2" fill="#e9a786"/>','<linearGradient id="hull" x2="0" y2="1"><stop stop-color="#e9e5cc"/><stop offset=".45" stop-color="#8fb6bc"/><stop offset="1" stop-color="#315c71"/></linearGradient>')
# Illustrated fish collection: actual private card rank selects its original species drawing.
colors=['#e98d62','#8dd7bf','#e4c26a','#83badd','#b9a0d8','#e5a6bc','#e9c7a7']
for rank in range(2,15):
 c=colors[(rank-2)%len(colors)];spots=''.join(f'<circle cx="{62+j*19}" cy="{58+(j%2)*20}" r="5" fill="#fff2d0" fill-opacity=".7"/>' for j in range(4))
 stripe=''.join(f'<path d="M{x} 35q-13 35 0 68" stroke="#183f4d" stroke-width="9" stroke-opacity=".2"/>' for x in [75,104,133]) if rank%2 else spots
 body=f'<path d="M50 66 12 35l7 35-7 35 40-27" fill="{c}" stroke="#214953" stroke-width="3"/><path d="M48 70Q65 13 126 27q42 9 52 43-14 38-56 42Q62 123 48 70Z" fill="{c}" stroke="#214953" stroke-width="3"/>{stripe}<path d="M87 30Q107 2 133 20l-9 10M88 107q23 25 42 5" fill="{c}" stroke="#214953" stroke-width="3"/><path d="m98 70-22-4 8 23Z" fill="#fff0c2" stroke="#214953" stroke-width="2"/><circle cx="145" cy="56" r="14" fill="#fff8df"/><circle cx="149" cy="57" r="7" fill="#173d47"/><circle cx="152" cy="54" r="2" fill="white"/><path d="M162 78q-8 7-15 1" stroke="#214953" stroke-width="3" stroke-linecap="round"/>'
 if rank>=11:body+='<path d="m103 22-6-18 15 10 11-12 8 14 15-4-7 19Z" fill="#f2ce77" stroke="#214953" stroke-width="2"/>'
 svg('fish-'+str(rank),190,140,body)
svg('marine-back',120,170,'<rect x="2" y="2" width="116" height="166" rx="13" fill="#082e42" stroke="#e0cf98" stroke-width="3"/><rect x="9" y="9" width="102" height="152" rx="8" stroke="#acbda4"/>'+''.join(f'<path d="M10 {y}q12-10 24 0t24 0 24 0 28 0" stroke="#598b8a" stroke-opacity=".4"/>' for y in range(20,160,14))+'<circle cx="60" cy="85" r="35" fill="#e5d09a"/><path d="m38 85 44-24v48Z" fill="#153e4c"/><path d="M77 85q-24-28-43 0 19 28 43 0Z" fill="#153e4c"/><circle cx="45" cy="81" r="3" fill="#f2e2b8"/><path d="M23 19h15m44 132h15" stroke="#e5d09a" stroke-width="3"/>')
svg('stack-back',120,170,'<rect x="2" y="2" width="116" height="166" rx="13" fill="#102b38" stroke="#f4ead3" stroke-width="3"/><rect x="9" y="9" width="102" height="152" rx="8" stroke="#809b8e"/><path d="M60 22 105 85 60 148 15 85Z" fill="#e7e7ca"/><path d="M60 35 95 85 60 135 25 85Z" fill="#dd725c"/><path d="M60 48 85 85 60 122 35 85Z" fill="#286a68"/><path d="M60 62 75 85 60 108 45 85Z" fill="#d3f57a"/>')
# Rocket peg and orbital launch-pad emblem, scalable to actual Ludo token buttons.
for i,c in enumerate(['#ff8a9a','#b6e77a','#f5cd74','#8cceeb']):
 svg('rocket-'+str(i),64,80,f'<ellipse cx="32" cy="71" rx="21" ry="5" fill="#031c36" fill-opacity=".4"/><path d="M19 43 8 60l15-5M45 43l11 17-15-5" fill="{c}" stroke="#16324c" stroke-width="2"/><path d="M22 60q10 18 20 0" fill="#f4c66e"/><path d="M18 52q-2-32 14-47 16 15 14 47l-7 12H25Z" fill="#f1e9d2" stroke="#16324c" stroke-width="3"/><path d="M23 17q9-17 18 0l-9-12Z" fill="{c}"/><circle cx="32" cy="34" r="10" fill="#173c59" stroke="{c}" stroke-width="4"/><path d="M23 54h18" stroke="{c}" stroke-width="5"/>')
svg('orbit-crest',160,160,'<circle cx="80" cy="80" r="68" fill="#12314b" stroke="#d9c797" stroke-width="2"/><ellipse cx="80" cy="80" rx="65" ry="25" transform="rotate(-35 80 80)" stroke="#b7dca9" stroke-width="3"/><circle cx="80" cy="80" r="27" fill="#d7eaa0"/><path d="m80 48 9 23 25 2-19 17 5 24-20-13-20 13 5-24-19-17 25-2Z" fill="#f0d597"/><circle cx="131" cy="44" r="7" fill="#f091a4"/>')
# Original social-deduction dossier insignia, plus sketchbook hardware.
svg('case-mask',260,220,'<path d="m27 61 103-33 103 33-18 91-85 44-85-44Z" fill="#162d40" stroke="#d4b983" stroke-width="4"/><path d="m130 29 103 32-18 91-85 44Z" fill="#bd6956"/><path d="M58 87q30-25 55 6-31 24-55-6Zm144 0q-30-25-55 6 31 24 55-6Z" fill="#f2e4bf"/><path d="m130 76-12 55 12-7 12 7Z" fill="#092539"/><path d="M96 151q34 21 68 0" stroke="#f2e4bf" stroke-width="5" stroke-linecap="round"/><path d="M42 40 22 24m196 16 20-16M130 20V5" stroke="#d4b983" stroke-width="3"/>')
svg('fingerprint',220,220,'<circle cx="110" cy="110" r="90" stroke="#8ab9a6" stroke-width="2"/>'+''.join(f'<path d="M{42+i*6} 155c-18-95 {118-i*12}-120 {136-i*12}-25q-2 37 {-12-i*2} 58" stroke="#8ab9a6" stroke-width="3" stroke-linecap="round"/>' for i in range(8)))
svg('spiral',24,240,''.join(f'<path d="M18 {y}C-4 {y-14}-4 {y+14}18 {y+8}" stroke="#071e2e" stroke-width="8"/><path d="M18 {y}C-3 {y-14}-3 {y+14}18 {y+8}" stroke="#c1c7bd" stroke-width="4"/><circle cx="19" cy="{y+8}" r="4" fill="#71857f"/>' for y in range(14,235,28)))
# Isometric waterfront city: new center illustration, never a substitute for playable tiles.
city='<path d="M0 280 240 150 520 300 260 450Z" fill="#204b58"/><path d="m0 315 260 140 260-140v60L260 515 0 375Z" fill="#102c43"/><path d="M22 296 250 173 495 306M36 353 254 235 470 350" stroke="#7da6a1" stroke-width="12"/><path d="M101 250 350 390M187 206 433 341M42 331 268 452" stroke="#d7c694" stroke-width="5"/>'
for x,y,w,h,c in [(110,235,55,95,'#d0c6a0'),(200,180,70,145,'#e4d6ac'),(300,236,55,110,'#8cb2aa'),(380,280,48,80,'#dbab8e'),(250,330,65,130,'#b9cba7'),(170,320,42,75,'#a3c0b7')]:
 city+=f'<path d="m{x} {y} {w/2} {-w/4} {w/2} {w/4}v{h}l{-w/2} {w/4} {-w/2} {-w/4}Z" fill="{c}"/><path d="m{x+w/2} {y+w/4} {w/2} {-w/4}v{h}l{-w/2} {w/4}Z" fill="#345668"/><path d="m{x} {y} {w/2} {-w/4} {w/2} {w/4} {-w/2} {w/4}Z" fill="#f3e8c8"/>'
 for yy in range(y+20,y+h-8,18):
  for xx in [x+8,x+22]:city+=f'<path d="M{xx} {yy}v8" stroke="#fff0b5" stroke-width="5"/>'
for x,y in [(70,290),(343,370),(400,310),(116,340)]:city+=f'<ellipse cx="{x}" cy="{y}" rx="13" ry="6" fill="#0a2e43"/><path d="M{x} {y}v-24" stroke="#b6ac82" stroke-width="4"/><circle cx="{x}" cy="{y-25}" r="14" fill="#83a873"/>'
svg('borough-city',520,520,city)
# Property icon family used only for public tile types.
for kind in ['prop','station','util','tax','surprise','rest','jail','goto','start']:
 if kind=='prop':body='<path d="M12 50V22l20-12 20 12v28Z" fill="#bdd3bc" stroke="#234854" stroke-width="3"/><path d="M24 50V34h16v16M21 24v4m22-4v4" stroke="#234854" stroke-width="4"/>'
 elif kind=='station':body='<rect x="15" y="9" width="34" height="38" rx="10" fill="#d4d9ba" stroke="#234854" stroke-width="3"/><path d="M21 21h22v12H21Zm0 31 7-7m15 7-7-7" stroke="#234854" stroke-width="4"/><circle cx="24" cy="40" r="3" fill="#234854"/><circle cx="40" cy="40" r="3" fill="#234854"/>'
 elif kind=='util':body='<path d="m36 6-23 29h17l-3 23 24-31H34Z" fill="#f2ca7c" stroke="#234854" stroke-width="3"/>'
 elif kind=='surprise':body='<path d="m32 5 8 17 19 3-14 14 3 19-16-9-17 9 3-19L4 25l20-3Z" fill="#e3bd89" stroke="#234854" stroke-width="3"/>'
 elif kind=='tax':body='<circle cx="32" cy="32" r="24" fill="#d8c79a" stroke="#234854" stroke-width="3"/><path d="M40 20H28q-12 0-12 10t16 6q16-4 16 6t-14 9H22M32 12v42" stroke="#234854" stroke-width="4"/>'
 elif kind=='jail':body='<rect x="10" y="8" width="44" height="48" rx="5" fill="#ccd8bf" stroke="#234854" stroke-width="3"/><path d="M20 9v46M32 9v46M44 9v46M11 39h42" stroke="#234854" stroke-width="3"/>'
 elif kind=='rest':body='<path d="M12 18h40v18H12Z" fill="#b3cbb4" stroke="#234854" stroke-width="3"/><path d="M8 40h48M16 40v14M48 40v14M12 27h40" stroke="#234854" stroke-width="4" stroke-linecap="round"/>'
 elif kind=='goto':body='<path d="M8 32h28M26 20l12 12-12 12M44 12h12v40H44" stroke="#234854" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
 else:body='<path d="M10 32h40M36 16l16 16-16 16" stroke="#234854" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
 svg('tile-'+kind,64,64,body)
