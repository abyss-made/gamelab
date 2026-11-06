'use strict';
// Avatar Studio 2.0 config (schema v3): strict allowlist normalization. Never stores raw
// client strings: only enum values from the bundled catalog survive. Returns null when invalid,
// so the caller falls back to the legacy {e,c} avatar.
const catalog = require('./avatar-catalog.json');

const MAX_BYTES = 256;
const FIELDS = ['palette', 'expression', 'eyes', 'hat', 'glasses', 'accessory', 'detail'];
const isStr = (v) => typeof v === 'string' && v.length <= 24;

function normalizeV3(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (raw.v !== catalog.schemaVersion || !isStr(raw.id)) return null;
  if (!Object.hasOwn(catalog.characters, raw.id)) return null;
  const compat = catalog.characters[raw.id];
  const out = { v: catalog.schemaVersion, id: raw.id };
  for (const f of FIELDS) {
    const allowed = f === 'palette' ? catalog.palettes : compat[f];
    if (!isStr(raw[f]) || !allowed.includes(raw[f])) return null;
    out[f] = raw[f];
  }
  // Headwear and headphones are mutually exclusive: keep the hat, drop the headphones.
  if (out.hat !== 'none' && out.accessory === 'headphones') out.accessory = 'none';
  if (Buffer.byteLength(JSON.stringify(out)) > MAX_BYTES) return null;
  return out;
}

module.exports = { normalizeV3, MAX_BYTES };
