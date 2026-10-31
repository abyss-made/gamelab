"""Generate design-only HTML/SVG specimens. Never imports or modifies application code."""
from pathlib import Path
import json, math
from html import escape
P=Path(__file__).resolve().parent
(P/'mockups').mkdir(exist_ok=True);(P/'assets').mkdir(exist_ok=True)
N=[('drawguess','Draw & Guess','Creative','#adff00','Draw a little. Laugh a lot.','Your word: CAT · Draw for your party.','Brush · 10px','Undo'),('fourrow','Four in a Row','Board','#4d91ff','One drop can change everything.','Your turn · You are Red. Choose a column.','Drop in column 4','Rules'),('chess','Chess','Strategy','#d5af7e','Your next great move.','Your turn · White to move.','Move selected piece','Offer draw'),('checkers','Checkers','Strategy','#dc855e','A small move. A big capture.','Your turn · A capture is available.','Select highlighted piece','Resign'),('ludo','Ludo','Board','#ff477b','Bring the whole crew home.','You rolled 6 · Choose a movable token.','Move token 2','Rules'),('pool','Pool','Skill','#33c8ae','Find your angle.','Your turn · Solids · Drag to aim, then Shoot.','Shoot','Rules'),('colorstack','Color Stack','Cards','#4db8ff','Keep the color. Change the game.','Your turn · Match Red or 7.','Play Red 5','Draw a card'),('gofish','Go Fish','Cards','#5ed1d4','A good catch starts with a question.','Choose a rank in your hand, then a player.','Ask Nova for 7','Rules'),('wordchain','Word Chain','Words','#d5a4ff','Keep the chain alive.','Your turn · Start with T · At least 3 letters.','Send word','Rules'),('categories','Categories Rush','Words','#ffcd2d','One letter. So many possibilities.','Round 2/5 · Every answer starts with S.','I’m done','Rules'),('tictactoe','Tic Tac Toe','Board','#79c7ff','Three makes a moment.','Your turn · You are X.','Place X','Rules'),('rps','Rock Paper Scissors','Party','#ffb46e','Make your move. Keep it secret.','Round 2 · Pick before the timer ends.','Lock in Paper','Rules'),('dotsboxes','Dots & Boxes','Board','#b09bff','Connect. Close. Claim.','Your turn · Complete a box to play again.','Select a line','Rules'),('wordscramble','Word Scramble','Words','#ffc377','A little chaos. A clever answer.','Round 3/8 · Unscramble the letters.','Submit guess','Rules'),('trivia','Trivia Blitz','Party','#7ddac6','A bright idea beats the buzzer.','Question 3/10 · Pick one answer.','Lock answer','Rules'),('telephone','Drawing Telephone','Creative','#ffa6cc','Every retelling gets better.','Step 2 · Draw the prompt privately.','Done drawing','Undo'),('bluff','Bluff Battle','Party','#b59dff','Make the unbelievable believable.','Round 2/5 · Write a convincing fake answer.','Submit bluff','Rules'),('impostor','The Impostor','Party','#e697ba','Who’s just playing along?','Clue round · Your turn to give a clue.','Give clue','Rules'),('battleship','Battleship','Strategy','#65c8fa','Quiet seas. Clever moves.','Target selected · B4 · Confirm to fire.','Fire at B4','Rules'),('golf','Mini Golf','Skill','#6ed192','Small course. Big bragging rights.','Hole 2/9 · Stroke 2 · Aim, set power, putt.','Putt','Rules'),('tycoon','Property Tycoon','Board','#f0c16b','Build a little empire together.','Your turn · Review Riverside before buying.','Buy for $160','Auction')]
D={i:dict(id=i,name=n,family=f,accent=a,tagline=t,status=s,primary=p,secondary=q) for i,n,f,a,t,s,p,q in N}
def txt(x,y,s,size=24,fill='#eaf2f8',anchor='middle',weight=650):return f'<text x="{x}" y="{y}" fill="{fill}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" font-family="Inter,Arial,sans-serif">{s}</text>'
def circle(x,y,r,fill,stroke='#ffffff35',sw=2):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def rect(x,y,w,h,fill,rx=12,stroke='#294153'):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}"/>'
def path(d,fill='none',stroke='#eaf2f8',sw=6):return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'
def card(x,y,v,c='#e2e8ed',w=100,h=146,sub='',selected=False):
 return rect(x,y,w,h,c,13,'#adff00' if selected else '#ffffff40')+txt(x+16,y+27,v,20,'#06131e','start')+f'<ellipse cx="{x+w/2}" cy="{y+h/2}" rx="{w*.35}" ry="{h*.26}" fill="#ffffffa0" transform="rotate(-24 {x+w/2} {y+h/2})"/>'+txt(x+w/2,y+h*.6,v,40,'#06131e')+txt(x+w/2,y+h-14,sub,12,'#06131e')
