/* Private, deterministic reading engine. No network, no generated lyrics, no database writes.
   Comparisons indicate textual similarity, NOT chronology, adoption, authorial intent or completion. */
(function(root){
'use strict';
const version='reading-v2.0';
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s　「」『』（）()【】〈〉《》、。，．.!！?？・:：;；'"‘’“”\-―〜～_＿\/\\]/g,'');
const titleKey=s=>normalize(String(s||'').normalize('NFKC').replace(/^\s*\d+[.．]\s*/,'')
  .replace(/^\s*(合唱曲\s*)?(歌詞案?|作詞メモ)\s*/,'')
  .replace(/\s*(歌詞案?|下書き|初稿|第\s*\d+\s*稿)\s*$/,''));
const isSeparateSky=(a,b)=>a.sky!=='unassigned'&&b.sky!=='unassigned'&&a.sky!==b.sky;
function parse(entry){
 const raw=String(entry.original_text||'');
 const lines=raw.split(/\r?\n/).map((text,i)=>({text,textIndex:i,key:normalize(text)}))
   .filter(x=>x.key.length>=6);
 const long=lines.filter(x=>x.key.length>=10&&x.key.length<=350);
 const grams=new Set();
 // Limits are explicit to prevent pasted megabytes from freezing a mobile browser.
 const maxChars=25000;let scanned=0;
 for(const line of lines){
  if(scanned>=maxChars)break;
  const key=line.key.slice(0,Math.max(0,maxChars-scanned));scanned+=key.length;
  for(let i=0;i+8<=key.length;i++)grams.add(key.slice(i,i+8));
 }
 return {entry,lines,long,grams,title:titleKey(entry.title),capped:scanned<lines.reduce((n,x)=>n+x.key.length,0)};
}
function similarity(a,b){
 if(a===b)return 1;
 if(!a||!b||Math.max(a.length,b.length)>2.2*Math.min(a.length,b.length))return 0;
 const tri=x=>{const out=new Set();for(let i=0;i+3<=x.length;i++)out.add(x.slice(i,i+3));return out;};
 const aa=tri(a),bb=tri(b);let same=0;for(const g of aa)if(bb.has(g))same++;
 return aa.size&&bb.size?2*same/(aa.size+bb.size):0;
}
function analyzePair(a,b,hit=0){
 const exact=[],soft=[],seen=new Set();
 const map=new Map();
 for(const ln of b.long){if(!map.has(ln.key))map.set(ln.key,ln)}
 for(const ln of a.long){
  const other=map.get(ln.key);
  if(other&&!seen.has(ln.key)){seen.add(ln.key);exact.push({a:ln.text,b:other.text,length:ln.key.length})}
 }
 exact.sort((x,y)=>y.length-x.length);
 // A partial rewrite is shown as a suggestion, not as a replacement, a deletion or a fact.
 // Limit costly approximate comparisons to reasonably sized individual lines.
 const aLines=a.long.filter(x=>x.key.length>=12&&x.key.length<=140&& !map.has(x.key));
 const aKeys=new Set(a.long.map(x=>x.key));
 const bLines=b.long.filter(x=>x.key.length>=12&&x.key.length<=140&&!aKeys.has(x.key));
 for(const x of aLines){
   let top=null;
   for(const y of bLines){
    if(Math.abs(x.key.length-y.key.length)>Math.max(12,Math.max(x.key.length,y.key.length)*.55))continue;
    const sim=similarity(x.key,y.key);
    if(sim>=.56&&(!top||sim>top.sim))top={a:x.text,b:y.text,sim};
   }
   if(top)soft.push(top);
 }
 soft.sort((x,y)=>y.sim-x.sim);
 const picked=[],takenA=new Set(),takenB=new Set();
 for(const p of soft){if(takenA.has(p.a)||takenB.has(p.b))continue;picked.push(p);takenA.add(p.a);takenB.add(p.b);if(picked.length>=5)break}
 const sameTitle=a.title.length>=3&&a.title===b.title;
 // A rare long shared line weighs more than a common short expression.
 const longExact=exact.filter(x=>x.length>=14),strongExact=exact.filter(x=>x.length>=20);
 const confidence=sameTitle
   ? (longExact.length>=3||picked.length>=3?'複数稿の可能性・高':'同題稿の可能性')
   : (strongExact.length>=2||longExact.length>=3?'原文の一致・高':strongExact.length===1||longExact.length>=2?'原文の一致・要確認':picked.length>=2?'似た表現・要確認':'文字列の共通部分');
 const score=Math.min(100, (sameTitle?28:0)+Math.min(exact.filter(x=>x.length>=10).length,6)*11+Math.min(strongExact.length,3)*8+Math.min(picked.length,4)*7+Math.min(hit,20));
 const linesA=new Set(a.lines.map(x=>x.key)),linesB=new Set(b.lines.map(x=>x.key));
 return {a:a.entry,b:b.entry,score,confidence,sameTitle,shared:exact.slice(0,7),rephrased:picked.slice(0,5),
   onlyA:a.lines.filter(x=>!linesB.has(x.key)).slice(0,4).map(x=>x.text),
   onlyB:b.lines.filter(x=>!linesA.has(x.key)).slice(0,4).map(x=>x.text),
   sharedCount:exact.length,changedCount:picked.length,
   limitHit:a.capped||b.capped};
}
function scan(entries){
 const source=(entries||[]).filter(e=>e&&typeof e.original_text==='string'&&e.original_text.trim());
 const docs=source.map(parse);const posting=new Map();
 docs.forEach((d,i)=>{for(const gram of d.grams){let arr=posting.get(gram);if(!arr){arr=[];posting.set(gram,arr)}arr.push(i)}});
 const edges=new Map();
 for(const ids of posting.values()){
   // Generic 8-character phrases repeated in a large share of notes are not reliable evidence.
   if(ids.length>Math.max(7,Math.round(docs.length*.12)))continue;
   for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
    const ai=ids[i],bi=ids[j];
    if(isSeparateSky(docs[ai].entry,docs[bi].entry))continue;
    const k=ai+'|'+bi;edges.set(k,(edges.get(k)||0)+1);
   }
 }
 const titles=new Map();
 docs.forEach((d,i)=>{if(d.title.length<3)return;const a=titles.get(d.title)||[];a.push(i);titles.set(d.title,a)});
 for(const group of titles.values())for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
  const a=group[i],b=group[j];if(!isSeparateSky(docs[a].entry,docs[b].entry))edges.set(a+'|'+b,Math.max(edges.get(a+'|'+b)||0,4));
 }
 const found=[];
 for(const [key,hits] of edges){
   if(hits<4)continue;
   const [a,b]=key.split('|').map(Number),p=analyzePair(docs[a],docs[b],hits);
   // Do not call matches based on a few ubiquitous terms; require substantial text evidence or a distinct same title.
   if(!p.sameTitle&&!(p.shared.some(x=>x.length>=18)||p.shared.filter(x=>x.length>=13).length>=2||p.rephrased.length>=2))continue;
   found.push(p);
 }
 found.sort((a,b)=>Number(b.sameTitle)-Number(a.sameTitle)||b.score-a.score||b.sharedCount-a.sharedCount);
 return {version,scanned:docs.length,totalLines:docs.reduce((n,d)=>n+d.lines.length,0),
 capped:docs.filter(x=>x.capped).map(x=>x.entry.source_id||x.entry.title),
 candidates:found,notesWithCandidates:new Set(found.flatMap(p=>[p.a.source_id||p.a.id,p.b.source_id||p.b.id])).size,
 supported:'文字列の同一性・類似性のみ。改稿の因果関係・執筆日時・採用／未採用は本人未確認'};
}
root.StrataReadingV2={version,normalize,titleKey,scan,analyzePair,parse};
})(typeof window!=='undefined'?window:globalThis);
