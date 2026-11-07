// Game-specific answer policy. Bundled factual proper-name lists supplement the common-word lexicon.
const lexicon = require('../lexicon');
const raw = require('../data/party-proper-nouns.json');
const plain = text => lexicon.normalize(text).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(the|a|an) /, '');
const proper = Object.fromEntries(Object.entries(raw).map(([category, words]) => [category, new Set(words.split('|').map(plain))]));
const allProper = new Set(Object.values(proper).flatMap(set => [...set]));
function phraseReason(text, category) {
  const value = plain(text);
  if (!value) return 'Enter an answer.';
  if (proper[category]) return proper[category].has(value) ? null : `Not in the ${category.toLowerCase()} list. Try a recognized ${category.toLowerCase()}.`;
  if (allProper.has(value)) return null;
  const words = value.split(' ');
  if (words.some(word => !['a','i'].includes(word) && !lexicon.has(word))) return 'Use real words or a recognized name; this answer is not in the word list.';
  return null;
}
function canonicalProper(value, category) {
  const aliases = category === 'Country' ? { usa: 'united states', us: 'united states', 'united states of america': 'united states', uk: 'united kingdom', 'great britain': 'united kingdom', 'czech republic': 'czechia', turkiye: 'turkey' } : category === 'City' ? { nyc: 'new york', 'new york city': 'new york', 'washington dc': 'washington' } : {};
  return aliases[value] || value;
}
module.exports = { plain, proper, phraseReason, canonicalProper };
