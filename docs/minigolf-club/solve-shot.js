// Browser-test opponent: search using the exact authoritative physics; never changes game state.
const fs=require('fs');
const G=require('../../node-server/server/games/golf').rules;
const g=JSON.parse(fs.readFileSync(0,'utf8')),h=g.hole,me=g.players.find(p=>p.id===g.turnId);
const others=g.players.filter(p=>p.id!==me.id&&!p.out&&!p.holed&&p.strokes>0).map(p=>({id:p.id,x:p.x,y:p.y}));
const protectedBalls=g.players.filter(p=>p.id!==me.id&&!p.out&&!p.holed&&p.strokes===0);
const quantize=a=>Math.round(a*180/Math.PI*4)/4*Math.PI/180;
let frontier=[{x:me.x,y:me.y,path:[],others}],seen=new Set(),best=null,dist=Infinity,simulations=0;
for(let depth=0;depth<7;depth++){
 const next=[];
 for(const s of frontier){
  const direct=Math.atan2(h.cup[1]-s.y,h.cup[0]-s.x),angles=[direct,...Array.from({length:48},(_,i)=>i*Math.PI/24+(i%2?.02:0))];
  for(const raw of angles)for(const power of [.15,.3,.5,.7,.9,1]){
   const angle=quantize(raw),r=G.simulatePutt(h,s.x,s.y,angle,power,s.others,protectedBalls);simulations++;const path=s.path.concat({angle,power});
   if(r.outcome==='cup'){process.stdout.write(JSON.stringify({action:path[0],path,simulations}));process.exit(0);}
   if(r.outcome!=='rest')continue;
   const key=Math.round(r.x/20)+','+Math.round(r.y/20);if(seen.has(key))continue;seen.add(key);
   const updated=s.others.map(p=>{const n=r.others.find(q=>q.id===p.id);return n&&n.outcome==='rest'?{id:p.id,x:n.x,y:n.y}:p;}).filter(p=>!r.others.some(q=>q.id===p.id&&q.outcome==='cup'));
   next.push({x:r.x,y:r.y,path,others:updated});const d=Math.hypot(r.x-h.cup[0],r.y-h.cup[1]);if(d<dist){dist=d;best=path;}
  }
 }
 frontier=next.slice(0,140);
}
if(best)process.stdout.write(JSON.stringify({action:best[0],path:best,simulations,partial:true}));else process.exit(2);