def drawing():
 return rect(0,0,800,600,'#fff',12,'#e6edf3')+path('M220 440 L245 210 L320 280 Q400 235 480 280 L555 210 L580 440 Q400 530 220 440Z','#ffd395','#142231',8)+path('M255 235 L275 292 M543 235 L519 293',stroke='#db887c',sw=14)+circle(330,360,12,'#142231')+circle(470,360,12,'#142231')+path('M386 398 L414 398 L400 414Z','#df8a85','#142231',4)+path('M400 414 Q380 447 360 424 M400 414 Q420 447 440 424 M240 385 L180 373 M240 405 L173 417 M560 385 L620 373 M560 405 L627 417',stroke='#142231',sw=5)
def chess_piece(kind,x,y,c):
 shapes={'p':'M-10 10 Q-20 25-24 37H24Q20 25 10 10Z','r':'M-24-28H-12V-17H-5V-28H5V-17H12V-28H24V-2L14 10L20 37H-20L-14 10L-24-2Z','n':'M-24 36L-13 3L-28 0L-24-22L-8-36L-4-24L15-18Q34 3 25 36Z','b':'M0-36Q35-9 10 9L20 37H-20L-10 9Q-35-9 0-36Z','k':'M0-48V-27M-12-39H12M-22-20L22-20L12 9L22 37H-22L-12 9Z','q':'M-26-20L-10-8L0-30L10-8L26-20L17 37H-17Z'}
 body=path(shapes[kind],c,'#122130' if c!='#20384d' else '#9bb4c8',3)
 if kind=='p':body+=circle(0,-8,17,c,'#122130',3)
 body+=path('M-26 40H26',stroke='#172b3c',sw=6)
 return f'<g transform="translate({x} {y}) scale(.7)">{body}</g>'
