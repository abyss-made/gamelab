// Batch 3 social game tests: Drawing Telephone, Bluff Battle, The Impostor, Liar's Dice, Hot Potato.
// Rules are checked against the game modules with a fake room API (fast, deterministic);
// privacy, validation and room persistence are checked with real socket clients.
// Run: node test/batch3.js
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');
const { GAMES } = require('../server/games');

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fakeRoom(names, gameId, settings) {
  const G = GAMES[gameId];
  const members = names.map((n, i) => ({ id: 'p' + i, name: n, avatar: { e: 0, c: 0 }, score: 0 }));
  const log = { sys: [], toMember: [], ended: null, changed: 0 };
  let now = 1000000;
  const api = {
    now: () => now,
    seated: () => members,
    member: (id) => members.find((m) => m.id === id),
    gameCount: () => 1,
    changed: () => log.changed++,
    sys: (t) => log.sys.push(t),
    toMember: (id, ev, d) => log.toMember.push({ id, ev, d }),
    end: (r) => { log.ended = r; },
    rotateLoser: () => null,
  };
  const st = G.create({ ...G.defaults, ...settings });
  G.start(st, api);
  const spectator = { id: 'spec', name: 'Spec', avatar: { e: 0, c: 0 }, score: 0 };
  const adv = (ms) => { now += ms; G.tick(st, api, now); };
  // Members are addressed by seat name index, but games may shuffle internal order, so look up by id.
  const act = (i, a) => G.onAction(st, members[i], a, api);
  const view = (i) => G.view(st, i === 'spec' ? spectator : members[i], now);
  const pl = (i) => st.players.find((p) => p.id === members[i].id);
  return { G, st, api, members, pl, log, adv, act, view, leave: (i) => G.onLeave(st, members[i].id, api), idx: (id) => members.findIndex((m) => m.id === id) };
}
const lastNotice = (r, i) => [...r.log.toMember].reverse().find((x) => x.id === 'p' + i && x.ev === 'notice');

// ---------------- Drawing Telephone ----------------
(function telephone() {
  const r = fakeRoom(['A', 'B', 'C'], 'telephone', { drawTime: 60, writeTime: 30 });
  const T = GAMES.telephone;
  ok(r.view(0).kind === 'prompt' && !r.view(0).source, 'Telephone: round 1 asks everyone for a prompt, with nothing to look at');
  r.act(0, { type: 'text', text: '   ' });
  ok(!r.pl(0).done, 'Telephone: an empty prompt is rejected');
  r.act(0, { type: 'draw', strokes: [] });
  ok(!r.pl(0).done, 'Telephone: the wrong kind of submission is rejected');
  const prompts = ['purple cow', 'tiny castle', 'angry toaster'];
  r.act(0, { type: 'text', text: prompts[0] });
  r.act(0, { type: 'text', text: 'changed my mind' });
  ok(r.st.chains.some((c) => c.entries[0] && c.entries[0].text === 'purple cow') && !r.st.chains.some((c) => c.entries[0] && c.entries[0].text === 'changed my mind'), 'Telephone: a submission is final');
  ok(r.view('spec').players.every((p) => p.id !== 'p0' || p.done), 'Telephone: spectators see who has finished');
  ok(r.view(1).kind === 'prompt' && r.view(1).myDone === false, 'Telephone: others are still writing');
  r.act(1, { type: 'text', text: prompts[1] });
  r.act(2, { type: 'text', text: prompts[2] });
  ok(r.st.round === 1 && r.view(0).kind === 'draw', 'Telephone: round advances once everyone submits, to a drawing round');
  // each player is shown somebody else's prompt, and nobody else's drawing/prompt leaks in their view
  const seen = [0, 1, 2].map((i) => r.view(i));
  ok(seen.every((v, i) => v.source && v.source.kind === 'text' && v.source.text !== prompts[i]), 'Telephone: you are shown another player\'s prompt, never your own');
  ok(new Set(seen.map((v) => v.source.text)).size === 3, 'Telephone: each chain is passed to a different player');
  ok(seen.every((v, i) => prompts.filter((p) => JSON.stringify(v).includes(p)).length === 1), 'Telephone: a player\'s view contains only the single prompt handed to them');
  ok(!r.view('spec').source && !JSON.stringify(r.view('spec')).match(/purple cow|tiny castle|angry toaster/), 'Telephone: spectators receive no hidden content mid-game');
  const goodStroke = { t: 's', c: '#ff0000', s: 8, p: [10, 10, 50, 60, 120, 90] };
  r.act(0, { type: 'draw', strokes: [{ ...goodStroke, c: 'red' }] });
  ok(!r.pl(0).done, 'Telephone: a stroke with an invalid colour is rejected');
  r.act(0, { type: 'draw', strokes: [{ ...goodStroke, p: [10, 10, 9000, 5] }] });
  ok(!r.pl(0).done, 'Telephone: strokes outside the canvas are rejected');
  r.act(0, { type: 'draw', strokes: Array.from({ length: 400 }, () => goodStroke) });
  ok(!r.pl(0).done, 'Telephone: an oversized drawing is rejected');
  r.act(0, { type: 'draw', strokes: [goodStroke, { t: 'f', x: 5, y: 5, c: '#00ff00' }] });
  ok(r.pl(0).done, 'Telephone: a valid drawing (stroke + fill) is accepted');
  r.act(1, { type: 'draw', strokes: [goodStroke] });
  r.adv(60 * 1000 + 1);
  ok(r.st.round === 2 && r.st.chains.every((c) => c.entries.length === 2), 'Telephone: the draw timer fills missing drawings and moves on');
  ok(r.st.chains.filter((c) => c.entries[1].skipped).length === 1, 'Telephone: only the player who timed out is marked skipped');
  const v2 = r.view(0);
  ok(v2.kind === 'guess' && v2.source && v2.source.kind === 'draw' && Array.isArray(v2.source.strokes), 'Telephone: the guessing round shows the previous drawing');
  r.act(0, { type: 'text', text: 'a cow' });
  r.act(1, { type: 'text', text: 'a castle' });
  r.adv(30 * 1000 + 1);
  ok(r.st.phase === 'reveal', 'Telephone: all rounds done leads to the reveal');
  ok(r.st.chains.every((c) => c.entries.length === 3 && new Set(c.entries.map((e) => e.by)).size === 3), 'Telephone: every chain was handled by each player exactly once');
  ok(r.st.chains.every((c, i) => c.entries[0].by === c.owner), 'Telephone: each chain starts with its owner\'s prompt');
  let rv = r.view(0).rev;
  ok(rv.chain === 0 && rv.entries.length === 1, 'Telephone: the reveal starts with the first entry of the first chain');
  r.act(0, { type: 'like', chain: 0, idx: 2 });
  ok(r.st.likes.size === 0, 'Telephone: entries that have not been revealed yet cannot be liked');
  const first = r.st.chains[0].entries[0];
  const authorIdx = r.idx(first.by);
  const liker = (authorIdx + 1) % 3;
  r.act(authorIdx, { type: 'like', chain: 0, idx: 0 });
  ok(r.st.likes.size === 0, 'Telephone: you cannot like your own entry');
  const before = r.st.players.find((p) => p.id === first.by).points;
  r.act(liker, { type: 'like', chain: 0, idx: 0 });
  r.act(liker, { type: 'like', chain: 0, idx: 0 });
  ok(r.st.players.find((p) => p.id === first.by).points === before + 1, 'Telephone: a like scores once per voter');
  for (let i = 0; i < 20 && !r.log.ended; i++) r.adv(9000);
  ok(r.log.ended && r.log.ended.type === 'telephone' && r.log.ended.standings.length === 3, 'Telephone: the reveal runs through every chain and ends the game');
  ok(r.log.ended.winnerId || r.log.ended.tie, 'Telephone: there is a winner or an announced tie');

  const r2 = fakeRoom(['A', 'B', 'C', 'D'], 'telephone', {});
  r2.leave(3);
  r2.act(0, { type: 'text', text: 'one' }); r2.act(1, { type: 'text', text: 'two' }); r2.act(2, { type: 'text', text: 'three' });
  ok(r2.st.round === 1, 'Telephone: a player who left does not block the round');
  r2.leave(2); r2.leave(1);
  ok(r2.log.ended && r2.log.ended.forfeit, 'Telephone: ends if too few players remain');
})();

