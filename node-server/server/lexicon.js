// Server-side English lexicon used for BROAD answer validation (is this a real word?).
// Curated prompt/solution generation uses separate, smaller lists (see games). Nothing here
// touches the network; the data is bundled in server/data (see LEXICON.md for source/licence).
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const WORDS = new Set();

function loadFile(name) {
  let txt = '';
  try {
    txt = fs.readFileSync(path.join(DATA, name), 'utf8');
  } catch (e) {
    return;
  }
  for (const line of txt.split('\n')) {
    const w = line.trim().toLowerCase();
    if (w && w[0] !== '#' && /^[a-z]{2,24}$/.test(w)) WORDS.add(w);
  }
}
loadFile('lexicon.txt');
loadFile('lexicon-esdb.txt'); // licensed offline expansion
loadFile('lexicon-extra.txt'); // exception list for omissions

// Case, Unicode compatibility forms (full-width letters), accents, zero-width characters and
// surrounding whitespace don't change which word was meant. Returns '' for non-strings.
function normalize(raw) {
  if (typeof raw !== 'string' || raw.length > 128) return '';
  return raw
    .slice(0, 128)
    .normalize('NFKD')
    .replace(/[\p{M}\u200b-\u200d\u2060\ufeff]/gu, '')
    .replace(/[’‘]/g, "'")
    .replace(/œ/g,'oe').replace(/Œ/g,'OE').replace(/æ/g,'ae').replace(/Æ/g,'AE')
    .replace(/ß/g,'ss').replace(/[łŁ]/g,'l').replace(/[øØ]/g,'o').replace(/[đĐ]/g,'d')
    .toLowerCase()
    .trim();
}

const has = (w) => WORDS.has(normalize(w));
const size = () => WORDS.size;

const byInitial = new Map();
for (const word of WORDS) {
  if (!byInitial.has(word[0])) byInitial.set(word[0], []);
  byInitial.get(word[0]).push(word);
}
const startingWith = letter => byInitial.get(letter) || [];
module.exports = { has, normalize, size, WORDS, startingWith };
