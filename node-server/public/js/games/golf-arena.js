/* Original Playgrid festival-arena artwork; geometry, textures and characters are
 * constructed locally. Decoration stays outside the fairway or above ball height. */
window.GolfArena={
 install(s){
  const T=s.T,canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');c.fillStyle='#eaf6ff';c.fillRect(0,0,512,512);
  let seed=17;for(let i=0;i<18000;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%512;seed=(seed*1664525+1013904223)>>>0;c.fillStyle=i%2?'#23334c12':'#ffffff16';c.fillRect(x,seed%512,1,1);}
  c.strokeStyle='#17384a16';c.lineWidth=2;for(let n=0;n<=512;n+=128){c.beginPath();c.moveTo(n,0);c.lineTo(n,512);c.moveTo(0,n);c.lineTo(512,n);c.stroke();}
  const turf=new T.CanvasTexture(canvas);turf.colorSpace=T.SRGBColorSpace;turf.wrapS=turf.wrapT=T.RepeatWrapping;turf.repeat.set(1/140,1/140);s.resources.add(turf);s.mat.arena.map=turf;
  const sky=document.createElement('canvas');sky.width=2;sky.height=256;const ctx=sky.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#72bde7');gradient.addColorStop(.6,'#b5e3f4');gradient.addColorStop(1,'#eaf7fc');ctx.fillStyle=gradient;ctx.fillRect(0,0,2,256);s.arenaSky=new T.CanvasTexture(sky);s.arenaSky.colorSpace=T.SRGBColorSpace;s.resources.add(s.arenaSky);
  s.mat.arenaGround=new T.MeshStandardMaterial({color:'#5196b2',roughness:1});s.mat.neon=new T.MeshBasicMaterial({color:'#bdff45',toneMapped:false});s.mat.visor=new T.MeshStandardMaterial({color:'#0a1f32',roughness:.25,metalness:.15});s.mat.cloud=new T.MeshStandardMaterial({color:'#e3f4fc',roughness:1,flatShading:true});
 },
 sign(s,title,subtitle,key){
  if(s.mat[key])return s.mat[key];const T=s.T,c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');x.fillStyle='#0b2338';x.fillRect(0,0,1024,256);x.strokeStyle='#bfff45';x.lineWidth=8;x.strokeRect(8,8,1008,240);
  x.fillStyle='#bfff45';x.beginPath();x.moveTo(40,48);x.lineTo(112,90);x.lineTo(40,132);x.closePath();x.fill();x.fillStyle='#0b2338';x.beginPath();x.moveTo(58,72);x.lineTo(88,90);x.lineTo(58,108);x.closePath();x.fill();x.fillStyle='#f7fcff';x.font='900 64px sans-serif';x.fillText(title,138,112,840);x.font='600 33px sans-serif';x.fillStyle='#b3cddc';x.fillText(subtitle,44,205,935);
  const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=4;s.resources.add(tx);return s.mat[key]=new T.MeshBasicMaterial({map:tx,side:T.DoubleSide,toneMapped:false});
 },
 bumper(s,b,i){
  const T=s.T,body=s.mat[i%2?'pink':'yellow'],cap=new T.Group();s.world.add(cap);cap.position.set(b.x-350,0,b.y-220);
  const local=(r,h,y,material)=>{const m=s.mesh(new T.CylinderGeometry(r,r,h,28),material,cap);m.position.y=y+h/2;return m;};
  s.cylinder(b.x,b.y,b.r,4,0,s.mat.navy);local(b.r-2,4,4,s.mat.purple);
  const cushion=s.mesh(new T.TorusGeometry(b.r-3,3,10,32),body,cap);cushion.rotation.x=Math.PI/2;cushion.position.y=10;
  local(b.r-4,3,10,body);local(Math.min(10,b.r*.45),1.5,13,s.mat.white);
  const mark=new T.Shape();mark.moveTo(-3,-4);mark.lineTo(5,0);mark.lineTo(-3,4);mark.closePath();const logo=s.mesh(new T.ShapeGeometry(mark),s.mat.navy,cap);logo.rotation.x=-Math.PI/2;logo.position.y=14.6;logo.castShadow=false;
  s.bumperCaps.push({group:cap,index:i,hitAt:-1});
 },
 rail(s,a,b,ox,oz){
  const T=s.T,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx),cx=(a[0]+b[0])/2+ox,cz=(a[1]+b[1])/2+oz;
  const foot=s.box(cx,cz,length,12,14,0,s.mat.purple);foot.rotation.y=angle;foot.userData.kind='boundary';
  const tube=s.mesh(new T.CylinderGeometry(6,6,length,16),s.mat.cyan);tube.rotation.set(0,angle,Math.PI/2);tube.position.set(cx-350,14,cz-220);
  for(let t=22;t<length-8;t+=44){const band=s.mesh(new T.CylinderGeometry(6.15,6.15,3,16),s.mat.white);band.rotation.copy(tube.rotation);band.position.set(a[0]+dx*t/length+ox-350,14,a[1]+dz*t/length+oz-220);band.castShadow=false;}
 },
 motor(s,m){
  const T=s.T,g=new T.Group();g.position.set(m.x-350,0,m.y-220);s.world.add(g);
  const beam=s.mesh(new T.BoxGeometry(m.length*2,10,m.r*2),s.mat.pink,g);beam.position.y=7;beam.userData.kind='motor';beam.userData.motor=m.id;
  for(const side of [-1,1]){const end=s.mesh(new T.CylinderGeometry(m.r,m.r,10,20),s.mat.yellow,g);end.position.set(side*m.length,7,0);for(let x=8;x<m.length;x+=12){const stripe=s.mesh(new T.BoxGeometry(4,.6,m.r*2+.1),s.mat.white,g);stripe.position.set(side*x,12.5,0);stripe.castShadow=false;}}
  s.cylinder(m.x,m.y,9,9,12,s.mat.navy);s.cylinder(m.x,m.y,5,2,21,s.mat.neon);
  const points=[];for(let n=0;n<=80;n++){const a=n*Math.PI/40;points.push(new T.Vector3(m.x-350+Math.cos(a)*(m.length+m.r+7),.3,m.y-220+Math.sin(a)*(m.length+m.r+7)));}
  const arc=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineDashedMaterial({color:'#e8efff',dashSize:3,gapSize:6,transparent:true,opacity:.5}));arc.computeLineDistances();s.world.add(arc);
  s.motors.push({definition:m,group:g});
 },
 build(s,g){
  const T=s.T,h=g.hole,number=g.holeIndex+1;
  // A stage, sky islands and tiered stands give the hole a setting and depth.
  const sign=this.sign(s,'PLAYGRID',`${String(number).padStart(2,'0')}  /  ${h.name.toUpperCase()}   ·   PAR ${h.par}`,'arenaSign'+number);
  s.box(350,-28,306,10,80,10,s.mat.navy);const face=s.mesh(new T.PlaneGeometry(300,75),sign);face.position.set(0,50,-242);face.castShadow=false;
  for(const x of [205,495]){s.cylinder(x,-28,4,70,-60,s.mat.navy);s.box(x,-22,5,3,55,15,s.mat.neon);}
  for(const [i,[x,z,r]] of [[-65,45,45],[765,85,55],[-50,450,38],[740,455,50]].entries()){
   const island=s.mesh(new T.IcosahedronGeometry(r,1),s.mat.purple);island.position.set(x-350,-80,z-220);island.scale.set(1,.7,.8);island.castShadow=false;
   for(let n=0;n<3;n++){const cloud=s.mesh(new T.SphereGeometry(r*.7,12,8),s.mat.cloud);cloud.position.set(x-350+(n-1)*r*.55,-108,z-220);cloud.scale.set(1,.3,.65);cloud.castShadow=false;}
   s.cylinder(x,z,6,55,-40,s.mat.navy);s.cylinder(x,z,11,3,15,s.mat.neon);
   const flag=new T.Shape();flag.moveTo(0,0);flag.lineTo(34,-8);flag.lineTo(0,-20);flag.closePath();const pennant=s.mesh(new T.ShapeGeometry(flag),i%2?s.mat.pink:s.mat.yellow);pennant.position.set(x-349,65,z-220);pennant.castShadow=false;
  }
  for(const cx of [165,535])for(let row=0;row<3;row++){
   s.box(cx,430+row*17,145,16,5+row*10,-35,s.mat.navy);s.box(cx,431+row*17,140,8,2,-28+row*10,row%2?s.mat.pink:s.mat.cyan);
  }
  const bodyGeometry=new T.CapsuleGeometry(3.2,5,3,8),headGeometry=new T.SphereGeometry(5,10,8),visorGeometry=new T.BoxGeometry(6,3,1);
  const bodies=new T.InstancedMesh(bodyGeometry,s.mat.cyan,18),heads=new T.InstancedMesh(headGeometry,s.mat.white,18),visors=new T.InstancedMesh(visorGeometry,s.mat.visor,18),dummy=new T.Object3D();s.world.add(bodies,heads,visors);
  for(let i=0;i<18;i++){const side=i<9?165:535,row=Math.floor(i%9/3),x=side+((i%3)-1)*35,z=431+row*17,y=-22+row*10;dummy.position.set(x-350,y,z-220);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);bodies.setColorAt(i,new T.Color(['#f78bbc','#86e1e6','#d8f186'][i%3]));dummy.position.y=y+9;dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);dummy.position.z=z-224;dummy.updateMatrix();visors.setMatrixAt(i,dummy.matrix);}
  // Original mascot robot, echoing the homepage robot's white shell/lime visor.
  const bot=new T.Group();bot.position.set(-391,5,100);s.world.add(bot);
  const part=(geometry,material,x,y,z)=>{const m=s.mesh(geometry,material,bot);m.position.set(x,y,z);return m;};
  part(new T.SphereGeometry(16,20,14),s.mat.white,0,29,0).scale.set(1,.85,.85);part(new T.BoxGeometry(23,12,4),s.mat.visor,0,28,11);for(const x of [-6,6])part(new T.SphereGeometry(2.7,10,8),s.mat.neon,x,30,14);part(new T.CapsuleGeometry(8,10,4,12),s.mat.navy,0,5,0);part(new T.CylinderGeometry(1.2,1.2,10,8),s.mat.navy,0,46,0);part(new T.SphereGeometry(3,10,8),s.mat.pink,0,52,0);for(const side of [-1,1]){part(new T.CapsuleGeometry(3,8,3,8),s.mat.white,side*14,9,0).rotation.z=side*.5;part(new T.SphereGeometry(4,10,8),s.mat.yellow,side*17,4,0);}s.mascot=bot;
  const x=h.cup[0],z=h.cup[1],finish=s.mesh(new T.TorusGeometry(27,2,10,48),s.mat.neon);finish.position.set(x-350,43,z-220);finish.rotation.y=Math.atan2(h.tee[0]-x,h.tee[1]-z);finish.userData.kind='finish';s.finish=finish;
  for(let i=0;i<12;i++){const a=i*Math.PI/6,tile=s.box(x+Math.cos(a)*21,z+Math.sin(a)*21,7,7,.25,.25,i%2?s.mat.white:s.mat.navy);tile.rotation.y=-a;tile.castShadow=false;}
  const start=this.sign(s,'START','PULL BACK TO PUTT','arenaStart'),startPlane=s.mesh(new T.PlaneGeometry(58,14),start);startPlane.rotation.x=-Math.PI/2;startPlane.position.set(h.tee[0]-350,.35,h.tee[1]-254);startPlane.castShadow=false;
 }
};