def board(id):
 if id in ['drawguess','telephone']:return drawing()
 if id in ['chess','checkers']:
  s=rect(82,0,636,600,'#493e35',18);a=56;b=800/8
  for r in range(8):
   for c in range(8):
    x=120+c*70;y=20+r*70;s+=rect(x,y,70,70,'#dfd3ba' if (r+c)%2==0 else '#527080',0,'none')
    if id=='chess' and r in [0,1,6,7]:s+=chess_piece('p' if r in [1,6] else 'rnbqkbnr'[c],x+35,y+32,'#f8f0de' if r>3 else '#20384d')
    if id=='checkers' and (r+c)%2 and r in [0,1,2,5,6,7]:
     s+=circle(x+35,y+35,25,'#e1aa78' if r>3 else '#263d51','#f0cda3' if r>3 else '#8da8b8',3)+circle(x+35,y+35,18,'none','#ffffff40',2)
  s+=(rect(540,510,70,70,'#adff0040',0,'#adff00')+circle(505,405,8,'#adff00')+circle(645,405,8,'#adff00')) if id=='chess' else (rect(260,370,70,70,'#adff0040',0,'#adff00')+circle(365,335,25,'#263d51','#8da8b8',3)+circle(435,265,8,'#adff00'))
  return s+''.join(txt(155+c*70,596,chr(97+c),13,'#f4e6cf') for c in range(8))
 if id=='fourrow':
  s=rect(110,28,580,535,'#2c55d7',28,'#6c99ff')
  for r in range(6):
   for c in range(7):
    col=('#ff477b' if c in [2,3,4] else '#ffcd2d') if r>=4 and c<5 else '#081827';x=160+c*80;y=80+r*82
    s+=circle(x,y,31,col,'#112e68',4)
    if col!='#081827':s+=circle(x,y,23,'none','#ffffff45',2)
  return s+path('M400 6V32 M390 22L400 32L410 22',stroke='#adff00',sw=5)
 if id=='ludo':
  s=rect(100,0,600,600,'#d9e5e9',18);C=['#ff477b','#adff00','#ffcd2d','#4db8ff']
  for q,(x,y) in enumerate([(100,0),(460,0),(460,360),(100,360)]):
   s+=rect(x+8,y+8,224,224,C[q],14,'none')+rect(x+38,y+38,164,164,'#f2f5ec',30,'none')
   for t,(dx,dy) in enumerate([(75,75),(165,75),(75,165),(165,165)]):s+=circle(x+dx,y+dy,24,C[q],'#102338',3)+txt(x+dx,y+dy+6,str(t+1),17,'#102338')
  for i in range(15):
   for j in range(15):
    if i in [6,7,8] or j in [6,7,8]:s+=rect(100+j*40,i*40,40,40,'#f0f4ee',0,'#9aafb9')
  for i in range(1,6):
   for x,y,c in [(100+i*40,280,C[0]),(380,i*40,C[1]),(660-i*40,280,C[2]),(380,560-i*40,C[3])]:s+=rect(x,y,40,40,c,0,'#92a5ab')
  return s+path('M340 240L460 240L400 300Z',C[1],'none',0)+path('M460 240L460 360L400 300Z',C[2],'none',0)+path('M460 360L340 360L400 300Z',C[3],'none',0)+path('M340 360L340 240L400 300Z',C[0],'none',0)+circle(200,260,18,C[0],'#fff',4)
 if id=='pool':
  s=rect(14,74,772,440,'#243a3e',38,'#7b8d87')+rect(40,100,720,388,'#175b58',24,'#277f77')+rect(61,120,678,345,'#0a4848',12,'#20716b')
  for x,y in [(60,122),(400,110),(740,122),(60,464),(400,478),(740,464)]:s+=circle(x,y,23,'#020a13','#253e40',5)
  s+=path('M120 395 L290 320',stroke='#c4a16e',sw=9)+path('M320 305 L525 216',stroke='#f3f9e8',sw=2)
  for n,(x,y,c) in enumerate([(310,310,'#fff'),(548,206,'#ffcd2d'),(585,250,'#438bff'),(610,215,'#ff477b'),(626,293,'#0c1320'),(565,325,'#ff8c4c')]):
   s+=circle(x+3,y+5,15,'#0005','none',0)+circle(x,y,15,c,'#ffffff60')
   if n:s+=circle(x,y,7,'#fff','none',0)+txt(x,y+4,str(8 if n==4 else n),10,'#112030')
  return s
 if id in ['colorstack','gofish']:
  s=rect(20,15,760,570,'#0d3037',80,'#276069')+f'<ellipse cx="400" cy="270" rx="270" ry="170" fill="none" stroke="#ffffff0b" stroke-width="3"/>'
  if id=='colorstack':
   s+=card(260,122,'PG','#264552',110,162,'DRAW')+card(425,122,'7','#ff7c83',110,162,'RED')
   for i,(v,c,n) in enumerate([('5','#ff7c83','RED'),('2','#71b9fa','BLUE'),('+2','#ffe18a','YELLOW'),('8','#86d6b3','GREEN'),('+4','#b9a2e8','WILD')]):s+=card(100+i*120,366,v,c,105,155,n,i==0)
  else:
   s+=txt(400,85,'Ask Nova for a rank you hold',22)+card(282,130,'PG','#264552',106,150,'POND')+card(415,130,'7','#f8efd9',106,150,'BOOK 1/4')
   for i,v in enumerate(['3','4','7','7','A']):s+=card(100+i*120,366,v,'#fcf5e7',105,155,'DIAMOND' if i%2 else 'CLUB',i==2)
  return s
 if id=='tictactoe':
  s=''
  for r in range(3):
   for c in range(3):
    x=160+c*165;y=40+r*165;s+=rect(x,y,150,150,'#102b3d',22,'#345769')
    if (r,c) in [(0,0),(1,1)]:s+=path(f'M{x+48} {y+48}L{x+102} {y+102}M{x+102} {y+48}L{x+48} {y+102}',stroke='#8cceff',sw=14)
    if (r,c) in [(0,2),(2,0)]:s+=circle(x+75,y+75,40,'none','#ffc985',12)
  return s
 if id=='dotsboxes':
  s=''
  for r in range(5):
   for c in range(5):
    x=180+c*110;y=65+r*110
    if c<4:s+=path(f'M{x} {y}h110',stroke='#304d60',sw=7)
    if r<4:s+=path(f'M{x} {y}v110',stroke='#304d60',sw=7)
    s+=circle(x,y,7,'#e9f4f7')
  s+=rect(185,70,100,100,'#6093ff35',6,'none')+txt(235,130,'A',25,'#8bb8ff')+path('M180 65h110M180 65v110M180 175h110',stroke='#8bb8ff',sw=8)+path('M290 65v110',stroke='#adff00',sw=10)
  return s
 if id=='battleship':
  s=txt(400,38,'OPPONENT WATERS',18,'#96c5df')
  for r in range(10):
   for c in range(10):
    x=170+c*47;y=60+r*47;s+=rect(x,y,43,43,'#123a50',5,'#2c566a')
    if (r,c) in [(1,2),(2,2),(4,6)]:s+=path(f'M{x+12} {y+12}l19 19m0-19l-19 19',stroke='#ff947d',sw=4)
    if (r+c)%11==1:s+=circle(x+21,y+21,4,'#bcd4dd')
  return s+rect(170+3*47,60+1*47,43,43,'none',5,'#adff00')+txt(400,572,'B4 selected · Fire to confirm',19,'#adff00')
 if id=='golf':
  s=rect(25,25,750,550,'#133f35',24,'#508268')+path('M90 430L90 170L300 170L300 300L700 300L700 460Z','#277b54','#bfceaa',14)+rect(410,316,60,110,'#d4b17b',15,'none')+circle(640,382,15,'#071b18')+path('M640 380V310l42 18-42 16',stroke='#f8e5bc',sw=5)+circle(180,365,13,'#fff')+path('M200 365L345 300',stroke='#e2f1c6',sw=3)
  return s+txt(410,540,'Aim 24° · Power 45%',21,'#d5e6d3')
 if id=='tycoon':
  s=rect(100,0,600,600,'#0c2c34',20,'#597f83');cols=['#db8e89','#cfac70','#87bccb','#afa2d0','#7fb79c']
  for i in range(10):
   for x,y,w,h in [(100+i*60,0,60,82),(100+i*60,518,60,82),(100,i*60,82,60),(618,i*60,82,60)]:s+=rect(x+2,y+2,w-4,h-4,'#e9e4d5',3,'#a5b4ad')+rect(x+3,y+3,w-6,12,cols[i%5],2,'none')
  return s+txt(400,240,'RIVERSIDE',27,'#f4e9cb')+txt(400,295,'$160',55,'#f0c16b')+txt(400,340,'Rent $14 · Group: Canal',20,'#b2cad0')+circle(450,552,17,'#adff00')+txt(450,558,'A',17,'#06131d')
 if id=='rps':
  s=txt(400,70,'YOUR PICK STAYS HIDDEN',19,'#b9cedc')
  for i,(label,symbol) in enumerate([('ROCK','M-27 20L-35-8L-16-28L14-32L34-8L28 23Z'),('PAPER','M-27-34H27V34H-27Z'),('SCISSORS','M-25-30L25 30M25-30L-25 30')]):
   x=180+i*220;s+=rect(x-90,145,180,260,'#142b3b',24,'#adff00' if i==1 else '#3f596a')+f'<g transform="translate({x} 245)">'+path(symbol,'#ffdbac' if i!=2 else 'none','#ffdbac',9)+'</g>'+txt(x,370,label,18,'#f2e8db')
  return s+txt(400,480,'Paper selected · Lock in to submit',23,'#adff00')
 if id=='categories':
  s=rect(45,15,710,570,'#102331',18)+txt(100,95,'S',68,'#ffcd2d','start')+txt(230,76,'Every answer starts here.',24,'#f1e8cc','start')
  for i,(a,b) in enumerate([('Animal','Swan'),('Country','Spain'),('Food','Sushi'),('Object','Scissors')]):s+=txt(80,160+i*98,a,16,'#b4c8d4','start')+rect(80,180+i*98,640,52,'#061722',8,'#355263')+txt(100,214+i*98,b,22,'#edf3f7','start')
  return s
 if id in ['wordchain','wordscramble']:
  s=txt(400,95,'START WITH' if id=='wordchain' else 'UNSCRAMBLE',17,'#b5c8d8')
  if id=='wordchain':s+=txt(400,315,'T',185,'#d5a4ff')+txt(400,372,'Tree → Eagle → Ember → …',23,'#b6cddd')
  else:
   for i,ch in enumerate('A E R H'.split()):s+=rect(170+i*120,180,100,116,'#f0dfc3',14,'#bda784')+txt(220+i*120,260,ch,52,'#18303c')
   s+=txt(400,365,'4 letters · Medium',21,'#b6cddd')
  return s+rect(150,425,500,62,'#061722',10,'#719267')+txt(180,465,'Type your word…',23,'#9ab2c5','start')
 if id=='trivia':
  s=txt(400,95,'SCIENCE · QUESTION 3',17,'#7ddac6')+txt(400,185,'Which planet has the most',31)+txt(400,228,'prominent ring system?',31)
  for i,label in enumerate(['A   Mars','B   Saturn','C   Venus','D   Mercury']):
   x=70+(i%2)*345;y=300+(i//2)*100;s+=rect(x,y,315,78,'#164343' if i==1 else '#102a3b',12,'#adff00' if i==1 else '#355768')+txt(x+25,y+47,label,23,'#eaf4f7','start')
  return s
 if id=='bluff':return rect(60,60,680,480,'#211b3a',24,'#695987')+txt(400,140,'COMPLETE THE FACT',18,'#c7b8eb')+txt(400,220,'A group of crows is called…',31)+rect(110,290,580,130,'#0b1527',14,'#645677')+txt(140,340,'Write something believable…',22,'#b2a6cc','start')+txt(400,485,'Your answer stays anonymous until voting.',19,'#c4b8dc')
 if id=='impostor':return rect(130,50,540,470,'#251f36',24,'#6f4e77')+txt(400,123,'ONLY YOU CAN SEE THIS',16,'#d8b3db')+txt(400,225,'You know the word',31)+txt(400,300,'AVOCADO',51,'#eeb5d1')+txt(400,353,'Category: Fruits &amp; vegetables',19,'#c9b5d1')+rect(180,402,440,63,'#0e1726',10,'#735977')+txt(210,441,'Give a subtle clue…',20,'#baa9cb','start')
 raise ValueError(id)
for id,d in D.items():
 view='120 20 560 560' if id in ['chess','checkers'] else '100 0 600 600' if id=='ludo' else '150 40 510 510' if id=='battleship' else '0 60 800 460' if id=='pool' else '0 0 800 600'
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}"><title>{escape(d["name"])} proposed visual board</title>'+board(id)+'</svg>'
 (P/'assets'/f'{id}.svg').write_text(svg)
