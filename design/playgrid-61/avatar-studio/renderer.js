/* Trusted bundled assets only. All caller config must first pass normalizeConfig. */
export const COLORS={lime:'#b7ff04',cyan:'#62d5ee',violet:'#b49aee',amber:'#f2b16b',rose:'#e7a2bc',mint:'#a4dba8'};
export const LEGACY=['#ff6b6b','#ffa94d','#ffd43b','#69db7c','#38d9a9','#4dabf7','#748ffc','#b197fc','#f783ac','#ced4da'];
export const slots=['expression','eyes','hat','glasses','accessory','detail'];
export function normalizeConfig(value,catalog){
 const fallback=()=>({v:3,id:'h01',...catalog[0].defaultLook});
 if(!value||typeof value!=='object'||Array.isArray(value))return fallback();
 if((value.v===1&&value.kind==='legacy'))return {v:1,kind:'legacy',e:Number.isInteger(value.e)&&value.e>=0&&value.e<24?value.e:0,c:Number.isInteger(value.c)&&value.c>=0&&value.c<10?value.c:0};
 if(value.v!==3&&value.v!==2)return fallback();
 const c=catalog.find(c=>c.id===value.id);if(!c)return fallback();
 const out={v:3,id:c.id,palette:typeof value.palette==='string'&&Object.hasOwn(COLORS,value.palette)?value.palette:c.defaultLook.palette};
 for(const s of slots)out[s]=c.compatibility[s].includes(value[s])?value[s]:c.defaultLook[s];
 if(out.hat!=='none'&&out.accessory==='headphones')out.accessory='none';
 return out;
}
let legacySpriteReady;
export function legacyNode(e,c){
 const outer=document.createElement('span');outer.className='legacy-art';outer.style.setProperty('--legacy-x',(e%2)*100+'%');outer.style.setProperty('--legacy-y',Math.floor(e%4/2)*100+'%');outer.style.setProperty('--legacy-hue',Math.floor(e/4)*12+'deg');outer.style.setProperty('--legacy-ring',LEGACY[c]);const inner=document.createElement('span');inner.className='legacy-paint';outer.append(inner);if(!legacySpriteReady)legacySpriteReady=new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=new URL('../../../node-server/public/assets/player-portraits.png',import.meta.url).href;});legacySpriteReady.then(ok=>{if(ok)outer.classList.add('legacy-known');else inner.style.backgroundImage='none';});return outer;
}
const cache=new Map();
export function clearAssetCache(){cache.clear();}
export async function compose(character,config,instance){
 if(!cache.has(character.id))cache.set(character.id,fetch(character.asset).then(r=>{if(!r.ok)throw Error('Unavailable bundled asset');return r.text();}));
 const doc=new DOMParser().parseFromString(await cache.get(character.id),'image/svg+xml');if(doc.querySelector('parsererror'))throw Error('Invalid SVG');const svg=doc.documentElement;
 svg.style.setProperty('--accent',COLORS[config.palette]);svg.dataset.expression=config.expression;svg.dataset.eyeStyle=config.eyes;svg.dataset.detail=config.detail;
 for(const slot of ['hat','glasses','accessory']){
  const item=config[slot],target=svg.querySelector('[data-layer="'+slot+'"]');target.replaceChildren();if(item==='none')continue;
  const anchor=item==='scarf'?character.anchors.scarf:character.anchors[slot],use=doc.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#'+character.id+'-'+(item==='round'?'round-glasses':item));for(const k of ['x','y','width','height'])use.setAttribute(k,String(anchor[k]));if(anchor.rotate)use.setAttribute('transform',`rotate(${anchor.rotate} ${anchor.x+anchor.width/2} ${anchor.y+anchor.height/2})`);target.append(use);
 }
 const ids=new Map([...svg.querySelectorAll('[id]')].map(e=>[e.id,instance+'-'+e.id]));for(const e of [svg,...svg.querySelectorAll('*')])for(const a of [...e.attributes]){let v=a.value;for(const [old,id] of ids){if(a.name==='id'&&v===old)v=id;v=v.replaceAll('url(#'+old+')','url(#'+id+')');if(v==='#'+old)v='#'+id;if(a.name==='aria-labelledby'&&v===old)v=id;}if(v!==a.value)e.setAttribute(a.name,v);}
 svg.setAttribute('aria-label',character.name+' avatar');return svg;
}
