// Shot-switch gates: real server collisions, safe closure, synchronized replays.
const assert=require('node:assert/strict');
const G=require('../server/games/golf'),C=require('../server/games/golfcourses'),R=G.rules;
const M=require('../public/js/games/golf-motion');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('Gauntlet is selectable; Coastal Club remains the default; invalid IDs stay rejected',()=>{
 assert.equal(G.defaults.course,'coastal');assert.equal(G.sanitizeSettings({course:'gauntlet'},G.defaults).course,'gauntlet');assert.equal(G.sanitizeSettings({course:'arbitrary'},G.defaults).course,'coastal');assert.equal(C.BY_ID.gauntlet.holes.length,6);assert.equal(C.BY_ID.tour.holes.length,18);
});
const gateHole={poly:C.rect(60,60,640,380),tee:[110,220],cup:[590,220],gates:[{id:'A',phase:0,poly:C.rect(300,160,320,280)}]};
test('Closed gates bounce real shots; raised gates leave an actual playable opening',()=>{
 const closed={...gateHole,gates:R.gateStates(gateHole,0)},open={...gateHole,gates:R.gateStates(gateHole,1)};
 const a=R.simulatePutt(closed,110,220,0,.8),b=R.simulatePutt(open,110,220,0,.8);
 assert(a.x<294);assert(b.x>326);assert.deepEqual(a,R.simulatePutt(closed,110,220,0,.8));assert(R.onFairway(closed,a.x,a.y));
});
test('Gate closures respect ball clearance, including untouched tee balls; out/holed balls do not block',()=>{
 for(const x of [294,310,326])assert.equal(R.gateStates(gateHole,0,[{x,y:220,strokes:0}])[0].closed,false);
 assert.equal(R.gateStates(gateHole,0,[{x:310,y:220,out:true}])[0].closed,true);
 assert.equal(R.gateStates(gateHole,0,[{x:310,y:220,holed:true}])[0].closed,true);
 assert.equal(R.gateStates(gateHole,0,[{x:280,y:220}])[0].closed,true);
});
test('Every Gauntlet layout has six safe tees and stable, finite shots in both gate configurations',()=>{
 for(const hole of C.BY_ID.gauntlet.holes)for(const phase of [0,1]){
  const h={...hole,gates:R.gateStates(hole,phase)},occupied=[];
  for(let i=0;i<6;i++){const p=R.startPosition(h,occupied);assert(R.onFairway(h,p.x,p.y));assert(occupied.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>=13));occupied.push(p);}
  for(let n=0;n<80;n++){
   const shot=R.simulatePutt(h,h.tee[0],h.tee[1],n*Math.PI/40,.15+(n*37%85)/100);
   assert(Number.isFinite(shot.x)&&Number.isFinite(shot.y));assert(shot.anim.settled,h.name);if(shot.outcome==='rest')assert(R.onFairway(h,shot.x,shot.y),h.name);
  }
 }
});
test('Rounding a resting ball at the slime edge preserves a legal next shot position',()=>{
 const h=C.BY_ID.gauntlet.holes[3],r=R.simulatePutt(h,...h.tee,8*Math.PI/40,.15+(8*37%85)/100);
 assert.equal(r.outcome,'rest');assert(r.y>300&&r.y<300.05);assert(R.onFairway(h,r.x,r.y));
});
test('A shot carries its locked gate state; the next turn changes gates identically for players and spectators',()=>{
 let now=1000000;const members=[{id:'a',name:'Alex',score:0},{id:'b',name:'Nova',score:0}];
 const api={now:()=>now,seated:()=>members,member:id=>members.find(m=>m.id===id),sys(){},changed(){},toMember(){},end(){}};
 const st=G.create({...G.defaults,course:'gauntlet'});G.start(st,api);
 // Unit fixture: start directly on the gate hole with legal positions (not a browser capture).
 st.hole=2;for(const [i,p] of st.players.entries()){p.x=110+i*16;p.y=220+i*16;}
 const before=G.view(st,members[0],now);assert(before.hole.gates[0].closed);assert(!before.hole.gates[1].closed);
 G.onAction(st,members[1],{type:'putt',angle:0,power:.4},api);assert.equal(st.shots,0);
 G.onAction(st,members[0],{type:'putt',angle:0,power:.4},api);assert.equal(st.shots,1);
 const moving=G.view(st,members[0],now),spectator=G.view(st,{id:'spectator'},now);
 assert.deepEqual(moving.anim.gates,before.hole.gates);assert.deepEqual(moving.anim,spectator.anim);assert.deepEqual(moving.hole.gates,spectator.hole.gates);
 assert(!moving.hole.gates[0].closed);assert(moving.hole.gates[1].closed);
 G.onAction(st,members[1],{type:'putt',angle:0,power:.4},api);assert.equal(st.shots,1);
 now=st.animUntil+1;const after=G.view(st,members[1],now);assert.equal(after.anim,null);assert(!after.hole.gates[0].closed);assert(after.hole.gates[1].closed);
});
test('Moving sweepers collide during the shot, not just between turns',()=>{
 const motor={id:'test',x:350,y:220,length:40,r:6,speed:1,angle:0};
 const b={x:380,y:231,r:6,vx:0,vy:0};const hit=M.collide(b,motor,.2,true);assert(hit&&hit.type==='motor');assert(Math.hypot(b.vx,b.vy)>10);assert(M.clear(b,[motor],.2));
 const h={poly:C.rect(60,60,640,380),tee:[110,220],cup:[590,220],motors:[motor]};
 const a=R.simulatePutt(h,200,220,0,.55),again=R.simulatePutt(h,200,220,0,.55),flat=R.simulatePutt({...h,motors:[]},200,220,0,.55);
 assert.deepEqual(a,again);assert(a.anim.impacts.some(e=>e.type==='motor'));assert.notEqual(a.y,flat.y);assert(a.anim.duration>=M.RUN_FOR);assert.equal(a.anim.motion.end,M.RUN_FOR);
});
test('Motor poses use a shared clock and park at the exact authoritative phase',()=>{
 const m={x:200,y:200,length:30,r:6,speed:1.2,angle:.4},motion={start:4.8,runFor:2.4,end:7.2},h={motorTime:7.2};
 for(const t of [0,.1,.75,1.4,2.4,3,10]){const clock=M.clock(h,{motion},t);assert.equal(clock,4.8+M.travel(Math.min(t,2.4)));assert.deepEqual(M.pose(m,clock),M.pose(m,motion.start+M.travel(Math.min(t,motion.runFor))));}
 assert.equal(M.drive(0),0);assert.equal(M.drive(2.4),0);assert.equal(M.travel(2.4),2.4);assert(M.travel(.2)<.2);assert(M.travel(2.2)>2.2);
 assert.equal(M.clock(h,null),7.2);
});
test('All sweeper phases settle safely, and impact payloads stay bounded',()=>{
 let impacts=0;
 for(const hole of C.BY_ID.gauntlet.holes)for(const time of [0,.7,2.4,4.8])for(let n=0;n<100;n++){
  const h={...hole,motorTime:time},r=R.simulatePutt(h,...h.tee,n*Math.PI/50,.1+(n*37%90)/100);
  assert(r.anim.settled,h.name);if(r.outcome==='rest'){assert(R.onFairway(h,r.x,r.y),h.name);assert(M.clear({...r,r:6},h.motors,r.anim.motion?.end),h.name);}
  assert(r.anim.impacts.length<=64);assert(r.anim.impacts.every(e=>e.t>=0&&e.t<=r.anim.duration+.001&&Number.isFinite(e.speed)&&Number.isFinite(e.x)&&Number.isFinite(e.y)));impacts+=r.anim.impacts.filter(e=>e.type==='motor').length;
 }
 assert(impacts>30,'fuzz trajectories must exercise real moving-obstacle contacts');
});
test('Motor discs keep clear of tees, cups, solid obstacles and other bumpers',()=>{
 for(const h of C.BY_ID.gauntlet.holes)for(const m of h.motors||[]){
  const envelope=m.length+m.r+6;assert(Math.hypot(m.x-h.tee[0],m.y-h.tee[1])>envelope+24);assert(Math.hypot(m.x-h.cup[0],m.y-h.cup[1])>envelope+10);
  for(let n=0;n<80;n++){const a=n*Math.PI/40,p={x:m.x+Math.cos(a)*(m.length+m.r),y:m.y+Math.sin(a)*(m.length+m.r)};assert(R.onFairway({...h,bumpers:(h.bumpers||[]).filter(b=>b.motor!==m.id)},p.x,p.y),h.name);}
 }
});
test('A sweeper can hit a resting opponent during another player’s stroke',()=>{
 const motor={id:'test',x:350,y:220,length:40,r:6,speed:1,angle:0},h={poly:C.rect(60,60,640,380),tee:[110,220],cup:[590,220],motors:[motor]},other={id:'waiting',x:370,y:245};
 assert(M.clear({...other,r:6},[motor],0));const r=R.simulatePutt(h,110,220,Math.PI,.1,[other]);assert(r.anim.impacts.some(e=>e.type==='motor'&&e.ballId==='waiting'));assert(Math.hypot(r.others[0].x-other.x,r.others[0].y-other.y)>10);assert(r.anim.paths.waiting.length===r.anim.frames.length);
});
console.log(`golfgauntlet: ${checks} checks passed`);
