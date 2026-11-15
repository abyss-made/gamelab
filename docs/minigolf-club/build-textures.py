"""Original deterministic golf materials; no source photographs or publisher assets."""
from pathlib import Path
from PIL import Image, ImageDraw
import random, math, hashlib, json
OUT=Path(__file__).resolve().parents[2]/'node-server/public/assets/golf-club';OUT.mkdir(exist_ok=True)
rng=random.Random(6147)
for kind in ['turf','stone','wood','water','sand']:
 n=512;im=Image.new('RGB',(n,n));pixels=im.load()
 for y in range(n):
  for x in range(n):
   noise=rng.uniform(-1,1)
   if kind=='turf':
    check=1 if (x//128+y//128)%2==0 else -1;base=(48+check*4,137+check*7,53+check*2);amp=10
   elif kind=='stone':base=(195,204,202);amp=8
   elif kind=='wood':
    grain=math.sin(y*.4+math.sin(x*.025)*3)*6;base=(130+grain,91+grain*.6,49+grain*.3);amp=5
   elif kind=='sand':base=(227,199,143);amp=14
   else:
    wave=math.sin(x*math.pi/64+math.sin(y*math.pi/128)*2)*math.sin(y*math.pi/64+math.cos(x*math.pi/128)*2);caustic=max(0,abs(wave)-.77)*130;base=(33+caustic,159+caustic,190+caustic);amp=2
   pixels[x,y]=tuple(max(0,min(255,int(c+noise*amp))) for c in base)
 d=ImageDraw.Draw(im)
 if kind=='turf':
  for i in range(13000):
   x=rng.randrange(n);y=rng.randrange(n);d.line((x,y,x+rng.choice([-1,0,1]),y-2),fill=rng.choice([(79,161,63),(43,123,43),(66,151,49)]),width=1)
 elif kind=='stone':
  for row in range(8):
   for col in range(-1,5):
    x=col*128+(row%2)*64;y=row*64
    d.rounded_rectangle((x+2,y+2,x+125,y+61),radius=3,outline=(123,150,154),width=3)
    d.line((x+5,y+5,x+122,y+5),fill=(232,237,227),width=3)
    d.line((x+5,y+6,x+5,y+56),fill=(220,227,218),width=2)
    d.line((x+8,y+58,x+122,y+58),fill=(151,169,169),width=2)
 elif kind=='wood':
  for i in range(0,512,64):
   d.line((0,i,512,i),fill=(72,50,30),width=4);d.line((0,i+4,512,i+4),fill=(169,128,69),width=2)
  for i in range(0,512,128):
   for j in [12,500]:d.ellipse((j-3,i+18,j+3,i+24),fill=(54,50,38))
 im.save(OUT/(kind+'.png'),optimize=True)
print('Built five original seamless golf materials')
