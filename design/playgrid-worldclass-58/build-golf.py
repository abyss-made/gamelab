"""Original top-down course derivatives; source geometry remains exact. No simulation."""
from pathlib import Path
import json,html
P=Path(__file__).resolve().parent;A=P/'assets/golf';courses=json.loads((A/'geometry.json').read_text());manifest=[]
def path(poly):return 'M'+'L'.join(f'{x} {y}' for x,y in poly)+'Z'
for ci,c in enumerate(courses):
 for hi,h in enumerate(c['holes']):
  key=f'{c["id"]}-{hi+1:02}';d=path(h['poly']);name=html.escape(h['name']);ground=['#739d56','#9e9163','#698b79'][ci];edge=['#d0d6ac','#dcc9a0','#c6d5c0'][ci]
  defs=f'''<defs><linearGradient id="grass" x2=".8" y2="1"><stop stop-color="#72bb73"/><stop offset="1" stop-color="#318363"/></linearGradient><linearGradient id="pond" x2="1" y2="1"><stop stop-color="#69c6c3"/><stop offset="1" stop-color="#287d9b"/></linearGradient><radialGradient id="ball" cx=".3" cy=".2"><stop stop-color="#fff"/><stop offset="1" stop-color="#becfc4"/></radialGradient><pattern id="turf" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M2 7l2-3m8 10 2-3" stroke="#e0eec0" opacity=".15"/></pattern><pattern id="sand" width="14" height="12" patternUnits="userSpaceOnUse"><rect width="14" height="12" fill="#ddc78d"/><path d="M2 3h2m5 5h2" stroke="#b89f65" stroke-width="1"/></pattern><clipPath id="playable"><path d="{d}"/></clipPath><filter id="shadow"><feDropShadow dy="3" stdDeviation="2" flood-color="#173e37" flood-opacity=".5"/></filter></defs>'''
  body=f'<rect x="5" y="8" width="690" height="428" rx="26" fill="#122e31"/><rect x="5" y="3" width="690" height="425" rx="26" fill="{edge}" stroke="#e1e6bf" stroke-width="3"/><rect x="15" y="13" width="670" height="405" rx="20" fill="{ground}"/>'
  # Garden and path decorations stay outside the solid playable boundary, no ambiguous fake hazards.
  body+='<g stroke="#d5d4b5" stroke-width="14" fill="none"><path d="M34 30H666V402H34Z"/></g>'
  for x in range(45,670,25):body+=f'<path d="M{x} 22v16M{x} 394v16" stroke="#80977b" stroke-width="1"/>'
  for x in range(50,670,40):
   body+=f'<g transform="translate({x} 48)"><ellipse rx="15" ry="7" fill="#244e3d" opacity=".3"/><circle cy="-2" r="9" fill="#47724b"/><circle cx="-3" cy="-5" r="6" fill="#8daa65"/><circle cx="4" cy="-7" r="2" fill="{["#e8b5ad","#ebd7a2","#bfd7d9"][ci]}"/></g>'
  body+=f'<path d="{d}" fill="none" stroke="#294c3b" stroke-width="15" stroke-linejoin="round"/><path d="{d}" fill="url(#grass)" stroke="{edge}" stroke-width="8" stroke-linejoin="round"/><g clip-path="url(#playable)"><path d="{d}" fill="url(#turf)"/>'
  for x in range(40,680,48):body+=f'<rect x="{x}" width="24" height="440" fill="#d7edb7" opacity=".06"/>'
  for z in h.get('sand',[]):body+=f'<rect x="{z["x"]}" y="{z["y"]}" width="{z["w"]}" height="{z["h"]}" fill="url(#sand)" stroke="#a58e60" stroke-width="2"/>'
  for z in h.get('water',[]):
   body+=f'<rect x="{z["x"]}" y="{z["y"]}" width="{z["w"]}" height="{z["h"]}" fill="url(#pond)" stroke="#d5ddba" stroke-width="3"/>'
   for y in range(z['y']+12,z['y']+z['h'],17):body+=f'<path d="M{z["x"]+8} {y}h{z["w"]-16}" stroke="#d2f1df" opacity=".3"/>'
  body+='</g>'
  for poly in h.get('walls',[]):body+=f'<path d="{path(poly)}" fill="#c3cba6" stroke="#778f73" stroke-width="2"/><path d="{path(poly)}" fill="none" stroke="#e4e4c6" stroke-width="1"/>'
  for b in h.get('bumpers',[]):body+=f'<circle cx="{b["x"]}" cy="{b["y"]}" r="{b["r"]}" fill="#365e52" stroke="#d7dfb5" stroke-width="4"/><circle cx="{b["x"]}" cy="{b["y"]}" r="{b["r"]-7}" fill="#91b17a" stroke="#c5d5a5"/>'
  x,y=h['cup'];body+=f'<ellipse cx="{x}" cy="{y}" rx="8" ry="6" fill="#153b31" stroke="#c8ddb0" stroke-width="2"/><path d="M{x} {y-2}v-35" stroke="#f0efcd" stroke-width="2"/><path d="M{x+1} {y-37}l22 7-22 7Z" fill="#d4ed8c" stroke="#4d8255"/>'
  x,y=h['tee'];body+=f'<ellipse cx="{x+2}" cy="{y+4}" rx="8" ry="5" fill="#244d38" opacity=".4"/><circle cx="{x}" cy="{y}" r="6" fill="url(#ball)" stroke="#eef5df"/>'
  title=f'{c["name"]} · {name} · par {h["par"]}'
  for portrait in [False,True]:
   suffix='-portrait' if portrait else '';v='0 0 440 700' if portrait else '0 0 700 440';content=f'<g transform="translate(440 0) rotate(90)">{body}</g>' if portrait else body
   (A/f'{key}{suffix}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{v}" role="img"><title>{title} · exact existing geometry</title>{defs}{content}</svg>')
  manifest.append({'id':key,'course':c['name'],'name':h['name'],'par':h['par'],'tee':h['tee'],'cup':h['cup'],'wide':key+'.svg','portrait':key+'-portrait.svg','geometryUnchanged':True})
(A/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(A/'review.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Existing 18 holes · top-down material extension</title><style>body{background:#071c27;color:#ecf3dd;font:15px Arial;margin:30px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}figure{margin:0;padding:14px;background:#15333b;border:1px solid #52756b;border-radius:15px}img{width:100%}figcaption{padding:12px 0}</style><h1>18 existing holes. One material language.</h1><p>Original top-down SVG derivatives. Exact course boundaries and hazards; no new physics. The approved Dogleg hero remains unchanged.</p><main>'+''.join(f'<figure><img src="{m["wide"]}" alt="{m["name"]}"><figcaption>{m["course"]} · {m["name"]} · par {m["par"]}</figcaption></figure>' for m in manifest)+'</main></html>')
print('36 SVGs for 18 exact existing holes.')
