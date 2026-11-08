// Confirmed-state presentation only: no action queues, synthetic scores or private-state inference.
window.GameExperience=(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),cache=new WeakMap();
 const phaseTargets={trivia:'#tv-choices',bluff:'#bl-body',impostor:'#im-body',telephone:'#tp-body',categories:'#cr-body',wordscramble:'#ws-tiles',tycoon:'#ty-actions'};
 const specs={colorstack:['#cs-hand [data-card]','card'],gofish:['#gf-hand [data-hand-card]','handCard'],ludo:['[data-tok]','tok']};
 function animate(el,frames,options={}){if(el&&!reduced.matches&&el.animate)el.animate(frames,{duration:240,easing:'cubic-bezier(.2,.8,.2,1)',...options});}
 function nodes(stage,game){const out=new Map(),s=specs[game];if(s)stage.querySelectorAll(s[0]).forEach(el=>out.set(el.dataset[s[1]],{el,rect:el.getBoundingClientRect()}));return out;}
 function before(stage,state){return {nodes:nodes(stage,state.gameId),previous:cache.get(stage)};}
 function after(stage,state,snap){
  const g=state.game,turn=g.turnId||g.players?.[g.turn]?.id||g.drawerId||'',phase=[state.gameId,g.round,g.phase,g.kind,g.holeIndex].join('|');
  const scores=new Map((g.players||[]).map(p=>[p.id,p.points??p.boxes??p.books?.length??p.words??p.cash]));
  stage.dataset.experience=state.gameId;const previous=snap.previous;
  if(previous?.game===state.gameId){
   if(previous.phase!==phase)animate(stage.querySelector(phaseTargets[state.gameId]),[{opacity:.3,translate:'0px 8px'},{opacity:1,translate:'0px 0px'}]);
   for(const [id,item] of nodes(stage,state.gameId)){
    const old=snap.nodes.get(id);
    if(old){const dx=old.rect.x-item.rect.x,dy=old.rect.y-item.rect.y;if(Math.abs(dx)+Math.abs(dy)>2&&old.rect.width===item.rect.width)animate(item.el,[{translate:`${dx}px ${dy}px`},{translate:'0px 0px'}],{duration:280});}
    else animate(item.el,[{opacity:0,translate:'0px 16px'},{opacity:1,translate:'0px 0px'}]);
   }
   stage.querySelectorAll('[data-player]').forEach(el=>{
    const id=el.dataset.player;
    if(turn===id&&previous.turn!==turn)animate(el,[{boxShadow:'0 0 0 5px #b7ff4655'},{boxShadow:'0 0 0 0 #b7ff4600'}],{duration:450});
    if(scores.has(id)&&previous.scores.has(id)&&scores.get(id)!==previous.scores.get(id))animate(el,[{filter:'brightness(1.6)'},{filter:'brightness(1)'}],{duration:400});
   });
   if(state.gameId==='colorstack'&&previous.top!==g.top?.id)animate(stage.querySelector('#cs-top'),[{opacity:.3,translate:'-28px -12px',rotate:'-12deg'},{opacity:1,translate:'0px 0px',rotate:'0deg'}],{duration:280});
  }
  cache.set(stage,{game:state.gameId,turn,phase,scores,top:g.top?.id});
 }
 function reset(stage){if(stage){cache.delete(stage);delete stage.dataset.experience;}}
 document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  const target=e.target,dialog=target.closest?.('#cs-picker,#ch-promo,.pld-picker');
  if(dialog&&!dialog.hidden){
   if(e.key==='Escape'){const close=dialog.querySelector('[data-color=""],#ch-promo-cancel,[data-pick-close]');if(close){e.preventDefault();close.click();}}
   if(e.key==='Tab'){const all=[...dialog.querySelectorAll('button:not(:disabled)')];if(e.shiftKey&&target===all[0]){e.preventDefault();all.at(-1)?.focus();}else if(!e.shiftKey&&target===all.at(-1)){e.preventDefault();all[0]?.focus();}}
   return;
  }
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
  const board=target.closest?.('.ch-board,.ck-board,.ttt-board,.db-grid');if(!board||target.tagName!=='BUTTON')return;
  const all=[...board.querySelectorAll('button:not(:disabled)')];let next;
  if(e.key==='Home')next=all[0];else if(e.key==='End')next=all.at(-1);else{
   const r=target.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=['ArrowLeft','ArrowRight'].includes(e.key),sign=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;
   next=all.map(el=>{const b=el.getBoundingClientRect(),dx=b.x+b.width/2-x,dy=b.y+b.height/2-y;return {el,along:(h?dx:dy)*sign,across:Math.abs(h?dy:dx)};}).filter(p=>p.along>2).sort((a,b)=>a.along+a.across*3-b.along-b.across*3)[0]?.el;
  }
  e.preventDefault();next?.focus({preventScroll:true});
 });
 reduced.addEventListener('change',()=>{if(reduced.matches)document.getAnimations().forEach(a=>a.cancel());});
 return {before,after,reset,animate};
})();
