// Rules-level difficulty probe, not human playtesting or a source of screenshots.
const fs=require('fs'),path=require('path'),G=require('../../node-server/server/games/golf'),plan=require('./plan-shot');
const out=__dirname,results=[];
function match(noise,seed,probe=false){
 const initialSeed=seed;let now=1000000;const members=[{id:'p0',name:'Alex',score:0},{id:'p1',name:'Nova',score:0}],log={result:null},api={now:()=>now,seated:()=>members,member:id=>members.find(m=>m.id===id),sys(){},changed(){},toMember(){},end:r=>log.result=r};
 const st=G.create({...G.defaults,course:'gauntlet',maxStrokes:8,turnTime:60});G.start(st,api);const actions=[];let slimeTested=false;
 const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let count=0;!log.result&&count<180;count++){
  if(st.phase==='between'){now=st.nextAt+1;G.tick(st,api,now);continue;}
  now=Math.max(now,st.animUntil+1);const member=st.players[st.turn],slot=members.findIndex(p=>p.id===member.id),view=G.view(st,members[slot],now),p=probe&&st.hole===3&&!slimeTested?{action:{angle:331.25*Math.PI/180,power:.55}}:plan(view),raw=p.action.angle+(rnd()-.5)*noise*Math.PI/180,angle=Math.round(raw*180/Math.PI*4)/4*Math.PI/180,power=Math.max(.03,Math.min(1,Math.round((p.action.power+(rnd()-.5)*noise*.02)*100)/100));
  G.onAction(st,members[slot],{type:'putt',angle,power},api);if(probe&&st.hole===3&&!slimeTested){if(st.last.outcome!=='water')throw Error('probe did not reach slime');slimeTested=true;}actions.push({hole:st.hole+1,playerSlot:slot,angleDegrees:((angle*180/Math.PI)%360+360)%360,power,outcome:st.last.outcome,note:st.last.note,motorHits:(st.anim.impacts||[]).filter(e=>e.type==='motor').length,duration:st.anim.duration});
 }
 if(!log.result)throw Error('match did not finish');return{noise,initialSeed,finalRandomState:seed,actions,result:log.result,limits:actions.filter(a=>a.note==='limit').length};
}
const probe=process.argv.includes('--slime-probe'),runs=Number(process.argv.find(v=>/^\d+$/.test(v))||1);for(let i=0;i<runs;i++){const noise=i===0?0:i%2?1.5:3,run=match(noise,48+i,probe);results.push(run);console.log('MATCH',i,'noise',noise,'limits',run.limits,'scores',run.result.standings.map(p=>p.total).join('/'),'shots',run.actions.length);fs.writeFileSync(path.join(out,probe?'scenario-plan.json':'balance-checks.json'),JSON.stringify({description:'Automated rules-level route agents, with optional aim/power perturbation. These are not real-player observations.',runs:results},null,2)+'\n');if(i===0)fs.writeFileSync(path.join(out,'replay-actions.json'),JSON.stringify({description:'Legal native inputs chosen in a rules-level simulation. The browser harness must independently play and verify them in a normal match.',actions:run.actions},null,2)+'\n');}
