// Compare existing courses/backend and the shared integrator's legacy behavior.
const fs=require('fs'),cp=require('child_process'),vm=require('vm'),assert=require('node:assert/strict'),P=require('../../node-server/server/games/physics');
const baseline='2e0dc0e29ae0e7253c4074666a416640b232323a';
function oldModule(file){const module={exports:{}};vm.runInNewContext(cp.execFileSync('git',['show',baseline+':'+file],{encoding:'utf8'}),{module});return module.exports;}
const beforeCourses=oldModule('node-server/server/games/golfcourses.js'),courses=require('../../node-server/server/games/golfcourses');
for(const c of beforeCourses.COURSES.filter(c=>c.id!=='gauntlet'))assert.equal(JSON.stringify(courses.BY_ID[c.id]),JSON.stringify(c));assert.equal(JSON.stringify(courses.BY_ID.tour),JSON.stringify(beforeCourses.BY_ID.tour));
const oldPhysics=oldModule('node-server/server/games/physics.js');
for(let n=0;n<120;n++){
 const world={balls:[{id:'a',x:200,y:220,vx:Math.cos(n)*450,vy:Math.sin(n)*450,r:6},{id:'b',x:350,y:225,vx:0,vy:0,r:6}],walls:P.polyWalls([[60,60],[640,60],[640,380],[60,380]]),circles:[{x:460,y:140,r:22}],collide:true,maxTime:16,sampleEvery:4};
 const a=JSON.parse(JSON.stringify(world)),b=JSON.parse(JSON.stringify(world)),before=oldPhysics.run(a),after=P.run(b);assert.equal(JSON.stringify(before),JSON.stringify(after));assert.equal(JSON.stringify(a.balls),JSON.stringify(b.balls));
}
const changed=cp.execFileSync('git',['diff','--name-only',baseline,'--','node-server/server'],{encoding:'utf8'}).trim().split('\n');assert.deepEqual(changed,['node-server/server/games/golf.js','node-server/server/games/golfcourses.js','node-server/server/games/physics.js']);
const report={baseline,existingCoursesPreserved:beforeCourses.COURSES.filter(c=>c.id!=='gauntlet').map(c=>c.id),originalTourPreserved:true,legacyPhysicsCases:120,identicalFramesDurationsAndFinalBalls:true,changedServerFiles:changed,otherGamesAndSecurityLoggingHealthShutdownUnchanged:true};
fs.writeFileSync(__dirname+'/preservation-checks.json',JSON.stringify(report,null,2)+'\n');console.log('PASS existing courses, original tour, 120 exact legacy physics comparisons and unrelated backend preservation');
