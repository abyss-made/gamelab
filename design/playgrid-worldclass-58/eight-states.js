/* Approved-layout state references. Fixed design fixtures, never server gameplay. */
(async()=>{
 const key=new URLSearchParams(location.search).get('state')||'active',game=document.body.dataset.game,main=document.querySelector('main'),$=s=>main.querySelector(s),all=s=>[...main.querySelectorAll(s)];
 const models=await fetch('../state-model.json').then(r=>r.json()),model=models.find(g=>g.id===game);if(!model?.states.some(s=>s.id===key))throw Error('Unknown reference state');
 document.body.classList.add('feel-state','state-'+key);const disable=()=>all('button,input,select').forEach(e=>e.disabled=true);
 const card=(title,copy,html='')=>`<section class="feel-state-card"><span class="eyebrow">${model.name.toUpperCase()}</span><h1>${title}</h1><p>${copy}</p>${html}</section>`;
 function replace(t,p,h=''){main.classList.add('feel-replaced');main.innerHTML=card(t,p,h);}
 function note(t){let n=$('.under-note,.selection-label,.caption');if(!n){n=document.createElement('p');n.className='feel-note';main.appendChild(n);}n.textContent=t;n.setAttribute('role','status');}
 const field=(label,button,type='text')=>`<label class="feel-field">${label}<input type="${type}" aria-label="${label}"><button type="button" class="primary">${button}</button></label>`;
 if(key==='waiting'||key==='reconnect')replace(key==='waiting'?'Stay with your party.':'Reconnecting…',key==='waiting'?'The next game state will appear when the table is ready.':'Controls return after your connection is restored.');
 else if(key==='result'||key==='rematch'){
  const text={colorstack:['Hand complete.','Alex emptied their hand.'],pool:['A clean finish.','Alex pocketed the 8 ball.'],golf:['The scorecard is in.','Alex · 18 strokes · Nova · 20 · Kai · 22'],ludo:['All the way home.','Alex brought all four tokens home.'],tycoon:['Your little empire.','Final net worth · Alex $2,480 · Nova $2,240 · Trouble $1,920'],battleship:['Fleet defeated.','All opposing ships are sunk.'],gofish:['Thirteen books. One great game.','Alex · 5 books · Nova · 4 · Trouble · 4'],chess:['Checkmate.','Alex wins by checkmate.']}[game];
  replace(text[0],text[1],'<div class="feel-result-avatars"><span class="avatar a0"></span><span class="avatar a1"></span><span class="avatar a2"></span></div><div class="feel-actions">'+(key==='result'?'<button>Back to Lobby</button><button>Choose Another Game</button><button class="primary">Play Again</button>':'<button>Back to Lobby</button><button>Vote for Next Game</button><button class="primary">Ready for Rematch</button>')+'</div>');
 }else if(key==='spectator'||key==='out'){
  if(game==='colorstack')all('.fan,.hand-zone .between,.action-dock').forEach(e=>e.remove());
  if(game==='gofish')all('.fish-hand,.ask-strip,.your-hand-label').forEach(e=>e.remove());
  disable();note(key==='out'?'You are out · watching the table.':'You are watching. Private hands and controls are unavailable.');
 }else if(key==='opponent'){disable();note('Nova’s turn. Your controls return on your turn.');}
 else if(key==='invalid'){note('That action is unavailable. Keep your selection and choose a legal action.');}
 if(game==='colorstack'){
  if(key==='drawn'){$('.action-dock button:not(.primary)').textContent='Keep & pass';$('.action-dock .primary').textContent='Play drawn Red 5';note('You drew a playable card. Play it or keep it and pass.');}
  if(key==='wild'){main.insertAdjacentHTML('beforeend','<div class="feel-popover"><h2>Choose your color.</h2><div class="feel-colors">'+['Red','Blue','Green','Yellow'].map((n,i)=>`<button type="button" data-color-choice="${n.toLowerCase()}" style="--choice:${['#e26771','#68a9df','#72c1a0','#ebc85c'][i]}">${n}</button>`).join('')+'</div></div>');}
  if(key==='long'){const fan=$('.fan'),cards=[...fan.children];cards.forEach(c=>fan.appendChild(c.cloneNode(true)));fan.classList.add('feel-long-hand');note('12 cards · expand or scroll your hand. Inspect before playing.');}
  if(key==='deal'||key==='penalty')note(key==='deal'?'Cards arrive as backs. Only your own faces are revealed.':'Draw penalty · take the cards, then pass the turn.');
 }else if(game==='pool'){
  if(['resolving','foul','ballinhand','resign'].includes(key)){
   if(key==='resolving'){disable();note('Shot resolving. Wait for the balls to settle.');}
   if(key==='foul')note('Foul · Nova has ball in hand.');
   if(key==='ballinhand'){$('.pool-dock .primary').textContent='Lock cue ball';note('Place the cue ball in a valid position, then lock it.');}
   if(key==='resign')main.insertAdjacentHTML('beforeend','<div class="feel-popover"><h2>Resign this game?</h2><p>Your party stays together.</p><div class="feel-actions"><button>Keep playing</button><button>Resign</button></div></div>');
  }
 }else if(game==='golf'){
  if(key==='rolling'){disable();note('Ball rolling. Your controls return when it is your turn.');}
  if(key==='sand'||key==='water'){const n=key==='sand'?'04':'05';$('.golf-wide').src='../../assets/golf/meadow-'+n+'.svg';$('.golf-tall').src='../../assets/golf/meadow-'+n+'-portrait.svg';$('.golf-head h1').textContent=key==='sand'?'Sand Trap':'Water Bridge';$('.golf-head .eyebrow').textContent='MEADOW MINI · HOLE '+(key==='sand'?'4':'5')+' / 6';all('.golf-course img').forEach(i=>i.alt=key==='sand'?'Existing Sand Trap geometry with slowing sand':'Existing Water Bridge geometry with penalty water');}
  if(key==='sand')note('Sand slows your ball. Aim carefully for the next stroke.');
  if(key==='water')note('Water penalty · your ball returns to the previous stroke position.');
  if(key==='hole'||key==='scorecard'){replace(key==='hole'?'Hole complete.':'Meadow Mini scorecard.','Every stroke counts. Here is how your round is shaping up.', '<div class="feel-scorecard"><div>Player <b>Hole 1</b><b>Hole 2</b><b>Total</b></div><div>Alex <b>3</b><b>3</b><b>6</b></div><div>Nova <b>4</b><b>3</b><b>7</b></div></div><p class="feel-note">The next hole begins when everyone has finished.</p>');}
 }else if(game==='ludo'){
  if(key==='roll')note('Your turn · roll the die, then choose your token.');
  if(key==='choose')note('You rolled 6. Choose a highlighted token.');
  if(key==='stack')note('Safe cell · choose your numbered token below.');
  if(key==='capture')note('Capture accepted · the captured token returns to its yard.');
  if(key==='bonus')note('Bonus roll · you get another turn.');
 }else if(game==='tycoon'){
  const panel=$('.property-sheet');
  if(['auction','rent','build','trade','debt','bankrupt'].includes(key)){
   if(key==='auction')panel.innerHTML='<div class="property-tag">AUCTION · BLOSSOM AVENUE</div><div class="property-copy"><h1>Make your bid.</h1><p>Current high bid · $100 · Nova</p>'+field('Bid amount','Preview bid','number')+'<button type="button">Pass</button></div>';
   if(key==='rent')panel.innerHTML='<div class="property-tag">RENT RECEIPT</div><div class="property-copy"><h1>Rent paid.</h1><p>Blossom Avenue · paid Nova $12.</p></div>';
   if(key==='build')panel.innerHTML='<div class="property-tag">YOUR PROPERTY</div><div class="property-copy"><h1>Blossom Avenue</h1><p>Your property · review the next upgrade.</p><div class="feel-actions"><button>Preview build</button><button>Preview sell</button></div></div>';
   if(key==='trade')panel.innerHTML='<div class="property-tag">TRADE DRAFT</div><div class="property-copy"><h1>A fair exchange?</h1><label class="feel-field">Player<select aria-label="Trade player"><option>Nova</option><option>Trouble</option></select></label><label class="feel-field">Offer cash<input type="number" aria-label="Offer cash" value="100" min="0"></label><p>Select the properties and cash you want to exchange.</p><button>Preview offer</button></div>';
   if(key==='debt')panel.innerHTML='<div class="property-tag">PAYMENT RECEIPT</div><div class="property-copy"><h1>A difficult turn.</h1><p>Cash was short. Upgrades are sold automatically to settle the payment. If that is not enough, bankruptcy follows.</p><p class="feel-note">Review the transaction in your activity history.</p></div>';
   if(key==='bankrupt'){disable();panel.innerHTML='<div class="property-tag">OUT · WATCHING</div><div class="property-copy"><h1>Your run is over.</h1><p>Watch the remaining players. The party stays together.</p></div>';}
  }
  if(key==='roll')note('Your roll is in · moving around the Plaza.');
 }else if(game==='battleship'){
  if(key==='fleet'){$('.charts').classList.add('view-fleet');all('.chart-tabs button').forEach((b,i)=>b.classList.toggle('selected',i===1));}
  if(key==='placement'){
   $('.charts').classList.add('view-fleet');const image=$('.own-chart img');if(image)image.alt='Local draft fleet placement, five vessels';$('.naval-status h1').textContent='Place your fleet.';$('.fire-dock').innerHTML='<div><small>LOCAL DRAFT</small><strong>5 ships</strong></div><button type="button">Rotate ship</button><button type="button" class="primary">Lock fleet</button>';note('Arrange five ships inside your waters, with no overlap.');
  }
  if(key==='random')note('Random & Lock immediately commits a random fleet in the current game. No reroll review is promised.');
  if(key==='hit'||key==='sunk')note(key==='hit'?'Shot accepted · hit. Keep the persistent hit mark.':'Ship sunk · reveal only public sunk information.');
  if(key==='resign')note('Resign this game? Confirm to leave the match.');
 }else if(game==='gofish'){
  if(key==='long'){const hand=$('.fish-hand'),cards=[...hand.children];cards.forEach(c=>hand.appendChild(c.cloneNode(true)));hand.classList.add('feel-long-hand');note('10 cards · group by rank, retain actual suits and counts.');}
  if(key==='locked'){disable();note('Asking Nova for sevens…');}
  if(key==='book')note('Four of one rank form a book. Score and card counts update from the accepted view.');
  if(key==='draw')note('Go Fish · draw a card. Only you see its face.');
  if(key==='deal')note('Deal backs around the table; only the local hand reveals its faces.');
 }else if(game==='chess'){
  if(key==='check'||key==='promotion'){$('.chess-board img').src='../../assets/chess-'+key+'.svg';$('.chess-board img').alt=key==='check'?'White king e1 checked by Black rook e8; escape d1 or f1':'White pawn a7 ready to promote; kings h1 and h8';$('.chess-caption p').textContent=key==='check'?'White to move. King e1 is in check.':'White to move. Pawn a7 to a8.';}
  if(key==='check'){$('.chess-caption h1').textContent='Your king is in check.';note('Check · choose a highlighted escape.');}
  if(key==='promotion')main.insertAdjacentHTML('beforeend','<div class="feel-popover"><h2>Choose a promotion.</h2><div class="feel-actions">'+['Queen','Rook','Bishop','Knight'].map(n=>'<button type="button" data-promotion="'+n.toLowerCase()+'">'+n+'</button>').join('')+'</div></div>');
  if(key==='draw')main.insertAdjacentHTML('beforeend','<div class="feel-popover"><h2>Nova offered a draw.</h2><div class="feel-actions"><button>Decline</button><button>Accept draw</button></div></div>');
  if(key==='resign'){const b=all('button').find(b=>b.textContent==='Resign');if(b)b.textContent='Tap again to resign';}
  if(key==='clock'){disable();note('Clock expired. The actual result decides the winner.');}
 }
 document.documentElement.dataset.stateReady='true';
})().catch(e=>{document.documentElement.dataset.stateError=e.message;console.error(e);});