colors=['#000000','#4c4c4c','#9a9a9a','#ffffff','#ef130b','#ff7100','#ffe400','#00cc00','#00b2ff','#231fd3','#a300ba','#ff8fc8','#a0522d','#592f2a','#ffcfa8','#740b07','#c23800','#e8a200','#005510','#00569e','#0e0865','#550069']
def av(i):return f'<span class="avatar a{i}" aria-hidden="true"></span>'
def controls(d):
 id=d['id'];extra=''
 if id in ['drawguess','telephone']:
  extra='<div class="brushbar"><button class="selected">Brush</button><button>Eraser</button><button>Fill</button><label>Size <input type="range" aria-label="Brush size"></label><button>Undo</button><button>Clear</button></div><div class="palette">'+''.join(f'<button style="--sw:{c}" aria-label="Color {c}"></button>' for c in colors)+'</div>'
 if id in ['pool','golf']:extra='<div class="sliders"><label>Aim · 24°<input type="range" aria-label="Aim angle"></label><label>Power · 45%<input type="range" aria-label="Shot power"></label></div>'
 if id=='ludo':extra='<div class="tokens"><span class="die" aria-label="Rolled six"><i></i><i></i><i></i><i></i><i></i><i></i></span><button class="selected">Token 2 · 6 steps</button><button>Token 4 · 6 steps</button></div>'
 if id in ['chess','checkers']:extra='<div class="context-note">Selected: '+('White knight · g1 → f3' if id=='chess' else 'Man · c3 → e5 · capture')+'<span> Tap a legal destination</span></div>'
 return extra