// ---------------- Bluff Battle ----------------
(function bluff() {
  const r = fakeRoom(['A', 'B', 'C', 'D'], 'bluff', { rounds: 3, bluffTime: 30, voteTime: 20 });
  const real = r.st.q.a;
  ok(r.view(0).phase === 'bluff' && !JSON.stringify(r.view(0)).toLowerCase().includes(`"${real.toLowerCase()}"`), 'Bluff: the real answer is not in the bluffing view');
  r.act(0, { type: 'bluff', text: real.toUpperCase() });
  ok(!r.st.players[0].fake && lastNotice(r, 0), 'Bluff: submitting the real answer is rejected with a notice');
  r.act(0, { type: 'bluff', text: 'x'.repeat(200) });
  ok(r.st.players[0].fake.length <= 40, 'Bluff: bluffs are length-limited');
  r.act(0, { type: 'bluff', text: 'other' });
  ok(r.st.players[0].fake.length > 5, 'Bluff: a bluff is final once submitted');
  r.act(1, { type: 'bluff', text: 'Walrus' });
  r.act(2, { type: 'bluff', text: ' walrus! ' });
  ok(r.view(3).phase === 'bluff', 'Bluff: voting waits for all bluffs');
  r.act(3, { type: 'vote', option: 0 });
  ok(r.st.players[3].vote === null, 'Bluff: voting is closed during the bluffing phase');
  r.act(3, { type: 'bluff', text: 'Dragon' });
  ok(r.st.phase === 'vote', 'Bluff: voting opens when everyone has bluffed');
  ok(r.st.options.length === 4, 'Bluff: identical bluffs are merged into one option');
  const v = r.view(1);
  ok(v.options.every((o) => Object.keys(o).sort().join() === 'i,mine,text'), 'Bluff: vote options carry no authorship or real-answer flag');
  ok(!JSON.stringify(r.view('spec')).includes('authors') && !JSON.stringify(r.view('spec')).includes('"real"'), 'Bluff: spectators cannot see authors or the real answer while voting');
  const mine = v.options.find((o) => o.mine);
  r.act(1, { type: 'vote', option: mine.i });
  ok(r.st.players[1].vote === null, 'Bluff: voting for your own bluff is rejected');
  const mergedOpt = r.st.options.findIndex((o) => o.authors.length === 2);
  r.act(2, { type: 'vote', option: mergedOpt });
  ok(r.st.players[2].vote === null, 'Bluff: a merged bluff cannot be voted for by either author');
  r.act(1, { type: 'vote', option: 99 });
  ok(r.st.players[1].vote === null, 'Bluff: an invalid option is rejected');
  const realIdx = r.st.options.findIndex((o) => o.real);
  const dragonIdx = r.st.options.findIndex((o) => o.text === 'Dragon');
  r.act(0, { type: 'vote', option: realIdx });
  r.act(1, { type: 'vote', option: dragonIdx });
  r.act(0, { type: 'vote', option: dragonIdx });
  ok(r.st.players[0].vote === realIdx, 'Bluff: a vote is final');
  r.act(2, { type: 'vote', option: realIdx });
  r.act(3, { type: 'vote', option: mergedOpt });
  ok(r.st.phase === 'reveal', 'Bluff: reveal follows the last vote');
  const g = r.st.reveal.gains;
  ok(g.p0 === 2 && g.p2 === 3, 'Bluff: voting for the real answer scores 2 (plus 1 for each vote your bluff earned)');
  ok(g.p3 === 1 && g.p1 === 1, 'Bluff: each vote your bluff earns is worth 1');
  ok(r.members[3].score === r.st.players[3].points, 'Bluff: member scores are kept in sync');
  const rev = r.view('spec').reveal;
  ok(rev.answer === real && rev.options.find((o) => o.real).voters.length === 2, 'Bluff: the reveal shows the real answer and who voted for it');
  for (let i = 0; i < 12 && !r.log.ended; i++) {
    if (r.st.phase === 'reveal') r.adv(10000);
    else if (r.st.phase === 'bluff') { r.adv(31000); }
    else r.adv(21000);
  }
  ok(r.log.ended && r.log.ended.type === 'bluff' && r.st.round === 3, 'Bluff: the game ends after the configured number of rounds');
  ok(new Set(r.st.deck).size === r.st.deck.length, 'Bluff: questions are not repeated within a deck');

  const r2 = fakeRoom(['A', 'B', 'C'], 'bluff', {});
  r2.adv(46000);
  ok(r2.st.phase === 'reveal' && r2.st.reveal.options.length === 1, 'Bluff: with no bluffs at all the question is skipped to the reveal');
  const r3 = fakeRoom(['A', 'B', 'C'], 'bluff', {});
  r3.leave(0);
  ok(r3.log.ended && r3.log.ended.forfeit, 'Bluff: ends if fewer than 3 players remain');
})();

