/* Design prototype: local, allowlisted config. No game protocol or profile mutation. */
(async()=>{
 const data=await fetch('catalog.json').then(r=>r.json()),chars=data.characters,byId=new Map(chars.map(c=>[c.id,c]));
 const COLORS={lime:'#b7ff04',cyan:'#62d5ee',violet:'#b49aee',amber:'#f2b16b',rose:'#e7a2bc',mint:'#a4dba8'};
 const LEGACY=['#ff6b6b','#ffa94d','#ffd43b','#69db7c','#38d9a9','#4dabf7','#748ffc','#b197fc','#f783ac','#ced4da'];
 const KEY='pg_avatar_studio_preview_v1',cache=new Map();let epoch=0,reactionTimer=null,activeTab='characters';
 const $=s=>document.querySelector(s),status=t=>{$('#status').textContent=t;};
 const fallback=()=>({v:2,id:'a01',palette:'lime',expression:'smile',eyes:'default',hat:'none',glasses:'none',accessory:'none'});
 function normalize(o){
  if(!o||typeof o!=='object'||Array.isArray(o))return fallback();
  if(o.v===1&&o.kind==='legacy')return {v:1,kind:'legacy',e:Number.isInteger(o.e)&&o.e>=0&&o.e<24?o.e:0,c:Number.isInteger(o.c)&&o.c>=0&&o.c<10?o.c:0};
  if(o.v!==2)return fallback();
  const c=byId.get(o.id)||chars[0],n={v:2,id:c.id,palette:Object.hasOwn(COLORS,o.palette)?o.palette:'lime'};
  for(const slot of ['expression','eyes','hat','glasses','accessory'])n[slot]=c.compatibility[slot].includes(o[slot])?o[slot]:slot==='expression'?'smile':slot==='eyes'?'default':'none';
  return n;
 }
 let config=fallback();try{const raw=localStorage.getItem(KEY);if(raw&&raw.length<=1024)config=normalize(JSON.parse(raw));}catch{}
 function legacyNode(e,c,extra=''){
  const n=document.createElement('span');n.className='legacy-art '+extra;n.style.setProperty('--legacy-x',(e%2)*100+'%');n.style.setProperty('--legacy-y',Math.floor((e%4)/2)*100+'%');n.style.setProperty('--legacy-hue',Math.floor(e/4)*12+'deg');n.style.setProperty('--legacy-ring',LEGACY[c]);const art=document.createElement('span');art.className='legacy-paint';n.appendChild(art);return n;
 }
 function renameIds(svg,suffix){
  const ids=new Map([...svg.querySelectorAll('[id]')].map(e=>[e.id,suffix+'-'+e.id]));
  svg.querySelectorAll('*').forEach(e=>{for(const a of [...e.attributes]){let v=a.value;for(const [old,id] of ids){v=v.replaceAll('url(#'+old+')','url(#'+id+')');if(v==='#'+old)v='#'+id;if(a.name==='id'&&v===old)v=id;if(a.name==='aria-labelledby'&&v===old)v=id;}if(v!==a.value)e.setAttribute(a.name,v);}});
  const title=svg.getAttribute('aria-labelledby');if(ids.has(title))svg.setAttribute('aria-labelledby',ids.get(title));return svg;
 }
 async function compose(c,cfg,instance){
  if(!cache.has(c.id))cache.set(c.id,fetch(c.asset).then(r=>{if(!r.ok)throw Error('Asset unavailable');return r.text();}));
  const raw=await cache.get(c.id),doc=new DOMParser().parseFromString(raw,'image/svg+xml');if(doc.querySelector('parsererror'))throw Error('Invalid character SVG');
  const svg=doc.documentElement;svg.style.setProperty('--accent',COLORS[cfg.palette]);svg.dataset.expression=cfg.expression;svg.dataset.eyeStyle=cfg.eyes;
  for(const slot of ['hat','glasses','accessory']){
   const item=cfg[slot];if(item==='none')continue;const anchor=item==='scarf'?c.anchors.scarf:c.anchors[slot];
   const use=doc.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#'+c.id+'-'+(item==='round'?'round-glasses':item));
   for(const k of ['x','y','width','height'])use.setAttribute(k,String(anchor[k]));svg.querySelector('[data-layer="'+slot+'"]').appendChild(use);
  }
  svg.setAttribute('aria-label',c.name+' avatar');return renameIds(svg,instance);
 }
 function palette(){
  const legacy=config.v===1,values=legacy?LEGACY:Object.values(COLORS),names=legacy?LEGACY.map((_,i)=>'Classic color '+(i+1)):Object.keys(COLORS);
  $('#palette').replaceChildren(...values.map((color,i)=>{const b=document.createElement('button');b.type='button';b.style.setProperty('--sw',color);b.setAttribute('aria-label',names[i]+' accent');b.setAttribute('aria-pressed',String(legacy?config.c===i:config.palette===names[i]));b.onclick=()=>{config=normalize({...config,[legacy?'c':'palette']:legacy?i:names[i]});renderAvatar();palette();};return b;}));
 }
 async function renderAvatar(override=null){
  const turn=++epoch,cfg=override||config;clearTimeout(reactionTimer);$('#portrait').className='';
  if(cfg.v===1){
   $('#portrait').replaceChildren(legacyNode(cfg.e,cfg.c,'legacy-big'));for(const id of ['tiny24','tiny32','tiny48','context-avatar'])$('#'+id).replaceChildren(legacyNode(cfg.e,cfg.c));
   $('#character-name').textContent='Classic '+String(cfg.e+1).padStart(2,'0');$('#character-kind').textContent='Original portrait · preserved';return;
  }
  const c=byId.get(cfg.id);let svg;
  try{svg=await compose(c,cfg,'large-'+turn);}catch{status('That preview could not load. Your classic avatar is preserved.');$('#portrait').replaceChildren(legacyNode(c.fallback.e,c.fallback.c,'legacy-big'));for(const id of ['tiny24','tiny32','tiny48','context-avatar'])$('#'+id).replaceChildren(legacyNode(c.fallback.e,c.fallback.c));$('#character-name').textContent=c.name;$('#character-kind').textContent='Classic fallback · preview unavailable';return;}
  if(turn!==epoch)return;$('#portrait').replaceChildren(svg);$('#character-name').textContent=c.name;$('#character-kind').textContent=c.silhouette+' · '+c.family;
  for(const id of ['tiny24','tiny32','tiny48','context-avatar']){const clone=await compose(c,cfg,id+'-'+turn);if(turn!==epoch)return;$('#'+id).replaceChildren(clone);}
 }
 function drawCatalog(){
  const search=$('#search').value.trim().toLowerCase(),family=$('#family').value,list=chars.filter(c=>(family==='all'||c.family===family)&&[c.name,c.family,c.silhouette].join(' ').toLowerCase().includes(search));
  $('#catalog').replaceChildren(...list.map(c=>{const b=document.createElement('button');b.type='button';b.className='character-choice';b.dataset.character=c.id;b.setAttribute('aria-label',c.name+', '+c.silhouette);b.setAttribute('aria-pressed',String(config.v===2&&config.id===c.id));const img=document.createElement('img');img.src=c.asset;img.alt='';img.loading='lazy';const n=document.createElement('b');n.textContent=c.name;const s=document.createElement('small');s.textContent=c.family;b.append(img,n,s);b.onclick=()=>{const prev=config;config=normalize({...fallback(),...(config.v===2?config:{}),id:c.id});clearTimeout(reactionTimer);drawCatalog();drawLooks();palette();renderAvatar();const reset=prev.v===2&&['hat','glasses','accessory'].some(k=>prev[k]!==config[k]);status(reset?c.name+' selected. Unsupported items returned to None.':c.name+' selected.');};return b;}));$('#empty').hidden=!!list.length;
 }
 const OPTIONS={expression:['smile','joy','focused','surprised','sad'],eyes:['default','bright','sleepy'],hat:['none','beanie','cap','crown'],glasses:['none','sunglasses','round'],accessory:['none','scarf','headphones']};
 function drawLooks(){
  const legacy=config.v===1,c=byId.get(config.id)||chars[0];$('#compat-note').textContent=legacy?'Classic portraits keep their original artwork. Choose a new character for layered looks.':c.name+' · accessories fit the '+c.silhouette+' silhouette.';
  $('#look-controls').replaceChildren(...Object.entries(OPTIONS).map(([slot,opts])=>{const l=document.createElement('label');l.textContent=slot==='eyes'?'Eye style':slot[0].toUpperCase()+slot.slice(1);const select=document.createElement('select');select.className='look-select';select.dataset.slot=slot;select.setAttribute('aria-label',l.textContent);select.disabled=legacy;
   for(const v of opts){const o=document.createElement('option');o.value=v;o.textContent=v[0].toUpperCase()+v.slice(1);o.disabled=!c.compatibility[slot].includes(v);select.appendChild(o);}select.value=legacy?(slot==='expression'?'smile':slot==='eyes'?'default':'none'):config[slot];
   select.onchange=()=>{config=normalize({...config,[slot]:select.value});renderAvatar();status('Look updated. Save when you’re ready.');};l.appendChild(select);
   const missing=opts.filter(x=>!c.compatibility[slot].includes(x));if(missing.length){const note=document.createElement('small');note.textContent=slot==='hat'?'Wide hats would hide these ears, horns or antenna.':slot==='glasses'?'This visor has a single eye.': 'Some accessories would cover this silhouette.';l.appendChild(note);}return l;}));
 }
 function drawLegacy(){
  $('#legacy-catalog').replaceChildren(...Array.from({length:24},(_,e)=>{const b=document.createElement('button');b.type='button';b.className='legacy-choice';b.dataset.legacy=String(e);b.setAttribute('aria-label','Classic avatar '+(e+1));b.setAttribute('aria-pressed',String(config.v===1&&config.e===e));b.appendChild(legacyNode(e,config.v===1?config.c:0));const n=document.createElement('b');n.textContent='Classic '+String(e+1).padStart(2,'0');b.appendChild(n);b.onclick=()=>{config=normalize({v:1,kind:'legacy',e,c:config.v===1?config.c:0});drawLegacy();drawCatalog();drawLooks();palette();renderAvatar();status('Classic '+(e+1)+' selected. Original choices are preserved.');};return b;}));
 }
 function tab(id){activeTab=id;document.querySelectorAll('[data-tab]').forEach(b=>{const on=b.dataset.tab===id;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!==id);if(id==='looks')drawLooks();if(id==='classic')drawLegacy();}
 const tabs=[...document.querySelectorAll('[data-tab]')];tabs.forEach((b,i)=>{b.onclick=()=>tab(b.dataset.tab);b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tab(tabs[n].dataset.tab);tabs[n].focus();}};});
 $('#search').oninput=drawCatalog;$('#family').onchange=drawCatalog;
 $('#save').onclick=()=>{try{const raw=JSON.stringify(normalize(config));if(new TextEncoder().encode(raw).length>256)throw Error('Config too large');localStorage.setItem(KEY,raw);status('Avatar saved on this browser.');}catch{status('Your browser could not save this preview. Your existing profile is unchanged.');}};
 $('#reset').onclick=()=>{config=config.v===1?normalize({v:1,kind:'legacy',e:config.e,c:0}):normalize({...fallback(),id:config.id});drawLooks();palette();renderAvatar();drawCatalog();status('Look reset. Save to keep it on this browser.');};
 const motion=matchMedia('(prefers-reduced-motion:reduce)');$('#reduce').checked=motion.matches;$('#reduce').onchange=()=>document.body.classList.toggle('reduced',$('#reduce').checked);$('#reduce').onchange();
 document.querySelectorAll('[data-reaction]').forEach(b=>b.onclick=async()=>{if(config.v===1){status('Classic portraits stay static. Your original choice is unchanged.');return;}const reaction=b.dataset.reaction,expression=reaction==='win'||reaction==='cheer'?'joy':reaction==='loss'?'sad':'smile';await renderAvatar({...config,expression});$('#portrait').className='reaction-'+reaction;status(reaction[0].toUpperCase()+reaction.slice(1)+' reaction preview.');reactionTimer=setTimeout(()=>{renderAvatar();status('Back to your chosen look.');},650);});
 $('#reference').onclick=()=>$('#style-dialog').showModal();$('#close-reference').onclick=()=>{$('#style-dialog').close();$('#reference').focus();};$('#style-dialog').addEventListener('close',()=>$('#reference').focus());
 window.StudioDesign={normalize,getConfig:()=>structuredClone(config),catalog:chars,setConfig:o=>{config=normalize(o);drawLooks();drawCatalog();drawLegacy();palette();return renderAvatar();},storageKey:KEY};
 drawCatalog();drawLooks();drawLegacy();palette();await renderAvatar();document.documentElement.dataset.studioReady='true';
})().catch(e=>{document.documentElement.dataset.studioError=e.message;console.error(e);});
