// Unit tests for Avatar Studio v3 config normalization. Run: node test/avatarv3.js
const assert = require('assert');
const { normalizeV3 } = require('../server/avatarv3');
const good = { v: 3, id: 'h01', palette: 'lime', expression: 'smile', eyes: 'default', hat: 'none', glasses: 'sunglasses', accessory: 'none', detail: 'signature' };
const t = (name, fn) => { fn(); console.log('PASS  ' + name); };

t('valid config round-trips', () => assert.deepStrictEqual(normalizeV3(good), good));
t('extra fields are dropped', () => assert.ok(!('x' in normalizeV3({ ...good, x: '<svg onload=1>' }))));
t('unknown id / version rejected', () => {
  assert.strictEqual(normalizeV3({ ...good, id: 'zz9' }), null);
  assert.strictEqual(normalizeV3({ ...good, v: 4 }), null);
  assert.strictEqual(normalizeV3({ ...good, v: '3' }), null);
});
t('non-enum values (urls, markup, objects) rejected', () => {
  assert.strictEqual(normalizeV3({ ...good, palette: 'url(http://x)' }), null);
  assert.strictEqual(normalizeV3({ ...good, hat: { a: 1 } }), null);
  assert.strictEqual(normalizeV3({ ...good, eyes: '<b>' }), null);
});
t('non-objects rejected', () => [null, undefined, 5, 'a', [], [good]].forEach((v) => assert.strictEqual(normalizeV3(v), null)));
t('hat + headphones keeps hat, clears headphones', () => {
  const r = normalizeV3({ ...good, hat: 'cap', accessory: 'headphones' });
  assert.strictEqual(r.hat, 'cap');
  assert.strictEqual(r.accessory, 'none');
});
t('per-base compatibility enforced (robot has no headphones)', () => {
  assert.strictEqual(normalizeV3({ ...good, id: 'h02', accessory: 'headphones' }), null);
  assert.ok(normalizeV3({ ...good, id: 'h02', accessory: 'scarf', glasses: 'none' }));
});
console.log('avatarv3: all passed');