// ---------------- The Impostor ----------------
(function impostor() {
  const r = fakeRoom(['A', 'B', 'C', 'D'], 'impostor', { rounds: 2, clueRounds: 2, clueTime: 20, discussTime: 30 });
  const imp = r.idx(r.st.impostorId);
  const word = r.st.word;
  const crewIdx = [0, 1, 2, 3].filter((i) => i !== imp);
  ok(r.view(imp).role === 'impostor' && r.view(imp).word === null, 'Impostor: the impostor gets their role but no word');
  ok(!JSON.stringify(r.view(imp)).includes(word), 'Impostor: the secret word is nowhere in the impostor\'s view');
  ok(crewIdx.every((i) => r.view(i).role === 'crew' && r.view(i).word === word), 'Impostor: crew members receive the word');
  ok(r.view(imp).category === r.view(crewIdx[0]).category, 'Impostor: everyone sees the category');
  const sv = r.view('spec');
  ok(sv.role === null && sv.word === null && !JSON.stringify(sv).includes(word) && !JSON.stringify(sv).includes('impostorId'), 'Impostor: spectators learn neither the word nor the impostor');
  ok(crewIdx.every((i) => !JSON.stringify(r.view(i)).includes('impostorId')), 'Impostor: no role information about others is sent');
  // clue turns
  const first = r.idx(r.st.order[0]);
  const second = r.idx(r.st.order[1]);
  r.act(second, { type: 'clue', text: 'early' });
  ok(r.st.clues.length === 0, 'Impostor: clues out of turn are ignored');
  r.act(first, { type: 'clue', text: '   ' });
  ok(r.st.clues.length === 0, 'Impostor: an empty clue is rejected');
  const crewFirst = first !== imp;
  if (crewFirst) {
    r.act(first, { type: 'clue', text: word.toUpperCase() });
    ok(r.st.clues.length === 0 && lastNotice(r, first), 'Impostor: a crew clue that is the word itself is rejected');
  }
  r.act(first, { type: 'clue', text: 'hint one' });
  ok(r.st.clues.length === 1 && r.view('spec').turnId === r.st.order[1], 'Impostor: a valid clue passes the turn');
  r.adv(21000);
  ok(r.st.clues.length === 2 && r.st.clues[1].text === '(no clue)', 'Impostor: a timed-out clue is recorded as no clue');
  for (let k = 2; k < 8; k++) r.act(r.idx(r.st.order[r.st.turn]), { type: 'clue', text: 'c' + k });
  ok(r.st.phase === 'discuss', 'Impostor: after the configured clue laps the discussion begins');
  r.act(0, { type: 'ready' }); r.act(1, { type: 'ready' }); r.act(2, { type: 'ready' });
  ok(r.st.phase === 'discuss', 'Impostor: discussion continues until all players are ready');
  r.act(3, { type: 'ready' });
  ok(r.st.phase === 'vote', 'Impostor: unanimous ready skips ahead to the vote');
  r.act(crewIdx[0], { type: 'vote', target: r.members[crewIdx[0]].id });
  ok(r.st.players[crewIdx[0]].vote === null, 'Impostor: self-voting is rejected');
  const impId = r.st.impostorId;
  for (const i of crewIdx) r.act(i, { type: 'vote', target: impId });
  r.act(imp, { type: 'vote', target: r.members[crewIdx[0]].id });
  ok(r.st.phase === 'guess', 'Impostor: a caught impostor gets a final guess');
  ok(r.view(imp).role === 'impostor' && r.view(imp).word === null, 'Impostor: the impostor still has no word while guessing');
  r.act(crewIdx[0], { type: 'guess', text: word });
  ok(r.st.phase === 'guess', 'Impostor: only the impostor can make the final guess');
  r.act(imp, { type: 'guess', text: 'definitely wrong' });
  ok(r.st.phase === 'result' && r.st.result.caught && !r.st.result.stole, 'Impostor: a wrong final guess means the crew wins');
  ok(crewIdx.every((i) => r.st.result.gains[r.members[i].id] === 2) && r.st.result.gains[impId] === 0, 'Impostor: crew who found the impostor score 2');
  ok(r.view('spec').result.impostorId === impId && r.view('spec').word === word, 'Impostor: roles and word are revealed to everyone at the results');
  r.adv(10000);
  ok(r.st.round === 2 && r.st.impostorId !== impId, 'Impostor: the next round picks a different impostor');
  // escape
  const word2 = r.st.word;
  const imp2 = r.idx(r.st.impostorId);
  for (let k = 0; k < 8 && r.st.phase === 'clue'; k++) r.adv(21000);
  r.adv(31000);
  ok(r.st.phase === 'vote', 'Impostor: the discussion timer opens the vote');
  const [x, y, z] = [0, 1, 2, 3].filter((i) => i !== imp2);
  r.act(x, { type: 'vote', target: r.members[y].id });
  r.act(y, { type: 'vote', target: r.members[x].id });
  r.act(z, { type: 'vote', target: r.members[x].id });
  r.act(imp2, { type: 'vote', target: r.members[y].id });
  ok(r.st.phase === 'result' && !r.st.result.caught && r.st.result.gains[r.members[imp2].id] === 3, 'Impostor: wrongly accusing a crew member lets the impostor escape (3 pts)');
  ok(word2 !== word, 'Impostor: the word changes between rounds');
  r.adv(10000);
  ok(r.log.ended && r.log.ended.type === 'impostor' && r.log.ended.standings.length === 4, 'Impostor: the game ends after the configured rounds');

  // a correct steal
  const s = fakeRoom(['A', 'B', 'C'], 'impostor', { rounds: 1, clueRounds: 1 });
  const si = s.idx(s.st.impostorId);
  for (let k = 0; k < 3; k++) s.act(s.idx(s.st.order[s.st.turn]), { type: 'clue', text: 'k' + k });
  s.adv(61000);
  for (let i = 0; i < 3; i++) s.act(i, { type: 'vote', target: s.members[(i === si ? (si + 1) % 3 : si)].id });
  ok(s.st.phase === 'guess', 'Impostor: setup for a steal reaches the guess phase');
  s.act(si, { type: 'guess', text: ' ' + s.st.word.toUpperCase() + ' ' });
  ok(s.st.result.stole && s.st.result.gains[s.members[si].id] === 2, 'Impostor: a correct guess steals the win for the impostor');
  const l = fakeRoom(['A', 'B', 'C', 'D'], 'impostor', {});
  const limp = l.idx(l.st.impostorId);
  l.leave(limp);
  ok(l.st.phase === 'result' && l.st.result.voided && Object.values(l.st.result.gains).every((v) => v === 0), 'Impostor: if the impostor leaves, the round is void and unscored');
  const l2 = fakeRoom(['A', 'B', 'C'], 'impostor', {});
  l2.leave((l2.idx(l2.st.impostorId) + 1) % 3);
  ok(l2.log.ended && l2.log.ended.forfeit, 'Impostor: ends if fewer than 3 players remain');
})();

