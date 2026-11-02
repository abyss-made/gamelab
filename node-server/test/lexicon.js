// Lexicon + word-game validation tests (fake room API, deterministic).
// Run: node test/lexicon.js
const { GAMES } = require('../server/games');
const lexicon = require('../server/lexicon');

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};

function fakeRoom(names, gameId, settings) {
  const G = GAMES[gameId];
  const members = names.map((n, i) => ({ id: 'p' + i, name: n, avatar: { e: 0, c: 0 }, score: 0 }));
  const log = { sys: [], toMember: [], ended: null };
  let now = 1000000;
  const api = {
    now: () => now, seated: () => members, member: (id) => members.find((m) => m.id === id), gameCount: () => 1,
    changed() {}, sys: (t) => log.sys.push(t), toMember: (id, ev, d) => log.toMember.push({ id, ev, d }),
    end: (r) => { log.ended = r; }, rotateLoser: () => null,
  };
  const st = G.create({ ...G.defaults, ...settings });
  G.start(st, api);
  return { G, st, members, log, act: (i, a) => G.onAction(st, members[i], a, api), adv: (ms) => { now += ms; G.tick(st, api, now); } };
}

// ---- lexicon module ----
ok(lexicon.size() > 100000, `lexicon is broad (${lexicon.size()} words)`);
for (const w of ['dog', 'dogs', 'running', 'ran', 'jumped', 'children', 'color', 'colour', 'zebra', 'xylophones', 'qi', 'syzygy', 'cafe'])
  ok(lexicon.has(w), `lexicon accepts "${w}" (common/inflected/dialect/obscure)`);
for (const w of ['xqzvk', 'asdfgh', '', 'a', 'dog9'])
  ok(!lexicon.has(w), `lexicon rejects "${w}"`);
ok(lexicon.has('  DoGs '), 'lexicon normalizes case and whitespace');
ok(lexicon.has('ＤＯＧＳ'), 'lexicon normalizes full-width Unicode');
ok(lexicon.has('Café'), 'lexicon strips combining accents');
ok(lexicon.has('do​g'), 'lexicon strips zero-width characters');
ok(!lexicon.has(null) && !lexicon.has({}) && !lexicon.has(12), 'lexicon ignores non-strings');
ok(!lexicon.has('nasa') && !lexicon.has('london'), 'proper nouns / abbreviations are not in the lexicon (use lexicon-extra.txt)');

// ---- Word Chain accepts legitimate words outside the curated list ----
(function chain() {
  const wc = require('../server/games/wordchain');
  const r = fakeRoom(['A', 'B'], 'wordchain', { minLen: 3 });
  const cur = () => r.members.findIndex((m) => m.id === r.st.players[r.st.turn].id);
  const L = r.st.letter;
  const obscure = ['zebra', 'xylophones', 'abacus', 'lemurs', 'walruses', 'tortoises', 'sparrows', 'rhinoceros', 'pelicans']
    .find((w) => w[0] === L && lexicon.has(w) && !wc.DICT.has(w));
  const w = obscure || require('fs').readFileSync(__dirname + '/../server/data/lexicon.txt', 'utf8').split('\n').find((x) => x[0] === L && x.length >= 5 && !wc.DICT.has(x));
  ok(!wc.DICT.has(w) && lexicon.has(w), `Word Chain test word "${w}" is outside the curated list`);
  r.act(cur(), { type: 'word', word: ' ' + w.toUpperCase() + ' ' });
  ok(r.st.chain.length === 1 && r.st.chain[0].word === w, 'Word Chain accepts a legitimate non-curated word (case/space normalized)');
  const next = r.st.chain[0].word.slice(-1);
  r.act(cur(), { type: 'word', word: 'xqzvk' + next });
  ok(r.st.chain.length === 1, 'Word Chain still rejects non-words');
  r.act(cur(), { type: 'word', word: w });
  ok(r.st.chain.length === 1, 'Word Chain rejects a repeated word');
  const inflected = require('fs').readFileSync(__dirname + '/../server/data/lexicon.txt', 'utf8').split('\n').find((x) => x[0] === next && x.endsWith('ing') && x.length >= 6);
  r.act(cur(), { type: 'word', word: inflected });
  ok(r.st.chain.length === 2, `Word Chain accepts inflected form "${inflected}"`);
  // Dictionary Off still accepts anything alphabetic
  const r2 = fakeRoom(['A', 'B'], 'wordchain', { dictionary: 'off', minLen: 3 });
  const c2 = r2.members.findIndex((m) => m.id === r2.st.players[r2.st.turn].id);
  r2.act(c2, { type: 'word', word: r2.st.letter + 'qzx' });
  ok(r2.st.chain.length === 1, 'Word Chain dictionary-off mode unchanged');
})();

