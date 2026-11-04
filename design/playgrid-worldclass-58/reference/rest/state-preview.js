/* Local design-state renderer only. Never emits actions or connects to game sockets. */
(async()=>{
 const query=new URLSearchParams(location.search),key=query.get('state');
 if(!key){document.documentElement.dataset.stateReady='true';return;}
 const game=document.body.classList[0],models=await fetch('../state-model.json').then(r=>r.json()),model=models.find(g=>g.id===game),state=model?.states.find(s=>s.id===key);
 if(!state)throw Error('Unknown design state');
 document.body.classList.add('sb-frame','sb-'+key);document.title=model.name+' · '+state.label+' · design reference';
 if(query.has('reduced'))document.body.classList.add('sb-reduced');
 const main=document.querySelector('main'),$=s=>main.querySelector(s),all=s=>[...main.querySelectorAll(s)];
 const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const disable=(s='button,input,textarea')=>all(s).forEach(e=>{e.disabled=true;});
 function title(t){$('.phasebar h1').textContent=t;}
 function clock(t='—'){const c=$('.clock');if(c)c.innerHTML='<small>TIME</small>'+t;}
 function receipt(t,kind='info'){
  let el=$('.status')||$('.field-actions p')||$('.private-note')||$('.caption');
  if(game==='drawguess'||game==='telephone'){title(t);return;}
  if(el){el.textContent=t;el.classList.add('sb-receipt','sb-'+kind);el.setAttribute('role',kind==='error'?'alert':'status');}
 }
 function scene(html){const s=$('.scene');s.className='scene sb-scene';s.innerHTML=html;all('main > .player-rail').forEach(x=>x.remove());return s;}
 const participant=(n,i,sub)=>`<div class="person"><span class="avatar a${i}" role="img" aria-label="${n} avatar"></span><span><b>${n}</b><small>${sub}</small></span></div>`;
 const totals={drawguess:['1640','1420','980','820'],rps:['4','1','0','0'],wordscramble:['640','610','480','420'],trivia:['1020','980','760','640'],wordchain:['12','9','6','4'],categories:['36','32','29','24'],telephone:['12','9','6','4'],bluff:['12','9','6','4'],impostor:['6','4','2','0']};
 const ranks=()=>'<div class="sb-ranks">'+[['Alex',0],['Nova',1],['Trouble',2],['Kai',3]].map(([n,i])=>participant(n,i,`${i+1}${i===0?'st':i===1?'nd':i===2?'rd':'th'} · ${totals[game]?.[i]||'0'} ${game==='wordchain'?'words':'pts'}`)).join('')+'</div>';
 function card(h,p,inside=''){return `<section class="sb-card"><span class="eyebrow">${model.direction.toUpperCase()}</span><h2>${h}</h2><p>${p}</p>${inside}</section>`;}
 function form(label,value,button){return `<label class="sb-form-label">${label}<div class="answer-form"><input aria-label="${label}" value="${safe(value)}" placeholder="${safe(label)}"><button class="primary" type="button">${button}</button></div></label>`;}
 function voting(names,own='Alex'){return '<div class="sb-vote-list">'+names.map((n,i)=>`<button type="button" ${n===own?'disabled':''}>${participant(n,i%4,n===own?'You · unavailable':'Choose player')}</button>`).join('')+'</div>';}
 function noPrivate(){
  if(game==='drawguess'){
   all('.prompt-card,.tools').forEach(e=>e.remove());title('Nova is drawing · _ _ _ _ _ _');
   all('.paper img').forEach(e=>e.alt='Live drawing by Nova');
   const compose=$('.chat-compose');if(compose)compose.innerHTML='<input aria-label="Party chat" placeholder="Party chat…"><button type="button">Send</button>';
   $('.draw-layout').classList.add('sb-guesser-layout');
  }else if(game==='telephone'){
   all('.prompt-card,.tools').forEach(e=>e.remove());$('.paper').innerHTML='<div class="sb-private-placeholder"><h2>Relay in progress.</h2><p>Prompts and drawings stay private until the reveal.</p></div>';
   all('.draw-side > button').forEach(e=>e.remove());$('.draw-side > .caption').textContent='Waiting for the players to finish this step.';title('Watch the relay unfold.');$('.draw-layout').classList.add('sb-guesser-layout');
  }else if(game==='impostor'){
   $('.private-folder').innerHTML='<small>WATCHING</small><h2>Category</h2><div class="secret">Household Items</div><p>The word and roles stay private.</p>';
   all('.clue-ledger .answer-form').forEach(e=>e.remove());$('.private-note').textContent='You are watching the public clues.';
  }else if(game==='categories'){
   all('.field-row input').forEach(e=>{e.value='';e.removeAttribute('value');e.placeholder='Private until review';e.disabled=true;});$('.field-actions p').textContent='Answers stay private until the round ends.';
  }else if(game==='bluff'){
   all('.answer-slip small').forEach(e=>e.remove());all('.answer-slip').forEach(e=>e.disabled=true);
  }else if(game==='wordchain'){
   all('.answer-form input').forEach(e=>{e.value='';e.removeAttribute('value');e.placeholder='Watching · Nova’s turn';});
  }
  if(game==='checkers'){all('.check-target').forEach(e=>e.remove());all('.check-square').forEach(e=>{e.classList.remove('selected');e.setAttribute('aria-label',e.getAttribute('aria-label').replace('legal destination','empty'));});}
  all('.person small').forEach(e=>e.textContent=e.textContent.replace(/You\s*·\s*/g,''));
  all('.person.active').forEach(e=>e.classList.remove('active'));
  if(game==='telephone')all('.ready-list .state').forEach(e=>e.remove());
  if(game==='rps'){all('.throw-choices').forEach(e=>e.remove());all('.duelist>small').forEach(e=>e.textContent=e.textContent.replace('YOU · ',''));receipt('Watching the match. Picks stay hidden.');}
  disable();
  if(game==='drawguess')all('.chat-compose input,.chat-compose button').forEach(e=>e.disabled=false);
 }
 function finalBoard(draw=false){
  let original=$('.connect-board,.ceramic-board,.quilt-board,.checkers-board');if(!original)return '';
  const b=original.cloneNode(true);
  if(game==='fourrow'){
   const cs=[...b.querySelectorAll('.connect-col')];cs.forEach((col,c)=>[...col.querySelectorAll('.slot')].forEach((s,r)=>{
    let v=draw?((r+c+Math.floor(c/2))%2+1):r===5&&c<4?1:r===4&&c<3?2:0;
    s.innerHTML=v?`<i class="disc ${v===2?'gold':''} ${!draw&&r===5&&c<4?'sb-winning':''}"></i>`:'';
   }));
  }else if(game==='tictactoe'){
   const vals=draw?['x','o','x','x','o','o','o','x','x']:['x','o','','o','x','','','','x'];
   [...b.children].forEach((e,i)=>{e.classList.remove('empty');e.innerHTML=vals[i]?`<img src="../../reference/rest/assets/mark-${vals[i]}.svg" alt="${vals[i].toUpperCase()}">`:'';if(!draw&&[0,4,8].includes(i))e.classList.add('sb-winning');});
  }else if(game==='dotsboxes'){
   [...b.querySelectorAll('.patch')].forEach((e,i)=>{e.classList.remove('blank');e.textContent=i<9?'A':'N';e.style.setProperty('--thread',i<9?'#618ea5':'#c9827a');});b.querySelectorAll('.quilt-edge').forEach((e,i)=>{e.classList.add('taken');e.style.setProperty('--thread',i%2?'#618ea5':'#c9827a');});
  }else if(game==='checkers'&&!draw){
   b.querySelectorAll('.check-square').forEach(e=>{e.innerHTML='';e.classList.remove('selected');});
   b.children[56].innerHTML='<span class="check-piece sb-king"><img src="../../reference/rest/assets/crown.svg" alt="Lime king"></span>';
  }
  b.querySelectorAll('button').forEach(e=>e.disabled=true);return '<div class="sb-final-board">'+b.outerHTML+'</div>';
 }
 if(key==='waiting'||key==='reconnect'){
  title(key==='waiting'?'The table is getting ready.':'Reconnecting…');clock();
  scene(card(key==='waiting'?'Stay with your party.':'We’re finding your seat.',key==='waiting'?'Your game will appear when everyone is ready.':'Controls are unavailable while the connection returns.',`<div class="sb-game-seal" aria-hidden="true">${safe(model.name.split(' ').map(w=>w[0]).slice(0,3).join(''))}</div><div class="sb-wait-players">${participant('Alex',0,'You')}${participant('Nova',1,'In the party')}</div>`));
 }else if(key==='result'||key==='rematch'||key==='draw'){
  const board=finalBoard(key==='draw'),host=key!=='rematch',isDraw=key==='draw';
  title(isDraw?'It’s a draw.':board?'Alex wins.':'The final standings.');clock();
  let detail=game==='checkers'?(isDraw?'40 moves each without a capture or man move.':'Nova has no pieces left. Alex has one king.'):
   game==='dotsboxes'?'Alex · 9 boxes · Nova · 7 boxes':game==='fourrow'?(isDraw?'No four-disc line.':'Four Red discs in a row.'):
   game==='tictactoe'?(isDraw?'No line of three.':'X completes the diagonal.'):'A good finish, and another game together.';
  scene(`<div class="sb-finish"><div class="sb-result-heading"><img src="../../reference/rest/assets/${isDraw?'connection':'trophy'}.svg" alt=""><h2>${isDraw?'Honors shared.':board?'A well-played finish.':'Good company. Great game.'}</h2><p>${detail}</p></div>${board||ranks()}<div class="sb-result-actions">${host?'<button type="button" class="quiet">Back to Lobby</button><button type="button" class="quiet">Choose Another Game</button><button type="button" class="primary">Play Again</button>':'<button type="button" class="quiet">Back to Lobby</button><button type="button" class="quiet">Vote for Next Game</button><button type="button" class="primary" aria-pressed="false">Ready for Rematch</button>'}</div><p class="caption">${host?'You’re still in The Friday Crew.': 'Waiting for the host to start the next game.'}</p></div>`);
 }else if(key==='spectator'){noPrivate();title(game==='drawguess'?'Watching · Nova is drawing':game==='telephone'?'Watching the private relay.':'You’re watching · '+model.name);clock();
 }else if(key==='opponent'||key==='out'){
  disable();all('.active').forEach(e=>e.classList.remove('active'));all('.answer-form input').forEach(e=>{e.value='';e.placeholder=key==='out'?'You are watching':'Wait for your turn';});
  if(game==='checkers'){all('.check-target').forEach(e=>e.remove());all('.check-square.selected').forEach(e=>e.classList.remove('selected'));}title(key==='out'?'You’re out · keep watching.':'Nova’s turn.');receipt(state.copy);
 }else if(key==='invalid'){
  if(game==='drawguess'){noPrivate();title('Only the current drawer can draw.');}
  else if(game==='telephone'){title('Drawing limit reached.');receipt('Undo or clear to continue.','error');}
  else if(game==='bluff'){title('Your own bluff is unavailable.');receipt('Choose another answer. You cannot vote for your own.','error');}
  else if(game==='rps'){disable('.throw-choice');receipt('Your throw is locked. Wait for the reveal.','error');}
  else if(game==='categories')receipt('Check your five fields, or keep editing.','error');
  else if(game==='impostor')receipt('Keep your clue to 30 characters or fewer.','error');
  else if(game==='wordscramble')receipt('Not quite. Try again!','error');
  else if(game==='wordchain')receipt('That word is already in the chain. Try another.','error');
  else if(game==='trivia'){disable('.quiz-answers button');receipt('Your answer is already locked.','error');}
  else receipt(game==='fourrow'?'Choose an open column.':game==='dotsboxes'?'That edge is taken. Choose an unclaimed edge.':game==='checkers'?'Choose a highlighted legal square.':'That square is occupied. Choose an empty one.','error');
 }
 // Per-game phase-specific variants; every branch remains a static design example.
 if(game==='drawguess'){
  if(key==='choose'){
   title('Choose your word.');clock('0:12');scene(card('What will you draw?','Only you see these choices.','<div class="sb-word-choices">'+['Dragon','Lighthouse','Watermelon','Skateboard','Telescope','Penguin'].map(w=>`<button type="button">${w}</button>`).join('')+'</div>'));
  }else if(key==='guesser'||key==='guessed'){
   noPrivate();const input=$('.chat-compose input');input.placeholder=key==='guessed'?'Chat with the party…':'Type your guess…';input.setAttribute('aria-label',key==='guessed'?'Party chat':'Your guess');input.disabled=false;$('.chat-compose button').disabled=false;
   title(key==='guessed'?'You got it · DRAGON':'Nova is drawing · _ _ _ _ _ _');
  }else if(key==='reveal'){title('The word was DRAGON.');clock();all('.tools').forEach(e=>e.remove());$('.draw-layout').classList.add('sb-guesser-layout');$('.prompt-card').innerHTML='<span class="eyebrow">ROUND COMPLETE</span><strong>DRAGON</strong>';$('.guess-feed').innerHTML='<p><b>Alex</b> guessed the word</p><p><b>Nova</b> drawing complete</p><p>Next drawer begins after this reveal.</p>';}
  else if(key==='focus'){document.body.classList.add('sb-focus');title('Canvas focus · DRAGON');document.querySelector('.header-tools').insertAdjacentHTML('afterbegin','<button type="button">Exit Focus</button>');all('.prompt-card,.draw-side > .player-rail').forEach(e=>e.remove());}
  else if(key==='clear'){scene(card('Clear the whole drawing?','This removes the current canvas.','<div class="sb-dialog-actions"><button type="button" class="quiet">Keep drawing</button><button type="button" class="primary">Clear drawing</button></div>'));title('Clear confirmation');clock();}
 }else if(game==='fourrow'&&key==='full'){
  const slots=all('.connect-col .slot');all('.connect-col')[0].disabled=true;all('.connect-col')[0].setAttribute('aria-label','Column 1 is full');[...all('.connect-col')[0].children].forEach((e,i)=>e.innerHTML='<i class="disc '+(i%2?'gold':'')+'"></i>');receipt('Column 1 is full. Choose another.');
 }else if(game==='rps'){
  if(key==='locked'){disable('.throw-choice');all('.throw-choice')[0].classList.add('sb-picked');all('.throw-choice')[0].setAttribute('aria-pressed','true');receipt('Rock locked. Waiting for Nova.');}
  if(key==='reveal'||key==='tie'){
   disable('.throw-choice');const ds=all('.duelist');ds[0].insertAdjacentHTML('beforeend','<img class="sb-duel-throw" src="../../reference/rest/assets/throw-rock.svg" alt="Alex chose Rock">');ds[1].insertAdjacentHTML('beforeend',`<img class="sb-duel-throw" src="../../reference/rest/assets/throw-${key==='tie'?'rock':'scissors'}.svg" alt="Nova chose ${key==='tie'?'Rock':'Scissors'}">`);receipt(state.copy);title(key==='tie'?'A tie. Throw again.':'Rock beats scissors.');
  }else if(key==='bye'){disable('.throw-choice');title('You have a bye.');receipt('Watch the bracket. Your next match will appear here.');}
  else if(key==='bracket16'){
   title('The full tournament.');clock();const names=['Alex','Nova','Trouble','Kai','Riley','Robin','Sage','Quinn','Rowan','Mika','Ash','Remy','Jules','Noor','Ari','Eden'];
   let html='<div class="sb-bracket-scroll" role="region" aria-label="Sixteen-player tournament bracket" tabindex="0">';
   for(let r=0;r<4;r++){html+=`<section><h3>${['Round of 16','Quarterfinals','Semifinals','Final'][r]}</h3>`;for(let m=0;m<8/2**r;m++)html+=`<div class="match"><div>${r?`Winner ${m*2+1}`:names[m*2]}</div><div>${r?`Winner ${m*2+2}`:names[m*2+1]}</div></div>`;html+='</section>';}scene(html+'</div>');
  }
 }else if(game==='dotsboxes'){
  if(key==='claim'){receipt('Box claimed · Alex has 3 boxes. You go again.');all('.patch:not(.blank)')[0].classList.add('sb-claimed');}
  else if(key==='dense'){
   title('Five by five boxes.');const grid=$('.quilt-board');grid.classList.add('sb-dense');grid.innerHTML='';for(let r=0;r<11;r++)for(let c=0;c<11;c++)grid.insertAdjacentHTML('beforeend',r%2===0&&c%2===0?'<span class="junction"></span>':r%2&&c%2?'<span class="patch blank"></span>':`<button class="quilt-edge ${c%2===0?'vertical':''}" type="button" aria-label="${c%2===0?'Vertical':'Horizontal'} edge row ${Math.floor(r/2)+1}, column ${Math.floor(c/2)+1}"></button>`);receipt('Use an edge or choose precise coordinates below.');$('.board-main').insertAdjacentHTML('beforeend','<div class="sb-precision"><label>Edge <select aria-label="Edge direction"><option>Horizontal</option><option>Vertical</option></select></label><label>Row <select aria-label="Edge row"><option>1</option><option>2</option></select></label><label>Column <select aria-label="Edge column"><option>1</option><option>2</option></select></label><button type="button" class="primary">Draw edge</button></div>');
  }
 }else if(game==='wordscramble'){
  if(key==='solved'){disable('.answer-form input,.answer-form button');receipt('Solved · +90. Waiting for the others.');}
  if(key==='reveal'){all('.letter-tile').forEach((e,i)=>e.textContent='OCEAN'[i]);disable('.answer-form input,.answer-form button');receipt('The word was OCEAN. First: Nova.');clock();}
  if(key==='long'){title('A longer jumble.');$('.letter-tiles').classList.add('sb-long-tiles');$('.letter-tiles').innerHTML=[...'RTAEWFALL'].map(c=>'<span class="letter-tile">'+c+'</span>').join('');$('.mini-title').textContent='HARD · 9 LETTERS';$('.wordslots').innerHTML='<i></i>'.repeat(9);}
 }else if(game==='trivia'){
  const buttons=all('.quiz-answers button');
  if(['locked','reveal','wrong'].includes(key)){
   disable('.quiz-answers button');const picked=key==='wrong'?0:1;buttons[picked].classList.add('sb-picked');buttons[picked].setAttribute('aria-pressed','true');
   if(key!=='locked'){buttons[1].classList.add('sb-correct');buttons[1].insertAdjacentHTML('beforeend','<span class="sb-answer-result">Correct</span>');if(key==='wrong'){buttons[0].classList.add('sb-wrong');buttons[0].insertAdjacentHTML('beforeend','<span class="sb-answer-result">Your answer · wrong</span>');}clock();}
   receipt(state.copy);
  }else if(key==='long'){title('Question text wraps naturally.');$('.question').textContent='Which of these mountain ranges contains Mount Everest, the highest mountain above sea level?';buttons[1].lastChild.textContent='Himalayas, across Nepal and Tibet';}
 }else if(game==='wordchain'){
  if(key==='life'){all('.lives')[0].lastElementChild.classList.add('off');disable('.answer-form input,.answer-form button');receipt('One life lost · 2 lives remain. Nova is up.');}
  else if(key==='deadletter'){$('.chain-history').innerHTML='<h3>A FRESH CHAIN</h3><p class="caption">The previous letter had no continuation. Begin again with A.</p>';$('.chain-hero .letter-tile').textContent='A';$('.answer-form input').value='';$('.answer-form input').placeholder='Word starting with A';title('A fresh start.');}
 }else if(game==='categories'){
  if(key==='locked'){all('.field-row input').forEach(e=>e.readOnly=true);$('.field-actions button').disabled=true;receipt('Locked in. Waiting for the others.');}
  else if(key==='autosave')receipt('Saving your private draft…');
  else if(key==='long'){all('.field-row b')[3].textContent='Fruit or vegetable';all('.field-row input')[3].value='Blackberry';}
  else if(key==='review'){
   title('Round 2 · the answers are in.');clock();scene(card('Every answer counts.','Unique answers score 2. Matching answers score 1.',`<div class="sb-table-scroll" role="region" aria-label="Category answer review" tabindex="0"><table><thead><tr><th>Player</th><th>Animal</th><th>Food</th><th>Country</th><th>City</th><th>Boy name</th><th>Round</th></tr></thead><tbody><tr><th>Alex</th><td>Bison <small>+2</small></td><td>Bread <small>+1</small></td><td>Brazil <small>+1</small></td><td>Berlin <small>+2</small></td><td>— <small>0</small></td><td>+6</td></tr><tr><th>Nova</th><td>Bear <small>+2</small></td><td>Bread <small>+1</small></td><td>Brazil <small>+1</small></td><td>Boston <small>+2</small></td><td>Ben <small>+2</small></td><td>+8</td></tr></tbody></table></div><p>Next round starts after the review.</p>`));
  }
 }else if(game==='telephone'){
  if(key==='prompt'){
   title('Start a story worth drawing.');scene(card('Your private prompt','Only the next player receives your words.',form('Write a prompt','A cat running a bakery.','Submit prompt')));
  }else if(key==='describe'){
   title('Put this picture into words.');scene(`<div class="sb-describe"><div class="paper"><img src="../../reference/rest/assets/relay-cat-baker.svg" alt="The single drawing handed to you"></div>${form('Describe the drawing','','Submit description')}<p class="caption">Only this drawing is visible to you. The chain is still private.</p></div>`);
  }else if(key==='pending'||key==='locked'){
   disable();title(key==='pending'?'Submitting your page…':'Page passed.');const b=$('.draw-side > button');b.textContent=key==='pending'?'Submitting…':'Done · waiting for the others';
  }else if(key==='limit'){title('Drawing limit reached.');$('.draw-side > .caption').textContent='Undo or clear to keep drawing.';}
  else if(key==='reveal'){
   title('Alex’s chain · 1 of 4');clock();scene(`<div class="sb-relay-reveal"><article><span class="eyebrow">01 · ALEX WROTE</span><h2>A cat running a bakery.</h2></article><article><span class="eyebrow">02 · NOVA DREW</span><img src="../../reference/rest/assets/relay-cat-baker.svg" alt="Released drawing by Nova"><button type="button" class="quiet">Like · 2</button></article><article><span class="eyebrow">03 · TROUBLE DESCRIBED</span><h2>A baker with very good whiskers.</h2><button type="button" class="quiet">Like · 1</button></article></div>`);
  }
 }else if(game==='bluff'){
  if(key==='write'||key==='locked'){
   title(key==='write'?'Write a convincing bluff.':'Your bluff is in.');scene(card('The “#” symbol is technically called an…',key==='write'?'Invent a believable wrong answer.':'Your bluff: Hatchmark',key==='write'?form('Your fake answer','Hatchmark','Submit bluff'):'<p class="sb-lock-note">Locked in. Waiting for the others.</p>'));
  }else if(key==='voted'){disable('.answer-slip');all('.answer-slip')[1].classList.add('sb-picked');all('.answer-slip')[1].setAttribute('aria-pressed','true');receipt('Gridmark locked. Waiting for the truth.');}
  else if(key==='reveal'){
   title('The truth comes out.');clock();all('.answer-slip').forEach((e,i)=>{e.disabled=true;e.querySelector('small')?.remove();e.insertAdjacentHTML('beforeend',`<small>${i===0?'REAL ANSWER':i===1?'BLUFF BY NOVA · ALEX VOTED':i===4?'YOUR BLUFF · NO VOTES':'BLUFF · NO VOTES'}</small>`);if(i===0)e.classList.add('sb-correct');});receipt('Octothorpe was real. Nova fooled Alex for +1.');
  }
 }else if(game==='impostor'){
  const folder=$('.private-folder');
  if(key==='impostor'||key==='lastguess'){
   folder.innerHTML='<small>YOUR PRIVATE ROLE</small><h2>You are the impostor.</h2><div class="secret">Blend in.</div><small>CATEGORY · HOUSEHOLD ITEMS</small><p>You do not know the word. Listen to the clues.</p>';
   if(key==='lastguess'){$('.clue-ledger').innerHTML='<span class="eyebrow">LAST CHANCE</span><h2>Guess the secret word.</h2>'+form('Your final guess','','Guess');title('One last chance.');}
  }else if(key==='covered'){
   $('.secret').textContent='Word covered';folder.querySelector('button').textContent='Reveal word';folder.querySelector('button').setAttribute('aria-expanded','false');folder.querySelector('p').textContent='Show only when you are ready to read.';
  }else if(key==='discuss'){
   $('.clue-ledger').innerHTML='<span class="eyebrow">DISCUSSION</span><h2>Who doesn’t know the word?</h2><div class="guess-feed"><p><b>Nova</b> Trouble’s clue felt vague.</p><p><b>Trouble</b> I said wax!</p></div>'+form('Discuss with the party','','Send')+'<button type="button" class="primary">I’m ready to vote</button>';title('Talk it through.');
  }else if(key==='vote'||key==='voted'){
   $('.clue-ledger').innerHTML='<span class="eyebrow">VOTE</span><h2>Who is the impostor?</h2>'+voting(['Alex','Nova','Trouble','Kai'])+'<p class="private-note">Your vote locks once selected.</p>';
   if(key==='voted'){disable('.sb-vote-list button');all('.sb-vote-list button')[1].classList.add('sb-picked');all('.sb-vote-list button')[1].setAttribute('aria-pressed','true');$('.private-note').textContent='Vote for Nova locked. Waiting for the others.';}
  }else if(key==='reveal'){
   title('The word was CANDLE.');clock();folder.innerHTML='<small>ROUND RESULT</small><h2>Nova was the impostor.</h2><div class="secret">CANDLE</div><p>The crew caught the impostor.</p>';
   $('.clue-ledger').innerHTML='<span class="eyebrow">THE REVEAL</span><h2>Good instincts.</h2><p>Alex voted for Nova and earns the existing crew reward.</p><p>The impostor did not steal the round with a final guess.</p>';
  }
 }else if(game==='checkers'){
  if(key==='capture'||key==='chain'){
   all('.check-target').forEach(e=>e.remove());all('.check-square').forEach(e=>{e.innerHTML='';e.classList.remove('selected');});
   const b=$('.checkers-board'),from=key==='chain'?28:42,to=key==='chain'?14:28,opponent=key==='chain'?21:35;
   b.children[from].innerHTML='<span class="check-piece"></span>';b.children[from].classList.add('selected');b.children[opponent].innerHTML='<span class="check-piece ivory"></span>';b.children[to].innerHTML='<span class="check-target"></span>';
   all('.check-square').forEach((e,i)=>e.disabled=i!==from&&i!==to);receipt(state.copy);all('.duel-rail .person small,.board-aside p').forEach(e=>e.textContent='Sample capture position · 1 piece each');$('.board-main > .caption').textContent=key==='chain'?'Same piece · continue the jump':'Capture is required';
  }else if(key==='king'){
   all('.check-square').forEach(e=>{e.innerHTML='';e.classList.remove('selected');});const b=$('.checkers-board');b.children[1].innerHTML='<span class="check-piece sb-king"><img src="../../reference/rest/assets/crown.svg" alt="Lime king on b8"></span>';b.children[39].innerHTML='<span class="check-piece ivory"></span>';receipt('Your piece is now a king on b8.');all('.duel-rail .person small,.board-aside p').forEach(e=>e.textContent='Crowning sample · 1 piece each');$('.board-main>.caption').textContent='Lime reaches b8 and becomes a king.';
  }else if(key==='resign'){
   const r=all('.board-main button').find(e=>e.textContent==='Resign');r.textContent='Tap again to resign';r.classList.add('sb-armed');r.setAttribute('aria-describedby','resign-reason');const cap=$('.board-main > .caption');cap.id='resign-reason';cap.textContent='First tap only · game has not ended.';
  }
 }
 if(key==='active')document.body.classList.add('sb-active');
 all('.check-square').forEach(e=>e.setAttribute('aria-pressed',String(e.classList.contains('selected'))));
 document.documentElement.dataset.stateReady='true';
})().catch(e=>{document.documentElement.dataset.stateError=e.message;throw e;});
