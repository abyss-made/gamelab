"""Label and compose actual browser PNGs; never edits their internal contents."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
GAMES = [('golf','Mini Golf'),('pool','Pool'),('tycoon','Property Tycoon'),('gofish','Go Fish'),('ludo','Ludo'),('battleship','Battleship'),('colorstack','Color Stack'),('impostor','The Impostor'),('chess','Chess'),('telephone','Drawing Telephone')]
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
for width in [1440,390,932]:
    tw = 720 if width != 390 else 300
    th = round(tw * {1440:900,390:844,932:430}[width]/width)
    cols = 2 if width != 390 else 5
    out = Image.new('RGB',(cols*(tw+20)+20,((10+cols-1)//cols)*(th+50)+20),'#081421')
    draw = ImageDraw.Draw(out)
    for i,(game,name) in enumerate(GAMES):
        x=20+(i%cols)*(tw+20); y=20+(i//cols)*(th+50)
        draw.text((x,y),name,fill='#eff4de',font=FONT)
        im=Image.open(ROOT/f'screenshots/after/{game}-{width}.png').convert('RGB').resize((tw,th),Image.Resampling.LANCZOS)
        out.paste(im,(x,y+30))
    out.save(ROOT/f'overview-{width}.jpg',quality=92)
for game,width in [('pool',1440),('chess',1440),('gofish',390),('ludo',390),('tycoon',390)]:
    tw = 900 if width==1440 else 390
    th = round(tw*(900 if width==1440 else 844)/width)
    out=Image.new('RGB',(tw*2+48,th+72),'#081421'); draw=ImageDraw.Draw(out)
    for i,tag in enumerate(['before','after']):
        draw.text((16+i*(tw+16),12),f'{game} — {tag} — {width}px',font=FONT,fill='white')
        im=Image.open(ROOT/f'screenshots/{tag}/{game}-{width}.png').convert('RGB').resize((tw,th),Image.Resampling.LANCZOS)
        out.paste(im,(16+i*(tw+16),52))
    out.save(ROOT/f'comparison-{game}-{width}.jpg',quality=94)
print('PASS: 3 overview sheets and 5 before/after sheets')
