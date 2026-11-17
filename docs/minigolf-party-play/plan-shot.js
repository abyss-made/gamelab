// Verification player: route planning and exact server physics choose real inputs.
// No app state is injected. This module also supports offline balance simulations.
const R=require('../../node-server/server/games/golf').rules;
function plan(g){
 const h=g.hole,me=g.players.find(p=>p.id===g.turnId),step=14,nx=51,ny=32,legal=new Uint8Array(nx*ny),distance=new Float64Array(nx*ny).fill(Infinity),motors=h.motors||[];
 const others=g.players.filter(p=>p.id!==me.id&&!p.out&&!p.holed&&p.strokes>0),protectedBalls=g.players.filter(p=>p.id!==me.id&&!p.out&&!p.holed&&p.strokes===0);
 const safe=(x,y)=>R.onFairway(h,x,y)&&motors.every(m=>Math.hypot(x-m.x,y-m.y)>m.length+m.r+9);
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)legal[y*nx+x]=safe(x*step,y*step)?1:0;
 const heap=[];function push(i,d){let k=heap.length;heap.push([i,d]);while(k){const p=(k-1)>>1;if(heap[p][1]<=d)break;heap[k]=heap[p];k=p;}heap[k]=[i,d];}
 function pop(){const root=heap[0],last=heap.pop();if(heap.length){let k=0;while(k*2+1<heap.length){let c=k*2+1;if(c+1<heap.length&&heap[c+1][1]<heap[c][1])c++;if(heap[c][1]>=last[1])break;heap[k]=heap[c];k=c;}heap[k]=last;}return root;}
 let goal=-1,min=Infinity;for(let i=0;i<legal.length;i++)if(legal[i]){const d=Math.hypot(i%nx*step-h.cup[0],Math.floor(i/nx)*step-h.cup[1]);if(d<min){min=d;goal=i;}}
 distance[goal]=0;push(goal,0);
 while(heap.length){const [i,d]=pop();if(d!==distance[i])continue;const x=i%nx,y=Math.floor(i/nx);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=nx||yy>=ny)continue;const j=yy*nx+xx;if(!legal[j]||!safe((x+dx/2)*step,(y+dy/2)*step))continue;const next=d+Math.hypot(dx,dy)*step;if(next<distance[j]){distance[j]=next;push(j,next);}
 }}
 function cost(x,y){const cx=Math.round(x/step),cy=Math.round(y/step);let best=Infinity;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=cx+dx,yy=cy+dy;if(xx<0||yy<0||xx>=nx||yy>=ny)continue;const i=yy*nx+xx;if(Number.isFinite(distance[i])&&safe((x+xx*step)/2,(y+yy*step)/2))best=Math.min(best,distance[i]+Math.hypot(x-xx*step,y-yy*step));}return best;}
 const direct=Math.atan2(h.cup[1]-me.y,h.cup[0]-me.x),angles=[direct,direct-.02,direct+.02,direct-.05,direct+.05,...Array.from({length:72},(_,i)=>i*Math.PI/36)];let best=null,simulations=0;
 for(const raw of angles)for(const power of [.03,.08,.15,.25,.4,.55,.7,.85,1]){
  const angle=((Math.round(raw*180/Math.PI*4)/4)%360+360)%360*Math.PI/180,r=R.simulatePutt(h,me.x,me.y,angle,power,others,protectedBalls);simulations++;
  if(r.outcome==='cup')return{action:{angle,power},simulations,quality:0};if(r.outcome!=='rest')continue;
  const score=cost(r.x,r.y)+power*.5;
  if(Number.isFinite(score)&&(!best||score<best.quality))best={action:{angle,power},quality:score,simulations};
 }
 if(!best)throw Error('No safe putt found on '+h.name);best.simulations=simulations;return best;
}
module.exports=plan;
if(require.main===module){const fs=require('fs');process.stdout.write(JSON.stringify(plan(JSON.parse(fs.readFileSync(0,'utf8')))));}
