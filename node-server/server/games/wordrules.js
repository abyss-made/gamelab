// Offline, game-specific policies. Sources, licences and limits: data/DICTIONARY-2.md.
const fs=require('fs'),path=require('path'),lexicon=require('../lexicon');
const raw=require('../data/party-proper-nouns.json');
const vocabulary=require('../data/category-vocabulary.json'),inflections=require('../data/noun-inflections.json');
const plain=text=>lexicon.normalize(text).replace(/['’]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim().replace(/^(the|a|an) /,'');
const proper=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,new Set(v.split('|').map(plain))]));
for(const city of fs.readFileSync(path.join(__dirname,'../data/city-names.txt'),'utf8').split('\n'))if(city)proper.City.add(city);
proper.Country.add('cote divoire');
const allProper=new Set(Object.values(proper).flatMap(s=>[...s]));
const sets=Object.fromEntries(Object.entries(vocabulary).map(([k,v])=>[k,new Set(v)]));
// Reviewed common answers that WordNet's hypernym walk misses (actor, singer, milkshake, garlic...).
for(const [k,v] of Object.entries(require('../data/category-supplements.json')))if(sets[k])for(const w of v.split('|'))sets[k].add(plain(w));
const aliases={Country:{usa:'united states',us:'united states','united states of america':'united states',uk:'united kingdom','great britain':'united kingdom','czech republic':'czechia',turkiye:'turkey','ivory coast':'cote divoire','cote d ivoire':'cote divoire',uae:'united arab emirates'},City:{nyc:'new york','new york city':'new york','washington dc':'washington',kiev:'kyiv',saigon:'ho chi minh city',bombay:'mumbai',peking:'beijing'}};
function canonicalProper(v,cat){return aliases[cat]?.[v]||v;}
// Spelling must be a real word before any plural is stripped: "fishs"/"foxs"/"sheeps" are not.
function realSpelling(value){
 const w=value.slice(value.lastIndexOf(' ')+1);
 return lexicon.has(w)||!!inflections[w]||!!inflections[value];
}
function forms(value){
 if(!realSpelling(value))return [];
 const out=[...(inflections[value]||[])],i=value.lastIndexOf(' ')+1,stem=value.slice(0,i),w=value.slice(i);
 for(const form of inflections[w]||[])out.push(stem+form);
 if(w.endsWith('s')&&!w.endsWith('ss'))out.push(stem+w.slice(0,-1));
 if(w.endsWith('ies'))out.push(stem+w.slice(0,-3)+'y');
 if(/(ch|sh|ss|x|z|o)es$/.test(w))out.push(stem+w.slice(0,-2));
 return out;
}
function canonicalCategory(value,cat){const set=sets[cat];return set?(forms(value).find(w=>set.has(w))||(set.has(value)?value:null)):null;}
function phraseReason(text,cat){
 const value=plain(text);if(!value)return 'Enter an answer.';
 if(proper[cat])return proper[cat].has(canonicalProper(value,cat))?null:`Not in the ${cat.toLowerCase()} list. Try a recognized ${cat.toLowerCase()}.`;
 if(sets[cat])return canonicalCategory(value,cat)?null:`Not found in our ${cat.toLowerCase()} word list. Try another example; you can report an omission after the round.`;
 if(allProper.has(value))return null;
 return value.split(' ').some(w=>!['a','i'].includes(w)&&!lexicon.has(w))?'Use real words or a recognized name; this answer is not in the word list.':null;
}
const policy=cat=>proper[cat]?'Recognized names':sets[cat]?'Category vocabulary checked':'Real words checked; category fit is party-judged';
module.exports={plain,proper,phraseReason,canonicalProper,canonicalCategory,policy,isProper:v=>allProper.has(plain(v))};
