// Basic chat and name filter. Add words to BAD_WORDS to block more.
const BAD_WORDS = [
  'fuck', 'fucker', 'fucking', 'motherfucker', 'shit', 'bitch', 'bastard', 'cunt',
  'dick', 'cock', 'pussy', 'asshole', 'whore', 'slut', 'fag', 'faggot', 'nigger',
  'nigga', 'retard', 'rape', 'rapist', 'porn', 'penis', 'vagina', 'nazi', 'kys',
];

const pattern = new RegExp(
  '\\b(' + BAD_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')s?\\b',
  'gi'
);

function mask(text) {
  return text.replace(pattern, (m) => m[0] + '*'.repeat(m.length - 1));
}

function hasBad(text) {
  pattern.lastIndex = 0;
  const found = pattern.test(text);
  pattern.lastIndex = 0;
  return found;
}

function clean(text, max) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function cleanName(name) {
  let n = clean(name, 16);
  if (!n || hasBad(n)) n = 'Player' + Math.floor(100 + Math.random() * 900);
  return n;
}

function cleanChat(text) {
  return mask(clean(text, 120));
}

module.exports = { cleanName, cleanChat, mask, clean };
