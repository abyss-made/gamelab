# Word lexicon

`lexicon.txt` is the broad "is this a real English word?" list used by the word games.

- **Source:** SCOWL (Spell Checker Oriented Word Lists) by Kevin Atkinson, http://wordlist.aspell.net/,
  as packaged in the MIT-licensed npm package `wordlist-english@1.2.1`.
- **Licence:** permissive SCOWL notice, reproduced in `LEXICON-COPYRIGHT.txt` (must accompany copies).
- **Generation:** `node scripts/build-lexicon.js <extracted wordlist-english dir>` (sorted, reproducible).
- **Contents:** SCOWL sizes 10-70 for neutral, American, British, Canadian and Australian English
  (so `color` and `colour` both count), including plurals and inflected forms (`dogs`, `running`, `jumped`).
- **Spelling policy:** all dialect spellings accepted. Lowercase a-z, 2-24 letters only.
  Proper nouns, most abbreviations, and words with apostrophes/hyphens are excluded from the list.
- **Not exhaustive:** no list contains literally every English word. Add omissions, one per line, to
  `lexicon-extra.txt` (loaded at startup). Profanity is filtered separately by `server/filter.js`.
- **Normalization:** `server/lexicon.js` lowercases, strips accents/zero-width characters and applies
  NFKD (so full-width letters work) before lookup.
- No runtime network access is used.
