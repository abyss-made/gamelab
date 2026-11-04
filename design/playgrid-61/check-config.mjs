/* Malformed serialized-profile and byte-budget regressions, independent of the UI. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeConfig} from './avatar-studio/renderer.js';
const root=new URL('./',import.meta.url),catalog=JSON.parse(fs.readFileSync(new URL('avatar-studio/catalog.json',root))).characters;
const normalize=x=>normalizeConfig(x,catalog);
assert.equal(normalize({v:3,id:'a02',palette:['lime']}).palette,'cyan');
assert.equal(typeof normalize({v:3,id:'a02',palette:{toString:'lime'}}).palette,'string');
assert.equal(normalize({v:3,id:'a02',palette:'__proto__'}).palette,'cyan');
assert.equal(normalize({v:999,id:'a02'}).id,'h01');
assert.equal(normalize({v:3,id:['a02']}).id,'h01');
assert.equal(normalize({v:3,id:'a02',hat:'cap',accessory:'headphones'}).accessory,'none');
const migrated=normalize({v:2,id:'a01',palette:'cyan',hat:'none',glasses:'round',expression:'smile',eyes:'default',accessory:'none',injected:'<svg/>'});
assert.equal(migrated.v,3);assert.equal(migrated.detail,'signature');assert.ok(!Object.hasOwn(migrated,'injected'));
let maxBytes=0;for(const c of catalog){const n=normalize({v:3,id:c.id,...c.defaultLook});assert.deepEqual(normalize(JSON.parse(JSON.stringify(n))),n);const bytes=new TextEncoder().encode(JSON.stringify(n)).length;assert.ok(bytes<=256);maxBytes=Math.max(bytes,maxBytes);}
const report={paletteMustBePrimitiveString:true,arrayAndPrototypeInputsFallBack:true,unknownVersionAndIdFallback:true,headwearConflictNormalized:true,v2MigrationAndUnknownFieldRemoval:true,roundTripBases:catalog.length,maxDefaultConfigBytes:maxBytes,byteCap:256};fs.writeFileSync(new URL('CONFIG-CHECKS.json',root),JSON.stringify(report,null,2)+'\n');console.log('Config malformed-input/migration/round-trip checks passed; maximum default',maxBytes,'bytes.');
