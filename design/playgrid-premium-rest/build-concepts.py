"""Original Issue #55 Stage A design source. No runtime game code or external APIs."""
from pathlib import Path
from html import escape as esc
import json,re
P=Path(__file__).resolve().parent;A=P/'assets';A.mkdir(exist_ok=True)
GAMES=[('drawguess','Draw & Guess','Sketch Club'),('fourrow','Four in a Row','Drop Society'),('tictactoe','Tic Tac Toe','Cross & Circle'),('rps','Rock Paper Scissors','Throwdown'),('dotsboxes','Dots & Boxes','Stitch & Claim'),('wordscramble','Word Scramble','Letterworks'),('trivia','Trivia Blitz','Orbit Quiz'),('wordchain','Word Chain','Chain Reaction'),('categories','Categories Rush','The Fieldbook'),('telephone','Drawing Telephone','Paper Relay'),('bluff','Bluff Battle','The Velvet Lie'),('impostor','The Impostor','Confidential Club'),('checkers','Checkers','Emerald House')]
def svg(name,w,h,content,defs=''):
 (A/(name+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img"><title>Original Playgrid {name.replace("-"," ")}</title><defs>{defs}</defs>{content}</svg>')
def path(d,c='none',s='#263c46',w=4):return f'<path d="{d}" fill="{c}" stroke="{s}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
def circle(x,y,r,c,s='none',w=1):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" stroke="{s}" stroke-width="{w}"/>'
# Original ink drawing, deliberately sketch-like to suit the live canvas rather than a stock sticker.
s=path('M162 442Q113 425 129 382Q155 362 188 379L258 348Q292 292 325 243Q290 170 320 123L387 199Q401 172 424 166L448 107 469 162Q511 152 540 188Q566 178 578 200Q602 235 565 251L526 251Q505 275 477 284Q506 310 495 352Q476 386 443 383L423 448 380 451 395 402Q351 430 307 416L273 466 235 457 259 405Q209 419 162 442Z','#78b968','#294d47',8)
s+=path('M329 246Q259 171 222 131Q164 168 125 224Q114 267 132 307Q169 254 209 261Q245 266 263 308L297 282Z','#a1cc73','#294d47',7)
s+=path('M139 290Q164 228 222 131M210 260L222 131M269 299L222 131',s='#477653',w=4)
s+=path('M339 242Q357 224 370 218M377 205l-12-43M407 181l-4-32M470 165l-11-37',s='#294d47',w=7)
s+=path('M472 275Q438 282 410 315Q382 351 397 394Q425 383 448 375L472 318Z','#d0d98a','#477653',4)
for y in [301,324,347,370]:s+=path(f'M407 {y}l33 9',s='#6e965d',w=3)
s+=path('M316 397Q298 365 274 363M441 378Q448 346 473 337M248 458l-8 10m19-9-4 12m130-22-6 11m17-11-4 11',s='#294d47',w=5)
s+=circle(508,204,11,'#fff6d4','#294d47',3)+circle(512,204,5,'#294d47')+circle(556,219,4,'#294d47')+path('M528 242q16 12 31-3',s='#294d47',w=4)
s+=path('M586 248Q636 220 654 240Q651 257 629 262Q686 247 709 281Q665 274 653 295Q630 288 625 276Q610 280 586 248Z','#efae4d','#df8c42',4)+path('M609 251q30-8 45 9-24 3-16 16Z','#f9d985','none',0)
s+=path('M159 473q102 15 201-2M416 472q47 6 68-2',s='#c7d2c4',w=3)
svg('sketch-dragon',800,600,s)
# Separate original illustration for telephone's current drawing prompt, no earlier-chain leakage.
s=path('M170 443L198 288H597L624 443Z','#e0b991','#725b55',5)+path('M180 444H615L596 482H201Z','#c7987c','#725b55',5)
s+=path('M270 292Q231 229 278 188L289 117 344 153Q382 130 426 151L484 117 491 194Q535 236 491 292Z','#cfa37f','#5b5554',7)
s+=path('M292 155l3-24 28 25M452 157l25-25 1 32','#eac8a3','#8e7062',3)+path('M313 222q15-17 29 0M426 222q15-17 29 0',s='#5b5554',w=5)
s+=path('M375 239l17 0-8 10Z','#bc7d76','#5b5554',3)+path('M384 251q-9 17-22 1m22-1q12 17 25 0M307 240l-40-6m43 19-40 7m183-20 43-6m-43 20 42 8',s='#5b5554',w=3)
s+=path('M304 285L337 269Q384 303 429 269L469 289 447 397H327Z','#7fa8a4','#5b5554',5)+path('M341 286l5 88h78l6-88M366 335h38v27h-38Z','#adc7b2','#567b7a',3)
s+=path('M292 305Q242 301 240 336Q252 359 286 344M478 302q50-2 51 35-18 22-48 6','#cfa37f','#5b5554',5)
# Hand-drawn bread and flour details.
for x,y in [(253,397),(359,416),(477,397)]:
 s+=path(f'M{x-47} {y+21}q-6-50 40-57q48-9 59 39l-3 20Z','#e3b56c','#936e53',4)
 for k in range(3):s+=path(f'M{x-16+k*19} {y-21}l-8 21',s='#fff1b5',w=5)
s+=path('M561 338v-58h44v58Z','#f1e5c5','#8f8875',4)+path('M568 293h30m-30 11h30',s='#c6bca3',w=2)
s+=path('M173 495q206 15 444 0',s='#d5d4bd',w=3)
svg('relay-cat-baker',800,600,s)
# Hand illustrations for the tournament, not emoji or branded assets.
handdefs='<linearGradient id="skin" x2=".4" y2="1"><stop stop-color="#efcaa1"/><stop offset="1" stop-color="#ce997d"/></linearGradient>'
rock=path('M56 92V74q0-17 15-17 2-17 19-15 7-16 24-7 16-8 26 6 22-1 25 23v48q-2 33-30 43H79q-29-14-29-44Z','url(#skin)','#5b6473',4)+path('M76 79v20m22-29v24m23-21v24m22-12v17M58 109q21-17 35 4l-6 17M78 142h61',s='#a37666',w=3)
paper=path('M71 155Q48 125 43 101q0-14 12-15l23 26-6-70q0-16 13-15 12 0 13 13l5 47-1-65q1-14 13-13 12 0 12 14l1 62 4-55q2-13 14-10 11 2 9 15l-2 56 7-37q4-13 15-9 11 4 7 17l-9 67q-4 32-30 48Z','url(#skin)','#5b6473',4)+path('M86 103q32-16 55 13M103 95v33m22-32 1 27m20-27-3 25',s='#ad7c68',w=3)
scissors=path('M71 156Q51 134 55 111q0-16 18-18l-8-56q-1-17 13-18 11 1 16 15l18 59 27-65q6-15 20-8 11 6 5 22l-20 62q27-15 36 5 8 19-9 42l-20 18Z','url(#skin)','#5b6473',4)+path('M74 97q21-10 29 12l-4 29M111 103q16-12 28 6l-9 21M145 112q12-9 20 1M80 150h52',s='#ad7c68',w=3)
for name,art in [('rock',rock),('paper',paper),('scissors',scissors)]:svg('throw-'+name,210,190,art,handdefs)
# Small original line icons, shared drawing controls.
ICONS={'Brush':'M5 18l11-11 3 3-11 11-4 1Z M14 9l3 3','Erase':'M4 14l9-10 7 7-9 10H8Z M8 19h12','Fill':'M5 8l7-5 8 10-9 6-8-8Z M7 6l11 9 M19 18q4 4 0 5-4-1 0-5','Undo':'M8 5L3 10l5 5 M3 10h10q9 0 7 8','Clear':'M4 7h16 M9 4h6 M7 8l1 13h8l1-13 M10 11v6m4-6v6'}
COLORS=['#18252b','#8c9697','#ffffff','#e95c62','#f3974c','#efcf62','#a5c954','#56a36d','#4c9ba0','#5798cc','#656ac0','#9b64bb','#edb1bf','#b3896d','#e4c19e','#b64e48','#9b693b','#7c8b43','#276762','#26556f','#393b7c','#683a76']
def tools(telephone=False):
 return '<div class="tools"><div class="tool-buttons">'+''.join(f'<button type="button" class="{"on" if i==0 else ""}" aria-label="{n}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="{d}"/></svg>{n}</button>' for i,(n,d) in enumerate(ICONS.items()))+'</div><div class="palette" role="group" aria-label="Drawing colors">'+''.join(f'<button type="button" class="{"on" if i==0 else ""}" style="--c:{c}" aria-label="Color {c}"></button>' for i,c in enumerate(['#000000','#9a9a9a','#ffffff','#ef130b','#ff7100','#ffe400','#00cc00','#00b2ff','#231fd3','#a300ba','#ff8fc8','#a0522d'] if telephone else COLORS))+'</div><label class="brush-size">SIZE · 10<input type="range" min="4" max="38" value="10" aria-label="Brush size"></label></div>'
def person(name='Alex',i=0,sub='You · 840 pts',active=False,extra=''):
 return f'<div class="person {"active" if active else ""}"><span class="avatar a{i}" role="img" aria-label="{name} avatar"></span><span><b>{name}</b><small>{sub}</small></span>{extra}</div>'
def rail():return '<div class="player-rail">'+''.join(person(n,i,s) for n,i,s in [('Alex',0,'You · 840 pts'),('Nova',1,'1,020 pts'),('Trouble',2,'760 pts'),('Kai',3,'620 pts')])+'</div>'
def scores():return '<aside class="scoreboard"><h3>AT THE TABLE</h3>'+''.join(person(n,i,'You' if i==0 else 'Playing',extra=f'<strong>{v}</strong>') for n,i,v in [('Nova',1,'1,020'),('Alex',0,'840'),('Trouble',2,'760'),('Kai',3,'620')])+'</aside>'
def form(placeholder,button,value=''):
 return f'<div class="answer-form"><input aria-label="{esc(placeholder)}" placeholder="{esc(placeholder)}" value="{esc(value)}"><button type="button" class="primary">{button}</button></div>'
def status(t):return '<div class="status"><i aria-hidden="true"></i>'+t+'</div>'
def phase(kicker,title,time='0:24',extra=''):
 return f'<div class="phasebar"><div><span class="eyebrow">{kicker}</span><h1>{title}</h1></div><div class="phase-meta">{extra}<div class="clock"><small>TIME</small>{time}</div></div></div>'
def make(game,body):
 id,name,direction=game;(P/id).mkdir(exist_ok=True)
 # Illustrative scores respect the scale and current round of each actual game.
 score_sets={'wordscramble':('220','180','160','120'),'trivia':('580','440','360','320'),'categories':('8','6','5','4'),'bluff':('4','2','1','0'),'impostor':('0','0','0','0')}
 if id in score_sets:
  for old,new in zip(['1,020','840','760','620'],score_sets[id]):body=body.replace(old,new)
 s=f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="data:,"><link rel="stylesheet" href="../shared.css"><title>{name} · {direction} · Stage A concept</title></head><body class="{id}"><header><span class="brand"><img src="../../../node-server/public/favicon.svg" alt="Playgrid">PLAYGRID</span><span class="game-name">{name}</span><div class="header-tools"><button type="button">Rules</button><button type="button" class="sound">Sound</button></div></header><main>{body}</main><footer><button type="button">← Party</button><span class="foot-note">The Friday Crew · Private party</span><div class="row"><button type="button">Players</button><button type="button">Chat · 2</button></div></footer></body></html>'
 (P/id/'concept.html').write_text(s)
# 1. A real illustration on the drawing surface, with the private word shown only for this drawer concept.
body=phase('SKETCH CLUB · ROUND 2 / 3','You are drawing: <strong>DRAGON</strong>','1:18','<span class="pill">Medium</span>')
body+='<div class="draw-layout scene">'+tools()+'<div class="paper"><span class="page-corner">THE SKETCH CLUB / PLAYGRID</span><img src="../assets/sketch-dragon.svg" alt="Original illustrative dragon sketch on a warm white drawing surface"></div><aside class="draw-side"><div class="prompt-card"><span class="eyebrow">YOUR SECRET WORD</span><strong>DRAGON</strong></div><div class="player-rail">'+person('Nova',1,'Guessing',extra='<strong>1,020</strong>')+person('Trouble',2,'Guessing',extra='<strong>760</strong>')+person('Kai',3,'Guessing',extra='<strong>620</strong>')+'</div><div class="guesses"><h3>LIVE GUESSES</h3><div class="guess-feed"><p><b>Nova</b> dinosaur?</p><p><b>Trouble</b> something with wings</p><p><b>Kai</b> fire breathing lizard</p><p><b>Nova</b> wait, I know this</p></div><div class="chat-compose"><input placeholder="Chat with the party…" aria-label="Party chat"><button type="button">Send</button></div></div></aside></div>'
make(GAMES[0],body)
# Board samples are inspectable original HTML components, never intended as state/engine logic.
def duel(left='Alex',right='Nova',subleft='You · Red',subright='Yellow'):
 return '<div class="duel-rail">'+person(left,0,subleft,True)+person(right,1,subright)+'</div>'
def boardwrap(content,lefttitle,leftcopy,righttitle,rightcopy,boardstatus,dual):
 return '<div class="board-layout scene">'+dual+'<aside class="board-aside"><span class="eyebrow">PLAYGRID TABLETOP</span><h2>'+lefttitle+'</h2><p>'+leftcopy+'</p>'+person('Alex',0,'You · Your turn',True)+'</aside><div class="board-main">'+content+status(boardstatus)+'</div><aside class="board-aside">'+person('Nova',1,'Your opponent')+'<div><span class="eyebrow">'+righttitle+'</span><p>'+rightcopy+'</p></div></aside></div>'
cols=[[0,0,0,0,2,1],[0,0,0,0,1,2],[0,0,0,2,1,1],[0,0,0,1,2,2],[0,0,0,0,2,1],[0,0,0,0,0,0],[0,0,0,0,0,0]]
board='<div class="column-labels" aria-hidden="true">'+''.join(f'<span>{c+1}</span>' for c in range(7))+'</div><div class="connect-board" role="group" aria-label="7 column, 6 row Four in a Row board">'
for c,values in enumerate(cols):board+=f'<button type="button" class="connect-col" aria-label="Drop Red in column {c+1}">'+''.join('<span class="slot">'+(f'<i class="disc {"gold" if v==2 else ""}"></i>' if v else '')+'</span>' for v in values)+'</button>'
board+='</div><p class="caption">Choose a column. Drop into place.</p>'
# 12 sample discs, six each; Red's turn is coherent.
make(GAMES[1],phase('DROP SOCIETY · YOUR TURN','One move. Four together.','0:26')+boardwrap(board,'A little gravity.<br>A clever move.','You play <b>Red</b>. Connect four discs in any direction.','MAKE YOUR MOVE','Your disc settles in the lowest open slot. Connect four horizontally, vertically or diagonally.','Your turn · You are Red',duel()))
marks=['x','o','','','x','','','','o'];cells=''
for i,v in enumerate(marks):
 mark=('<svg viewBox="0 0 100 100" aria-hidden="true">'+(path('M22 22L78 78M78 22L22 78',s='#517f9b',w=19) if v=='x' else circle(50,50,33,'none','#d78073',17))+'</svg>') if v else '<span></span>'
 cells+=f'<button type="button" class="ceramic-cell {"empty" if not v else ""}" aria-label="Row {i//3+1}, column {i%3+1}: {v.upper() or "empty"}" {"disabled" if v else ""}>{mark}</button>'
board='<div class="ceramic-board" role="group" aria-label="Tic Tac Toe board">'+cells+'</div><p class="caption">Small board. Plenty of possibility.</p>'
make(GAMES[2],phase('CROSS & CIRCLE · YOUR TURN','Make your mark.','0:28')+boardwrap(board,'Simple.<br>Never ordinary.','You are <b>X</b>. Make a line of three before Nova does.','WINNER STAYS','Win the board and keep your seat for the next challenger. Three in a row takes it.','Your turn · You are X',duel(subleft='You · X',subright='O')))
# 4. Tournament pick state: opponent pick is private and no move is locked yet.
body=phase('THROWDOWN · SEMIFINAL · BEST OF 3','Read the room. Make your throw.','0:09')+'<div class="throw-layout scene"><div class="throw-arena"><div class="versus-scene"><div class="duelist"><span class="avatar a0"></span><b>Alex</b><small>YOU · 1 THROW WON</small></div><span class="versus">VS</span><div class="duelist"><span class="avatar a1"></span><b>Nova</b><small>PICK HIDDEN · 0 WON</small></div></div><div class="throw-choices">'+''.join(f'<button type="button" class="throw-choice"><img src="../assets/throw-{n}.svg" alt="Original illustrated {n} hand throw">{n.title()}</button>' for n in ['rock','paper','scissors'])+'</div>'+status('Tap a throw to lock it. Both picks reveal together.')+'<p class="caption">No tells. No take-backs. Just one good guess.</p></div><aside class="bracket"><h3>The bracket</h3><div class="bracket-round"><small>SEMIFINALS</small><div class="match"><div class="me"><span>Alex</span><b>1</b></div><div><span>Nova</span><b>0</b></div></div><div class="match"><div><span>Trouble</span><b>0</b></div><div><span>Kai</span><b>1</b></div></div></div><div class="bracket-round"><small>FINAL</small><div class="match"><div><span>Winner of match 1</span></div><div><span>Winner of match 2</span></div></div></div></aside></div>'
make(GAMES[3],body)
# 5. Four by four quilt. Claimed squares have all four boundary edges, no speculative ownership.
owned={(0,0):0,(0,1):1,(1,0):0,(2,2):1,(3,2):0};edges={}
for (r,c),o in owned.items():
 for e in [('h',r,c),('h',r+1,c),('v',r,c),('v',r,c+1)]:edges[e]=o
edges.update({('h',0,2):1,('v',1,2):1,('h',3,0):0})
quilt='<div class="quilt-board" role="group" aria-label="Dots and Boxes, 4 by 4 boxes">'
for r in range(9):
 for c in range(9):
  if r%2==0 and c%2==0:quilt+='<span class="junction"></span>'
  elif r%2 and c%2:
   o=owned.get(((r-1)//2,(c-1)//2));quilt+=f'<span class="patch {"blank" if o is None else ""}" style="--thread:{["#618ea5","#c9827a"][o] if o is not None else "transparent"}">{["A","N"][o] if o is not None else ""}</span>'
  else:
   vertical=c%2==0;key=('v' if vertical else 'h',(r-1)//2 if vertical else r//2,c//2 if vertical else (c-1)//2);o=edges.get(key)
   quilt+=f'<button type="button" class="quilt-edge {"vertical" if vertical else ""} {"taken" if o is not None else ""}" style="--thread:{["#618ea5","#c9827a"][o] if o is not None else "transparent"}" aria-label="{key[0]} edge row {key[1]+1}, column {key[2]+1}{", taken" if o is not None else ""}" {"disabled" if o is not None else ""}></button>'
quilt+='</div><p class="caption">Complete a box. Keep your turn.</p>'
make(GAMES[4],phase('STITCH & CLAIM · 4 × 4 BOXES','Join the dots. Claim your patch.','0:24')+boardwrap(quilt,'Every line<br>leaves a mark.','Blue thread is Alex. Coral thread is Nova. Claimed patches carry their owner’s initial.','BOXES CLAIMED','Alex · 3 boxes<br>Nova · 2 boxes','Your turn · Choose an unclaimed edge',duel(subleft='You · 3 boxes',subright='2 boxes')))
# 6. Typed solution remains the supported interaction; letters are presentation, not a new drag game.
body=phase('LETTERWORKS · WORD 3 / 8','Find the word in the jumble.','0:23')+'<div class="word-scene scene"><section class="word-work"><span class="mini-title">MEDIUM · 5 LETTERS</span><div class="letter-tiles">'+''.join(f'<span class="letter-tile" style="--r:{r}deg">{c}</span>' for c,r in zip('CENAO',[-5,2,-2,4,-2]))+'</div><div class="wordslots" aria-hidden="true">'+('<i></i>'*5)+'</div><h2>A little rearranging.</h2>'+form('Type the word','Guess')+'<p class="caption">Everyone sees the same letters.<br>Your answer stays private until the reveal.</p></section>'+scores()+'</div>'
make(GAMES[5],body)
# 7. Quiz quality reference without copied Kahoot shapes/assets.
body=phase('ORBIT QUIZ · QUESTION 4 / 10','Trivia Blitz','0:12')+'<section class="quiz-scene scene"><div class="quiz-progress" aria-label="Question 4 of 10">'+''.join(f'<i class="{"done" if i<3 else "now" if i==3 else ""}"></i>' for i in range(10))+'</div><span class="quiz-category">GEOGRAPHY</span><h2 class="question">Mount Everest is part of<br>which mountain range?</h2><div class="quiz-answers">'+''.join(f'<button type="button"><kbd>{i+1}</kbd>{a}</button>' for i,a in enumerate(['Alps','Himalayas','Rockies','Andes']))+'</div><p class="caption">Pick once to lock your answer · Keyboard 1–4</p>'+rail()+'</section>'
make(GAMES[6],body)
# 8. Accepted history is a chain, not predictions; current terminal R is consistent.
body=phase('CHAIN REACTION · YOUR TURN','Keep a good thing going.','0:17')+'<div class="word-scene scene"><section class="word-work"><div class="chain-players">'+person('Alex',0,'You · 3 lives',True,'<span class="lives" aria-hidden="true"><i></i><i></i><i></i></span>')+person('Nova',1,'2 lives',False,'<span class="lives" aria-hidden="true"><i></i><i></i><i class="off"></i></span>')+person('Kai',3,'3 lives',False,'<span class="lives" aria-hidden="true"><i></i><i></i><i></i></span>')+'</div><div class="chain-hero"><span class="letter-tile">R</span><div class="chain-guide"><span class="eyebrow">NEXT WORD STARTS WITH</span><h2>Take the last letter.<br>Start something new.</h2><p>At least 3 letters. No repeats.<br>Accepted words keep the chain alive.</p></div></div>'+form('Word starting with R','Send word','river')+'<p class="caption">The next player starts with your last letter.<br>Only accepted words join the chain.</p></section><aside class="chain-history"><h3>THE CHAIN SO FAR</h3>'+''.join(f'<div class="chain-node"><b>{w[:-1]}<em>{w[-1]}</em></b><small>{n}</small></div>' for w,n in [('ORCHARD','Nova'),('DRAGON','Kai'),('NECTAR','Alex'),('ROCKET','Nova'),('TIGER','Kai')])+'</aside></div>'
make(GAMES[7],body)
# 9. Exactly five current categories, four filled sample answers, no premature server validation badges.
body=phase('THE FIELDBOOK · ROUND 2 / 5','Five categories. One letter.','0:42')+'<div class="field-layout scene"><section class="fieldbook"><div class="field-head"><span class="letter-tab">B</span><div><h2>Begin with B.</h2><p>Find something for every line.<br>Keep your answers to yourself.</p></div></div><div class="field-rows">'+''.join(f'<label class="field-row"><span>0{i+1}</span><b>{n}</b><input aria-label="{n}, starts with B" value="{v}" placeholder="B…"></label>' for i,(n,v) in enumerate([('Animal','Bison'),('Food','Bread'),('Country','Brazil'),('City','Berlin'),('Boy name','')]))+'</div><div class="field-actions"><p>4 / 5 fields filled · Drafts stay private<br>“I’m done” locks your answers for this round.</p><button type="button" class="primary">I’m done</button></div></section>'+scores().replace('</aside>','<p>Unique answers · 2 points<br>Matching answers · 1 point<br>Results appear after the round.</p></aside>')+'</div>'
make(GAMES[8],body)
# 10. Only current source prompt appears; no early chain preview.
body=phase('PAPER RELAY · STEP 2 / 4','Pass the imagination.','0:48','<div class="relay-spine" aria-label="Relay step 2 of 4"><span>1</span><span class="now">2</span><span>3</span><span>4</span></div>')+'<div class="draw-layout scene">'+tools(True)+'<div class="paper"><span class="page-corner">PAPER RELAY / DRAW THIS MOMENT</span><img src="../assets/relay-cat-baker.svg" alt="Original sample drawing of a cat running a bakery"></div><aside class="draw-side"><div class="prompt-card"><span class="eyebrow">YOUR PRIVATE DRAWING BRIEF</span><strong>A cat running<br>a bakery.</strong><p>Draw what you read. The next player will only see your picture.</p></div><div class="ready-list">'+person('Alex',0,'Drawing now',True,'<small class="state">YOU</small>')+person('Nova',1,'Working…')+person('Trouble',2,'Done',False,'<small class="state">LOCKED</small>')+person('Kai',3,'Working…')+'</div><button type="button" class="primary">Done · pass my drawing</button><p class="caption">Tap Done when your drawing is ready.<br>The whole story reveals at the end.</p></aside></div>'
make(GAMES[9],body)
# 11. Real bank question; answer authors/real flag remain undisclosed. Sample option texts are illustrative.
body=phase('THE VELVET LIE · QUESTION 2 / 5','Find the truth in good company.','0:16')+'<section class="bluff-scene scene"><div class="bluff-question"><span class="eyebrow">THE BLUFFS ARE IN · CHOOSE THE REAL ANSWER</span><h2>The “#” symbol is technically<br>called an…</h2></div><div class="bluff-options">'+''.join(f'<button type="button" class="answer-slip" {"disabled" if i==4 else ""}><span>0{i+1}</span>{t}'+('<small>YOUR BLUFF</small>' if i==4 else '')+'</button>' for i,t in enumerate(['Octothorpe','Gridmark','Crosslet','Number lattice','Hatchmark']))+'</div><p class="caption">One vote locks your choice. You can’t vote for your own bluff.<br>Authors and the real answer reveal together.</p>'+rail()+'</section>'
make(GAMES[10],body)
# 12. Crew-private view. No public participant role labels; other clients must not receive this word.
body=phase('CONFIDENTIAL CLUB · ROUND 1 / 3 · CLUE LAP 1 / 2','Someone is blending in.','0:26')+'<div class="dossier-layout scene"><section class="private-folder"><span class="confidential-stamp">FOR YOUR EYES ONLY</span><small>YOUR PRIVATE ROLE</small><h2>You are crew.</h2><div class="secret">CANDLE</div><small>CATEGORY · HOUSEHOLD ITEMS</small><p>Give a clue that proves you know.<br>Don’t give the word away.</p><button type="button">Cover word</button></section><section class="clue-ledger"><div><span class="eyebrow">PUBLIC CLUE LEDGER</span><h2>Every clue leaves a trace.</h2></div><div class="clue-item">'+person('Nova',1,'Gave a clue')+'<b>wick</b></div><div class="clue-item">'+person('Trouble',2,'Gave a clue')+'<b>wax</b></div>'+form('Your short clue','Give clue','glow')+'<p class="private-note">Your turn. The word is private; your clue will be public.<br>Discussion and voting follow the clue laps.</p></section></div>'+rail()
make(GAMES[11],body)
# 13. Initial 24-piece board, local c3 man and two legal destinations shown as a selection study.
board='<div class="checkers-board" role="group" aria-label="Checkers board">'
for r in range(8):
 for c in range(8):
  dark=(r+c)%2==1;piece=dark and (r<3 or r>4);ivory=r<3;selected=(r,c)==(5,2);target=(r,c) in [(4,1),(4,3)]
  board+=f'<button type="button" class="check-square {"dark" if dark else ""} {"selected" if selected else ""}" aria-label="{"abcdefgh"[c]}{8-r}: '+('Ivory man' if ivory and piece else 'Jade man' if piece else 'legal destination' if target else 'empty')+'">'+(f'<span class="check-piece {"ivory" if ivory else ""}"></span>' if piece else '<span class="check-target"></span>' if target else '')+'</button>'
board+='</div><p class="caption">Piece selected · c3 → b4 or d4</p><div class="row"><button type="button" class="quiet">Resign</button></div>'
make(GAMES[12],phase('EMERALD HOUSE · YOUR TURN','A classic worth coming back to.','0:25')+boardwrap(board,'Quiet board.<br>Sharp thinking.','Polished jade and ivory. A clear destination for every legal move.','AT THE TABLE','Alex · Jade · 12 pieces<br>Nova · Ivory · 12 pieces','Your turn · Choose a highlighted square',duel(subleft='You · Jade · 12 pieces',subright='Ivory · 12 pieces')))
(P/'games.json').write_text(json.dumps([{'id':i,'name':n,'direction':d} for i,n,d in GAMES],indent=2)+'\n')
print('Built thirteen original concept pages and original SVG art.')