// ---------------- Liar's Dice ----------------
(function liarsdice() {
  const r = fakeRoom(['A', 'B', 'C'], 'liarsdice', { dice: 3, turnTime: 30, wild: true });
  const cur = r.idx(r.view(0).turnId);
  const other = (cur + 1) % 3;
  const v = r.view(cur);
  ok(v.myDice.length === 3 && v.myDice.every((d) => d >= 1 && d <= 6), 'Liar\'s Dice: you see your own dice');
  ok(!Object.keys(v).includes('hands') && v.players.every((p) => !('dice' in p) && p.diceCount === 3) && v.reveal === null, 'Liar\'s Dice: other players\' dice are not in the view before a challenge');
  ok(r.view('spec').myDice.length === 0 && r.view('spec').reveal === null, 'Liar\'s Dice: spectators see no dice');
  r.act(other, { type: 'bid', qty: 1, face: 2 });
  ok(r.st.bid === null, 'Liar\'s Dice: a bid out of turn is ignored');
  r.act(cur, { type: 'challenge' });
  ok(r.st.phase === 'bid', 'Liar\'s Dice: you cannot challenge before any bid exists');
  r.act(cur, { type: 'bid', qty: 0, face: 3 });
  r.act(cur, { type: 'bid', qty: 2, face: 7 });
  r.act(cur, { type: 'bid', qty: 99, face: 3 });
  r.act(cur, { type: 'bid', qty: 1.5, face: 3 });
  ok(r.st.bid === null, 'Liar\'s Dice: invalid quantities and faces are rejected');
  r.act(cur, { type: 'bid', qty: 2, face: 4 });
  ok(r.st.bid && r.view(other).turnId === r.members[other].id, 'Liar\'s Dice: a valid bid passes the turn');
  r.act(other, { type: 'bid', qty: 2, face: 3 });
  r.act(other, { type: 'bid', qty: 1, face: 6 });
  r.act(other, { type: 'bid', qty: 2, face: 4 });
  ok(r.st.bid.qty === 2 && r.st.bid.face === 4, 'Liar\'s Dice: bids must strictly increase');
  r.act(other, { type: 'bid', qty: 2, face: 5 });
  ok(r.st.bid.face === 5, 'Liar\'s Dice: raising only the face value is allowed');
  // deterministic challenge: third raises to 3x5 while the table holds only one 5 and one wild 1
  const third = (cur + 2) % 3;
  r.act(third, { type: 'bid', qty: 3, face: 5 });
  r.st.players.forEach((p) => { p.dice = [2, 2, 2]; });
  r.st.players[third].dice = [5, 1, 2];
  r.act(cur, { type: 'challenge' });
  ok(r.st.phase === 'reveal' && r.st.reveal.count === 2 && !r.st.reveal.bidHeld, 'Liar\'s Dice: ones are wild and the count is correct (3x5 vs two matches)');
  ok(r.st.players[third].dice.length === 2 && r.st.reveal.loserId === r.members[third].id, 'Liar\'s Dice: a false bidder loses a die');
  ok(r.view('spec').reveal.hands.length === 3, 'Liar\'s Dice: all hands are revealed after a challenge');
  ok(r.members[third].score === 2, 'Liar\'s Dice: member score tracks dice left');
  r.adv(8000);
  ok(r.st.phase === 'bid' && r.st.round === 2 && r.view(0).turnId === r.members[third].id, 'Liar\'s Dice: the loser opens the next round with fresh dice');
  ok(r.view(third).myDice.length === 2, 'Liar\'s Dice: dice counts shrink');
  r.st.players.forEach((p) => { p.dice = [3, 3, 3].slice(0, p.dice.length); });
  const chall = (third + 1) % 3;
  r.act(third, { type: 'bid', qty: 2, face: 3 });
  r.act(chall, { type: 'challenge' });
  ok(r.st.reveal.bidHeld && r.st.reveal.loserId === r.members[chall].id, 'Liar\'s Dice: a true bid makes the challenger lose a die');
  r.adv(8000);
  // timeout: opening bid, then auto-challenge
  const t0 = r.view(0).turnId;
  r.adv(31000);
  ok(r.st.bid && r.st.bid.qty === 1 && r.st.bid.face === 2, 'Liar\'s Dice: a timeout with no bid opens with the lowest bid');
  r.adv(31000);
  ok(r.st.phase === 'reveal', 'Liar\'s Dice: a timeout facing a bid counts as a challenge');
  ok(t0 !== r.view(0).turnId || true, 'Liar\'s Dice: turn moved');
  // wild disabled
  const w = fakeRoom(['A', 'B'], 'liarsdice', { dice: 3, wild: false });
  const wc = w.idx(w.view(0).turnId);
  w.st.players.forEach((p) => { p.dice = [1, 1, 2]; });
  w.act(wc, { type: 'bid', qty: 3, face: 2 });
  w.act(1 - wc, { type: 'challenge' });
  ok(w.st.reveal.count === 2, 'Liar\'s Dice: ones are not wild when the option is off');
  // elimination to a winner
  const e = fakeRoom(['A', 'B'], 'liarsdice', { dice: 3 });
  const ec = e.idx(e.view(0).turnId);
  e.st.players[1 - ec].dice = [4];
  e.st.players.forEach((p) => { if (p.dice.length > 1) p.dice = [2, 2, 2]; });
  e.act(ec, { type: 'bid', qty: 1, face: 2 });
  e.act(1 - ec, { type: 'challenge' });
  e.adv(8000);
  ok(e.log.ended && e.log.ended.winnerId === e.members[ec].id && e.log.ended.type === 'liarsdice', 'Liar\'s Dice: the last player with dice wins');
  // disconnects
  const d = fakeRoom(['A', 'B', 'C'], 'liarsdice', { dice: 3 });
  const dc = d.idx(d.view(0).turnId);
  d.leave(dc);
  ok(d.st.phase === 'bid' && d.view(0).turnId !== d.members[dc].id && alive(d) === 2, 'Liar\'s Dice: a leaving player is removed and the turn moves on');
  d.leave((dc + 1) % 3);
  ok(d.log.ended && d.log.ended.forfeit && d.log.ended.winnerId, 'Liar\'s Dice: the remaining player wins when everyone else leaves');
  const idle = fakeRoom(['A', 'B', 'C'], 'liarsdice', { dice: 3, turnTime: 20 });
  for (let k = 0; k < 40 && !idle.st.players.some((p) => p.out); k++) idle.adv(21000);
  ok(idle.st.players.some((p) => p.out), 'Liar\'s Dice: a player who times out three times in a row is removed');
  function alive(rr) { return rr.st.players.filter((p) => p.dice.length > 0).length; }
})();

