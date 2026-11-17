// Offline rules-level route planning. Browser proof must replay these inputs
// through real controls; this is not a browser capture or human playtest.
const fs = require('fs');
const G = require('../../node-server/server/games/golf');
const plan = require('./plan-shot');
const count = Number(process.argv[2] || 3);
if (![2, 3, 6].includes(count)) throw Error('Choose 2, 3 or 6 verification players');
let now = 1000000, result = null;
const members = Array.from({length:count}, (_,i) => ({id:'p'+i,name:['Alex','Nova','Kai','Milo','Jules','Robin'][i],score:0}));
const api = {now:()=>now,seated:()=>members,member:id=>members.find(p=>p.id===id),sys(){},changed(){},toMember(){},end:r=>{result=r;}};
const st = G.create({...G.defaults,course:'gauntlet',turnTime:60});
G.start(st,api);
const actions = [], recaps = [];
for (let i=0; !result && i<350; i++) {
  if (st.phase === 'between') {
    recaps.push({hole:st.hole+1,summary:st.summary,recap:st.recap});
    now = st.nextAt+1;G.tick(st,api,now);continue;
  }
  now = Math.max(now,st.animUntil+1);
  const slot = st.turn;
  const view = G.view(st,members[slot],now);
  // A deliberate, legal first-shot turbo route, then ordinary planned putts.
  const input = actions.length === 0 ? {angle:9*Math.PI/180,power:.7} : plan(view).action;
  const angle = ((Math.round(input.angle*180/Math.PI*4)/4)%360+360)%360;
  const power = Math.round(input.power*100)/100;
  G.onAction(st,members[slot],{type:'putt',angle:angle*Math.PI/180,power},api);
  const events = st.anim.impacts;
  actions.push({hole:st.hole+1,playerSlot:slot,angleDegrees:angle,power,outcome:st.last.outcome,note:st.last.note,boosts:events.filter(e=>e.type==='boost').length,motors:events.filter(e=>e.type==='motor').length,finish:st.last.finish});
  console.log('PUTT',st.hole+1,slot,st.last.outcome,'boosts',actions.at(-1).boosts);
}
if (!result) throw Error('Verification match did not finish');
const report = {description:'Automated rules-level match; planned legal controls, not human observations.',players:count,actions,recaps,result,limits:actions.filter(a=>a.note==='limit').length};
fs.writeFileSync(__dirname+'/planned-'+count+'-player.json',JSON.stringify(report,null,2)+'\n');
console.log('COMPLETE',count,'players',actions.length,'putts',result.standings.map(p=>p.total).join('/'),'caps',report.limits);
