/* REC NOTE lyric workbench shared logic (v18).
   Never rewrites prior lyric versions or timestamp records. */
(function(global){
'use strict';
function normalize(v){return String(v??'').replace(/\r\n?/g,'\n');}
function lines(v){return normalize(v).split('\n');}
function draftKey(workId,versionId){return 'lyric-source-draft-v1:'+workId+':'+versionId;}
function displayKey(workId,versionId,i){return 'lyric-display-v1:'+workId+':'+versionId+':'+i;}
function mapping(a,b){
 const old=lines(a),next=lines(b),pairs=[];
 if(old.length===next.length){
  for(let i=0;i<old.length;i++)pairs.push({old:i,next:i,exact:old[i]===next[i]});
  return pairs;
 }
 // LCS maps only text-identical, order-preserving lines when line counts differ.
 const m=old.length,n=next.length,dp=Array.from({length:m+1},()=>new Uint16Array(n+1));
 for(let i=m-1;i>=0;i--)for(let j=n-1;j>=0;j--)
  dp[i][j]=old[i]===next[j]?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
 let i=0,j=0;
 while(i<m&&j<n){
  if(old[i]===next[j]){pairs.push({old:i,next:j,exact:true});i++;j++;}
  else if(dp[i+1][j]>=dp[i][j+1])i++;else j++;
 }
 return pairs;
}
function validation(text){
 const src=normalize(text);
 if(!src.trim())throw Error('歌詞が空です。');
 if(src.length>40000)throw Error('歌詞が長すぎます。');
 if(lines(src).length>500)throw Error('1曲500行以内にしてください。');
 return src;
}
function previewMigration(state,from,to){
 const old=lines(from.literal_text),newer=lines(to);
 const pairs=mapping(from.literal_text,to);
 const mapped=new Set(pairs.map(p=>p.next));
 const count=state.lyricTimings?.filter(x=>x.textVersionId===from.id&&!x.syncConflictOf&&x.kind!=='song-section').length||0;
 return {oldLines:old.length,newLines:newer.length,preserved:pairs.filter(x=>x.exact).length,changed:pairs.filter(x=>!x.exact).length,needsTiming:newer.length-mapped.size,records:count,pairs};
}
function transfer(state,workId,song,from,to){
 if(!state||!Array.isArray(state.lyricTimings))throw Error('REC NOTEの時刻データが見つかりません。');
 const map=mapping(from.literal_text,to.literal_text),original=lines(from.literal_text),fresh=lines(to.literal_text);
 const byOld=new Map(map.map(x=>[x.old,x]));
 const ids=new Set(state.lyricTimings.map(x=>x.id));
 let copied=0,recheck=0;
 for(const t of [...state.lyricTimings]){
  if(t.workId!==workId||t.textVersionId!==from.id||!Number.isInteger(t.lineIndex)||t.syncConflictOf||t.kind==='song-section')continue;
  const target=byOld.get(t.lineIndex);if(!target)continue;
  const newId='lyric-line:'+workId+':'+to.id+':'+target.next;if(ids.has(newId))continue;
  const exact=!!target.exact,hasConflict=state.lyricTimings.some(x=>x.syncConflictOf===t.id);
  const clone={...t,id:newId,workId,textVersionId:to.id,lineIndex:target.next,song,
   status:exact&&!hasConflict?t.status:'draft',
   confirmedAt:exact&&!hasConflict?t.confirmedAt??null:null,
   migratedFrom:t.id,updatedAt:new Date().toISOString()};
  state.lyricTimings.push(clone);ids.add(newId);copied++;
  if(!exact||hasConflict)recheck++;
 }
 state.drafts=state.drafts&&typeof state.drafts==='object'?state.drafts:{};
 let displayCopied=0;
 for(const p of map){
  if(!p.exact||original[p.old]!==fresh[p.next])continue;
  const oldKey=displayKey(workId,from.id,p.old),newKey=displayKey(workId,to.id,p.next);
  const d=state.drafts[oldKey];
  if(d&&d.source===original[p.old]&&!state.drafts[newKey]){
   state.drafts[newKey]={...JSON.parse(JSON.stringify(d)),updatedAt:new Date().toISOString(),migratedFrom:oldKey};displayCopied++;
  }
 }
 return {copied,recheck,displayCopied,unmapped:fresh.length-new Set(map.map(x=>x.next)).size};
}
function fetchDraft(state,work,version){
 const key=draftKey(work.id,version.id),d=state.drafts?.[key];
 return d&&d.schema===1&&d.sourceVersionId===version.id&&d.baseText===version.literal_text?d:null;
}
function saveDraft(state,work,version,text){
 const key=draftKey(work.id,version.id);
 if(Object.keys(state.drafts||{}).some(k=>k.startsWith(key+'__local_')))throw Error('クラウド同期の競合があります。別端末の変更を確認してください。');
 state.drafts=state.drafts&&typeof state.drafts==='object'?state.drafts:{};
 const previous=state.drafts[key];
 const v={schema:1,sourceVersionId:version.id,baseText:version.literal_text,text:normalize(text),
  displayBreaks:previous?.sourceVersionId===version.id&&previous?.baseText===version.literal_text&&previous.displayBreaks&&typeof previous.displayBreaks==='object'?JSON.parse(JSON.stringify(previous.displayBreaks)):{},
  updatedAt:new Date().toISOString()};
 state.drafts[key]=v;return v;
}
global.RECNOTE_LYRIC_WORKBENCH=Object.freeze({normalize,lines,mapping,validation,transfer,previewMigration,draftKey,displayKey,fetchDraft,saveDraft});
})(window);
