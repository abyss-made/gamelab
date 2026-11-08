// Helpers shared by the social party games (batch 3).
const crypto = require('crypto');
const { mask } = require('../filter');

// Trim, drop control characters, collapse spaces, cap the length and mask bad words.
function cleanText(s, max) {
  if (typeof s !== 'string') return '';
  const t = s.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  return mask(t);
}

// Comparison form: lowercase letters/digits only, so "The  Cat!" equals "the cat".
const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

// Unbiased integer in [0, n) that a client can't predict.
const randInt = (n) => crypto.randomInt(n);
const pick = (arr) => arr[randInt(arr.length)];

module.exports = { cleanText, norm, randInt, pick };
