// Mini Golf screen: canvas hole, drag to aim, power slider, scorecard. The server plays each putt and sends the
// sampled path; this screen only replays it.
window.GameUI = window.GameUI || {};
GameUI.golf = (() => {
  const C = GameUI.common;
  const FX = GameUI.premium5;
  const visual = FX.scene();
  const COLORS = ["#ff477b", "#4db8ff", "#ffcd2d", "#adff00", "#b48cff", "#ff9a3d"];
  let root = null;
  let app = null;
  let S = null;
  let g = null;
  let canvas = null;
  let ctx = null;
  let scene3d = null;
  let clock = null;
  let raf = 0;
  let aim = 0;
  let power = 50;
  let placing = false;
  let teeDraft = null;
  let animKey = -1;
  let animT0 = 0;
  let receivedShotTime = 0;
  let busyUntil = 0;
  let holeKey = "";
  let dragging = false;
  let gesture = null;
  let tickT = 0;
  let loupe = null; // {x,y} screen-space finger while aiming: temporary 2D magnifier of the same course
  let decoKey = "";
  let deco = [];
  let lastTrail = null;
  let showTrail = false;
  let readyTurn = '';
  let renderReady = false;
  let renderGeneration = 0;
  let renderLoadT = 0;
  let renderCleanup = null;
  let renderNotice = '';

  const assets=new Map(),patterns=new Map();
  function clubImage(name,ext='png'){
    const key=name+'.'+ext;if(!assets.has(key)){const image=new Image();image.src='/assets/golf-club/'+key;assets.set(key,image);}
    const image=assets.get(key);return image.complete&&image.naturalWidth?image:null;
  }
  function material(name,scale,fallback){
    const image=clubImage(name);if(!image)return fallback;
    const key=name+':'+scale;if(!patterns.has(key)){const pattern=ctx.createPattern(image,'repeat');pattern.setTransform(new DOMMatrix().scale(scale));patterns.set(key,pattern);}
    return patterns.get(key);
  }

  // Phone portrait: rotate the unchanged 700x440 course -90deg to fill the screen; input is inverse-mapped.
  const portrait = () => !scene3d && !!canvas && window.innerWidth < 700 && window.innerHeight > window.innerWidth;

  const deg = (r) => ((((r * 180) / Math.PI) % 360) + 360) % 360;
  const colorOf = (i) => COLORS[i % COLORS.length];
  const me = () => (g ? g.players.findIndex((p) => p.id === S.you) : -1);
  const canPutt = () => renderReady && g && g.phase === "play" && g.turnId === S.you && performance.now() >= busyUntil && !S.lastResult;

  function rendererReady(mode) {
    if (!root || renderReady) return;
    renderReady = true;
    clearTimeout(renderLoadT);
    root.dataset.renderer = mode;
    canvas.setAttribute('aria-busy', 'false');
    paintText();
    syncControls();
  }

  function useCompatibilityView(reason) {
    if (!root || !canvas) return;
    const restoreFocus = document.activeElement === canvas;
    renderGeneration++;
    renderReady = false;
    clearTimeout(renderLoadT);
    renderCleanup?.(); renderCleanup = null;
    cancelPull();
    placing=false;teeDraft=null;
    const oldScene = scene3d; scene3d = null;
    if (oldScene) oldScene.dispose();
    const replacement = canvas.cloneNode(false);
    replacement.style.width = ''; replacement.style.height = '';
    replacement.classList.remove('portrait');
    canvas.replaceWith(replacement); canvas = replacement;
    ctx = canvas.getContext('2d'); patterns.clear();
    root.dataset.renderer = ctx ? 'loading' : 'error';
    renderNotice = !ctx ? '' : reason === 'lost' ? 'You can keep playing in the simpler course view.' : 'A simpler course view is available with the same controls.';
    root.querySelector('#gf-input-help').textContent = 'Top-down view. Tap to aim, or pull back from your ball to putt.';
    bindCanvas(); fit();
    if (restoreFocus) canvas.focus({preventScroll:true});
    paintText(); syncControls();
  }

  function prepareRenderer() {
    const mounted = root, target = canvas, generation = ++renderGeneration;
    const current = () => root === mounted && generation === renderGeneration;
    const onLost = event => {
      event.preventDefault();
      if (current()) useCompatibilityView('lost');
    };
    target.addEventListener('webglcontextlost', onLost);
    renderCleanup = () => target.removeEventListener('webglcontextlost', onLost);
    // Network-delayed graphics must not leave a party member unable to play.
    renderLoadT = setTimeout(() => { if (current() && !renderReady) useCompatibilityView('slow'); }, 6000);
    GolfClubScene.create(target, root.querySelector('.club-arena')).then(scene => {
      if (!current()) { scene.dispose(); return; }
      clearTimeout(renderLoadT);
      scene3d = scene; fit();
      // Unlock only after frame() has displayed the actual current hole.
    }).catch(() => { if (current()) useCompatibilityView('unavailable'); });
  }

  function size() {
    const rect = canvas.getBoundingClientRect();
    const rot = portrait();
    return { rect, rot, k: rect.width / (rot ? g.size.h : g.size.w) };
  }

  function fit() {
    if (!canvas || !g) return;
    if(scene3d){canvas.classList.remove('portrait');canvas.style.width='100%';canvas.style.height='100%';const changed=scene3d.resize();if(changed&&gesture)cancelPull();return;}
    const rot = portrait();
    canvas.classList.toggle("portrait", rot);
    if (rot) {
      const maxH = Math.max(300, canvas.parentElement.clientHeight);
      canvas.style.width = `${Math.min(canvas.parentElement.clientWidth, (maxH * g.size.h) / g.size.w)}px`;
    } else canvas.style.width = `${Math.min(canvas.parentElement.clientWidth,canvas.parentElement.clientHeight*g.size.w/g.size.h)}px`;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(rect.width * dpr);
    const ch = Math.round((rot ? (rect.width * g.size.w) / g.size.h : (rect.width * g.size.h) / g.size.w) * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
  }

  // ---- botanical decoration: placed only outside the playable polygon, never collides ----
  function inPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function edgeDist(x, y, pts) {
    let d = 1e9;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [ax, ay] = pts[j], [bx, by] = pts[i];
      const vx = bx - ax, vy = by - ay;
      const u = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)));
      d = Math.min(d, Math.hypot(x - ax - u * vx, y - ay - u * vy));
    }
    return d;
  }
  function buildDeco(h) {
    const out = [];
    let seed = 7;
    for (const ch of h.name || "") seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) % 1000) / 1000;
    for (let y = 34; y < g.size.h - 20; y += 66)
      for (let x = 34; x < g.size.w - 20; x += 76) {
        const px = x + (rnd() - 0.5) * 26, py = y + (rnd() - 0.5) * 22;
        if (inPoly(px, py, h.poly)) continue;
        const d = edgeDist(px, py, h.poly);
        if (d < 26) continue;
        const kind = rnd();
        if (kind < 0.3 && d > 34) out.push({ t: "tree", x: px, y: py, r: Math.min(d - 10, 16 + rnd() * 9) });
        else if (kind < 0.5) out.push({ t: "flowers", x: px, y: py, c: ["#f3a6c0", "#fff2b8", "#e8c3ff"][Math.floor(rnd() * 3)] });
      }
    return out;
  }
  function drawDeco(c) {
    for(const d of deco){
      c.save();c.translate(d.x,d.y);
      const sprite=d.t==='tree'?clubImage('palm','svg'):null;
      if(sprite&&d.t==='tree'){c.drawImage(sprite,-d.r*1.7,-d.r*1.9,d.r*3.4,d.r*3.4);}
      else if(d.t==='tree'){
        c.fillStyle='#031b2a77';c.beginPath();c.ellipse(6,9,d.r*1.1,d.r*.9,0,0,7);c.fill();
        for(let j=0;j<7;j++){const a=j*Math.PI*2/7,x=Math.cos(a)*d.r*.42,y=Math.sin(a)*d.r*.42,g=c.createRadialGradient(x-3,y-4,1,x,y,d.r*.65);g.addColorStop(0,j%2?'#6aa793':'#93bf92');g.addColorStop(1,'#1c5b65');c.fillStyle=g;c.beginPath();c.arc(x,y,d.r*.65,0,7);c.fill();}
        c.strokeStyle='#c5deaa77';c.lineWidth=1;c.beginPath();c.arc(-3,-4,d.r*.5,3.4,5.5);c.stroke();
      }else{
        c.fillStyle='#193f50';c.beginPath();c.ellipse(0,3,15,8,0,0,7);c.fill();
        for(const [x,y] of [[-8,-1],[-2,2],[4,-2],[9,1]]){c.strokeStyle='#88c7b3';c.lineWidth=1;c.beginPath();c.moveTo(x,y+4);c.lineTo(x,y-2);c.stroke();for(let k=0;k<5;k++){c.fillStyle=d.c;c.beginPath();c.arc(x+Math.cos(k*1.25)*2,y+Math.sin(k*1.25)*2,2,0,7);c.fill();}c.fillStyle='#f2d58f';c.beginPath();c.arc(x,y,1.4,0,7);c.fill();}
      }
      c.restore();
    }
  }

  function poly(c, pts) {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  }

  function myBall() {
    return g.players.find((p) => p.id === S.you);
  }

  // Position of a player's ball right now (the mover's ball follows the replayed path).
  function ballAt(p, now) {
    const a = g.anim;
    const path = a && (a.by === p.id ? a.frames : a.paths?.[p.id]);
    if (a && a.shot === animKey && path) {
      const t = (now - animT0) / 1000;
      if (t < a.duration) {
        const fr = path;
        let i = 0;
        while (i < fr.length - 2 && fr[i + 1][0] <= t) i++;
        const f0 = fr[i], f1 = fr[Math.min(i + 1, fr.length - 1)];
        const u = f1[0] > f0[0] ? Math.min(1, Math.max(0, (t - f0[0]) / (f1[0] - f0[0]))) : 0;
        if (f0[1] === null) return null;
        if (f1[1] === null) return { x: f0[1], y: f0[2] };
        return { x: f0[1] + (f1[1] - f0[1]) * u, y: f0[2] + (f1[2] - f0[2]) * u };
      }
      if (p.holed) return null;
    }
    return { x: p.x, y: p.y };
  }

  function draw(now) {
    if (!canvas || !g || !g.hole) return;
    fit();
    if(scene3d){
      fit();const animating=!!(g.anim&&now-animT0<g.anim.duration*1000);
      const positions=g.players.map(p=>({p,pos:p.out||p.holed&&!(animating&&(g.anim.by===p.id||g.anim.paths?.[p.id]))?null:ballAt(p,now)}));
      try {
        scene3d.frame({g,now,positions,aim,power,mine:S.you,pulling:gesture?.mode==='pull',aiming:gesture?.mode==='pull'||gesture?.mode==='aim',canPutt:canPutt(),placing,teeDraft,animating,trail:lastTrail,showTrail,receivedShotTime,shotTime:g.anim?Math.max(0,(now-animT0)/1000):0});
        if(scene3d?.key===holeKey && scene3d.ready)rendererReady('webgl');
      } catch (error) {
        console.warn('Mini Golf is switching to its compatibility view.', error);
        useCompatibilityView('unavailable');
      }
      return;
    }
    if(!ctx)return;
    const h = g.hole;
    if (decoKey !== holeKey) { decoKey = holeKey; deco = buildDeco(h); }
    const rot = portrait();
    const k = canvas.width / (rot ? g.size.h : g.size.w);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    if (rot) { ctx.translate(0, g.size.w); ctx.rotate(-Math.PI / 2); }
    scene(now);
    // thumb loupe: magnified mirror of the same course around the ball while the finger is down
    const b = myBall();
    if (loupe && b && canPutt()) {
      const R = 62, Z = 2.1;
      const lx = b.x < g.size.w / 2 ? g.size.w - R - 14 : R + 14, ly = R + 14;
      ctx.save();
      ctx.beginPath(); ctx.arc(lx, ly, R, 0, 7); ctx.fillStyle = "#0a2a22"; ctx.fill(); ctx.clip();
      ctx.translate(lx, ly); ctx.scale(Z, Z); ctx.translate(-b.x, -b.y);
      scene(now);
      ctx.restore();
      ctx.beginPath(); ctx.arc(lx, ly, R, 0, 7); ctx.strokeStyle = "#f2e8cf"; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    rendererReady('2d');
  }

  function shownGates(now){return g.anim&&now-animT0<g.anim.duration*1000?(g.anim.gates||g.hole.gates||[]):(g.hole.gates||[]);}
  function scene(now) {
    const h = g.hole;
    const party=g.course.id==='gauntlet';
    const lawn = ctx.createLinearGradient(0, 0, 0, g.size.h);
    lawn.addColorStop(0, "#61cbd7");
    lawn.addColorStop(1, "#2396bb");
    ctx.fillStyle = lawn;
    ctx.fillRect(-400, -400, g.size.w + 800, g.size.h + 800);
    ctx.save();ctx.globalAlpha=.45;ctx.fillStyle=material('water',.7,'#32afcb');ctx.fillRect(-400,-400,g.size.w+800,g.size.h+800);ctx.restore();
    drawDeco(ctx);
    // Raised miniature course base. Its top edge remains the exact collision polygon.
    ctx.save();ctx.translate(0,7);poly(ctx,h.poly);ctx.shadowColor='#041f25aa';ctx.shadowBlur=16;ctx.shadowOffsetY=8;ctx.fillStyle='#879d9a';ctx.fill();ctx.strokeStyle='#6e8e92';ctx.lineWidth=15;ctx.lineJoin='round';ctx.stroke();ctx.restore();
    // fairway with mowing stripes
    poly(ctx, h.poly);
    const green=ctx.createLinearGradient(0,0,g.size.w,g.size.h);green.addColorStop(0,"#8acb59");green.addColorStop(.55,"#62b447");green.addColorStop(1,"#328b43");
    ctx.fillStyle = party?'#58b2dd':material('turf',.35,green);
    ctx.fill();
    ctx.save();
    poly(ctx, h.poly);
    ctx.clip();
    const cupGlow = ctx.createRadialGradient(h.cup[0], h.cup[1], 4, h.cup[0], h.cup[1], 70);
    cupGlow.addColorStop(0, "#7fd07a55");
    cupGlow.addColorStop(1, "#7fd07a00");
    ctx.fillStyle = cupGlow;
    ctx.fillRect(h.cup[0] - 70, h.cup[1] - 70, 140, 140);
    for (const z of h.sand) { ctx.fillStyle = material('sand',.3,'#dfc399'); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(z.x, z.y, z.w, z.h, 14) : ctx.rect(z.x, z.y, z.w, z.h); ctx.fill(); ctx.strokeStyle = "#c9ae66"; ctx.lineWidth = 2; ctx.stroke(); }
    for (const z of h.water) {
      const wg = ctx.createLinearGradient(z.x, z.y, z.x + z.w, z.y + z.h);
      wg.addColorStop(0, "#234c7e"); wg.addColorStop(1, "#102a51");
      ctx.fillStyle = party?'#168849':material('water',.3,wg); ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeStyle = "#cfeee966"; ctx.lineWidth = 1.5;
      for (let y = z.y + 10; y < z.y + z.h; y += 14) { ctx.beginPath(); ctx.moveTo(z.x + 8, y); ctx.bezierCurveTo(z.x + z.w * 0.3, y - 4, z.x + z.w * 0.6, y + 4, z.x + z.w - 8, y); ctx.stroke(); }
    }
    ctx.restore();
    for(const tile of h.boosts||[]){
      ctx.save();ctx.fillStyle='#baff45';ctx.fillRect(tile.x,tile.y,tile.w,tile.h);ctx.strokeStyle='#102e41';ctx.lineWidth=2;ctx.strokeRect(tile.x,tile.y,tile.w,tile.h);
      ctx.translate(tile.x+tile.w/2,tile.y+tile.h/2);ctx.rotate(tile.angle);ctx.strokeStyle='#102e41';ctx.lineWidth=3;
      const along=Math.abs(Math.cos(tile.angle))>.5?tile.w:tile.h,across=Math.abs(Math.cos(tile.angle))>.5?tile.h:tile.w;
      for(const offset of [-1,0,1]){const x=offset*along*.25;ctx.beginPath();ctx.moveTo(x-4,-across*.22);ctx.lineTo(x+3,0);ctx.lineTo(x-4,across*.22);ctx.stroke();}ctx.restore();
    }
    // jointed limestone curbs
    ctx.lineJoin = "round";
    poly(ctx, h.poly);
    ctx.strokeStyle = "#5b8990";
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = party?'#64e1df':material('stone',.3,'#d7e0d7');
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.save();
    ctx.setLineDash([1.2, 16]);
    ctx.strokeStyle = "#799a9e88";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
    for (const w of h.walls) {
      ctx.save();ctx.translate(2,5);poly(ctx,w);ctx.fillStyle='#1d412c';ctx.shadowColor='#17372988';ctx.shadowBlur=7;ctx.fill();ctx.restore();
      poly(ctx, w);
      const wg=ctx.createLinearGradient(0,0,g.size.w,g.size.h);wg.addColorStop(0,'#dbbd7d');wg.addColorStop(1,'#88643e');
      ctx.fillStyle = party?'#ef62ae':material('wood',.24,wg);
      ctx.fill();
      ctx.strokeStyle = "#f2d69b";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    for (const b of h.bumpers) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, 7);
      const bumper=ctx.createRadialGradient(b.x-b.r*.3,b.y-b.r*.4,1,b.x,b.y,b.r);bumper.addColorStop(0,"#e4ffc1");bumper.addColorStop(.4,"#9be859");bumper.addColorStop(1,"#2b694c");
      ctx.fillStyle = bumper;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#030d17";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.45, 0, 7);
      ctx.fillStyle = "#030d17";
      ctx.fill();
    }
    // The compatibility renderer uses the same shot-locked gate state as WebGL.
    for(const gate of shownGates(now)){
      poly(ctx,gate.poly);ctx.fillStyle=gate.closed?'#ed4e9c':'#4bd6d044';ctx.fill();
      ctx.strokeStyle=gate.closed?'#ffe46a':'#30a29a';ctx.lineWidth=3;ctx.stroke();
      const x=gate.poly.reduce((s,p)=>s+p[0],0)/gate.poly.length,y=gate.poly.reduce((s,p)=>s+p[1],0)/gate.poly.length;
      ctx.fillStyle='#0b2335';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(gate.closed?'×':'↑',x,y+4);
    }
    const motorTime=GolfMotion.clock(h,g.anim,Math.max(0,(now-animT0)/1000));
    for(const motor of h.motors||[]){const p=GolfMotion.pose(motor,motorTime);ctx.save();ctx.strokeStyle='#f04d9f';ctx.lineWidth=p.r*2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.ax,p.ay);ctx.lineTo(p.bx,p.by);ctx.stroke();ctx.beginPath();ctx.arc(motor.x,motor.y,7,0,7);ctx.fillStyle='#baff45';ctx.fill();ctx.restore();}
    if(g.anim&&!matchMedia('(prefers-reduced-motion:reduce)').matches){const t=(now-animT0)/1000;for(const e of g.anim.impacts||[]){const age=t-e.t;if(age<0||age>.3)continue;ctx.save();ctx.globalAlpha=1-age/.3;ctx.strokeStyle=e.type==='motor'?'#ffe256':'#effffc';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,3+age*65,0,7);ctx.stroke();ctx.restore();}}
    for (const zone of h.slopes || []) {
      ctx.fillStyle='#cfba6b88';ctx.fillRect(zone.x,zone.y,zone.w,zone.h);
      ctx.save();ctx.beginPath();ctx.rect(zone.x,zone.y,zone.w,zone.h);ctx.clip();ctx.strokeStyle='#fcf3cc99';ctx.lineWidth=2;
      for(let y=zone.y+14;y<zone.y+zone.h;y+=24)for(let x=zone.x+14;x<zone.x+zone.w;x+=24){
        ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(zone.ay,zone.ax));ctx.beginPath();ctx.moveTo(-7,-5);ctx.lineTo(0,0);ctx.lineTo(-7,5);ctx.stroke();ctx.restore();
      }ctx.restore();
    }
    const area=h.teeArea;
    if(area){ctx.save();ctx.setLineDash([5,4]);ctx.strokeStyle=placing?'#c6ff55':'#ffffff88';ctx.lineWidth=2;ctx.strokeRect(area.x,area.y,area.w,area.h);ctx.restore();}
    if(placing&&teeDraft){ctx.beginPath();ctx.arc(teeDraft.x,teeDraft.y,h.ballR+4,0,7);ctx.strokeStyle='#c6ff55';ctx.lineWidth=3;ctx.stroke();}
    // tee and cup
    ctx.beginPath();
    ctx.arc(h.tee[0], h.tee[1], 9, 0, 7);
    ctx.fillStyle = "#ffffff30";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(h.cup[0], h.cup[1], h.cupR, 0, 7);
    ctx.fillStyle = "#030d17";
    ctx.fill();
    ctx.strokeStyle = "#f6f8fb";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(h.cup[0], h.cup[1]);
    ctx.lineTo(h.cup[0], h.cup[1] - 34);
    ctx.strokeStyle = "#f6f8fb";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(h.cup[0], h.cup[1] - 34);
    ctx.lineTo(h.cup[0] + 20, h.cup[1] - 27);
    ctx.lineTo(h.cup[0], h.cup[1] - 20);
    ctx.fillStyle = "#f14e52";
    ctx.fill();
    if(showTrail&&lastTrail&&performance.now()>=busyUntil){ctx.save();ctx.setLineDash([4,5]);ctx.strokeStyle='#f5ffe0b0';ctx.lineWidth=2;ctx.beginPath();let started=false;for(const f of lastTrail.frames){if(f[1]===null)break;if(started)ctx.lineTo(f[1],f[2]);else{ctx.moveTo(f[1],f[2]);started=true;}}ctx.stroke();ctx.restore();}
    // balls
    const mineIdx = me();
    const t0 = ballAt(myBall() || { x: 0, y: 0 }, now);
    g.players.forEach((p, i) => {
      if (p.out) return;
      const pos = ballAt(p, now);
      if(p.holed && !(g.anim && now-animT0<g.anim.duration*1000)) visual.ball(ctx,p.id,{x:p.x,y:p.y,gone:true},now,h.ballR,colorOf(i));
      if (!pos || (p.holed && !(g.anim && (g.anim.by === p.id || g.anim.paths?.[p.id]) && g.anim.shot === animKey && now - animT0 < g.anim.duration * 1000))) return;
      visual.ball(ctx,p.id,pos,now,h.ballR,colorOf(i));
      ctx.beginPath();
      ctx.arc(pos.x + 1, pos.y + 2, h.ballR, 0, 7);
      ctx.fillStyle = "#0005";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, h.ballR, 0, 7);
      const bg = ctx.createRadialGradient(pos.x - h.ballR * 0.4, pos.y - h.ballR * 0.5, 1, pos.x, pos.y, h.ballR);
      bg.addColorStop(0, "#fff"); bg.addColorStop(0.65, "#f6f6e7"); bg.addColorStop(1, "#a0b3aa");
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.lineWidth = p.id === g.turnId ? 3 : 2;
      ctx.strokeStyle = colorOf(i);
      ctx.stroke();
    });
    visual.draw(ctx,now);
    // aim guide
    if (canPutt() && mineIdx >= 0 && t0) {
      const len = 40 + power * 1.6;
      ctx.save();
      ctx.setLineDash([9, 7]);
      ctx.strokeStyle = "#f6f8fb";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      ctx.lineTo(t0.x + Math.cos(aim) * len, t0.y + Math.sin(aim) * len);
      ctx.stroke();
      ctx.restore();
      const ex = t0.x + Math.cos(aim) * len, ey = t0.y + Math.sin(aim) * len;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - Math.cos(aim - 0.45) * 14, ey - Math.sin(aim - 0.45) * 14);
      ctx.lineTo(ex - Math.cos(aim + 0.45) * 14, ey - Math.sin(aim + 0.45) * 14);
      ctx.closePath();
      ctx.fillStyle = "#f6f8fb";
      ctx.fill();
    }
  }

  function loop() {
    draw(performance.now());
    raf = requestAnimationFrame(loop);
  }

  // Screen point -> unchanged course coordinates (inverse of the portrait rotation).
  function toCourse(ev) {
    if(scene3d)return scene3d.toCourse(ev)||{x:myBall()?.x||0,y:myBall()?.y||0};
    const { rect, rot } = size();
    const sx = (ev.clientX - rect.left) / rect.width, sy = (ev.clientY - rect.top) / rect.height;
    if (rot) return { x: g.size.w - sy * g.size.w, y: sx * g.size.h };
    return { x: sx * g.size.w, y: sy * g.size.h };
  }

  const canPlace = () => renderReady && g && g.phase==='play' && performance.now() >= busyUntil && !S.lastResult && myBall() && !myBall().out && myBall().strokes===0;
  function courseScreen(x,y,elevation=6){
    if(scene3d)return scene3d.project(x,y,elevation);
    const {rect,rot}=size();return{x:rect.left+(rot?y/g.size.h:x/g.size.w)*rect.width,y:rect.top+(rot?(g.size.w-x)/g.size.w:y/g.size.h)*rect.height};
  }
  function ballScreen(){const b=myBall();return b?courseScreen(b.x,b.y):null;}
  function cancelPull() {
    const saved=gesture;gesture=null;dragging=false;loupe=null;
    if(saved?.mode==='pull'){aim=saved.aim;power=saved.power;}
    if(canvas&&saved&&canvas.hasPointerCapture(saved.id))canvas.releasePointerCapture(saved.id);
    if(root){root.dataset.gesture='idle';syncControls();paintText();}
  }
  function onPointer(ev) {
    if(!ctx&&!scene3d)return;
    if(ev.type==='pointerdown'&&ev.isPrimary===false){cancelPull();return;}
    if(scene3d&&ev.type==='pointerdown'&&ev.button===2){gesture={id:ev.pointerId,mode:'camera',clientX:ev.clientX,clientY:ev.clientY};canvas.setPointerCapture(ev.pointerId);ev.preventDefault();return;}
    if(gesture?.mode==='camera'){if(ev.type==='pointermove'){scene3d.rotate((ev.clientX-gesture.clientX)*.006,(ev.clientY-gesture.clientY)*.003);gesture.clientX=ev.clientX;gesture.clientY=ev.clientY;}if(['pointerup','pointercancel','lostpointercapture'].includes(ev.type))cancelPull();return;}
    if (ev.type==='pointercancel'||ev.type==='lostpointercapture') {cancelPull();return;}
    if(placing&&canPlace()){
      ev.preventDefault();
      if(ev.type==='pointerdown'){try{canvas.setPointerCapture(ev.pointerId);}catch{/* synthetic pointer events have no active pointer */}teeDraft=toCourse(ev);}
      if(ev.type==='pointermove'&&ev.buttons)teeDraft=toCourse(ev);
      if(ev.type==='pointerup'){const point=toCourse(ev);app.socket.emit('action',{type:'place',x:point.x,y:point.y});placing=false;teeDraft=null;syncControls();}
      return;
    }
    if(!canPutt()){if(gesture)cancelPull();return;}
    if(ev.type==='pointerdown'){
      if(ev.button>0||ev.isPrimary===false)return;
      const screen=ballScreen();
      const near=screen&&Math.hypot(ev.clientX-screen.x,ev.clientY-screen.y)<=28;
      gesture={id:ev.pointerId,mode:near?'pull':'aim',start:toCourse(ev),clientX:ev.clientX,clientY:ev.clientY,aim,power,distance:0};
      dragging=true;root.dataset.gesture=gesture.mode;
      try{canvas.setPointerCapture(ev.pointerId);}catch{/* synthetic pointer events have no active pointer */}canvas.focus({preventScroll:true});ev.preventDefault();
      syncControls();
    }
    if(!gesture||gesture.id!==ev.pointerId)return;
    if(ev.type==='pointerup'){
      const fire=gesture.mode==='pull'&&gesture.distance>=12;
      if(gesture.mode==='aim'&&gesture.distance<12){
        const point=toCourse(ev),b=myBall();
        if(b&&Math.hypot(point.x-b.x,point.y-b.y)>=4)aim=Math.atan2(point.y-b.y,point.x-b.x);
      }
      if(!fire&&gesture.mode==='pull'){aim=gesture.aim;power=gesture.power;}
      gesture=null;dragging=false;loupe=null;root.dataset.gesture='idle';
      if(canvas.hasPointerCapture(ev.pointerId))canvas.releasePointerCapture(ev.pointerId);
      if(fire)putt();else{syncControls();paintText();}
      return;
    }
    if(ev.type!=='pointermove')return;
    ev.preventDefault();const point=toCourse(ev),b=myBall();if(!b)return;
    gesture.distance=Math.hypot(ev.clientX-gesture.clientX,ev.clientY-gesture.clientY);
    if(gesture.mode==='pull'){
      const dx=gesture.start.x-point.x,dy=gesture.start.y-point.y;
      if(gesture.distance>3){aim=Math.atan2(dy,dx);power=Math.max(3,Math.min(100,Math.round(gesture.distance/1.45)));}
    }else if(Math.hypot(point.x-b.x,point.y-b.y)>=4)aim=Math.atan2(point.y-b.y,point.x-b.x);
    if(ev.pointerType==='touch'||ev.pointerType==='pen')loupe={x:ev.clientX,y:ev.clientY};
    syncControls();paintText();
  }

  function syncCameraControl(){
    if(!root)return;const button=root.querySelector('#gf-view'),overview=!!scene3d?.overview;
    button.textContent=overview?'Follow ball':'Overview';button.setAttribute('aria-pressed',String(overview));button.setAttribute('aria-label',overview?'Follow the current ball':'Show entire hole');
  }
  function onKey(e){
    if(scene3d&&['[',']','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home'){scene3d.center();syncCameraControl();}else scene3d.rotate(e.key==='['?-.2:.2);return;}

      if(e.key==='Escape'&&gesture){e.preventDefault();cancelPull();return;}
      if(placing&&canPlace()){
        const delta={ArrowLeft:[-4,0],ArrowRight:[4,0],ArrowUp:[0,-4],ArrowDown:[0,4]}[e.key];
        if(delta){e.preventDefault();teeDraft.x+=delta[0];teeDraft.y+=delta[1];return;}
        if(e.key==='Enter'){e.preventDefault();app.socket.emit('action',{type:'place',x:teeDraft.x,y:teeDraft.y});placing=false;teeDraft=null;syncControls();return;}
        if(e.key==='Escape'){placing=false;teeDraft=null;syncControls();return;}
      }
      const step = e.shiftKey ? 5 : 0.5;
      if (e.key === "ArrowLeft") aim -= (step * Math.PI) / 180;
      else if (e.key === "ArrowRight") aim += (step * Math.PI) / 180;
      else if (e.key === "ArrowUp") power = Math.min(100, power + (e.shiftKey ? 10 : 2));
      else if (e.key === "ArrowDown") power = Math.max(3, power - (e.shiftKey ? 10 : 2));
      else if (e.key === "Enter") return putt();
      else return;
      e.preventDefault();
      syncControls();
      }
  function bindCanvas(){for(const ev of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,onPointer);canvas.addEventListener('keydown',onKey);canvas.addEventListener('contextmenu',e=>{if(scene3d)e.preventDefault();});}
  function mount(stage, a) {
    visual.reset();
    app = a;
    root = document.createElement("div");
    root.className = "b2 gf golf golf-club";
    root.innerHTML = `<header class="club-hud"><div class="club-course"><span class="club-brand">PLAYGRID GOLF CLUB</span><h2 id="gf-title"></h2><span id="gf-eyebrow"></span></div><div class="gf-score" id="gf-score"></div><div class="club-hud-actions"><button type="button" class="btn btn-ghost" id="gf-scores-toggle" aria-controls="gf-score-details" aria-expanded="false">Scores</button><button type="button" class="btn btn-ghost" id="gf-room-toggle" aria-expanded="false" aria-controls="side room-chat">Room & chat</button></div></header>
      <div class="club-arena">
        <div class="club-camera-controls" role="group" aria-label="Course camera"><button type="button" id="gf-view" aria-pressed="false" aria-label="Show entire hole">Overview</button><button type="button" id="gf-center" aria-label="Follow the current ball">Center</button><button type="button" data-camera-rotate="-1" aria-label="Rotate camera left">↶</button><button type="button" data-camera-rotate="1" aria-label="Rotate camera right">↷</button><button type="button" data-camera-zoom="1" aria-label="Zoom camera in">+</button><button type="button" data-camera-zoom="-1" aria-label="Zoom camera out">−</button></div>
        <div class="gf-wrap"><canvas id="gf-canvas" class="gf-canvas" tabindex="0" role="application" aria-busy="true" aria-label="Mini Golf course. Tap the course to aim without shooting. Drag back from your ball and release to putt. Arrow keys fine tune aim and power. Enter putts. Escape cancels a shot." aria-describedby="gf-input-help"></canvas></div>
        <div class="club-standings" id="gf-players" aria-label="Players and strokes"></div>
        <div class="gf-between card" id="gf-between" hidden></div>
        <div class="ttt-status" id="gf-status" aria-live="polite"></div>
        <p class="club-input-help" id="gf-input-help">Tap to aim, or pull back from your ball to putt.<span> You can also set aim and power below.</span></p>
      </div>
      <div class="gf-controls" id="gf-controls"><div class="club-aim" id="gf-aim-controls"><span>Aim <b id="gf-aim-val"></b></span><div class="pl-fine-row"><button type="button" class="btn btn-ghost" data-fine="-1" aria-label="Aim half a degree left">−</button><input type="range" id="gf-aim" min="0" max="360" step="0.25" aria-label="Aim angle in degrees"><button type="button" class="btn btn-ghost" data-fine="1" aria-label="Aim half a degree right">+</button></div></div><button type="button" id="gf-fine-toggle" aria-controls="gf-aim-controls" aria-expanded="false" aria-label="Show precise aim controls">Aim</button>
        <label class="club-power"><span>Shot power <b id="gf-pow-val"></b></span><input type="range" id="gf-pow" min="3" max="100" step="1" aria-label="Putt power percent"></label><button type="button" class="btn" id="gf-putt">Putt</button><button type="button" class="btn btn-ghost" id="gf-cancel" hidden>Cancel shot</button>
      </div>
      <p class="club-course-note" id="gf-course-note" hidden></p><div class="club-utility"><button type="button" class="btn btn-ghost btn-small" id="gf-place">Choose tee position</button><button type="button" class="btn btn-ghost btn-small" id="gf-trail" aria-pressed="false" aria-label="Show your actual last-shot trail" disabled>Your last shot</button><small id="gf-place-note" role="status"></small><small id="gf-render-note" role="status" hidden></small><span class="club-authority">Lowest score wins · ${a.esc('2–6 players')}</span></div>
      <details class="club-scorecard" id="gf-score-details"><summary>Scores & last hole</summary><section class="club-last-hole" id="gf-last-hole" aria-label="Last completed hole" hidden></section><button type="button" class="btn btn-ghost" id="gf-score-back">Back to course</button><div class="gf-card" id="gf-card"></div></details>`;
    root.dataset.ten='golf';
    GameUI.scenes.mount(root,'golf');
    stage.appendChild(root);
    root.querySelector('#gf-fine-toggle').addEventListener('click',e=>{const open=root.classList.toggle('golf-fine-open');e.currentTarget.setAttribute('aria-expanded',String(open));e.currentTarget.setAttribute('aria-label',open?'Hide precise aim controls':'Show precise aim controls');});
    root.querySelector('#gf-scores-toggle').addEventListener('click', () => {
      const panel=root.querySelector('#gf-score-details');panel.open=!panel.open;
      root.querySelector('#gf-scores-toggle').setAttribute('aria-expanded',String(panel.open));
      if(panel.open)panel.scrollIntoView({block:'nearest',behavior:'instant'});
    });
    root.querySelector('#gf-score-details').addEventListener('toggle',e=>root.querySelector('#gf-scores-toggle').setAttribute('aria-expanded',String(e.target.open)));
    root.querySelector('#gf-score-back').addEventListener('click',()=>{
      root.querySelector('#gf-score-details').open=false;
      root.querySelector('.club-arena').scrollIntoView({block:'nearest',behavior:'instant'});
      canvas.focus({preventScroll:true});
    });
    root.querySelector('#gf-room-toggle').addEventListener('click', e => {
      const open=root.closest('.room').classList.toggle('golf-room-open');e.currentTarget.setAttribute('aria-expanded',String(open));fit();
    });
    root.querySelector('#gf-cancel').addEventListener('click',cancelPull);
    root.querySelector('#gf-trail').addEventListener('click',()=>{showTrail=!showTrail;syncControls();});
    canvas = root.querySelector("#gf-canvas");
    renderReady=false;renderNotice='';root.dataset.renderer='loading';prepareRenderer();
    root.querySelector('#gf-view').addEventListener('click',e=>{if(!scene3d)return;scene3d.toggleView();syncCameraControl();});
    root.querySelector('#gf-center').addEventListener('click',()=>{if(scene3d){scene3d.center();syncCameraControl();}});
    root.querySelectorAll('[data-camera-rotate]').forEach(b=>b.addEventListener('click',()=>scene3d?.rotate(Number(b.dataset.cameraRotate)*Math.PI/4)));
    root.querySelectorAll('[data-camera-zoom]').forEach(b=>b.addEventListener('click',()=>scene3d?.zoomBy(Number(b.dataset.cameraZoom))));
    clock = C.makeClock(() => root);
    bindCanvas();
    root.querySelector('#gf-place').addEventListener('click',()=>{if(!canPlace())return;placing=!placing;teeDraft=placing?{x:myBall().x,y:myBall().y}:null;syncControls();canvas.focus({preventScroll:true});});

    root.querySelector("#gf-aim").addEventListener("input", (e) => { aim = (Number(e.target.value) * Math.PI) / 180; syncControls(); });
    root.querySelector("#gf-pow").addEventListener("input", (e) => { power = Number(e.target.value); syncControls(); });
    root.querySelector("#gf-putt").addEventListener("click", putt);
    root.querySelectorAll("[data-fine]").forEach((b) => b.addEventListener("click", (e) => {
      if (!canPutt()) return;
      aim += (Number(b.dataset.fine) * (e.shiftKey ? 5 : 0.5) * Math.PI) / 180;
      syncControls();
    }));
    window.addEventListener("resize", fit);
    raf = requestAnimationFrame(loop);
  }

  function putt() {
    if (!canPutt()) return;
    placing=false;teeDraft=null;
    app.socket.emit("action", { type: "putt", angle: aim, power: power / 100 });
    Sound.play("drop");
    busyUntil = performance.now() + 600;
    syncControls();
  }

  function syncControls() {
    if (!root || !g) return;
    const mine = canPutt();
    const trailButton=root.querySelector('#gf-trail');trailButton.hidden=me()<0;trailButton.disabled=!renderReady||!lastTrail||performance.now()<busyUntil;trailButton.setAttribute('aria-pressed',String(showTrail));trailButton.setAttribute('aria-label',(showTrail?'Hide':'Show')+' your actual last-shot trail');
    const turnKey=holeKey+':'+(g.shotNumber??g.anim?.shot??0);
    if(mine&&readyTurn!==turnKey){readyTurn=turnKey;if(g.course.id==='gauntlet')FX.animate(root.querySelector('#gf-putt'),[{boxShadow:'0 0 0 0 #c5ff4588'},{boxShadow:'0 0 0 9px #c5ff4500'}],450);}
    root.querySelector('#gf-cancel').hidden=!gesture||gesture.mode!=='pull';
    root.querySelector('#gf-putt').textContent=gesture?.mode==='pull'?'Release to putt':'Putt';
    root.style.setProperty('--shot-power',power+'%');
    const place=root.querySelector('#gf-place');place.hidden=!myBall()||myBall().strokes>0;place.disabled=!canPlace();place.textContent=placing?'Cancel tee placement':'Choose tee position';place.setAttribute('aria-pressed',String(placing));
    root.querySelector('#gf-place-note').textContent=placing?'Tap a free spot inside the square. Keyboard: arrows move, Enter confirms.':canPlace()?'Optional: pick a tee position before your first stroke.':'';
    const aimEl = root.querySelector("#gf-aim");
    const powEl = root.querySelector("#gf-pow");
    aimEl.value = deg(aim).toFixed(2);
    powEl.value = power;
    root.querySelector("#gf-aim-val").textContent = deg(aim).toFixed(1) + "°";
    root.querySelectorAll("[data-fine]").forEach((b) => { b.disabled = !mine; });
    root.querySelector("#gf-pow-val").textContent = power + "%";
    root.querySelector("#gf-controls").hidden = me() < 0;
    aimEl.disabled = !mine;
    powEl.disabled = !mine;
    root.querySelector("#gf-putt").disabled = !mine;
    root.querySelectorAll('[data-p5-power]').forEach(b=>{b.disabled=!mine;b.setAttribute('aria-pressed',String(Number(b.dataset.p5Power)===power));});
  }

  function scoreCard() {
    const holes = g.course.pars;
    const head = `<tr><th scope="col">Player</th>${holes.map((p, i) => `<th scope="col" class="${i === g.holeIndex ? "cur" : ""}">${i + 1}<small>par ${p}</small></th>`).join("")}<th scope="col">Total</th></tr>`;
    const rows = g.players
      .map((p, i) => {
        const cells = holes.map((_, h) => {
          const v = h === g.holeIndex && p.scores[h] === null ? (p.strokes ? `<i>${p.strokes}</i>` : "") : p.scores[h] === null ? "" : p.scores[h];
          return `<td class="${h === g.holeIndex ? "cur" : ""}">${v}</td>`;
        });
        return `<tr class="${p.id === S.you ? "me" : ""} ${p.out ? "out" : ""}"><th scope="row"><span class="gf-dot" style="background:${colorOf(i)}"></span>${app.esc(p.name)}</th>${cells.join("")}<td><b>${p.total}</b></td></tr>`;
      })
      .join("");
    return `<div class="gf-scroll"><table class="gf-table"><caption class="sr-only">Scorecard</caption><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  }

  function statusText() {
    const turn = g.players.find((p) => p.id === g.turnId);
    const holeName = app.esc(g.hole.name);
    const head = `Hole ${g.holeIndex + 1}/${g.course.holes}: <b>${holeName}</b> · par ${g.hole.par}`;
    if(!renderReady)return `${head}<br>${root.dataset.renderer==='error'?'The course could not be displayed. Reload the page to reconnect.':'Preparing the course… Controls unlock when it is visible.'}`;
    if(gesture?.mode==='pull')return `<b>Release to putt</b> · ${power}% power. Escape cancels.`;
    if (performance.now() < busyUntil) return `${head} · ball rolling...`;
    if (g.phase === "between") return `${head} · hole complete`;
    if (!turn) return head;
    const who = turn.id === S.you ? "<b>Your putt!</b> Tap the course to aim, or pull back from your ball and release." : `Waiting for <b>${app.esc(turn.name)}</b> (stroke ${turn.strokes + 1}).`;
    const l = g.last;
    const extra = l && l.outcome === "water" ? ` <span class="warn-text">Last ball went in the ${g.course.id==='gauntlet'?'slime':'water'} (+1).</span>` : l?.nearCup ? ' <span class="club-close">So close — right by the cup.</span>' : '';
    return `${head}<br>${who}${extra}`;
  }

  function paintText() {
    if (!root || !g) return;
    const rolling=performance.now()<busyUntil&&g.anim;
    const activeId=rolling?g.anim.by:g.turnId;
    root.querySelector("#gf-players").innerHTML = g.players
      .map((p, i) => C.playerChip(app, p, { active: p.id === activeId, extra: `<span class="gf-dot" style="background:${colorOf(i)}" aria-hidden="true"></span>` + (!rolling && p.id === g.turnId && g.timeLeft !== null ? '<span class="fr-timer" data-timer></span>' : ""), sub: p.out ? "Out" : rolling&&(p.id===g.anim.by||g.anim.paths?.[p.id]) ? p.id===g.anim.by?'Ball rolling…':'On the course' : p.holed ? `Holed in ${p.strokes}` : `${p.strokes} stroke${p.strokes === 1 ? "" : "s"}` }))
      .join("");
    root.querySelector("#gf-eyebrow").textContent = `${g.course.name || "Course"} · Hole ${g.holeIndex + 1} / ${g.course.holes}`;
    root.querySelector("#gf-title").textContent = g.hole.name;
    root.dataset.course=g.course.id;
    const renderNote=root.querySelector('#gf-render-note');renderNote.hidden=!renderNotice;renderNote.textContent=renderNotice;
    root.querySelector('#gf-course-note').hidden=g.course.id!=='gauntlet';
    const motorHint=(g.hole.motors||[]).length?'Sweepers move for up to 2.4s per putt. ':'';
    const boostHint=(g.hole.boosts||[]).length?'Lime turbo tiles launch along the arrows. ':'';
    root.querySelector('#gf-course-note').textContent='One putt, then your friend’s turn. '+boostHint+motorHint+((g.hole.gates||[]).length?'Raised gates are open; they switch after each putt.':g.hole.water.length?'Risk the turbo shortcut or take the outer lane. Slime costs +1.':motorHint?'The outer lane avoids the sweeper.':'Use Overview to find the shortcut.');
    const mb = myBall();
    const score=root.querySelector('#gf-score'),previous=score.querySelector('strong')?.textContent;
    score.innerHTML = `<b>PAR ${g.hole.par}</b><span>Stroke <strong>${mb ? mb.strokes : 0}</strong></span>`;
    if(previous!==undefined&&previous!==String(mb?.strokes||0))FX.animate(score.querySelector('strong'),[{transform:'translateY(-5px)',opacity:.3},{transform:'none',opacity:1}],180);
    const st = root.querySelector("#gf-status");
    st.innerHTML = statusText();
    st.className = "ttt-status" + (canPutt() ? " mine" : "");
    const bt = root.querySelector("#gf-between");
    // Do not cover the last player's cup animation with the results panel.
    if (g.phase === "between" && g.summary && performance.now() >= busyUntil) {
      const rows = g.summary.map((s) => {
        const p = g.players.find((x) => x.id === s.id);
        if (!p || s.strokes === null) return "";
        const d = s.strokes - s.par;
        return `<li class="${p.id===S.you?'club-summary-me':''}"><span>${app.esc(p.name)}${s.finish?`<small>${app.esc(s.finish.title)}</small>`:''}</span><b>${s.strokes}<small>${d === 0 ? "par" : d > 0 ? "+" + d : d}</small></b></li>`;
      });
      const recap=g.recap,leader=recap?.leaderIds.length===1?g.players.find(p=>p.id===recap.leaderIds[0]):null;
      const lead=leader?`${app.esc(leader.name)} ${recap.changedLeader?'takes the lead':'leads'} · ${recap.lead} ahead`:recap?'Tied at the top · every stroke counts':'';
      bt.hidden = false;
      bt.innerHTML = `<span class="club-recap-kicker">HOLE ${g.holeIndex + 1} COMPLETE</span><b>${mb?.finish?app.esc(mb.finish.score):'On to the next!'}</b>${lead?`<p class="club-lead">${lead}</p>`:''}<ul>${rows.join("")}</ul><small class="muted">${g.holeIndex + 1 >= g.course.holes ? "Final results next..." : "Next hole starting… Find this recap in Scores."}</small>`;
    } else {
      bt.hidden = true;
    }
    root.querySelector("#gf-card").innerHTML = scoreCard();
    paintLastHole();
  }

  function paintLastHole(){
    const panel=root.querySelector('#gf-last-hole');
    const h=g.phase==='between'&&performance.now()>=busyUntil?{index:g.holeIndex,name:g.hole.name,par:g.hole.par,summary:g.summary,recap:g.recap}:g.lastHole;
    panel.hidden=!h;
    if(!h){panel.replaceChildren();return;}
    const rows=(h.summary||[]).map(s=>{
      const p=g.players.find(p=>p.id===s.id);if(!p||s.strokes===null)return '';
      const delta=s.strokes-h.par;
      return `<li class="${p.id===S.you?'club-summary-me':''}"><span class="club-recap-person">${app.avatarHTML(p.avatar)}<span>${app.esc(p.name)}${p.out?' (left)':''}<small>${s.finish?app.esc(s.finish.title):s.out?'Left this hole':s.strokes>=g.maxStrokes?'Stroke limit reached':'Hole score'}</small></span></span><b>${s.strokes}<small>${delta===0?'par':delta>0?'+'+delta:delta}</small></b></li>`;
    }).join('');
    const leader=h.recap?.leaderIds.length===1?g.players.find(p=>p.id===h.recap.leaderIds[0]):null;
    const standing=leader?`${app.esc(leader.name)} led by ${h.recap.lead} after this hole.`:h.recap?'The lead was tied after this hole.':'';
    panel.innerHTML=`<span class="club-recap-kicker">LAST COMPLETED HOLE · PAR ${h.par}</span><h3>Hole ${h.index+1} · ${app.esc(h.name)}</h3>${standing?`<p class="club-last-standing">${standing}</p>`:''}<ul>${rows}</ul><p>The round keeps moving while you check scores.</p>`;
  }

  function update(state) {
    const priorPhase = g?.phase;
    S = state;
    g = state.game;
    if (!g) return;
    if(gesture&&(g.turnId!==S.you||g.busyMs>0||g.phase!=='play'))cancelPull();
    clock.set(g.busyMs>0?null:g.timeLeft);
    const key = g.course.id + ":" + g.holeIndex;
    if (key !== holeKey) {
      holeKey = key; placing=false;teeDraft=null;lastTrail=null;showTrail=false;readyTurn='';
      renderReady=false;if(root.dataset.renderer!=='error')root.dataset.renderer='loading';canvas.setAttribute('aria-busy','true');
      const b = myBall();
      aim = b ? Math.atan2(g.hole.cup[1] - b.y, g.hole.cup[0] - b.x) : 0;
      animKey = -1;
    }
    const a = g.anim;
    if (a && a.shot !== animKey) {
      animKey = a.shot;
      animT0 = performance.now() - a.elapsedMs;
      receivedShotTime = a.elapsedMs / 1000;
      if(a.by===S.you)lastTrail={shot:a.shot,frames:a.frames};
    }
    if (a) busyUntil = Math.max(busyUntil, performance.now() + Math.max(0, g.busyMs));
    else if (g.busyMs <= 0) busyUntil = 0;
    // aim at the cup by default when it becomes my turn
    if (g.turnId === S.you && !dragging && !(a && g.busyMs > 0)) {
      const b = myBall();
      if (b && !update.aimed) {
        aim = Math.atan2(g.hole.cup[1] - b.y, g.hole.cup[0] - b.x);
        update.aimed = true;
      }
    } else if (g.turnId !== S.you) update.aimed = false;
    paintText();
    if(priorPhase && priorPhase!=="between" && g.phase==="between") FX.animate(root.querySelector("#gf-between"),[{opacity:0,transform:"translateY(12px)"},{opacity:1,transform:"none"}],420);
    syncControls();
    clearTimeout(tickT);
    const wait = busyUntil - performance.now();
    if (wait > 0) tickT = setTimeout(() => { clock.set(g.phase==='play'?Math.max(0,g.timeLeft-g.busyMs):null);paintText(); syncControls(); }, wait + 30);
  }

  function unmount() {
    visual.reset();
    gesture=null;dragging=false;
    renderGeneration++;clearTimeout(renderLoadT);renderCleanup?.();renderCleanup=null;renderReady=false;renderNotice='';
    if(scene3d){scene3d.dispose();scene3d=null;}
    ctx=null;
    root?.closest('.room')?.classList.remove('golf-room-open');
    cancelAnimationFrame(raf);
    clearTimeout(tickT);
    window.removeEventListener("resize", fit);
    if (clock) clock.stop();
    if (root) root.remove();
    root = null; canvas = null; ctx = null; g = null; placing = false; teeDraft = null; animKey = -1; holeKey = ""; loupe = null; decoKey = ""; deco = []; busyUntil = 0; update.aimed = false;lastTrail=null;showTrail=false;readyTurn='';receivedShotTime=0;
  }

  function renderLegacyResult(r, state, a) {
    const top = r.standings[0];
    const title = r.tie ? (r.winners.includes(state.you) ? "It's a tie, and you're in it!" : "It's a tie!") : r.winnerId === state.you ? "You win!" : `${a.esc(top ? top.name : "Someone")} wins!`;
    const rows = r.standings
      .map((p, i) => `<tr class="${p.id === state.you ? "me" : ""}"><th scope="row">${i + 1}. ${a.esc(p.name)}${p.out ? " (left)" : ""}</th>${r.pars.map((_, h) => `<td>${p.scores[h] === null ? "–" : p.scores[h]}</td>`).join("")}<td><b>${p.total}</b></td></tr>`)
      .join("");
    const head = `<tr><th scope="col">${a.esc(r.course)}</th>${r.pars.map((p, i) => `<th scope="col">${i + 1}<small>par ${p}</small></th>`).join("")}<th scope="col">Total</th></tr>`;
    return `<h2 class="result-title p5-result-heading">${title}</h2><div class="gf-scroll"><table class="gf-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  }

  function resultSound(r, state) {
    if (!r.winners.length || !state.you || !r.standings.some((p) => p.id === state.you)) return "reveal";
    return r.winners.includes(state.you) ? "win" : "lose";
  }

  return { mount, update, unmount, project:courseScreen, renderResult:(r,s,a)=>GameUI.scenes.result('golf',renderLegacyResult(r,s,a)), resultSound, scoreLabel: "wins" };
})();