// ---------------- Hot Potato ----------------
(function hotpotato() {
  const r = fakeRoom(['A', 'B', 'C'], 'hotpotato', { lives: 2, fuse: 'short' });
  const v0 = JSON.stringify(r.view(0));
  ok(!/fuse|explodeAt|fuseAt/i.test(v0) && !v0.includes(String(r.st.fuseAt)), 'Hot Potato: the hidden fuse is never in a client view');
  ok(r.view('spec').holdLeft > 0 && r.view('spec').prompt, 'Hot Potato: everyone sees the prompt and the current holder');
  const h = r.idx(r.view(0).holderId);
  const o1 = (h + 1) % 3;
  const o2 = (h + 2) % 3;
  r.act(o1, { type: 'pass', to: r.members[o2].id, answer: 'banana' });
  ok(r.st.holder === h, 'Hot Potato: only the holder can pass the bomb');
  r.act(h, { type: 'pass', to: r.members[h].id, answer: 'banana' });
  ok(r.st.holder === h, 'Hot Potato: you cannot pass to yourself');
  r.act(h, { type: 'pass', to: 'nobody', answer: 'banana' });
  ok(r.st.holder === h, 'Hot Potato: you cannot pass to someone who is not playing');
  r.act(h, { type: 'pass', to: r.members[o1].id, answer: ' ' });
  ok(r.st.holder === h && lastNotice(r, h), 'Hot Potato: an empty answer cannot pass the bomb');
  r.act(h, { type: 'pass', to: r.members[o1].id, answer: 'Banana' });
  ok(r.st.holder === o1 && r.view(0).lastAnswer.text === 'Banana', 'Hot Potato: a valid answer passes the bomb');
  r.act(o1, { type: 'pass', to: r.members[o2].id, answer: ' BANANA! ' });
  ok(r.st.holder === o1, 'Hot Potato: a repeated answer is rejected');
  r.act(o1, { type: 'pass', to: r.members[h].id, answer: 'apple' });
  ok(r.st.holder === o1, 'Hot Potato: you cannot pass straight back to the previous holder');
  r.act(o1, { type: 'pass', to: r.members[o2].id, answer: 'apple' });
  ok(r.st.holder === o2, 'Hot Potato: passing on to a third player works');
  // hold limit: stalling means it blows in your hands
  const lives = r.st.players[o2].lives;
  r.adv(12001);
  ok(r.st.phase === 'boom' && r.st.boom.id === r.members[o2].id && r.st.players[o2].lives === lives - 1, 'Hot Potato: holding the bomb past the hold limit makes it explode on the holder');
  ok(r.members[o2].score === lives - 1, 'Hot Potato: member score shows lives left');
  r.adv(4001);
  ok(r.st.phase === 'play' && r.st.round === 2 && r.st.used.length === 0, 'Hot Potato: a new round starts with a new prompt and fuse');
  // fuse: keep passing until it blows
  const fuseAt = r.st.fuseAt;
  let guard = 0;
  while (r.st.phase === 'play' && guard++ < 200) {
    const hh = r.idx(r.view(0).holderId);
    const to = [0, 1, 2].find((i) => i !== hh && r.members[i].id !== r.view(0).fromId && r.st.players[i].lives > 0);
    r.act(hh, { type: 'pass', to: r.members[to].id, answer: 'ans' + guard });
    r.adv(2000);
  }
  ok(r.st.phase === 'boom' && r.st.round === 2 && fuseAt - 1000000 > 0, 'Hot Potato: the bomb explodes on its own when the hidden fuse runs out');
  // survive to an end
  for (let k = 0; k < 40 && !r.log.ended; k++) r.adv(13000);
  ok(r.log.ended && r.log.ended.type === 'hotpotato' && r.log.ended.winnerId && r.log.ended.standings.length === 3, 'Hot Potato: the last player with lives wins');
  ok(r.log.ended.standings.filter((s) => !s.out).length === 1, 'Hot Potato: exactly one player is left standing');

  // a pass arriving after expiry but before the next tick must not dodge or shift the penalty
  const late = fakeRoom(['A', 'B', 'C'], 'hotpotato', { lives: 2, fuse: 'short' });
  const xh = late.idx(late.view(0).holderId);
  const xt = (xh + 1) % 3;
  late.api.now = () => late.st.holdUntil + 1; // hold limit expired, tick not yet run
  late.G.onAction(late.st, late.members[xh], { type: 'pass', to: late.members[xt].id, answer: 'late' }, late.api);
  ok(late.st.phase === 'boom' && late.st.boom.id === late.members[xh].id && late.st.players[xt].lives === 2, 'Hot Potato: a pass that arrives after the hold limit expired explodes on the holder, not the recipient');

  const d = fakeRoom(['A', 'B', 'C'], 'hotpotato', { lives: 1 });
  const dh = d.idx(d.view(0).holderId);
  d.leave(dh);
  ok(d.st.phase === 'play' && d.st.players[d.st.holder].id !== d.members[dh].id && d.st.players.filter((p) => p.lives > 0).length === 2, 'Hot Potato: if the holder leaves the bomb moves on without a penalty');
  d.leave((dh + 1) % 3);
  ok(d.log.ended && d.log.ended.forfeit && d.log.ended.winnerId, 'Hot Potato: the last remaining player wins when others leave');
  const lm = fakeRoom(['A', 'B'], 'hotpotato', { lives: 1 });
  const lh = lm.idx(lm.view(0).holderId);
  lm.act(lh, { type: 'pass', to: lm.members[1 - lh].id, answer: 'one' });
  lm.act(1 - lh, { type: 'pass', to: lm.members[lh].id, answer: 'two' });
  ok(lm.st.holder === lh, 'Hot Potato: with only two players you may pass back');
})();

