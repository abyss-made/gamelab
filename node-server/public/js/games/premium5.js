// Five-game presentation only. No intents, inferred cards, scores or simulated physics.
window.GameUI = window.GameUI || {};
GameUI.premium5 = (() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Set();
  motion.addEventListener('change', () => { if (motion.matches) running.forEach(a => a.cancel()); });
  function animate(el, frames, duration = 360) {
    if (!el || motion.matches) return;
    const a = el.animate(frames, {duration, easing:'cubic-bezier(.2,.7,.2,1)'});
    running.add(a); a.finished.catch(()=>{}).finally(()=>running.delete(a));
    return a;
  }
  const rects = (root, selector, key) => new Map([...root.querySelectorAll(selector)].map(el => [el.dataset[key], el.getBoundingClientRect()]));
  function flip(root, selector, key, before, duration = 120) {
    root.querySelectorAll(selector).forEach(el => {
      const old = before.get(el.dataset[key]); if (!old) return;
      const next = el.getBoundingClientRect(), dx = old.x-next.x, dy = old.y-next.y;
      if (Math.abs(dx)+Math.abs(dy)>1) animate(el,[{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],duration);
    });
  }
  function fly(root, from, to, count = 1) {
    if (!from || !to || motion.matches) return;
    const a=from.getBoundingClientRect(), b=to.getBoundingClientRect(), box=root.getBoundingClientRect();
    for(let i=0;i<Math.min(4,count);i++) {
      const el=document.createElement('img');el.className='p5-flying-card';el.src='/assets/premium/marine-card-back.svg';el.alt='';el.setAttribute('aria-hidden','true');
      el.style.left=(a.x+a.width/2-box.x-18)+'px';el.style.top=(a.y+a.height/2-box.y-25)+'px';root.append(el);
      const anim=animate(el,[{transform:'translate(0,0) rotate(-12deg)',opacity:0},{offset:.15,opacity:1},{transform:`translate(${b.x+b.width/2-a.x-a.width/2+i*3}px,${b.y+b.height/2-a.y-a.height/2}px) rotate(8deg)`,opacity:0}],420+i*45);
      if(anim) anim.finished.catch(()=>{}).finally(()=>el.remove()); else el.remove();
    }
  }
  function scene() {
    const history=new Map(); let sparks=[];
    return {
      reset(){history.clear();sparks=[];},
      ball(ctx,id,b,now,r,color){
        if(motion.matches){history.clear();sparks=[];return;}
        const old=history.get(id);
        if(b.gone){if(old&&!old.gone)sparks.push({x:old.x,y:old.y,t:now,color,r:r*2.4});history.set(id,{...b,t:now,gone:true});return;}
        if(old && now-old.t<100 && now!==old.t && !old.gone) {
          const dx=b.x-old.x,dy=b.y-old.y,dist=Math.hypot(dx,dy);
          if(dist>.3 && dist<r*10){
            const pts=[...(old.pts||[]),{x:old.x,y:old.y}].slice(-7);
            ctx.save();ctx.lineCap='round';ctx.lineWidth=r*.8;
            pts.forEach((p,i)=>{ctx.globalAlpha=(i+1)/pts.length*.22;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(p.x,p.y);const q=pts[i+1]||b;ctx.lineTo(q.x,q.y);ctx.stroke();});ctx.restore();
            if(old.dx!==undefined && dx*old.dx+dy*old.dy<-.5 && now-(old.impact||0)>120){sparks.push({x:old.x,y:old.y,t:now,color,r:r*2});old.impact=now;}
            history.set(id,{...b,t:now,dx,dy,pts,impact:old.impact});return;
          }
        }
        history.set(id,{...b,t:now});
      },
      draw(ctx,now){
        sparks=sparks.filter(s=>now-s.t<320).slice(-24);
        if(motion.matches)return;
        ctx.save();sparks.forEach(s=>{const t=(now-s.t)/320;ctx.globalAlpha=(1-t)*.75;ctx.strokeStyle=s.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x,s.y,s.r*(.3+t),0,Math.PI*2);ctx.stroke();});ctx.restore();
      }
    };
  }
  return {animate,rects,flip,fly,scene,reduced:()=>motion.matches};
})();
