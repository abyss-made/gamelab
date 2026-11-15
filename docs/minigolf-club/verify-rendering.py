"""Renderer unit fixtures: all authoritative hole definitions, camera math, and actual mesh cutouts.
These are NOT screenshots or injected app games; the real gameplay harness is play-course.py.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,time,json,urllib.request
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent;URL='http://127.0.0.1:45426'
fixtures=json.loads(subprocess.check_output(['node','-e',"const c=require('./node-server/server/games/golfcourses');console.log(JSON.stringify(c.COURSES.flatMap(course=>course.holes.map((h,i)=>({course:course.id,holeIndex:i,hole:{...h,walls:h.walls||[],water:h.water||[],sand:h.sand||[],bumpers:h.bumpers||[],slopes:h.slopes||[],ballR:6,cupR:10,teeArea:{x:h.tee[0]-24,y:h.tee[1]-24,w:48,h:48}}})))));"],cwd=ROOT,text=True))
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
    scene.world.traverse(o=>{const a=o.geometry?.attributes.position;if(a&&!Array.from(a.array).every(Number.isFinite))throw Error(h.name+' invalid geometry');});
    report.push({course:f.course,hole:h.name,inverseProjections:checks,teeOnTurf:true,cupRecessed:true,waterCutouts:h.water.length,finiteGeometry:true});
   }
   scene.dispose();arena.remove();return report;
  }''',fixtures)
  b.close();assert not errors,errors;assert len(result)==30
 (OUT/'rendering-checks.json').write_text(json.dumps({'fixtures':result,'errors':errors,'description':'Renderer unit fixtures only; no gameplay screenshots'},indent=2)+'\n');print('PASS: all 30 course meshes, recessed cups/water, overview framing and inverse camera mappings')
finally:server.terminate();server.wait(timeout=10)
