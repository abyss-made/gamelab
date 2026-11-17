// Shot-switch gates: real server collisions, safe closure, synchronized replays.
const assert=require('node:assert/strict');
const G=require('../server/games/golf'),C=require('../server/games/golfcourses'),R=G.rules;
const M=require('../public/js/games/golf-motion');
const Party=require('../public/js/games/golf-party');
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
test('Turbo tiles redirect real paths, preserve faster shots, and fire once per ball per putt',()=>{
 const tile={id:'launch',x:200,y:200,w:40,h:40,angle:-Math.PI/2,speed:390};
 const h={poly:C.rect(60,60,640,380),tee:[110,220],cup:[590,220],boosts:[tile]};
 const a=R.simulatePutt(h,110,220,0,.55),b=R.simulatePutt({...h,boosts:[]},110,220,0,.55);
 assert.deepEqual(a,R.simulatePutt(h,110,220,0,.55));assert(a.anim.settled);assert(Math.min(...a.anim.frames.filter(f=>f[1]!==null).map(f=>f[2]))<100);assert(a.x<b.x-40);assert(a.anim.impacts.some(e=>e.type==='boost'&&e.obstacleId==='launch'));
 assert.equal(a.anim.impacts.filter(e=>e.type==='boost').length,1);
 const ball={x:220,y:220,vx:500,vy:0},used=new Set();Party.boost(ball,[tile],used);assert.equal(Math.hypot(ball.vx,ball.vy),500);assert(ball.vy<0);assert.equal(Party.boost(ball,[tile],used),null);
 assert.equal(Party.boost({x:220,y:220,vx:0,vy:0},[tile],new Set()),null);
 const other=R.simulatePutt(h,110,310,Math.PI,.1,[{id:'waiting',x:220,y:220}]);assert(!other.anim.impacts.some(e=>e.type==='boost'));assert.equal(other.others[0].x,220);assert.equal(other.others[0].y,220);
});
test('Turbo artwork footprints stay on safe turf and away from tees and cups',()=>{
 const ids=new Set();let count=0;
 for(const h of C.BY_ID.gauntlet.holes)for(const tile of h.boosts||[]){
  count++;assert(!ids.has(tile.id));ids.add(tile.id);
  for(let y=tile.y;y<=tile.y+tile.h;y+=2)for(let x=tile.x;x<=tile.x+tile.w;x+=2){assert(R.onFairway(h,x,y),h.name);assert(Math.hypot(x-h.tee[0],y-h.tee[1])>40);assert(Math.hypot(x-h.cup[0],y-h.cup[1])>20);}
 }
 assert.equal(count,4);for(const c of C.COURSES.filter(c=>c.id!=='gauntlet'))assert(c.holes.every(h=>!h.boosts));
});
function partyRoom(course='gauntlet'){
 let now=1000000;const members=['Alex','Nova','Kai'].map((name,i)=>({id:String(i),name,score:0})),api={now:()=>now,seated:()=>members,member:id=>members.find(m=>m.id===id),sys(){},changed(){},toMember(){},end(){}};
 const st=G.create({...G.defaults,course});G.start(st,api);
 return {st,api,members,ready(){now=st.animUntil+1;},now:()=>now};
}
test('Party turns rotate after each putt, skip finished players, and cannot be stolen during replay',()=>{
 const r=partyRoom();
 for(const expected of [0,1,2,0]){
  assert.equal(r.st.turn,expected);r.ready();const before=r.st.shots;
  G.onAction(r.st,r.members[expected],{type:'putt',angle:Math.PI,power:.03},r.api);assert.equal(r.st.shots,before+1);
  G.onAction(r.st,r.members[r.st.turn],{type:'putt',angle:0,power:1},r.api);assert.equal(r.st.shots,before+1);
 }
 r.st.players[2].holed=true;r.ready();G.onAction(r.st,r.members[1],{type:'putt',angle:Math.PI,power:.03},r.api);assert.equal(r.st.turn,0);
 assert.equal(G.view(r.st,r.members[0],r.now()).turnOrder,'round-robin');
});
test('Party turns rotate past a departed current player; traditional courses retain farthest-first play',()=>{
 const r=partyRoom();G.onLeave(r.st,'0',r.api);assert.equal(r.st.turn,1);
 const classic=partyRoom('meadow');classic.st.players[0].x=500;classic.st.players[0].y=220;classic.st.players[0].strokes=1;
 G.onAction(classic.st,classic.members[0],{type:'putt',angle:Math.PI,power:.03},classic.api);assert.equal(classic.st.turn,1);assert.equal(G.view(classic.st,classic.members[0],classic.now()).turnOrder,'farthest');
});
test('Finish badges describe real contacts and never award extra scoring points',()=>{
 assert.equal(Party.finish(2,3,[{type:'wall'}]).title,'Bank shot!');assert.equal(Party.finish(2,4,[{type:'wall'},{type:'wall'}]).title,'Multi-bank finish!');
 assert.equal(Party.finish(2,3,[{type:'boost'}]).title,'Turbo finish!');assert.equal(Party.finish(2,4,[{type:'motor'}]).style,'sweeper');assert.equal(Party.finish(1,4,[{type:'boost'}]).title,'Hole in one!');
 assert.equal(Party.finish(2,3,[{type:'ball'}]).style,'clean');assert.equal(Party.finish(2,3).score,'Birdie!');
 const r=partyRoom('meadow');r.st.players[0].x=575;r.st.players[0].y=220;
 G.onAction(r.st,r.members[0],{type:'putt',angle:0,power:.03},r.api);assert(r.st.players[0].holed);assert.equal(r.st.players[0].strokes,1);assert(r.st.anim.finishes['0']);assert.equal(r.members[0].score,0);
 assert.deepEqual(G.view(r.st,r.members[0],r.now()).anim.finishes,G.view(r.st,{id:'spectator'},r.now()).anim.finishes);
});
test('Recaps identify actual lead changes and ties without counting departed players',()=>{
 const rows=[{id:'a',scores:[2,6]},{id:'b',scores:[4,2]},{id:'gone',scores:[1,1],out:true}];
 const recap=Party.recap(rows,1);assert.deepEqual(recap.leaderIds,['b']);assert.equal(recap.lead,2);assert(recap.changedLeader);assert.deepEqual(recap.bestHoleIds,['b']);
 rows[0].scores[1]=4;const tied=Party.recap(rows,1);assert.equal(tied.leaderIds.length,2);assert(!tied.changedLeader);assert.equal(tied.lead,0);
 assert(!Party.recap(rows,0).changedLeader);assert.equal(Party.recap([{id:'pending',scores:[null]}],0),null);
});
console.log(`golfgauntlet: ${checks} checks passed`);
