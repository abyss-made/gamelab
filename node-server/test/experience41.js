// Issue #70 game contracts: no sockets/architecture changes are needed for these deterministic cases.
const assert = require('assert/strict');
const { GAMES } = require('../server/games');
const categories = require('../server/games/categories');
let count=0;
function test(name, fn) { fn(); count++; console.log('PASS '+name); }
function room(game, settings={}, size=3) {
 const G=GAMES[game];const members=Array.from({length:size},(_,i)=>({id:'p'+i,name:'Player '+i,avatar:{e:i,c:i},score:0}));let now=1000000;
 const log={notices:[],result:null};const api={now:()=>now,seated:()=>members,member:id=>members.find(m=>m.id===id),gameCount:()=>1,sys(){},changed(){},toMember:(id,ev,text)=>log.notices.push({id,ev,text}),end:r=>log.result=r,rotateLoser:()=>null};
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
 assert.equal(categories.normalize('James','Boy name'),'james');assert.equal(categories.normalize('USA','Country'),categories.normalize('United States','Country'));
 assert.equal(categories.normalize('The Children'),categories.normalize('child'));assert.equal(categories.normalize('Berries'),'berry');
});
test('Categories review retains server invalid reasons and private submissions',()=>{
 const r=room('categories');r.st.letter='A';r.st.cats=Array(5).fill('Animal');r.act(0,{type:'answers',answers:['axqzzl'],done:true});
 assert(!JSON.stringify(r.view(1)).includes('axqzzl'));r.act(1,{type:'done'});r.act(2,{type:'done'});
 assert.equal(r.st.review.rows[0].cells[0].points,0);assert.match(r.st.review.rows[0].cells[0].reason,/word list/);
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
console.log(`experience41: ${count} checks passed`);
module.exports={room,test};