// ---- Word Scramble: any lexicon anagram scores; letters never already spell an answer ----
(function scramble() {
  const r = fakeRoom(['A', 'B'], 'wordscramble', { difficulty: 'medium' });
  const word = r.st.word;
  ok(!lexicon.has(r.st.letters.join('').toLowerCase()), 'scrambled letters do not already spell a lexicon word');
  r.act(0, { type: 'guess', word: 'zzzzzz' });
  ok(r.st.players[0].solvedAt === 0, 'Word Scramble rejects a wrong guess');
  r.act(0, { type: 'guess', word: ' ' + word.toUpperCase() + '​ ' });
  ok(r.st.players[0].solvedAt > 0, 'Word Scramble accepts the answer with case/whitespace/zero-width noise');
  const v = r.G.view(r.st, r.members[1], 0);
  ok(!JSON.stringify(v).toLowerCase().includes('"' + word + '"'), 'Word Scramble view does not leak the answer mid-round');
  // anagram acceptance for a word outside the curated pool
  const r3 = fakeRoom(['A', 'B'], 'wordscramble', {});
  r3.st.word = 'listen'; r3.st.letters = ['L', 'I', 'S', 'T', 'E', 'N'];
  r3.act(0, { type: 'guess', word: 'silent' });
  ok(r3.st.players[0].solvedAt > 0, 'Word Scramble accepts a valid anagram of the answer');
  r3.act(1, { type: 'guess', word: 'ntsile' });
  ok(r3.st.players[1].solvedAt === 0, 'Word Scramble rejects a non-word rearrangement');
})();

// ---- Categories Rush ----
(function cats() {
  const c = require('../server/games/categories');
  ok(c.normalize('Berries') === 'berry' && c.normalize('Glasses') === 'glass' && c.normalize('The Dogs') === 'dog', 'Categories normalizes plurals/articles via lexicon');
  ok(c.normalize('Éclair') === 'eclair', 'Categories strips accents');
  ok(c.normalize('Cats') === c.normalize('cat') && c.normalize('  CAT  ') === 'cat', 'Categories: duplicate detection ignores case/plural/whitespace');
  ok(!c.validFor('animal', 'A', 'Animal'), 'Categories rejects the category name itself as an answer');
  ok(c.validFor('ant', 'A', 'Animal') && !c.validFor('bat', 'A', 'Animal'), 'Categories enforces the round letter');
  const r = fakeRoom(['A', 'B'], 'categories', { rounds: 3, roundTime: 30 });
  const L = r.st.letter.toLowerCase();
  r.act(0, { type: 'answers', answers: [L + 'ax', L + 'ox', '', '', ''], done: true });
  r.act(1, { type: 'answers', answers: [L + 'ax', 'zzz', '', '', ''], done: true });
  const rows = r.st.review.rows;
  ok(rows[0].cells[0].status === 'dup' && rows[1].cells[0].status === 'dup', 'Categories: matching answers score as duplicates');
  ok(rows[0].cells[1].status === 'unique' && rows[1].cells[1].status === 'invalid', 'Categories: unique scores, wrong-letter answer is invalid');
  const r2 = fakeRoom(['A', 'B'], 'categories', { roundTime: 30 });
  r2.act(0, { type: 'answers', answers: ['x'.repeat(500), '', '', '', ''] });
  ok(r2.st.players[0].answers[0].length <= 30, 'Categories caps answer length');
  r2.adv(31000);
  ok(r2.st.phase === 'review', 'Categories: timer expiry scores the round');
})();

console.log(failures ? `\n${failures} FAILED` : '\nAll lexicon tests passed');
process.exit(failures ? 1 : 0);
