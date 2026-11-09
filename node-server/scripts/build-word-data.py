#!/usr/bin/env python3
"""Deterministic Dictionary 2.0 generator. Inputs/licenses: server/data/DICTIONARY-2.md.
Usage: build-word-data.py ESDB_WORDS WORDNET_DIR GEONAMESCACHE_DIR
"""
from pathlib import Path
import json,re,sys,unicodedata
from functools import lru_cache
out=Path(__file__).resolve().parents[1]/'server'/'data'
esdb,wn,geo=map(Path,sys.argv[1:])
def norm(s):
 s=unicodedata.normalize('NFKD',s).lower().translate(str.maketrans({'œ':'oe','æ':'ae','ß':'ss','ø':'o','ł':'l','đ':'d'}))
 return ''.join(c for c in s if not unicodedata.combining(c))
def plain(s):return re.sub(r'\s+',' ',re.sub('[^a-z0-9 ]',' ',norm(s).replace("'",''))).strip()
old=set((out/'lexicon.txt').read_text().splitlines())
words={norm(w) for w in esdb.read_text().splitlines() if w==w.lower() and re.fullmatch('[a-z]{2,24}',norm(w))}
(out/'lexicon-esdb.txt').write_text('\n'.join(sorted(words-old))+'\n')
roots={'Animal':['00015388'],'Food':['00021265','07555863'],'Fruit or vegetable':['13134947','07707451'],'Color or shade':['04956594'],'Musical instrument':['03800933'],'Body part':['05220461'],'Vehicle':['04524313'],'Drink':['07881800'],'Tool':['04451818'],'Job':['09632518','10480253','10053808','09614315','10078806','10560637','09615807','09761403','10091651','10448983','10014939','09931640']}
nodes={}
for line in (wn/'data.noun').read_text().splitlines():
 if not line or not line[0].isdigit():continue
 f=line.split('|')[0].split();n=int(f[3],16);end=4+n*2;parents=[]
 for j in range(end+1,end+1+int(f[end])*4,4):
  if f[j] in ('@','@i') and f[j+2]=='n':parents.append(f[j+1])
 nodes[f[0]]=(f[4:end:2],parents)
@lru_cache(None)
def ancestors(i):return frozenset([i]).union(*(ancestors(p) for p in nodes.get(i,([],[]))[1]))
cats={k:set() for k in roots}
for i,(lemmas,_) in nodes.items():
 for cat,ids in roots.items():
  if ancestors(i).intersection(ids):cats[cat].update(plain(w.replace('_',' ')) for w in lemmas if w==w.lower() and re.fullmatch('[a-z][a-z -]{1,48}',plain(w.replace('_',' '))))
extras={'Animal':'axolotl|capybara|quokka|red panda|cockapoo|labradoodle','Food':'boba|ramen|kimchi|biryani|falafel|shawarma|tikka masala|acai|quinoa|sushi|poke|bao|tempeh|tofu|edamame','Drink':'water|juice|fruit juice|orange juice|apple juice|boba|bubble tea|matcha|kombucha|oat milk|smoothie|flat white','Fruit or vegetable':'acai|dragon fruit|kiwi|kiwifruit|zucchini|courgette|aubergine|eggplant|arugula|rocket|broccolini','Color or shade':'teal|magenta|cyan|lime|navy|rose gold|taupe|lavender|charcoal|aqua','Musical instrument':'ukulele|synthesizer|synthesiser|keytar|cajon|kalimba|handpan|otamatone','Vehicle':'train|steam train|freight train|passenger train|microbus|ebike|e bike|electric scooter|e scooter|hoverboard','Job':'software developer|software engineer|data scientist|streamer|youtuber|podcaster|barista|game designer|content creator|ux designer'}
for k,v in extras.items():cats[k].update(map(plain,v.split('|')))
(out/'category-vocabulary.json').write_text(json.dumps({k:sorted(v) for k,v in cats.items()},indent=2)+'\n')
exceptions={}
for line in (wn/'noun.exc').read_text().splitlines():
 f=line.split();exceptions[plain(f[0].replace('_',' '))]=[plain(w.replace('_',' ')) for w in f[1:]]
(out/'noun-inflections.json').write_text(json.dumps(exceptions,sort_keys=True,indent=2)+'\n')
names=set()
for city in json.loads((geo/'geonamescache/data/cities15000.json').read_text()).values():
 for name in [city['name'],*city.get('alternatenames',[])]:
  # Exclude short alternate codes (airport codes etc.), non-Latin scripts and numeric identifiers.
  if name!=city['name'] and (len(name)<4 or (name.isupper() and len(name)<=4)):continue
  n=norm(name)
  if re.fullmatch("[a-z][a-z '-]{1,48}",n):names.add(plain(n))
(out/'city-names.txt').write_text('\n'.join(sorted(names))+'\n')
print(json.dumps({'addedWords':len(words-old),'cityNamesAndAliases':len(names),'memberships':{k:len(v) for k,v in cats.items()}},indent=2))
