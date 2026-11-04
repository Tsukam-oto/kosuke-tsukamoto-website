/* Evidence-only comparison. This file never contains private lyrics.
   Identical lines are observations, never proof of intent, dates or adoption. */
(function(root){
'use strict';
function normalized(v){
 return String(v||'').normalize('NFKC').toLowerCase().replace(/[\s\u3000]/g,'')
 .replace(/[、。．，！？!?「」『』【】（）(){}[\]・\-—….,;:'"‘’“”]/g,'');
}
function lines(input){
 return String(input||'').split(/\r?\n/).map((raw,i)=>({number:i+1,text:raw.trim(),key:normalized(raw)}))
  .filter(row=>row.text);
}
function inspect(input){
 const all=lines(input);
 return {lineCount:all.length,characters:String(input||'').length,
   opening:all.slice(0,3).map(x=>({line:x.number,text:x.text})),
   ending:all.slice(-3).map(x=>({line:x.number,text:x.text}))};
}
function compare(a,b){
 const A=lines(a), B=lines(b), index=new Map();
 for(const x of B){
  if(x.key.length<12)continue;
  if(!index.has(x.key))index.set(x.key,[]);
  index.get(x.key).push(x.number);
 }
 const found=[],used=new Set();
 for(const x of A){
  if(x.key.length<12||used.has(x.key)||!index.has(x.key))continue;
  used.add(x.key);
  found.push({leftLine:x.number,rightLine:index.get(x.key)[0],text:x.text,
   rightOccurrences:index.get(x.key).length});
 }
 return {left:inspect(a),right:inspect(b),sharedCount:found.length,
   shared:found.slice(0,30),moreShared:Math.max(0,found.length-30),
   notice:'字面が一致した行だけを示します。同一作品、改稿、引用、採用を意味しません。'};
}
const api={version:'cross-compare-v1',normalized,inspect,compare};
root.CrossSourceCompare=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