for id,d in D.items():
 for mode in ['desktop','mobile']:
  brand='../../../node-server/public/'
  clock='8:42 / 9:14' if id=='chess' else '1:19' if id in ['drawguess','telephone'] else '0:09' if id in ['rps','trivia'] else '0:18' if id=='wordchain' else '0:11' if id=='ludo' else '0:24'
  hud=f'<header><a class="brand"><img src="{brand}favicon.svg" alt="">PLAYGRID</a><span class="hud-title">{d["name"]}</span><span class="clock">◷ <b>{clock}</b></span><button class="quiet">Rules</button><button class="quiet more">Sound</button></header>'
  title=f'<div class="pageheading"><div><p class="eyebrow">THE FRIDAY CREW · SAME PARTY</p><h1>{d["name"]}</h1><p class="tagline">{d["tagline"]}</p></div><a class="back">← Back to Party</a></div>'
  players=f'<div class="players"><div class="player active">{av(0)}<div><b>Alex <small>You</small></b><small>{"Red · your turn" if id=="fourrow" else "Playing · your turn"}</small></div><span class="badge">YOU</span></div><div class="player">{av(1)}<div><b>Nova</b><small>{"Yellow" if id=="fourrow" else "Playing"}</small></div></div></div>'
  if id in ['telephone','bluff','impostor']:
   players=players[:-6]+f'<div class="player">{av(2)}<div><b>Trouble</b><small>Playing</small></div></div></div>'
  stage=f'<section class="stage" aria-label="{d["name"]} proposed board"><div class="turn"><span class="dot"></span><b>{d["status"]}</b></div><div class="board-wrap"><img class="board {id}" src="../assets/{id}.svg" alt="Illustrative {d["name"]} game state"></div>{controls(d)}<div class="actionbar"><span class="micro">'+('Your word · <b>CAT</b>' if id=='drawguess' else 'Choose carefully. Your move matters.')+f'</span><button>{d["secondary"]}</button><button class="primary">{d["primary"]}</button></div></section>'
  sidebar=f'<aside><div class="panel"><p class="eyebrow">PARTY SCOREBOARD</p><h2>Good company.</h2>{players}<div class="spectators">{av(2)}<span>Trouble is watching</span></div></div><div class="panel chat"><div class="chat-heading"><h2>Party chat</h2><span>2</span></div><p><b>Nova</b> Nice move!</p><p><b>Alex</b> Let’s go again after this.</p><div class="chat-compose">Message the party… <span>↗</span></div></div><div class="annotation"><b>3.1 DESIGN PROPOSAL</b><p>Illustrative state, not live gameplay.<br>Motion and permission states are specified in HANDOFF.md.</p></div></aside>'
  if id in ['telephone','bluff','impostor']:
   sidebar=sidebar.replace('Trouble is watching','Kai is watching')
  mobilebottom='<div class="mobile-social"><button>Players &amp; spectators</button><button>Chat · 2</button></div>'
  annotation=f'<footer>DESIGN ONLY · {d["family"].upper()} / {id} · '+('1440 × 900' if mode=='desktop' else '390 × 844')+' · Art direction specimen, not a production screenshot.</footer>'
  body=hud+title+players+'<main>'+stage+sidebar+'</main>'+mobilebottom+annotation
  html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="../design.css"><title>'+d['name']+' · Playgrid 3.1 proposal</title><body class="'+mode+' '+id+'" style="--accent:'+d['accent']+'">'+body+'</body></html>'
  (P/'mockups'/f'{id}-{mode}.html').write_text(html)
(P/'games.json').write_text(json.dumps(list(D.values()),indent=2)+'\n')
(P/'asset-manifest.json').write_text(json.dumps({'baseline':'d89486c609b40cf21158d1625c8469194a3531c3','reuse':[{'path':'../../node-server/public/favicon.svg','use':'Unchanged approved Playgrid mark'},{'path':'../../node-server/public/assets/player-portraits.png','use':'Existing 2×2 portrait sprite; CSS positions only'},{'path':'../../node-server/public/assets/fonts/inter-variable.ttf','license':'Existing fonts/OFL.txt','use':'Self-hosted Inter'}],'original_design_vectors':[{'id':i,'path':f'assets/{i}.svg','source':'build.py / board(); original vector design specimen','implementation':'Design reference only; retain live board geometry and authoritative server state, never serve as game background'} for i in D],'not_used':'No stock imagery, generated raster assets, new branding or third-party piece fonts'},indent=2)+'\n')
