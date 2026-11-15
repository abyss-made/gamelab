"""Compose saved browser PNGs with labels outside the images; never repaint gameplay."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent;FONT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
names=['Palm Promenade','Crate Escape','Lagoon Bend','Sandy Shortcut','Split Decision','Clubhouse Finish']
for width in [1440,390]:
 tw=600 if width==1440 else 300;th=round(tw*({1440:900,390:844}[width])/width);cols=3;out=Image.new('RGB',(cols*(tw+16)+16,2*(th+46)+16),'#081b29');d=ImageDraw.Draw(out)
 for i,n in enumerate(names):
  x=16+(i%3)*(tw+16);y=16+(i//3)*(th+46);d.text((x,y),f'{i+1}. {n}',font=FONT,fill='white');im=Image.open(ROOT/f'screenshots/hole-{i+1:02}-follow-{width}.png').convert('RGB').resize((tw,th),Image.Resampling.LANCZOS);out.paste(im,(x,y+30))
 out.save(ROOT/f'coastal-{width}.jpg',quality=93)
for width in [1440,390]:
 tw=900 if width==1440 else 390;th=round(tw*({1440:900,390:844}[width])/width);out=Image.new('RGB',(tw*2+48,th+60),'#081b29');d=ImageDraw.Draw(out)
 for i,tag in enumerate(['before','after']):
  path=ROOT/f'screenshots/{tag}/meadow-follow-{width}.png';im=Image.open(path).convert('RGB').resize((tw,th),Image.Resampling.LANCZOS);out.paste(im,(16+i*(tw+16),44));d.text((16+i*(tw+16),10),f'{tag.title()} · same Meadow hole · {width}px',font=FONT,fill='white')
 out.save(ROOT/f'comparison-{width}.jpg',quality=94)
print('PASS: four labeled actual-screenshot sheets')
