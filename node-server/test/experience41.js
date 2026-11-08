// Issue #70 game contracts: no sockets/architecture changes are needed for these deterministic cases.
const assert = require('assert/strict');
const { GAMES } = require('../server/games');
const categories = require('../server/games/categories');
let count=0;
function test(name, fn) { fn(); count++; console.log('PASS '+name); }
function room(game, settings={}, size=3) {
 const G=GAMES[game];const members=Array.from({length:size},(_,i)=>({id:'p'+i,name:'Player '+i,avatar:{e:i,c:i},score:0,connected:true,role:'player'}));let now=1000000;
 const log={notices:[],result:null};const api={now:()=>now,seated:()=>members,member:id=>members.find(m=>m.id===id),gameCount:()=>1,sys(){},chat(){},toRoom(){},changed(){},toMember:(id,ev,text)=>log.notices.push({id,ev,text}),end:r=>log.result=r,rotateLoser:()=>null};
 const st=G.create({...G.defaults,...settings});G.start(st,api);
 return {G,st,members,api,log,act:(i,a)=>G.onAction(st,members[i],a,api),view:i=>G.view(st,i===null?{id:'spectator'}:members[i],now),tick:()=>{now=Math.max(now+1,st.deadline+1);G.tick(st,api,now);}};
}
test('Categories rejects nonsense and explains why',()=>{
 assert(!categories.validFor('axqzzl','A','Animal'));assert.match(categories.invalidReason('axqzzl','A','Animal'),/word list/);
 assert(categories.validFor('ant','A','Animal'));assert(!categories.validFor('dog','D','Country'));
});
test('Categories accepts proper names without corrupting final S and canonicalizes aliases',()=>{
 for(const [answer,category,letter] of [['James','Boy name','J'],['Paris','City','P'],['United States','Country','U'],['New York','City','N']]) {
  const normalized=categories.normalize(answer,category);assert(categories.validFor(normalized,letter,category));
 }
 assert(categories.validFor('Great Britain','G','Country'));assert(categories.validFor('Adidas','A','Brand or store'));assert(categories.validFor("McDonald's",'M','Brand or store'));
 assert.equal(categories.normalize('James','Boy name'),'james');assert.equal(categories.normalize('USA','Country'),categories.normalize('United States','Country'));
 assert.equal(categories.normalize('The Children'),categories.normalize('child'));assert.equal(categories.normalize('Berries'),'berry');
});
test('Categories review retains server invalid reasons and private submissions',()=>{
 const r=room('categories');r.st.letter='A';r.st.cats=Array(5).fill('Animal');r.act(0,{type:'answers',answers:['axqzzl'],done:true});
 assert(!JSON.stringify(r.view(1)).includes('axqzzl'));r.act(1,{type:'done'});r.act(2,{type:'done'});
 assert.equal(r.st.review.rows[0].cells[0].points,0);assert.match(r.st.review.rows[0].cells[0].reason,/word list/);
});
test('Hot Potato rejects nonsense without passing or extending the fuse; normalized duplicates are blocked',()=>{
 const r=room('hotpotato');const h=r.st.holder, t=(h+1)%3, deadline=r.st.deadline;
 r.act(h,{type:'pass',to:r.members[t].id,answer:'axqzzl'});assert.equal(r.st.holder,h);assert.equal(r.st.deadline,deadline);assert.match(r.log.notices.at(-1).text,/word list/);
 r.act(h,{type:'pass',to:r.members[t].id,answer:'Banana'});assert.equal(r.st.holder,t);
 r.act(t,{type:'pass',to:r.members[(t+1)%3].id,answer:'BANANA!'});assert.equal(r.st.holder,t);
 assert(!JSON.stringify(r.view(0)).includes('fuseAt'));
});
test('Telephone sanitizes every new setting and rejects type coercion',()=>{
 const T=GAMES.telephone;const s=T.sanitizeSettings({rounds:5,drawTime:120,writeTime:15,promptSource:'custom',customWords:'Dragon, dragon, a castle\nrobot'},T.defaults);
 assert.equal(s.rounds,5);assert.equal(s.drawTime,120);assert.equal(s.promptSource,'custom');assert.equal(s.customWords.split(', ').length,3);
 const bad=T.sanitizeSettings({rounds:'5',drawTime:999,writeTime:0,promptSource:'url',customWords:[]},T.defaults);assert.deepEqual(bad,T.defaults);
 assert.equal(T.sanitizeSettings({promptSource:'custom',customWords:''},T.defaults).promptSource,'players');
});
test('Telephone configured steps finish exactly at the limit and reveal never invents a round',()=>{
 const r=room('telephone',{rounds:5});
 for(let i=0;i<5;i++){
  const g=r.view(0);assert.equal(g.round,i+1);assert.equal(g.rounds,5);assert.equal(g.completedRounds,i);
  for(let p=0;p<3;p++)r.act(p,g.kind==='draw'?{type:'draw',strokes:[{t:'s',c:'#123456',s:8,p:[1,1,8,8]}]}:{type:'text',text:'A castle'});
 }
 assert.equal(r.st.phase,'reveal');assert.equal(r.view(0).round,5);assert.equal(r.view(0).completedRounds,5);assert(r.st.chains.every(c=>c.entries.length===5));
 for(let i=0;i<100&&!r.log.result;i++)r.tick();assert.equal(r.log.result.rounds,5);
});
test('Telephone custom/curated sources seed private prompts with no human-submission credit',()=>{
 for(const promptSource of ['custom','curated']) {
  const r=room('telephone',{rounds:3,promptSource,customWords:'A dragon'});assert.equal(r.view(0).kind,'draw');assert.equal(r.view(0).round,2);
  assert(r.st.chains.every(c=>c.entries[0].generated));assert(r.st.players.every(p=>p.points===0));assert(!r.view(null).source);
  if(promptSource==='custom')assert.equal(r.view(0).source.text,'A dragon');
 }
});
test('Bluff stores and exposes uppercase answers without leaking authors before reveal',()=>{
 const r=room('bluff');for(let i=0;i<3;i++)r.act(i,{type:'bluff',text:['pink dolphin','Purple mountain','A robot'][i]});
 assert(r.st.players.every(p=>p.fake===p.fake.toUpperCase()));assert(r.view(0).options.every(o=>o.text===o.text.toUpperCase()));
 assert(!JSON.stringify(r.view(null)).includes('authors'));r.tick();assert.equal(r.view(0).reveal.answer,r.st.q.a.toUpperCase());
});
test('Impostor views keep role, word and ballots private until the result',()=>{
 const r=room('impostor',{rounds:1,clueRounds:1});const impostor=r.st.impostorId;assert.equal(r.view(null).role,null);assert.equal(r.view(null).word,null);
 for(let i=0;i<3;i++){const g=r.view(i);assert.equal(g.role,r.members[i].id===impostor?'impostor':'crew');assert.equal(g.word,r.members[i].id===impostor?null:r.st.word);assert(!('impostorId' in g));}
 for(let i=0;i<3;i++)r.tick();for(let i=0;i<3;i++)r.act(i,{type:'ready'});assert.equal(r.st.phase,'vote');
 r.act(0,{type:'vote',target:'p1'});assert(!('result' in r.view(2)));assert(!('votes' in r.view(2)));r.tick();if(r.st.phase==='guess')r.tick();assert(r.view(0).result.impostorId);
});
test('Golf all 24 holes offer six safe non-overlapping tee positions',()=>{
 const G=GAMES.golf.rules;for(const course of require('../server/games/golfcourses').COURSES)for(const hole of course.holes){
  const points=[];for(let i=0;i<6;i++){const pos=G.startPosition(hole,points);assert(G.onFairway(hole,pos.x,pos.y));assert(points.every(p=>Math.hypot(p.x-pos.x,p.y-pos.y)>=13));points.push(pos);}
 }
});
test('Golf placement validates ownership, bounds, overlap and first-stroke restriction',()=>{
 const r=room('golf',{},3);const p=r.st.players[0],before={x:p.x,y:p.y};
 r.act(0,{type:'place',x:999,y:999});assert.equal(p.x,before.x);
 r.act(0,{type:'place',x:r.st.players[1].x,y:r.st.players[1].y});assert.equal(p.x,before.x);
 r.act(0,{type:'place',x:142,y:220});assert(p.placed);assert.equal(p.x,142);
 r.act(0,{type:'putt',angle:0,power:.3});const after=p.x;r.act(0,{type:'place',x:120,y:220});assert.equal(p.x,after);
});
test('Golf collision paths are deterministic and replay every moving ball',()=>{
 const hole=require('../server/games/golfcourses').BY_ID.meadow.holes[0],G=GAMES.golf.rules;
 const a=G.simulatePutt(hole,110,220,0,.55,[{id:'other',x:300,y:220}]);const b=G.simulatePutt(hole,110,220,0,.55,[{id:'other',x:300,y:220}]);
 assert.deepEqual(a,b);assert(a.collisions>0);assert(a.others[0].x>300);assert(a.anim.paths.other.length===a.anim.frames.length);assert(a.anim.frames.every(f=>f[1]===null||Number.isFinite(f[1])));
});
test('Golf slopes change a deterministic path and the original tour stays at 18 holes',()=>{
 const courses=require('../server/games/golfcourses'),hole=courses.BY_ID.harbor.holes[0],G=GAMES.golf.rules;
 const slope=G.simulatePutt(hole,110,220,0,.5),flat=G.simulatePutt({...hole,slopes:[]},110,220,0,.5);
 assert.notDeepEqual(slope.anim.frames,flat.anim.frames);assert.equal(courses.BY_ID.tour.holes.length,18);
 const resting=G.simulatePutt(hole,110,220,Math.PI,.1,[{id:'resting',x:280,y:220}]);assert(resting.others[0].x>280);
});
test('Go Fish public transitions identify requests without leaking private draws',()=>{
 const r=room('gofish');r.st.players.sort((a,b)=>a.id.localeCompare(b.id));r.st.turn=0;r.st.players[0].hand=[{r:8,s:'S'}];r.st.players[1].hand=[{r:8,s:'H'},{r:2,s:'S'}];r.st.players[2].hand=[{r:3,s:'S'}];r.st.deck=[{r:7,s:'S'}];
 r.act(0,{type:'ask',target:'p1',rank:8});assert.equal(r.view(null).lastMove.received,1);assert.equal(r.view(null).lastMove.askerId,'p0');assert.equal(r.view(null).hand,null);
 r.act(0,{type:'ask',target:'p1',rank:8});const move=r.view(null).lastMove;assert(move.drawn);assert.equal(move.rank,8);assert.equal(move.matched,false);assert(!('card' in move));assert(!JSON.stringify(move).includes('7'));assert.equal(move.sequence,2);
});
test('Configured round counters stay bounded and finish at the selected total',()=>{
 for(const id of ['drawguess','categories','wordscramble','trivia','bluff','impostor','higherlower']){
  const expected=['wordscramble','trivia','higherlower'].includes(id)?5:3;
  const r=room(id,{rounds:expected,questions:expected});const observed=new Set();
  for(let step=0;step<160&&!r.log.result;step++){
   const view=r.view(0),total=view.rounds||view.total;assert(view.round>=1&&view.round<=total, id+' bounded counter');observed.add(view.round);
   if(id==='categories'&&r.st.phase==='answer'){r.st.letter='A';r.st.cats=Array(5).fill('Animal');for(let i=0;i<3;i++)r.act(i,{type:'answers',answers:Array(5).fill('ant'),done:true});}
   if(id==='wordscramble'&&r.st.phase==='play')for(let i=0;i<3;i++)r.act(i,{type:'word',word:r.st.word});
   if(id==='trivia'&&r.st.phase==='ask')for(let i=0;i<3;i++)r.act(i,{type:'answer',choice:0});
   if(id==='higherlower'&&r.st.phase==='guess')for(let i=0;i<3;i++)r.act(i,{type:'guess',dir:'higher'});
   r.tick();
  }
  assert(r.log.result,id+' ends');assert(observed.has(expected),id+' reaches configured final round');assert(!r.log.result.forfeit,id+' completes without forfeit');
 }
});
console.log(`experience41: ${count} checks passed`);
module.exports={room,test};
