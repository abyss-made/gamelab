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
loadFile('lexicon-extra.txt'); // exception list for omissions

// Case, Unicode compatibility forms (full-width letters), accents, zero-width characters and
// surrounding whitespace don't change which word was meant. Returns '' for non-strings.
function normalize(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .slice(0, 128)
    .normalize('NFKD')
    .replace(/[̀-ͯ​-‍⁠﻿]/g, '')
    .toLowerCase()
    .trim();
}

const has = (w) => WORDS.has(normalize(w));
const size = () => WORDS.size;

module.exports = { has, normalize, size, WORDS };
