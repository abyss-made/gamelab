// Differential, rules-level replay against the previous PR snapshot. No browser
// screenshots or human playtest claims are derived from this fake-clock check.
const assert=require('node:assert/strict'),fs=require('fs'),cp=require('child_process'),vm=require('vm'),path=require('path'),{createRequire}=require('module');
const baseline='69448c4e38736f259f61d57aa69ecc57d5e8d2d4',filename='node-server/server/games/golf.js';
const oldModule={exports:{}};
vm.runInNewContext(cp.execFileSync('git',['show',baseline+':'+filename],{encoding:'utf8'}),{module:oldModule,require:createRequire(path.resolve(filename))});
const old=oldModule.exports,current=require('../../node-server/server/games/golf');
assert.equal(old.rules.simulatePutt.toString(),current.rules.simulatePutt.toString());
const stable=['node-server/server/games/physics.js','node-server/server/games/golfcourses.js','node-server/public/js/games/golf-motion.js','node-server/public/js/games/golf-party.js','node-server/public/js/games/golf-scene.js','node-server/public/js/games/golf-arena.js'];
assert.equal(cp.execFileSync('git',['diff',baseline,'HEAD','--',...stable],{encoding:'utf8'}),'');
const serverFiles=cp.execFileSync('git',['diff','--name-only',baseline,'HEAD','--','node-server/server'],{encoding:'utf8'}).trim().split('\n');assert.deepEqual(serverFiles,[filename]);
function room(G){
 let now=1000000;const members=Array.from({length:6},(_,i)=>({id:'p'+i,name:'Player '+i,score:0}));let result=null;
 const api={now:()=>now,seated:()=>members,member:id=>members.find(p=>p.id===id),sys(){},changed(){},toMember(){},end:r=>result=r};
 const st=G.create({...G.defaults,course:'gauntlet',turnTime:60});G.start(st,api);
 return {st,members,advance(){now=st.phase==='between'?st.nextAt+1:Math.max(now,st.animUntil+1);G.tick(st,api,now);},act(a){G.onAction(st,members[a.playerSlot],{type:'putt',angle:a.angleDegrees*Math.PI/180,power:a.power},api);},result:()=>result};
}
const a=room(old),b=room(current),actions=JSON.parse(fs.readFileSync(__dirname+'/../minigolf-party-play/planned-6-player.json','utf8')).actions;
const physical=r=>JSON.stringify({hole:r.st.hole,turn:r.st.turn,phase:r.st.phase,deadline:r.st.deadline,nextAt:r.st.nextAt,players:r.st.players.map(p=>({id:p.id,x:p.x,y:p.y,strokes:p.strokes,scores:p.scores,holed:p.holed,out:p.out})),anim:r.st.anim});
for(const action of actions){a.advance();b.advance();assert.equal(physical(a),physical(b));a.act(action);b.act(action);assert.equal(physical(a),physical(b));}
a.advance();b.advance();assert.equal(JSON.stringify(a.result()),JSON.stringify(b.result()));assert(a.result());
const report={baseline,sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),unchangedModules:stable,puttsCompared:actions.length,players:6,holes:6,identicalFramesImpactsTurnsScoresAndResults:true,otherBackendFilesUnchanged:true,description:'Fake-clock rules replay, not human playtesting.'};
fs.writeFileSync(__dirname+'/preservation-checks.json',JSON.stringify(report,null,2)+'\n');console.log('PASS: 94 identical putts, six-player course results and unchanged physics/artwork modules');
