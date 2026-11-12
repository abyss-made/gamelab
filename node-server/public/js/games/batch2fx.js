// Batch 2's isolated presentation adapter. Never sends intents or exposes hidden state.
window.GameUI=window.GameUI||{};
GameUI.batch2fx=(()=>{
 const preference=matchMedia('(prefers-reduced-motion: reduce)'),active=new Set();
 preference.addEventListener('change',()=>{if(preference.matches)active.forEach(a=>a.cancel());});
 function animate(el,frames,duration=320){
  if(!el||preference.matches)return;
  const a=el.animate(frames,{duration,easing:'cubic-bezier(.2,.75,.2,1)'});active.add(a);a.finished.catch(()=>{}).finally(()=>active.delete(a));return a;
 }
 function transient(root,anchor,kind,text=''){
  if(!anchor||preference.matches)return;
  const box=root.getBoundingClientRect(),r=anchor.getBoundingClientRect(),el=document.createElement('span');
  el.className='b25-effect '+kind;el.setAttribute('aria-hidden','true');el.textContent=text;
  el.style.left=(r.x+r.width/2-box.x)+'px';el.style.top=(r.y+r.height/2-box.y)+'px';root.append(el);
  const frames=kind==='missile'?[{transform:'translate(-140px,130px) rotate(-45deg)',opacity:0},{opacity:1,offset:.2},{transform:'translate(-50%,-50%) rotate(-45deg)',opacity:0}]:[{transform:'translate(-50%,-50%) scale(.25)',opacity:0},{opacity:1,offset:.15},{transform:'translate(-50%,-50%) scale(2)',opacity:0}];
  const a=animate(el,frames,kind==='missile'?300:650);if(a)a.finished.catch(()=>{}).finally(()=>el.remove());else el.remove();
 }
 function fly(root,from,to,src){
  if(!from||!to||preference.matches)return;
  const box=root.getBoundingClientRect(),a=from.getBoundingClientRect?from.getBoundingClientRect():from,b=to.getBoundingClientRect(),el=typeof src==='string'?document.createElement('img'):src.cloneNode(true);if(typeof src==='string'){el.src=src;el.alt='';}else{el.removeAttribute('id');el.tabIndex=-1;}el.classList.add('b25-flight');el.setAttribute('aria-hidden','true');el.style.left=(a.x+a.width/2-box.x-24)+'px';el.style.top=(a.y+a.height/2-box.y-34)+'px';root.append(el);
  const anim=animate(el,[{transform:'rotate(-12deg)',opacity:0},{opacity:1,offset:.1},{transform:`translate(${b.x+b.width/2-a.x-a.width/2}px,${b.y+b.height/2-a.y-a.height/2}px) rotate(8deg)`,opacity:0}],400);if(anim)anim.finished.catch(()=>{}).finally(()=>el.remove());else el.remove();
 }
 function trap(e,dialog){
  if(e.key!=='Tab'||dialog.hidden||!dialog.contains(document.activeElement))return;
  const buttons=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(n=>n.getClientRects().length);if(!buttons.length)return;
  if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}
 }
 return{animate,transient,fly,trap,reduced:()=>preference.matches};
})();
