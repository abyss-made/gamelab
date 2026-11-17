// Compare physical outcomes on all five established courses with the prior PR.
const fs=require('fs'),cp=require('child_process'),vm=require('vm'),assert=require('node:assert/strict'),{createRequire}=require('module'),path=require('path');
const baseline='85ab293de52f3f1cd8669cdf0e344dd79efa13d0';
function previous(file){const module={exports:{}};vm.runInNewContext(cp.execFileSync('git',['show',baseline+':'+file],{encoding:'utf8'}),{module,require:createRequire(path.resolve(file))});return module.exports;}
const before=previous('node-server/server/games/golf.js'),now=require('../../node-server/server/games/golf'),courses=require('../../node-server/server/games/golfcourses'),oldCourses=previous('node-server/server/games/golfcourses.js');
const ids=['meadow','canyon','skyline','harbor','coastal'];let cases=0;
for(const id of ids){
 assert.equal(JSON.stringify(courses.BY_ID[id]),JSON.stringify(oldCourses.BY_ID[id]));
 for(const h of courses.BY_ID[id].holes)for(let n=0;n<10;n++){
  const args=[h,...h.tee,n*Math.PI/5,.1+(n*17%90)/100],a=before.rules.simulatePutt(...args),b=now.rules.simulatePutt(...args);
  const physical=r=>({x:r.x,y:r.y,outcome:r.outcome,others:r.others,frames:r.anim.frames,paths:r.anim.paths,duration:r.anim.duration});
  assert.equal(JSON.stringify(physical(a)),JSON.stringify(physical(b)),id+':'+h.name);cases++;
 }
}
assert.equal(JSON.stringify(courses.BY_ID.tour),JSON.stringify(oldCourses.BY_ID.tour));
const serverFiles=cp.execFileSync('git',['diff','--name-only',baseline,'HEAD','--','node-server/server'],{encoding:'utf8'}).trim().split('\n');assert.deepEqual(serverFiles,['node-server/server/games/golf.js','node-server/server/games/golfcourses.js']);
assert(!cp.execFileSync('git',['diff',baseline,'HEAD','--','node-server/server/games/physics.js'],{encoding:'utf8'}));
const report={baseline,existingCoursesPreserved:ids,originalTourPreserved:true,exactLegacyPhysicalCases:cases,sharedPhysicsUnchanged:true,changedServerFiles:serverFiles,unrelatedGamesAuthSecurityHealthLoggingShutdownUnchanged:true};
fs.writeFileSync(__dirname+'/preservation-checks.json',JSON.stringify(report,null,2)+'\n');console.log('PASS: five original courses, original tour, 300 exact old/new physical paths and unrelated backend preservation');
