#!/usr/bin/env node
// Regenerates server/data/lexicon.txt from the SCOWL word lists as packaged (JSON) in the
// `wordlist-english` npm package (MIT; SCOWL data under the permissive notice in LEXICON.md).
//
//   npm pack wordlist-english@1.2.1 && mkdir src && tar xzf wordlist-english-1.2.1.tgz -C src
//   node scripts/build-lexicon.js src/package
//
// Policy: SCOWL sizes 10-70 for the neutral, American, British, Canadian and Australian lists
// (so both "color" and "colour" are accepted), lowercase a-z only, 2-24 letters. Entries with a
// capital letter (proper nouns, most abbreviations) and entries with apostrophes or hyphens are
// dropped. Output is sorted, so regeneration is reproducible.
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node scripts/build-lexicon.js <wordlist-english package dir>');
  process.exit(1);
}
const DIALECTS = ['english', 'american', 'british', 'canadian', 'australian'];
const SIZES = [10, 20, 35, 40, 50, 55, 60, 70];
const out = new Set();
for (const d of DIALECTS) {
  for (const s of SIZES) {
    const f = path.join(dir, `${d}-words-${s}.json`);
    for (const w of JSON.parse(fs.readFileSync(f, 'utf8'))) if (/^[a-z]{2,24}$/.test(w)) out.add(w);
  }
}
const words = [...out].sort();
fs.writeFileSync(path.join(__dirname, '..', 'server', 'data', 'lexicon.txt'), words.join('\n') + '\n');
console.log(`wrote ${words.length} words`);