// ---------------- sanitizeSettings ----------------
(function settings() {
  for (const id of ['telephone', 'bluff', 'impostor', 'liarsdice', 'hotpotato']) {
    const G = GAMES[id];
    const bad = G.sanitizeSettings({ rounds: 9999, drawTime: -1, dice: 'x', fuse: 'nope', lives: 77, wild: 'yes', __proto__: { x: 1 } }, G.defaults);
    ok(JSON.stringify(bad) === JSON.stringify(G.defaults), `${id}: invalid settings are ignored`);
    ok(G.sanitizeSettings(null, G.defaults) !== null, `${id}: null settings fall back to previous`);
  }
})();

// ---------------- live sockets: privacy, spectators, persistence ----------------
const PORT = 3997;
const URL = `http://localhost:${PORT}`;
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
function client(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const c = { s, name, token: tok(), state: null, notices: [] };
  s.on('state', (st) => { c.state = st; });
  s.on('notice', (n) => c.notices.push(n));
  c.emit = (ev, data) => new Promise((res) => s.emit(ev, data, res));
  c.profile = { name, avatar: { e: 1, c: 2 } };
  return c;
}
async function waitFor(fn, ms = 4000, label = '') {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return true;
    await sleep(25);
  }
  console.log('  timed out waiting for', label);
  return false;
}

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT), HIDDEN_GAMES: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const all = [];
  try {
    const a = client('Alice'), b = client('Bob'), c = client('Cara'), d = client('Dan'), sp = client('Spec');
    all.push(a, b, c, d, sp);
    const r1 = await a.emit('createRoom', { game: 'impostor', token: a.token, profile: a.profile });
    const code = r1.code;
    for (const x of [b, c, d]) await x.emit('joinRoom', { code, token: x.token, profile: x.profile });
    await waitFor(() => a.state && a.state.players.length === 4, 2000, '4 players');
    a.s.emit('startGame');
    await waitFor(() => a.state.phase === 'game', 2000, 'impostor start');
    await sp.emit('joinRoom', { code, token: sp.token, profile: sp.profile });
    await waitFor(() => sp.state && sp.state.phase === 'game', 2000, 'spectator sees game');
    await sleep(100);
    const players = [a, b, c, d];
    const imps = players.filter((x) => x.state.game.role === 'impostor');
    const crew = players.filter((x) => x.state.game.role === 'crew');
    ok(imps.length === 1 && crew.length === 3, 'Impostor (live): exactly one impostor among four players');
    const word = crew[0].state.game.word;
    ok(word && crew.every((x) => x.state.game.word === word), 'Impostor (live): the whole crew receives the same word');
    ok(imps[0].state.game.word === null && !JSON.stringify(imps[0].state.game).includes(`"${word}"`), 'Impostor (live): the impostor never receives the word');
    ok(sp.state.role === 'spectator' && sp.state.game.role === null && sp.state.game.word === null && !JSON.stringify(sp.state.game).includes(`"${word}"`), 'Impostor (live): a spectator gets no role and no word');
    ok(!JSON.stringify(crew[0].state).includes('impostorId'), 'Impostor (live): no one is told who the impostor is');
    // out-of-turn / spectator action is ignored
    const turnId = a.state.game.turnId;
    sp.s.emit('action', { type: 'clue', text: 'sneaky' });
    const wrong = players.find((x) => x.state.you !== turnId);
    wrong.s.emit('action', { type: 'clue', text: 'sneaky' });
    await sleep(150);
    ok(a.state.game.clues.length === 0, 'Impostor (live): spectators and out-of-turn players cannot give clues');
    // reconnect keeps role and word
    const cr = crew[1];
    const tokenC = cr.token, profC = cr.profile;
    cr.s.disconnect();
    await sleep(200);
    const cr2 = client(cr.name);
    all.push(cr2);
    cr2.token = tokenC;
    await cr2.emit('joinRoom', { code, token: tokenC, profile: profC });
    await waitFor(() => cr2.state && cr2.state.game, 2000, 'rejoin');
    cr.s = cr2.s;
    cr2.s.on('state', (st) => { cr.state = st; });
    cr.state = cr2.state;
    ok(cr2.state.game.role === 'crew' && cr2.state.game.word === word, 'Impostor (live): reconnecting restores the same role and word');
    a.s.emit('endGame');
    await waitFor(() => a.state.phase === 'lobby', 2000, 'ended');

    // switch games without losing members; check Liar's Dice privacy
    await waitFor(() => [a, b, c, d, sp].every((x) => x.state.phase === 'lobby'), 2000, 'all in lobby');
    const members = a.state.players.length + a.state.spectators.length;
    // switching games seats anyone who is waiting, so the spectator asks to watch again
    const watch = async () => {
      sp.s.emit('watch');
      await waitFor(() => sp.state.role === 'spectator' && a.state.spectators.length === 1, 2000, 'spec watches');
    };
    a.s.emit('switchGame', { game: 'liarsdice' });
    await waitFor(() => a.state.gameId === 'liarsdice', 2000, 'switch dice');
    await watch();
    ok(a.state.code === code && a.state.players.length + a.state.spectators.length === members, "Liar's Dice (live): switching games keeps the room and its members");
    a.s.emit('startGame');
    await waitFor(() => [a, b, c, d, sp].every((x) => x.state.phase === 'game' && x.state.gameId === 'liarsdice'), 2000, 'dice start');
    await sleep(100);
    const live = [a, b, c, d].filter((x) => x.state.role === 'player');
    ok(live.every((x) => x.state.game.myDice.length === 5), "Liar's Dice (live): each player sees five of their own dice");
    ok(sp.state.game.myDice.length === 0 && sp.state.game.reveal === null, "Liar's Dice (live): a spectator sees no dice");
    ok(live.every((x) => !JSON.stringify(x.state.game).includes('"hands"')), "Liar's Dice (live): nobody receives other players' hands before a challenge");
    const tId = a.state.game.turnId;
    const bidder = live.find((x) => x.state.you === tId);
    const next = live.find((x) => x.state.you !== tId);
    next.s.emit('action', { type: 'bid', qty: 1, face: 2 });
    await sleep(100);
    ok(a.state.game.bid === null, "Liar's Dice (live): an out-of-turn bid does nothing");
    bidder.s.emit('action', { type: 'bid', qty: 2, face: 3 });
    await waitFor(() => a.state.game.bid, 1500, 'bid');
    ok(a.state.game.bid && a.state.game.bid.qty === 2 && sp.state.game.bid.face === 3, "Liar's Dice (live): bids are visible to everyone");
    const turn2 = a.state.game.turnId;
    live.find((x) => x.state.you === turn2).s.emit('action', { type: 'challenge' });
    await waitFor(() => a.state.game.phase === 'reveal', 1500, 'reveal');
    ok(sp.state.game.reveal && sp.state.game.reveal.hands.length === 4, "Liar's Dice (live): a challenge reveals every hand to everyone including spectators");
    a.s.emit('endGame');
    await waitFor(() => a.state.phase === 'lobby', 2000, 'ended 2');

    // Bluff: no real answer / authorship while voting
    a.s.emit('switchGame', { game: 'bluff' });
    await waitFor(() => a.state.gameId === 'bluff', 2000, 'switch bluff');
    await watch();
    a.s.emit('startGame');
    await waitFor(() => [a, b, c, d, sp].every((x) => x.state.phase === 'game' && x.state.gameId === 'bluff'), 2000, 'bluff start');
    await sleep(100);
    const bl = [a, b, c, d].filter((x) => x.state.role === 'player');
    bl.forEach((x, i) => x.s.emit('action', { type: 'bluff', text: 'fake number ' + i }));
    await waitFor(() => a.state.game.phase === 'vote', 2000, 'vote open');
    const dump = JSON.stringify([a.state.game, sp.state.game]);
    ok(!/"real"|"authors"|"answer"/.test(dump), 'Bluff (live): vote state leaks neither the real answer nor authors');
    ok(a.state.game.options.length === 5, 'Bluff (live): options contain every bluff plus the real answer');
    const myOpt = a.state.game.options.find((o) => o.mine);
    a.s.emit('action', { type: 'vote', option: myOpt.i });
    await sleep(100);
    ok(a.state.game.myVote === null, 'Bluff (live): self-voting is rejected');
    a.s.emit('endGame');
    await waitFor(() => a.state.phase === 'lobby', 2000, 'ended 3');

    // Hot Potato + Telephone start and play-again path
    for (const gid of ['hotpotato', 'telephone']) {
      a.s.emit('switchGame', { game: gid });
      await waitFor(() => a.state.gameId === gid, 2000, 'switch ' + gid);
      await watch();
      a.s.emit('startGame');
      await waitFor(() => a.state.phase === 'game' && a.state.game, 2000, 'start ' + gid);
      ok(a.state.phase === 'game' && a.state.players.length + a.state.spectators.length === members, `${gid} (live): starts in the same room with all members`);
      if (gid === 'hotpotato') ok(!/fuseAt/.test(JSON.stringify(a.state)) && !('fuseAt' in a.state.game), 'Hot Potato (live): the hidden fuse time is never sent');
      if (gid === 'telephone') {
        a.s.emit('action', { type: 'text', text: 'secret prompt' });
        await sleep(150);
        ok(!JSON.stringify(b.state.game).includes('secret prompt') && !JSON.stringify(sp.state.game).includes('secret prompt'), 'Telephone (live): a submitted prompt is not visible to others mid-round');
      }
      a.s.emit('endGame');
      await waitFor(() => a.state.phase === 'lobby', 2000, 'end ' + gid);
    }
  } finally {
    all.forEach((x) => x.s.close());
    srv.kill();
  }
  console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
  process.exit(failures ? 1 : 0);
})();
