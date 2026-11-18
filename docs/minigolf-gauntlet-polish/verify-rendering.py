"""Renderer unit fixtures: all authoritative hole definitions, camera math, and actual mesh cutouts.
These are NOT screenshots or injected app games; the real gameplay harness is play-course.py.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,json,urllib.request
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent;URL='http://127.0.0.1:45426'
fixtures=json.loads(subprocess.check_output(['node','-e',"const c=require('./node-server/server/games/golfcourses');const r=require('./node-server/server/games/golf').rules;console.log(JSON.stringify(c.COURSES.flatMap(course=>course.holes.map((h,i)=>({course:course.id,holeIndex:i,hole:{...h,gates:r.gateStates(h),walls:h.walls||[],water:h.water||[],sand:h.sand||[],bumpers:h.bumpers||[],slopes:h.slopes||[],ballR:6,cupR:10,teeArea:{x:h.tee[0]-24,y:h.tee[1]-24,w:48,h:48}}})))));"],cwd=ROOT,text=True))
server=subprocess.Popen(['node','server/index.js'],cwd=ROOT/'node-server',env={**os.environ,'PORT':'45426','ALPHA_ENABLED':''},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
 for i in range(100):
  try:urllib.request.urlopen(URL+'/healthz').close();break
  except:
   if i==99:raise
   time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium');pg=b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(URL)
  result=pg.evaluate('''async fixtures=>{
   const arena=document.createElement('div');arena.style='position:fixed;left:0;top:0;width:800px;height:500px';const canvas=document.createElement('canvas');arena.append(canvas);document.body.append(arena);const scene=await GolfClubScene.create(canvas,arena),T=scene.T,report=[];
   for(const f of fixtures){
    const h=f.hole,p={id:'fixture',name:'Renderer unit fixture',x:h.tee[0],y:h.tee[1],strokes:0,out:false,holed:false};const g={course:{id:f.course},holeIndex:f.holeIndex,hole:h,turnId:p.id,players:[p]};
    const data={g,now:10000,positions:[{p,pos:{x:p.x,y:p.y}}],aim:0,power:50,mine:p.id,canPutt:true,animating:false};
    scene.frame(data);let checks=0;
    for(const [width,height] of [[800,500],[390,424]])for(const yaw of [-.56,.5,1.6])for(const overview of [false,true]){
     arena.style.width=width+'px';arena.style.height=height+'px';scene.yaw=yaw;scene.overview=overview;scene.ready=false;scene.frame(data);
     for(const [x,y] of [h.tee,h.cup,...h.poly]){const screen=scene.project(x,y,0),point=scene.toCourse({clientX:screen.x,clientY:screen.y});if(!point||Math.hypot(x-point.x,y-point.y)>1e-4)throw Error(f.course+':'+h.name+' camera inverse mismatch');checks++;}
     if(overview&&!h.poly.every(([x,y])=>scene.project(x,y,24).visible))throw Error(h.name+' not framed by overview');
    }
    const floor=scene.world.children.find(o=>o.userData.kind==='fairway');if(!floor)throw Error('missing actual fairway mesh');const ray=new T.Raycaster();
    const capAt=([x,y])=>{ray.set(new T.Vector3(x-350,150,y-220),new T.Vector3(0,-1,0));return ray.intersectObject(floor).some(hit=>Math.abs(hit.point.y)<.1);};
    if(!capAt(h.tee))throw Error(h.name+' tee not on rendered turf');if(capAt(h.cup))throw Error(h.name+' cup is painted over, not recessed');
    for(const water of h.water)if(capAt([water.x+water.w/2,water.y+water.h/2]))throw Error(h.name+' water is painted over, not cut out');
    scene.world.traverse(o=>{const a=o.geometry?.attributes.position;if(a&&!Array.from(a.array).every(Number.isFinite))throw Error(h.name+' invalid geometry');if(![...o.position.toArray(),...o.scale.toArray(),...o.quaternion.toArray()].every(Number.isFinite))throw Error(h.name+' invalid transform');});
    report.push({course:f.course,hole:h.name,inverseProjections:checks,teeOnTurf:true,cupRecessed:true,waterCutouts:h.water.length,finiteGeometry:true});
   }
   // Dedicated renderer unit fixture: reconnect into a rolling gate shot.
   const f=fixtures.find(f=>f.course==='gauntlet'&&f.hole.name==='Gatecrasher'),locked=f.hole.gates,next=locked.map(g=>({...g,closed:!g.closed})),h={...f.hole,gates:next};
   const g={course:{id:'gauntlet'},holeIndex:2,hole:h,turnId:'fixture',players:[],anim:{duration:2,elapsedMs:200,gates:locked}};
   scene.build(g);if(scene.gates.some(g=>g.group.position.y!==(locked.find(v=>v.id===g.id).closed?0:55)))throw Error('reconnect did not restore locked gate pose immediately');
   const data={g,now:20000,positions:[],aim:0,power:50,mine:'fixture',canPutt:false,animating:true};scene.frame(data);
   if(scene.gates.some(g=>g.group.position.y!==(locked.find(v=>v.id===g.id).closed?0:55)))throw Error('rolling replay uses next-turn gate pose');
   scene.reduced={matches:true};scene.frame({...data,now:22000,animating:false});
   if(scene.gates.some(g=>g.group.position.y!==(next.find(v=>v.id===g.id).closed?0:55)))throw Error('next-turn reduced-motion gate pose mismatch');
   const blocked=scene.trace({...h,gates:locked},{x:230,y:190},0,80),clear=scene.trace(h,{x:230,y:190},0,80);
   if(blocked.x>=255||clear.x<310)throw Error('aim trace does not respect authoritative closed/open gate geometry');
   report.find(r=>r.course==='gauntlet'&&r.hole==='Gatecrasher').gateReplayPose={midShotReconnect:true,lockedDuringReplay:true,nextTurnReducedMotion:true,aimTraceMatchesState:true};
   // Powered obstacles must remain aligned with the server clock, including
   // reconnect and reduced motion. Physics-essential motion stays visible.
   const mf=fixtures.find(f=>f.hole.motors?.length),mh={...mf.hole,motorTime:4.8},mg={course:{id:mf.course},holeIndex:mf.holeIndex,hole:mh,players:[],turnId:null,anim:{shot:2,duration:3,elapsedMs:800,motion:{start:2.4,runFor:2.4,end:4.8},impacts:[]}};
   scene.reduced={matches:false};
   for(const t of [.8,1.3,2.2,3]){const md={g:mg,now:30000+t*1000,positions:[],aim:0,power:50,canPutt:false,animating:t<3,shotTime:t};scene.frame(md);const expected=GolfMotion.clock(mh,mg.anim,t);if(scene.motors.some(m=>Math.abs(m.group.rotation.y+GolfMotion.pose(m.definition,expected).angle)>1e-9))throw Error('motor render diverged from authoritative clock');}
   scene.reduced={matches:true};scene.frame({g:mg,now:35000,positions:[],aim:0,power:50,animating:true,shotTime:1.1});
   if(scene.motors.some(m=>Math.abs(m.group.rotation.y+GolfMotion.pose(m.definition,GolfMotion.clock(mh,mg.anim,1.1)).angle)>1e-9))throw Error('reduced motion hid essential obstacle movement');
   if(scene.mascot.position.y!==5)throw Error('reduced motion did not stop decorative motion');
   mg.anim=null;scene.reduced={matches:false};scene.overview=false;scene.ready=false;const marker={p:{id:'camera',name:'fixture',out:false,holed:false},pos:{x:110,y:220}};mg.turnId='camera';
   const cameraData={g:mg,now:40000,positions:[marker],aim:0,power:50,animating:false};scene.frame(cameraData);const before=scene.camera.matrixWorld.elements.slice();marker.pos={x:500,y:300};
   for(let n=1;n<=20;n++)scene.frame({...cameraData,now:40000+n*16,aiming:true});
   if(scene.camera.matrixWorld.elements.some((v,i)=>Math.abs(v-before[i])>1e-8))throw Error('camera drifts while aiming');
   report.find(r=>r.course===mf.course&&r.hole===mf.hole.name).motorPresentation={alignedWithServer:true,reconnectAtElapsedPhase:true,reducedMotionPreservesPhysics:true,decorativeMotionDisabled:true,cameraHeldDuringAim:true};
   scene.dispose();arena.remove();return report;
  }''',fixtures)
  b.close();assert not errors,errors;assert len(result)==36
 (OUT/'rendering-checks.json').write_text(json.dumps({'fixtures':result,'errors':errors,'description':'Renderer unit fixtures only; no gameplay screenshots'},indent=2)+'\n');print('PASS: all 36 course meshes, recessed cups/water, overview framing and inverse camera mappings')
finally:server.terminate();server.wait(timeout=10)
