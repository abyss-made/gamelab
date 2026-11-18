/* Original Playgrid course construction. Three.js is a locally vendored MIT renderer.
 * World X/Z is exactly the authoritative server's X/Y; height is presentation only. */
window.GolfClubScene={async create(canvas,arena){
 const T=await import('/vendor/three/three.module.min.js');
 return new ClubScene(T,canvas,arena);
}};
class ClubScene{
 constructor(T,canvas,arena){
  this.T=T;this.canvas=canvas;this.arena=arena;this.key='';this.width=0;this.height=0;this.yaw=-.56;this.pitch=.86;this.overview=false;this.zoom=1;this.ready=false;this.balls=new Map();this.labels=new Map();this.resources=new Set();this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
  this.scene=new T.Scene();this.scene.background=new T.Color('#83cedc');this.scene.fog=new T.Fog('#83cedc',1700,4100);
  this.camera=new T.PerspectiveCamera(42,1,1,6000);this.target=new T.Vector3();this.desired=new T.Vector3();this.ray=new T.Raycaster();this.plane=new T.Plane(new T.Vector3(0,1,0),0);this.hit=new T.Vector3();
  this.scene.add(new T.HemisphereLight('#d7f6ff','#63846e',2));const sun=new T.DirectionalLight('#fff1cf',3.3);sun.position.set(-400,850,250);sun.castShadow=true;sun.shadow.mapSize.set(innerWidth<700?1024:2048,innerWidth<700?1024:2048);Object.assign(sun.shadow.camera,{left:-680,right:680,top:600,bottom:-600,near:100,far:2000});this.sun=sun;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;sun.shadow.bias=-.0002;sun.shadow.normalBias=.8;this.scene.add(sun);
  this.textures={};const loader=new T.TextureLoader();for(const name of ['turf','stone','wood','water','sand']){const tx=loader.load('/assets/golf-club/'+name+'.png');tx.colorSpace=T.SRGBColorSpace;tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());tx.repeat.set(1/180,1/180);this.textures[name]=tx;}
  this.textures.stone.repeat.set(1/90,1/90);this.textures.wood.repeat.set(1/95,1/95);
  this.mat={grass:new T.MeshStandardMaterial({map:this.textures.turf,roughness:.98}),stone:new T.MeshStandardMaterial({map:this.textures.stone,color:'#d7e0d9',roughness:.85}),wood:new T.MeshStandardMaterial({map:this.textures.wood,color:'#d4b681',roughness:.85}),sand:new T.MeshStandardMaterial({map:this.textures.sand,color:'#edd39b',roughness:1}),dark:new T.MeshStandardMaterial({color:'#143340',roughness:.8}),white:new T.MeshStandardMaterial({color:'#edf1df',roughness:.5}),red:new T.MeshStandardMaterial({color:'#f14d50',roughness:.7,side:T.DoubleSide}),trunk:new T.MeshStandardMaterial({color:'#ac8653',roughness:1}),leaf:new T.MeshStandardMaterial({color:'#4d9c52',roughness:.8,side:T.DoubleSide}),leafLight:new T.MeshStandardMaterial({color:'#91bb57',roughness:.85,side:T.DoubleSide}),rock:new T.MeshStandardMaterial({color:'#b5b8a0',roughness:1,flatShading:true}),beam:new T.MeshStandardMaterial({color:'#9a713f',roughness:.9})};
  for(const [name,color] of Object.entries({arena:'#368cda',navy:'#263856',pink:'#f04d9f',cyan:'#45ded9',yellow:'#ffda54',purple:'#8160ce',slime:'#168849'}))this.mat[name]=new T.MeshStandardMaterial({color,roughness:.55,metalness:.03});
  this.ocean=new T.Mesh(new T.PlaneGeometry(6000,6000),new T.MeshPhysicalMaterial({color:'#65d6e1',map:this.textures.water,roughness:.3,metalness:.05,clearcoat:.5,transparent:true,opacity:.96}));this.ocean.rotation.x=-Math.PI/2;this.ocean.position.y=-26;this.ocean.receiveShadow=true;this.scene.add(this.ocean);
  // Plane geometry uses normalized UVs; give the ocean its own repeat scale.
  this.ocean.material.map=this.textures.water.clone();this.ocean.material.map.repeat.set(24,24);this.ocean.material.map.needsUpdate=true;this.oceanMap=this.ocean.material.map;this.resources.add(this.oceanMap);
  this.oceanMaterial=this.ocean.material;GolfArena.install(this);
  this.world=new T.Group();this.scene.add(this.world);this.effects=new T.Group();this.scene.add(this.effects);this.particles=[];
  this.guide=new T.Group();this.scene.add(this.guide);const lineGeo=new T.BufferGeometry();lineGeo.setAttribute('position',new T.BufferAttribute(new Float32Array(6),3));this.guideLine=new T.Line(lineGeo,new T.LineDashedMaterial({color:'#ffffed',dashSize:8,gapSize:6,transparent:true,opacity:.95,depthTest:false}));this.guideLine.renderOrder=5;this.guide.add(this.guideLine);this.ghost=new T.Mesh(new T.SphereGeometry(6.1,20,12),new T.MeshBasicMaterial({color:'#f3ffdb',wireframe:true,transparent:true,opacity:.55,depthTest:false}));this.guide.add(this.ghost);
  this.trailLine=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:'#f5ffe0',dashSize:4,gapSize:5,transparent:true,opacity:.65,depthTest:false}));this.trailLine.visible=false;this.trailLine.renderOrder=4;this.scene.add(this.trailLine);this.trailKey=null;
  this.labelLayer=document.createElement('div');this.labelLayer.className='club-ball-labels';this.arena.append(this.labelLayer);
  this.toast=document.createElement('div');this.toast.className='club-shot-result';this.toast.setAttribute('role','status');this.toast.hidden=true;this.arena.append(this.toast);
  this.cupMarker=document.createElement('div');this.cupMarker.className='club-cup-marker';this.cupMarker.setAttribute('aria-hidden','true');this.arena.append(this.cupMarker);this.lastNow=0;
 }
 material(name){return this.mat[name];}
 mesh(geometry,material,parent=this.world){const m=new this.T.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 polygon(points,holes=[]){const T=this.T,s=new T.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x-350,220-z):s.moveTo(x-350,220-z));s.closePath();for(const polygon of holes){const h=new T.Path();polygon.forEach(([x,z],i)=>i?h.lineTo(x-350,220-z):h.moveTo(x-350,220-z));h.closePath();s.holes.push(h);}return s;}
 extrude(points,height,y,material,holes=[]){const geo=new this.T.ExtrudeGeometry(this.polygon(points,holes),{depth:height,bevelEnabled:false,curveSegments:20});geo.rotateX(-Math.PI/2);const m=this.mesh(geo,material);m.position.y=y;return m;}
 box(x,z,w,d,h,y,material,parent=this.world){const m=this.mesh(new this.T.BoxGeometry(w,h,d),material,parent);m.position.set(x-350,y+h/2,z-220);return m;}
 cylinder(x,z,r,h,y,material,parent=this.world){const m=this.mesh(new this.T.CylinderGeometry(r,r,h,28),material,parent);m.position.set(x-350,y+h/2,z-220);return m;}
 disposeGroup(group){const geometries=new Set(),materials=new Set(),shared=new Set(Object.values(this.mat||{}));group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])if(!shared.has(m)&&m!==this.oceanMaterial)materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials){if(m.bumpMap){m.bumpMap.dispose();this.resources.delete(m.bumpMap);}m.dispose();}group.clear();}
 build(g){
  const T=this.T,h=g.hole;this.party=g.course.id==='gauntlet';this.gates=[];this.motors=[];this.boostPads=[];this.bumperCaps=[];this.ripples=[];this.effectShot=-1;this.effectCursor=0;this.mascot=null;this.finish=null;this.cheerUntil=0;this.disposeGroup(this.world);this.balls.clear();for(const l of this.labels.values())l.remove();this.labels.clear();this.particles=[];this.disposeGroup(this.effects);this.key=g.course.id+':'+g.holeIndex;this.sun.shadow.needsUpdate=true;this.ready=false;this.toast.hidden=true;this.lastShot=-1;this.trailKey=null;this.trailLine.visible=false;
  this.scene.background=this.party?this.arenaSky:new T.Color('#83cedc');this.scene.fog.color.set(this.party?'#b5e3f4':'#83cedc');this.ocean.visible=!this.party;this.ocean.material=this.oceanMaterial;this.ocean.position.y=-26;this.sun.intensity=this.party?2.1:3.3;this.renderer.toneMappingExposure=this.party?1.02:1.15;
  const holes=(h.water||[]).map(z=>[[z.x,z.y],[z.x+z.w,z.y],[z.x+z.w,z.y+z.h],[z.x,z.y+z.h]]);const cup=[];for(let i=0;i<48;i++)cup.push([h.cup[0]+Math.cos(i*Math.PI/24)*h.cupR,h.cup[1]+Math.sin(i*Math.PI/24)*h.cupR]);holes.push(cup);
  const base=this.extrude(h.poly,27,-27,this.party?[this.mat.arena,this.mat.navy]:[this.mat.grass,this.mat.stone],holes);base.receiveShadow=true;base.userData.kind='fairway';
  if(this.party){this.extrude(h.poly,5,-32,this.mat.yellow,holes);this.extrude(h.poly,12,-44,this.mat.navy,holes);}
  // Boundary walls stand OUTSIDE their collision plane; their inner face is exact.
  const area=h.poly.reduce((v,p,i)=>{const q=h.poly[(i+1)%h.poly.length];return v+p[0]*q[1]-q[0]*p[1];},0),sign=area>0?1:-1;
  for(let i=0;i<h.poly.length;i++){
   const a=h.poly[i],b=h.poly[(i+1)%h.poly.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),ox=sign*dz/len*6,oz=-sign*dx/len*6;
   if(this.party){GolfArena.rail(this,a,b,ox,oz);continue;}
   const wall=this.box((a[0]+b[0])/2+ox,(a[1]+b[1])/2+oz,len+2,12,20,0,this.party?this.mat.purple:this.mat.stone);wall.rotation.y=-Math.atan2(dz,dx);wall.userData.kind='boundary';
   const cap=this.box((a[0]+b[0])/2+ox,(a[1]+b[1])/2+oz,len+4,14,3.5,20,this.party?this.mat.cyan:this.mat.white);cap.rotation.y=wall.rotation.y;
   // Visible block joints subdivide each masonry run into believable stones.
   for(let t=30;t<len-10;t+=36){const joint=this.box(a[0]+dx*t/len+ox,a[1]+dz*t/len+oz,this.party?5:1.2,14.2,2,22,this.party?this.mat.white:this.mat.stone);joint.rotation.y=wall.rotation.y;}
  }
  for(const p of h.walls){
   if(this.party){this.extrude(p,30,0,this.mat.pink);this.extrude(p,4,30,this.mat.yellow);continue;}
   this.extrude(p,38,0,this.mat.wood);
   const minX=Math.min(...p.map(v=>v[0])),maxX=Math.max(...p.map(v=>v[0])),minZ=Math.min(...p.map(v=>v[1])),maxZ=Math.max(...p.map(v=>v[1]));
   // Braced wooden crate/fence faces sit within the actual solid footprint.
   const wide=maxX-minX>=maxZ-minZ,length=wide?maxX-minX:maxZ-minZ;
   for(let t=0;t<length;t+=65){const n=Math.min(65,length-t),cx=wide?minX+t+n/2:(minX+maxX)/2,cz=wide?(minZ+maxZ)/2:minZ+t+n/2;
    for(const side of [-1,1]){
     const x=wide?cx:cx+side*(maxX-minX)/2,z=wide?cz+side*(maxZ-minZ)/2:cz;
     const rail=this.box(x,z,wide?n:3,wide?3:n,4,32,this.mat.beam);rail.castShadow=false;
     const brace=this.box(x,z,Math.hypot(n-5,26),2.5,4,15,this.mat.beam);brace.rotation.z=Math.atan2(26,n-5);if(!wide){brace.rotation.set(0,Math.PI/2,Math.atan2(26,n-5));}
    }
   }
  }
  for(const z of h.sand)this.box(z.x+z.w/2,z.y+z.h/2,z.w,z.h,.35,.05,this.mat.sand);
  for(const z of h.water){
   const water=this.mesh(new T.PlaneGeometry(z.w,z.h),this.party?this.mat.slime:this.ocean.material);water.rotation.x=-Math.PI/2;water.position.set(z.x+z.w/2-350,-6,z.y+z.h/2-220);water.castShadow=false;
   if(this.party){
    // Surface paint identifies the recessed penalty area without adding colliders.
    for(let x=z.x+4;x<z.x+z.w-3;x+=12)for(const y of [z.y-1.5,z.y+z.h+1.5]){const m=this.box(x,y,6,3,.25,.15,this.mat.yellow);m.castShadow=false;}
    for(let y=z.y+4;y<z.y+z.h-3;y+=12)for(const x of [z.x-1.5,z.x+z.w+1.5]){const m=this.box(x,y,3,6,.25,.15,this.mat.yellow);m.castShadow=false;}
    for(let i=0;i<5;i++){const x=z.x+14+((i*29)%(z.w-28)),y=z.y+18+((i*43)%(z.h-36)),bubble=this.mesh(new T.SphereGeometry(4+i%3,12,8),this.mat.cyan);bubble.position.set(x-350,-6,y-220);bubble.scale.y=.35;bubble.castShadow=false;}
   }
  }
  for(const [i,b] of h.bumpers.entries()){
   if(this.party){GolfArena.bumper(this,b,i);continue;}
   const mat=this.party?(i%2?this.mat.pink:this.mat.yellow):this.mat.stone;
   this.cylinder(b.x,b.y,b.r,13,0,mat);this.cylinder(b.x,b.y,b.r*.87,3,13,this.party?this.mat.white:this.mat.white);this.cylinder(b.x,b.y,b.r*.54,2,16,this.party?this.mat.purple:this.mat.dark);
   if(this.party){const ring=this.mesh(new T.TorusGeometry(b.r*.73,2,8,32),mat);ring.rotation.x=Math.PI/2;ring.position.set(b.x-350,18,b.y-220);}
  }
  for(const motor of h.motors||[])GolfArena.motor(this,motor);
  for(const gate of h.gates||[]){
   const xs=gate.poly.map(p=>p[0]),zs=gate.poly.map(p=>p[1]),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2,w=Math.max(...xs)-Math.min(...xs),d=Math.max(...zs)-Math.min(...zs);
   const group=new T.Group();this.world.add(group);const panel=this.box(x,z,w,d,27,0,this.mat.pink,group);panel.userData.kind='gate';panel.userData.gate=gate.id;
   this.box(x,z,w+1,d+1,4,27,this.mat.yellow,group);
   const wide=w>d;for(let t=8;t<(wide?w:d);t+=15){const stripe=this.box(wide?Math.min(...xs)+t:x,wide?z:Math.min(...zs)+t,wide?3:w+.3,wide?d+.3:3,20,3,this.mat.white,group);stripe.castShadow=false;}
   // A client reconnecting during a shot must start with that shot's locked pose.
   const replay=g.anim&&g.anim.elapsedMs<g.anim.duration*1000?g.anim.gates?.find(v=>v.id===gate.id):null;
   group.position.y=(replay?.closed??gate.closed)?0:55;this.gates.push({id:gate.id,group});
   // Overhead supports sit above ball height; only the panel has a collision footprint.
   this.box(x,z,w+8,d+8,4,88,this.mat.navy);
  }
  for(const z of h.slopes||[]){const panel=this.box(z.x+z.w/2,z.y+z.h/2,z.w,z.h,.2,.2,new T.MeshStandardMaterial({color:'#d4c66d',roughness:.9,transparent:true,opacity:.65}));panel.castShadow=false;for(let x=z.x+18;x<z.x+z.w;x+=28)for(let y=z.y+18;y<z.y+z.h;y+=28){const arrow=new T.Shape();arrow.moveTo(-7,-5);arrow.lineTo(1,0);arrow.lineTo(-7,5);arrow.lineTo(-3,0);arrow.closePath();const m=this.mesh(new T.ShapeGeometry(arrow),this.mat.white);m.rotation.x=-Math.PI/2;m.rotation.z=-Math.atan2(z.ay,z.ax);m.position.set(x-350,.6,y-220);m.castShadow=false;}}
  for(const tile of h.boosts||[])GolfArena.boost(this,tile);
  // An actual recessed cup and original red flag.
  const cupSide=new T.Mesh(new T.CylinderGeometry(h.cupR,h.cupR,18,40,1,true),new T.MeshStandardMaterial({color:'#10292c',roughness:1,side:T.BackSide}));cupSide.position.set(h.cup[0]-350,-9,h.cup[1]-220);this.world.add(cupSide);this.cylinder(h.cup[0],h.cup[1],h.cupR,1,-18,this.mat.dark);
  const rim=this.mesh(new T.TorusGeometry(h.cupR,.8,8,48),this.mat.white);rim.rotation.x=Math.PI/2;rim.position.set(h.cup[0]-350,.2,h.cup[1]-220);this.cylinder(h.cup[0],h.cup[1],.9,60,0,this.mat.white);
  const flag=new T.Shape();flag.moveTo(0,0);flag.lineTo(28,-6);flag.lineTo(0,-14);flag.closePath();this.flag=this.mesh(new T.ShapeGeometry(flag),this.mat.red);this.flag.position.set(h.cup[0]-349,58,h.cup[1]-220);this.flagBase=Array.from(this.flag.geometry.attributes.position.array);
  // The tee marking denotes a legal placement area, not an extra collision object.
  const a=h.teeArea;if(a){const pts=[[a.x,a.y],[a.x+a.w,a.y],[a.x+a.w,a.y+a.h],[a.x,a.y+a.h],[a.x,a.y]].map(([x,z])=>new T.Vector3(x-350,.5,z-220));const mark=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineDashedMaterial({color:'#edffb3',dashSize:4,gapSize:3,transparent:true,opacity:.75}));mark.computeLineDistances();this.world.add(mark);}
  this.teeGhost=this.mesh(new T.SphereGeometry(h.ballR,20,12),new T.MeshBasicMaterial({color:'#d9f89a',transparent:true,opacity:.6}));this.teeGhost.visible=false;
  if(this.party)GolfArena.build(this,g);else this.decorate(h);
  this.bounds=new T.Box3().setFromPoints(h.poly.map(([x,z])=>new T.Vector3(x-350,0,z-220)));this.bounds.expandByScalar(55);
 }
 decorate(h){
  const T=this.T;let seed=17;for(const c of h.name)seed=(seed*31+c.charCodeAt(0))>>>0;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const inside=(x,z)=>{let b=false;for(let i=0,j=h.poly.length-1;i<h.poly.length;j=i++){const a=h.poly[i],c=h.poly[j];if((a[1]>z)!==(c[1]>z)&&x<(c[0]-a[0])*(z-a[1])/(c[1]-a[1])+a[0])b=!b;}return b;};let used=0;
  for(let z=-5;z<470;z+=100)for(let x=5;x<730;x+=120){if(used>8)break;const xx=x+(rnd()-.5)*35,zz=z+(rnd()-.5)*30;if(inside(xx,zz)||[[-40,0],[40,0],[0,-40],[0,40]].some(([dx,dz])=>inside(xx+dx,zz+dz)))continue;if(rnd()>.68)continue;used++;
   const rock=this.mesh(new T.IcosahedronGeometry(30+rnd()*12,1),this.mat.rock);rock.position.set(xx-350,-23,zz-220);rock.scale.set(1.2,.3,.9);
   if(used%3===0){const pebble=this.mesh(new T.IcosahedronGeometry(17,0),this.mat.rock);pebble.position.set(xx-330,-17,zz-220);continue;}
   this.palm(xx,zz,-16,.75+rnd()*.3);
  }
 }
 palm(x,z,y,scale){
  const T=this.T,group=new T.Group();this.world.add(group);group.position.set(x-350,y,z-220);group.scale.setScalar(scale);
  for(let i=0;i<9;i++){const trunk=this.mesh(new T.CylinderGeometry(3-i*.13,3.5-i*.13,8,7),i%2?this.mat.trunk:this.mat.beam,group);trunk.position.set(Math.sin(i*.13)*7,i*7,0);trunk.rotation.z=-.09;}
  for(let leaf=0;leaf<7;leaf++){
   const vertices=[],indices=[];const len=42+(leaf%3)*5;
   for(let i=0;i<=9;i++){const t=i/9,w=Math.sin(t*Math.PI)*7;for(const side of [-1,1])vertices.push(t*len,Math.sin(t*Math.PI)*11-t*t*16,side*w);if(i<9){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const m=this.mesh(geo,leaf%2?this.mat.leaf:this.mat.leafLight,group);m.position.set(6,62,0);m.rotation.y=leaf*Math.PI*2/7;
  }
 }
 resize(){const r=this.canvas.parentElement.getBoundingClientRect();if(r.width<1||r.height<1)return false;const w=Math.round(r.width),h=Math.round(r.height);if(w!==this.width||h!==this.height){this.width=w;this.height=h;this.renderer.setSize(w,h,false);this.camera.updateProjectionMatrix();return true;}return false;}
 project(x,z,y=6){const v=new this.T.Vector3(x-350,y,z-220).project(this.camera),r=this.canvas.getBoundingClientRect();return{x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2,visible:v.z>-1&&v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1};}
 toCourse(ev){const r=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new this.T.Vector2((ev.clientX-r.left)/r.width*2-1,-(ev.clientY-r.top)/r.height*2+1),this.camera);if(!this.ray.ray.intersectPlane(this.plane,this.hit))return null;return{x:this.hit.x+350,y:this.hit.z+220};}
 rotate(amount,pitch=0){this.yaw+=amount;this.pitch=Math.max(.57,Math.min(1.25,this.pitch+pitch));}
 toggleView(){this.overview=!this.overview;this.zoom=1;this.ready=false;return this.overview;}
 zoomBy(direction){this.zoom=Math.max(.65,Math.min(2.2,this.zoom*(direction>0?1.18:1/1.18)));}
 center(){this.overview=false;this.zoom=1;this.ready=false;}
 makeBall(p,index){
  const T=this.T,canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#aaa';c.fillRect(0,0,128,128);for(let y=0;y<136;y+=12)for(let x=0;x<136;x+=12){const xx=x+(y%24?6:0);const g=c.createRadialGradient(xx-1,y-1,.2,xx,y,4);g.addColorStop(0,'#666');g.addColorStop(.7,'#999');g.addColorStop(1,'#ccc');c.fillStyle=g;c.beginPath();c.arc(xx,y,4,0,7);c.fill();}const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;this.resources.add(map);
  const mesh=this.mesh(new T.SphereGeometry(6,28,20),new T.MeshStandardMaterial({color:'#fcfff3',roughness:.35,bumpMap:map,bumpScale:.55}));mesh.castShadow=false;const shadow=this.mesh(new T.CircleGeometry(7,24),new T.MeshBasicMaterial({color:'#183d3c',transparent:true,opacity:.22,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;const color=['#ff477b','#4db8ff','#ffcd2d','#adff00','#b48cff','#ff9a3d'][index%6];const ring=this.mesh(new T.TorusGeometry(8.5,1,8,40),new T.MeshBasicMaterial({color,transparent:true,opacity:.85}));ring.rotation.x=Math.PI/2;ring.castShadow=false;const label=document.createElement('span');label.className='club-ball-label';label.dataset.player=p.id;label.textContent=p.name;label.style.setProperty('--ball-color',color);this.labelLayer.append(label);this.labels.set(p.id,label);const b={mesh,ring,shadow,label,last:null,dropAt:0,visible:false};this.balls.set(p.id,b);return b;
 }
 trace(h,b,angle,limit){
  const dx=Math.cos(angle),dz=Math.sin(angle);let dist=limit;
  for(const polygon of [h.poly,...h.walls,...(h.gates||[]).filter(g=>g.closed).map(g=>g.poly)])for(let i=0;i<polygon.length;i++){
   const a=polygon[i],c=polygon[(i+1)%polygon.length],ex=c[0]-a[0],ez=c[1]-a[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-7)continue;
   const ax=a[0]-b.x,az=a[1]-b.y,t=(ax*ez-az*ex)/den,u=(ax*dz-az*dx)/den;
   if(t>0&&u>=0&&u<=1)dist=Math.min(dist,Math.max(0,t-h.ballR/Math.max(.1,Math.abs((dx*ez-dz*ex)/Math.hypot(ex,ez)))));
  }
  for(const c of h.bumpers){const ox=b.x-c.x,oz=b.y-c.y,dot=ox*dx+oz*dz,d=dot*dot-(ox*ox+oz*oz-(c.r+h.ballR)**2);if(d>=0){const t=-dot-Math.sqrt(d);if(t>0)dist=Math.min(dist,t);}}
  // A short visual guide, not a prediction: show the rotor's current footprint.
  if(h.motors?.length)for(let d=2;d<dist;d+=2){if(!GolfMotion.clear({x:b.x+dx*d,y:b.y+dz*d,r:h.ballR},h.motors,h.motorTime)){dist=Math.max(0,d-2);break;}}
  return{x:b.x+dx*dist,y:b.y+dz*dist,hit:dist<limit};
 }
 burst(x,z){if(this.reduced.matches)return;const T=this.T;for(let i=0;i<20;i++){const m=this.mesh(new T.BoxGeometry(2.5,1,4),new T.MeshBasicMaterial({color:['#c7f078','#fbce63','#f27078','#e8fff4'][i%4]}),this.effects);m.position.set(x-350,8,z-220);this.particles.push({m,vx:(Math.random()-.5)*90,vy:60+Math.random()*100,vz:(Math.random()-.5)*90,life:1.5});}}
 impact(event,now){
  if(this.reduced.matches)return;const T=this.T,color=event.type==='boost'?'#c5ff45':event.type==='motor'?'#ffdd54':event.type==='bumper'?'#baff58':'#e7fcff';
  if(event.type==='boost'){const pad=this.boostPads.find(p=>p.id===event.obstacleId);if(pad)pad.hitAt=now;}
  const ring=this.mesh(new T.RingGeometry(2,4,24),new T.MeshBasicMaterial({color,transparent:true,opacity:.9,side:T.DoubleSide,depthWrite:false}),this.effects);ring.rotation.x=-Math.PI/2;ring.position.set(event.x-350,.8,event.y-220);ring.castShadow=false;this.ripples.push({mesh:ring,age:0});
  const cap=this.bumperCaps.find(c=>c.index===event.obstacleId);if(event.type==='bumper'&&cap)cap.hitAt=now;
  if(event.type==='boost'||event.type==='motor'||event.type==='bumper')for(let i=0;i<5;i++){const m=this.mesh(new T.BoxGeometry(1.8,1.8,1.8),new T.MeshBasicMaterial({color}),this.effects);m.position.set(event.x-350,7,event.y-220);m.castShadow=false;this.particles.push({m,vx:(Math.random()-.5)*45,vy:25+Math.random()*30,vz:(Math.random()-.5)*45,life:.4});}
 }
 replayEffects(anim,shotTime,receivedShotTime,now){
  const events=anim.impacts||[];
  if(this.effectShot!==anim.shot){
   this.effectShot=anim.shot;this.effectCursor=0;
   // Skip contacts that predate this client's arrival, not contacts whose
   // presentation was delayed by a slow frame after a live shot arrived.
   while(this.effectCursor<events.length&&events[this.effectCursor].t<receivedShotTime-.12)this.effectCursor++;
  }
  const pending=[];
  while(this.effectCursor<events.length&&events[this.effectCursor].t<=shotTime)pending.push(events[this.effectCursor++]);
  // Bound catch-up work after a stall. Preserve important launch/arm contacts
  // and the latest other contacts instead of producing a particle/audio storm.
  const important=pending.filter(e=>e.type==='boost'||e.type==='motor').slice(-2);
  const chosen=[...important,...pending.filter(e=>!important.includes(e)).slice(-(4-important.length))];
  for(const e of chosen)this.impact(e,now);
  if(chosen.length&&!Sound.muted&&now-(this.lastImpactSound||0)>130){
   const e=important.at(-1)||chosen.at(-1);
   Sound.play(e.type==='boost'?'golfboost':e.type==='motor'?'golfmotor':e.type==='bumper'?'golfbumper':'golftap');this.lastImpactSound=now;
  }
 }
 frame(data){
  if(document.hidden||!this.canvas.getClientRects().length)return;
  const {g,now,positions,aim,power,mine,pulling,placing,teeDraft}=data,T=this.T;if(this.key!==g.course.id+':'+g.holeIndex)this.build(g);this.resize();if(!this.width)return;
  const dt=this.lastNow?Math.min(.06,(now-this.lastNow)/1000):.016;this.lastNow=now;const moving=!!(g.anim&&data.animating);const actorId=moving?g.anim.by:g.turnId;const actor=positions.find(v=>v.p.id===actorId)||positions.find(v=>v.pos)||positions[0];const fallback=g.phase==='between'?g.hole.cup:g.hole.tee;const focus=actor?.pos||this.balls.get(actorId)?.last||{x:fallback[0],y:fallback[1]};
  const gates=moving?(g.anim.gates||g.hole.gates||[]):(g.hole.gates||[]);for(const gate of this.gates){const state=gates.find(v=>v.id===gate.id),target=state?.closed?0:55;if(Math.abs(target-gate.group.position.y)>.01){gate.group.position.y=this.reduced.matches?target:gate.group.position.y+(target-gate.group.position.y)*(1-Math.exp(-dt*24));this.sun.shadow.needsUpdate=true;}}
  const shotTime=data.shotTime??((g.anim?.elapsedMs||0)/1000),motorTime=GolfMotion.clock(g.hole,g.anim,shotTime);
  for(const motor of this.motors){motor.group.rotation.y=-GolfMotion.pose(motor.definition,motorTime).angle;}
  if(g.anim)this.replayEffects(g.anim,shotTime,data.receivedShotTime??((g.anim.elapsedMs||0)/1000),now);
  for(const pad of this.boostPads)pad.flash.material.opacity=this.reduced.matches||pad.hitAt<0?0:Math.max(0,.65-(now-pad.hitAt)/600);
  const trail=data.trail;this.trailLine.visible=!!(data.showTrail&&trail&&!moving);
  if(trail&&this.trailKey!==trail){this.trailKey=trail;const points=trail.frames.filter(f=>f[1]!==null).map(f=>new T.Vector3(f[1]-350,1,f[2]-220));this.trailLine.geometry.dispose();this.trailLine.geometry=new T.BufferGeometry().setFromPoints(points);this.trailLine.computeLineDistances();}
  for(const c of this.bumperCaps){const age=(now-c.hitAt)/1000;c.group.scale.y=this.reduced.matches||c.hitAt<0||age>.35?1:1-.25*Math.exp(-age*10)*Math.sin(age*35);}
  for(let i=this.ripples.length-1;i>=0;i--){const p=this.ripples[i];p.age+=dt;p.mesh.scale.setScalar(1+p.age*24);p.mesh.material.opacity=Math.max(0,.9-p.age*2.4);if(p.age>.38){this.effects.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();this.ripples.splice(i,1);}}
  if(this.mascot){this.mascot.position.y=this.reduced.matches?5:5+Math.sin(now*.0016)*1.5;this.mascot.rotation.z=!this.reduced.matches&&now<this.cheerUntil?Math.sin(now*.018)*.1:0;}
  if(this.finish){const age=(now-(this.cheerUntil-1800))/1000;this.finish.scale.setScalar(this.reduced.matches||age<0||age>1.8?1:1+.04*Math.sin(age*20)*Math.exp(-age*2));}
  if(this.reduced.matches&&(this.particles.length||this.ripples.length)){this.disposeGroup(this.effects);this.particles=[];this.ripples=[];}
  const aspect=this.width/this.height,tan=Math.tan(this.camera.fov*Math.PI/360),direction=new T.Vector3(Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),Math.cos(this.yaw)*Math.cos(this.pitch));
  let distance;
  if(this.overview){
   this.desired.copy(this.bounds.getCenter(new T.Vector3()));this.desired.y=0;
   this.camera.position.copy(this.desired).addScaledVector(direction,1000);this.camera.lookAt(this.desired);this.camera.updateMatrixWorld();
   const corners=[];for(const x of [this.bounds.min.x,this.bounds.max.x])for(const z of [this.bounds.min.z,this.bounds.max.z])for(const y of [-25,70])corners.push(new T.Vector3(x,y,z).applyMatrix4(this.camera.matrixWorldInverse));
   distance=Math.max(300,...corners.map(v=>v.z+1000+Math.max(Math.abs(v.y)*1.12/tan,Math.abs(v.x)*1.12/(tan*aspect))))/this.zoom;
  }else{
   const cup=g.hole.cup,dx=cup[0]-focus.x,dz=cup[1]-focus.y,len=Math.hypot(dx,dz)||1;this.desired.set(focus.x-350+dx/len*55,0,focus.y-220+dz/len*55);distance=(this.width<700?420:390)/(2*tan*this.zoom);
  }
  // Finish the camera handoff during the existing post-shot pause. A ball must
  // be a stationary touch target before Putt becomes available to its owner.
  const handoff=this.cameraActor!==actorId||this.wasMoving&&!moving;
  if(!this.ready||handoff&&!data.aiming){this.target.copy(this.desired);this.distance=distance;this.ready=true;}
  else if(!data.aiming){if(this.reduced.matches){this.target.copy(this.desired);this.distance=distance;}else{this.target.lerp(this.desired,1-Math.exp(-dt*5));this.distance+=(distance-this.distance)*(1-Math.exp(-dt*5));}}
  this.cameraActor=actorId;this.wasMoving=moving;
  this.camera.position.copy(this.target).addScaledVector(direction,this.distance);this.camera.lookAt(this.target);this.camera.aspect=aspect;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();

  for(const [index,{p,pos}] of positions.entries()){
   const b=this.balls.get(p.id)||this.makeBall(p,index);let point=pos;
   if(!point&&b.visible&&p.holed&&(g.anim?.sunkIds?.includes(p.id)||g.anim?.outcome==='cup'&&g.anim.by===p.id)&&!b.dropAt){b.dropAt=now;this.burst(...g.hole.cup);this.impact({x:g.hole.cup[0],y:g.hole.cup[1],type:'cup'},now);Sound.play('correct');this.cheerUntil=now+1800;const moment=g.anim.finishes?.[p.id]||GolfParty.finish(p.strokes,g.hole.par);this.toast.textContent=(p.id===mine?'':p.name+' · ')+moment.title;this.toast.dataset.style=moment.style;this.toast.hidden=false;this.toastUntil=now+2200;}
   if(!point&&b.dropAt&&now-b.dropAt<350){const u=(now-b.dropAt)/350;point={x:g.hole.cup[0],y:g.hole.cup[1]};b.mesh.scale.setScalar(1-u*.8);b.mesh.position.y=6-u*18;}else if(point){b.mesh.scale.setScalar(1);b.mesh.position.y=6;}
   b.mesh.visible=!!point&&!p.out;b.ring.visible=!!pos&&!p.out;b.shadow.visible=b.mesh.visible;
   if(point){b.mesh.position.x=point.x-350;b.mesh.position.z=point.y-220;b.ring.position.set(point.x-350,.65,point.y-220);b.shadow.position.set(point.x-348,.22,point.y-221);if(b.last){const dx=point.x-b.last.x,dz=point.y-b.last.y,len=Math.hypot(dx,dz);if(len>.01&&len<80)b.mesh.rotateOnWorldAxis(new T.Vector3(dz,0,-dx).normalize(),len/6);}b.last={x:point.x,y:point.y};}
   b.visible=!!pos;b.label.hidden=!pos||p.out;const labelPos=point&&this.project(point.x,point.y,24),r=this.canvas.getBoundingClientRect();if(labelPos){b.label.style.left=(labelPos.x-r.left)+'px';b.label.style.top=(labelPos.y-r.top)+'px';b.label.hidden=!labelPos.visible||!pos||p.out||(p.id!==actorId&&Math.hypot(point.x-focus.x,point.y-focus.y)<45);b.label.classList.toggle('active',p.id===actorId);}
  }
  this.teeGhost.visible=!!(placing&&teeDraft);if(this.teeGhost.visible)this.teeGhost.position.set(teeDraft.x-350,6,teeDraft.y-220);
  const player=positions.find(v=>v.p.id===mine);this.guide.visible=!!(data.canPutt&&player?.pos&&!placing);if(this.guide.visible){const b=player.pos,end=this.trace(g.hole,b,aim,65+power*1.8),a=this.guideLine.geometry.attributes.position;a.setXYZ(0,b.x-350,6,b.y-220);a.setXYZ(1,end.x-350,6,end.y-220);a.needsUpdate=true;this.guideLine.geometry.computeBoundingSphere();this.guideLine.computeLineDistances();this.ghost.position.set(end.x-350,6,end.y-220);this.ghost.visible=end.hit;}
  if(this.flag&&!this.reduced.matches){const a=this.flag.geometry.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,Math.sin(now*.003+this.flagBase[i*3]*.14)*this.flagBase[i*3]*.06);a.needsUpdate=true;this.oceanMap.offset.x=(now*.000006)%1;this.oceanMap.offset.y=(now*.000003)%1;}
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.effects.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();this.particles.splice(i,1);continue;}p.vy-=130*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;p.m.rotation.x+=dt*3;p.m.rotation.z+=dt*4;}
  if(now>this.toastUntil)this.toast.hidden=true;
  const cp=this.project(...g.hole.cup,10),r=this.canvas.getBoundingClientRect();this.cupMarker.hidden=cp.visible;const arrows=['→','↘','↓','↙','←','↖','↑','↗'],heading=Math.round(Math.atan2(cp.y-r.top-r.height/2,cp.x-r.left-r.width/2)/(Math.PI/4));this.cupMarker.textContent='Cup '+arrows[(heading+8)%8];let markerX=Math.max(65,Math.min(r.width-65,cp.x-r.left)),markerY=Math.max(45,Math.min(r.height-60,cp.y-r.top));
  if(!cp.visible){
   const box=this.cupMarker.getBoundingClientRect(),halfW=box.width/2,halfH=box.height/2,controls=this.arena.querySelector('.club-camera-controls')?.getBoundingClientRect(),players=this.arena.querySelector('.club-standings')?.getBoundingClientRect();
   if(controls&&markerX+halfW>controls.left-r.left&&markerX-halfW<controls.right-r.left&&markerY-halfH<controls.bottom-r.top+8)markerY=controls.bottom-r.top+halfH+10;
   if(players&&markerX-halfW<players.right-r.left+8&&markerY-halfH<players.bottom-r.top+8&&markerY+halfH>players.top-r.top)markerX=Math.min(r.width-halfW-10,players.right-r.left+halfW+12);
  }
  this.cupMarker.style.left=markerX+'px';this.cupMarker.style.top=markerY+'px';
  this.renderer.render(this.scene,this.camera);
 }
 dispose(){this.labelLayer.remove();this.toast.remove();this.cupMarker.remove();const geos=new Set(),mats=new Set([...Object.values(this.mat),this.oceanMaterial]),textures=new Set(Object.values(this.textures));this.scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])mats.add(m);});for(const g of geos)g.dispose();for(const m of mats){for(const k of ['map','bumpMap'])if(m[k])textures.add(m[k]);m.dispose();}for(const t of [...textures,...this.resources])t.dispose();this.renderer.dispose();this.renderer.forceContextLoss();}
}
