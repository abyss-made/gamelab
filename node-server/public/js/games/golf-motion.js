/* Shared, deterministic obstacle geometry. Used by the server and both renderers. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GolfMotion=api;})(globalThis,()=>{
 const RUN_FOR=2.4;
 // Integral of a cosine drive: zero motor speed at activation and parking,
 // with exactly RUN_FOR units of phase travel over a complete powered cycle.
 function travel(t){if(t<=0)return 0;if(t>=RUN_FOR)return RUN_FOR;return t-Math.sin(t*2*Math.PI/RUN_FOR)*RUN_FOR/(2*Math.PI);}
 function drive(t){return t<=0||t>=RUN_FOR?0:1-Math.cos(t*2*Math.PI/RUN_FOR);}
 function pose(m,time=0){const angle=(m.angle||0)+m.speed*time,c=Math.cos(angle),s=Math.sin(angle);return{ax:m.x-c*m.length,ay:m.y-s*m.length,bx:m.x+c*m.length,by:m.y+s*m.length,r:m.r,angle};}
 function contact(b,m,time){const p=pose(m,time),dx=p.bx-p.ax,dy=p.by-p.ay,k=Math.max(0,Math.min(1,((b.x-p.ax)*dx+(b.y-p.ay)*dy)/(dx*dx+dy*dy))),x=p.ax+k*dx,y=p.ay+k*dy;return{...p,x,y,dx:b.x-x,dy:b.y-y,distance:Math.hypot(b.x-x,b.y-y)};}
 function clear(b,motors,time=0){return(motors||[]).every(m=>contact(b,m,time).distance>=b.r+m.r-1e-6);}
 function collide(b,m,time,active){
  const envelope=m.length+m.r+b.r;if(Math.abs(b.x-m.x)>envelope||Math.abs(b.y-m.y)>envelope)return null;
  const c=contact(b,m,time),radius=b.r+m.r;if(c.distance>=radius)return null;
  let nx=c.distance?c.dx/c.distance:-Math.sin(c.angle),ny=c.distance?c.dy/c.distance:Math.cos(c.angle);
  const omega=m.speed*(typeof active==='number'?active:active?1:0),vx=-omega*(c.y-m.y),vy=omega*(c.x-m.x);
  if(!c.distance&&(b.vx-vx)*nx+(b.vy-vy)*ny>0){nx=-nx;ny=-ny;}
  b.x=c.x+nx*(radius+1e-7);b.y=c.y+ny*(radius+1e-7);
  const vn=(b.vx-vx)*nx+(b.vy-vy)*ny;
  if(vn>=0)return null;b.vx-=(1+.86)*vn*nx;b.vy-=(1+.86)*vn*ny;
  return{x:c.x,y:c.y,speed:-vn,type:'motor',obstacleId:m.id};
 }
 function clock(hole,anim,elapsed=0){return anim?.motion?anim.motion.start+travel(Math.max(0,Math.min(elapsed,anim.motion.runFor))):(hole.motorTime||0);}
 return{RUN_FOR,travel,drive,pose,contact,clear,collide,clock};
});
