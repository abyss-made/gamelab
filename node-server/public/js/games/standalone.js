// Scene presentation primitives. Every value and position still comes from the native game view.
window.GameUI=window.GameUI||{};
GameUI.scenes=(()=>{
 const cache=new Map();
 const image=name=>{if(!cache.has(name)){const i=new Image();i.src="/assets/scenes/"+name+".png";cache.set(name,i);}const i=cache.get(name);return i.complete&&i.naturalWidth?i:null;};
 const root='/assets/scenes/';
 const names={pool:'Pool',golf:'Mini Golf',tycoon:'Property Tycoon',gofish:'Go Fish',ludo:'Ludo',battleship:'Battleship',colorstack:'Color Stack',impostor:'The Impostor',chess:'Chess',telephone:'Drawing Telephone'};
 function mount(el,id){el.dataset.scene=id;el.querySelector('.ten-heading')?.remove();el.setAttribute('aria-label',names[id]+' game');}
 const piece=(type,side)=>`<img class="scene-piece" src="${root}chess-${side}${type}.png" alt="" draggable="false">`;
 const pawn=colour=>`<img src="${root}pawn-${colour}.png" alt="" draggable="false">`;
 const car=colour=>`<img src="${root}car-${colour%6}.png" alt="" draggable="false">`;
 const pip={S:'♠',H:'♥',D:'♦',C:'♣'};
 function card(c){
  const rank=c.r===14?'A':({11:'J',12:'Q',13:'K'}[c.r]||String(c.r)),s=pip[c.s],ink=['H','D'].includes(c.s)?'#c72b40':'#142b3d';let body='';
  if(c.r>10&&c.r<14){
   // Original mirrored court illustration. Symbols and rank remain the real card's.
   const figure=`<path d="m31 25 7 18 9-12 9 12 7-18-3 28H34Z" fill="#dfb55e" stroke="#493a30"/><path d="M34 55q-4 35 13 42 19-9 13-42Z" fill="#f3cfaa" stroke="#564432"/><path d="M35 62q12-13 23 0M41 70h2m11 0h2M43 83q5 4 10 0" fill="none" stroke="#48382c" stroke-width="2"/><path d="M27 103q20-25 41 0l6 32H21Z" fill="${ink}" stroke="#dfb55e" stroke-width="3"/><path d="m26 103 42 27m-42-10 38-15" stroke="#e9c574" stroke-width="5"/>`;
   body=`<rect x="20" y="26" width="58" height="115" rx="3" fill="#f3e4bc" stroke="#d8b77a"/>${figure}<g transform="translate(98 168) rotate(180)">${figure}</g>`;
  }else{
   const n=c.r===14?1:c.r,rows={1:[[49,84]],2:[[49,45],[49,123]],3:[[49,44],[49,84],[49,124]],4:[[33,45],[65,45],[33,123],[65,123]],5:[[33,45],[65,45],[49,84],[33,123],[65,123]],6:[[33,43],[65,43],[33,84],[65,84],[33,125],[65,125]],7:[[33,43],[65,43],[49,63],[33,84],[65,84],[33,125],[65,125]],8:[[33,43],[65,43],[49,63],[33,84],[65,84],[49,105],[33,125],[65,125]],9:[[33,39],[65,39],[33,69],[65,69],[49,84],[33,99],[65,99],[33,129],[65,129]],10:[[33,37],[65,37],[49,54],[33,67],[65,67],[33,101],[65,101],[49,116],[33,131],[65,131]]}[n];
   body=rows.map(([x,y])=>`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${n===1?46:23}" fill="${ink}">${s}</text>`).join('');
  }
  return `<svg class="scene-card-face" viewBox="0 0 98 168" aria-hidden="true"><rect x="1" y="1" width="96" height="166" rx="8" fill="#fffdf4" stroke="#d4c9aa"/><g fill="${ink}" font-family="Georgia,serif" font-weight="bold"><text x="8" y="23" font-size="21">${rank}</text><text x="9" y="40" font-size="17">${s}</text><g transform="translate(98 168) rotate(180)"><text x="8" y="23" font-size="21">${rank}</text><text x="9" y="40" font-size="17">${s}</text></g></g>${body}</svg>`;
 }
 function rack(player,balls){
  const ids=player.group==='solids'?[1,2,3,4,5,6,7]:player.group==='stripes'?[9,10,11,12,13,14,15]:[];
  return ids.length?`<div class="scene-ball-rack" aria-label="${player.left} ${player.group} remaining">${ids.map(n=>`<i class="scene-ball n${n%8} ${n>8?'stripe':''} ${balls.find(b=>b.id===n)?.gone?'potted':''}" aria-hidden="true">${n}</i>`).join('')}</div>`:'<span class="scene-open-table">OPEN TABLE</span>';
 }
 function steps(phase){const list=[['clue','Clues'],['discuss','Discuss'],['vote','Vote'],['result','Reveal']],at=list.findIndex(([p])=>p===phase);return `<ol class="scene-phase" aria-label="Round progress">${list.map(([p,n],i)=>`<li class="${i===at?'current':i<at?'done':''}" ${i===at?'aria-current="step"':''}><span>${i+1}</span>${n}</li>`).join('')}</ol>`;}
 function meeting(g,a,you,picked){
  const seats=g.players.map((p,i)=>{const angle=-Math.PI/2+i*Math.PI*2/g.players.length,x=50+37*Math.cos(angle),y=50+32*Math.sin(angle),clue=g.clues.filter(c=>c.id===p.id).at(-1),active=g.turnId===p.id&&g.phase==='clue';
   return `<div class="scene-meeting-seat ${active?'speaking':''} ${p.out?'out':''}" style="left:${x}%;top:${y}%">${a.avatarHTML(p.avatar)}<b>${a.esc(p.name)}</b><small>${p.out?'Out':clue?a.esc(clue.text):active?'Giving a clue':p.voted?'Vote cast':'Listening'}</small></div>`;}).join('');
  return `<div class="scene-meeting" data-count="${g.players.length}"><div class="scene-meeting-desk"><span>THE MEETING</span><b>${a.esc(g.category)}</b><small>ROUND ${g.round}</small></div>${seats}</div>`;
 }
 return {mount,piece,pawn,car,card,rack,steps,image,meeting};
})();
