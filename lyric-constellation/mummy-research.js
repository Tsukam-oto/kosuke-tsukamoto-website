/* 木乃伊｜原文を根拠にした検索・精読補助
   IMPORTANT: This file contains no author's private lyric or essay text.
   All original text is read at runtime from the signed-in owner's RLS-protected corpus.
   Observed lexical matches are NOT authorial intent, chronology or thematic judgments. */
(function(root){
'use strict';
const THEMES=[
 {id:'music',name:'音楽を書く・聴く',keys:['音楽','ピアノ','ラップ','歌','ビート','リリック','楽譜','マイク']},
 {id:'memory',name:'時間・記憶',keys:['日々','昨日','明日','記憶','忘れ','過去','未来','朝','夜']},
 {id:'life',name:'生と終わり',keys:['生き','死','命','終わ','消え','心臓']},
 {id:'daily',name:'日々の生活',keys:['生活','洗濯','食事','ごはん','おかえり','コーヒー','日常','帰り道']},
 {id:'relations',name:'相手との距離',keys:['君','あなた','お前','家族','友達','恋','愛','二人','2人']},
 {id:'ability',name:'技術・評価',keys:['才能','上手','下手','評価','ルール','正し','不甲斐','努力','挫折']},
 {id:'return',name:'続ける・繰り返す',keys:['何度も','もう一度','繰り返し','やり直','まだ','それでも','続け','諦め']}
];
function lines(text){
 return String(text||'').split(/\r?\n/).map((raw,i)=>({number:i+1,text:raw.trim()}))
 .filter(x=>x.text);
}
function observe(work,theme){
 const linesIn=lines(work.lyrics);
 const matches=linesIn.map(x=>{
  const terms=theme.keys.filter(t=>x.text.includes(t));
  return terms.length?{line:x.number,text:x.text,terms}:null;
 }).filter(Boolean);
 const distinct=new Set(matches.flatMap(x=>x.terms));
 return {workId:work.id,score:distinct.size,matchedLines:matches.length,evidence:matches.slice(0,3),terms:[...distinct],
  sourceStatus:work.sourceStatus||'unknown'};
}
function analyze(works){
 const docs=(Array.isArray(works)?works:[]).filter(w=>w&&w.sky==='rap'&&w.sourceSystem==='lyric_master'&&typeof w.lyrics==='string');
 const groups=THEMES.map(theme=>{
  const rows=docs.map(w=>({work:w,observed:observe(w,theme)})).filter(x=>x.observed.score);
  rows.sort((a,b)=>b.observed.score-a.observed.score||b.observed.matchedLines-a.observed.matchedLines||
    String(a.work.title).localeCompare(String(b.work.title),'ja'));
  return {id:theme.id,name:theme.name,keys:theme.keys,matched:rows.length,rows};
 });
 return {works:docs.length,unverified:docs.filter(w=>w.sourceStatus==='unverified_pdf_extract').length,
  groups,version:'mummy-research-v1',notice:'語句の出現に基づく検索索引です。「主題」「作者の思想」「採用／没」は自動判定していません。'};
}
function searchWorks(works,query,themeId,limit=40){
 const q=String(query||'').trim().normalize('NFKC').toLowerCase();
 const target=THEMES.find(x=>x.id===themeId)||null;
 let found=(Array.isArray(works)?works:[]).filter(w=>w&&w.sky==='rap'&&w.sourceSystem==='lyric_master');
 if(q)found=found.filter(w=>(String(w.title)+' '+String(w.lyrics)+' '+String(w.collection||'')).normalize('NFKC').toLowerCase().includes(q));
 const rows=found.map(w=>({work:w,observed:target?observe(w,target):null})).filter(x=>!target||x.observed.score);
 rows.sort((a,b)=>target?b.observed.score-a.observed.score||b.observed.matchedLines-a.observed.matchedLines||String(a.work.title).localeCompare(String(b.work.title),'ja'):
  (Number(a.work.trackNo)||0)-(Number(b.work.trackNo)||0)||String(a.work.title).localeCompare(String(b.work.title),'ja'));
 const count=rows.length;
 return {count,rows:rows.slice(0,limit),theme:target,query:q};
}
function verify(source,passages,connections,works){
 if(!source||typeof source.original_text!=='string')return {passages:[],connections:[],discarded:0};
 const corpus=new Map((works||[]).map(w=>[w.id.replace(/^master-/,''),w]));
 const acceptedPassages=[],acceptedConnections=[];let discarded=0;
 for(const item of passages||[]){
  if(source.original_text.includes(item.evidence_a)&&source.original_text.includes(item.evidence_b)){
   acceptedPassages.push(item);
  }else discarded++;
 }
 for(const item of connections||[]){
  const w=corpus.get(item.work_id);
  if(w&&source.original_text.includes(item.essay_evidence)&&w.lyrics.includes(item.lyric_evidence)){
   const evidenceLine=lines(w.lyrics).find(x=>x.text.includes(item.lyric_evidence));
   acceptedConnections.push({...item,work:w,verifiedLine:evidenceLine?.number||null});
  }else discarded++;
 }
 return {passages:acceptedPassages,connections:acceptedConnections,discarded};
}
root.MummyResearch={THEMES,lines,observe,analyze,searchWorks,verify};
})(typeof window!=='undefined'?window:globalThis);
