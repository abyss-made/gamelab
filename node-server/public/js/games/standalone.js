// Scene presentation primitives. Every value and position still comes from the native game view.
window.GameUI=window.GameUI||{};
GameUI.scenes=(()=>{
 let courtSeq=0;
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
   // Original duplex court engraving: each portrait has its own clipped half.
   const clip='scene-court-'+(++courtSeq),royal=c.r===13,queen=c.r===12;
   const crown=royal?'<path d="m32 35 5 13h24l5-13-12 7-5-12-6 12Z" fill="#d6af56" stroke="#57412d"/>':queen?'<path d="m33 39 5 10h22l5-10-10 4-6-10-6 10Z" fill="#e4c570" stroke="#57412d"/><circle cx="49" cy="32" r="2" fill="#b94445"/>':'<path d="M31 44q18-23 36-2l-7 7H36Z" fill="#376779" stroke="#263d42"/><path d="M52 34q7-15 13-12-3 11-13 18" fill="#bb3a4a"/>';
   const figure=`<path d="M26 91q4-18 23-18t23 18v20H26Z" fill="${ink}" stroke="#d7b263" stroke-width="2"/><path d="m28 87 39 20m-32-27 35 18m-42 2 34-20" stroke="#d7b263" stroke-width="3"/><path d="M39 70h20v12H39Z" fill="#d7ab83"/><path d="M34 47q-4 7 0 20l7 10h16l7-10V47Z" fill="#f0cd9f" stroke="#674e35"/><path d="M33 47q15-18 31 0v8l-8-7-17 7-6 14Z" fill="#493a30"/>${crown}<path d="M39 59h5m10 0h5m-11 3-2 6h5m-8 4q7 3 12-1" fill="none" stroke="#5f4331" stroke-width="1.5"/>${royal?'<path d="m37 66 7 5h10l8-7-2 13-11 6-10-6Z" fill="#795038"/><path d="m45 70 8 0" stroke="#eac59b"/>':''}`;
   body=`<defs><clipPath id="${clip}"><rect x="21" y="27" width="56" height="57"/></clipPath></defs><rect x="20" y="26" width="58" height="116" rx="3" fill="#f0e2ba" stroke="#c5a56d"/><g clip-path="url(#${clip})">${figure}</g><g transform="translate(98 168) rotate(180)" clip-path="url(#${clip})">${figure}</g><path d="M21 84h56" stroke="#c5a56d" stroke-width="2"/>`;
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
 function result(id,markup){
  const art={pool:'ball-eight.svg',golf:'golf-flag.svg',tycoon:'car-2.png',gofish:'card-back.svg',ludo:'pawn-1.png',battleship:'ship-battleship.png',colorstack:'stack-back.svg',chess:'chess-wK.png'}[id];
  return `<article class="scene-results" data-scene-result="${id}"><div class="scene-result-heading">${art?`<img src="${root}${art}" alt="" class="scene-result-mark">`:''}<span>${names[id]}</span></div><div class="scene-results-body">${markup}</div></article>`;
 }
 return {mount,piece,pawn,car,card,rack,steps,image,meeting,result};
})();
