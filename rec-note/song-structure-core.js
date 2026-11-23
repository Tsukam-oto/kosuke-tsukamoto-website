/* REC NOTE v19: musical arrangement & short cut core.
   Completely separate from lyric text, display line breaks and existing song-section records. */
(function(global){
'use strict';
const TYPES=Object.freeze([
 ['verse','Aメロ'],['prechorus','Bメロ'],['chorus','サビ'],
 ['postchorus','サビ後半'],['bridge','Cメロ・ブリッジ'],
 ['interlude','間奏'],['intro','前奏'],['outro','後奏'],['instrumental','器楽'],['other','その他']
]);
const ALLOWED=new Set(TYPES.map(x=>x[0]));
const PREFIX='recnote-arrangement-v1';
const SHORT_PREFIX='recnote-short-plan-v1';
const VER='recnote-structure-v1';
const seedSections={
 'あなたと':[
 ['verse','Aメロ1（仮）',19.89,46.63],['prechorus','Bメロ1候補',46.63,80.79],
 ['chorus','サビ1候補',80.79,118.53],['verse','Aメロ2候補',136.55,164.10],
 ['chorus','後半サビ候補',164.10,204.98]],
 'これから':[
 ['verse','Aメロ1候補',31.12,71.89],['prechorus','Bメロ1候補',71.89,88.11],
 ['chorus','サビ1候補',88.11,115.40],['verse','Aメロ2候補',115.40,169.50],
 ['prechorus','Bメロ2候補',169.50,196.78],['chorus','後半サビ候補',196.78,232.09]],
 'これからも':[
 ['verse','Aメロ1候補',27.40,72.28],['prechorus','Bメロ1候補',72.28,90.36],
 ['chorus','サビ1候補',90.36,114.36],['postchorus','サビ後半候補',114.36,140.54],
 ['verse','Aメロ2候補',165.50,190.80],['prechorus','Bメロ2候補',190.80,220.00],
 ['bridge','Cメロ／ブリッジ候補',220.00,245.51],['chorus','ラスサビ候補',245.51,278.55]]
};
const seedShorts={
 'あなたと':[['1番サビ候補',80.79,101.40,'1番サビの候補'],['後半の展開候補',164.10,187.72,'後半の展開候補']],
 'これから':[['特別なあなたへ',88.11,110.61,'特別なあなたへの候補'],['先輩から受け継ぐ場面',138.39,160.64,'先輩から受け継ぐ場面の候補']],
 'これからも':[['救われたことと幸せ',102.25,126.35,'救われたことと幸せの話の候補'],['「どうか」からの展開',203.43,223.16,'「どうか」からの展開候補']]
};
function parseTime(value){
 const s=String(value??'').trim().replace(/：/g,':');
 if(!s)return null;
 const matched=s.match(/^(\d+):([0-5]?\d)(?:\.(\d{1,3}))?$/);
 if(matched)return +(Number(matched[1])*60+Number(matched[2])+Number('0.'+(matched[3]||'0'))).toFixed(3);
 if(/^\d+(?:\.\d{1,3})?$/.test(s))return +Number(s).toFixed(3);
 return NaN;
}
function formatTime(value){
 if(!Number.isFinite(value))return '—';
 let n=Math.round(Math.max(0,value)*100);
 return Math.floor(n/6000)+':'+String(Math.floor(n/100)%60).padStart(2,'0')+'.'+String(n%100).padStart(2,'0');
}
function validInterval(start,end,duration,complete=false){
 if(start!==null&&(!Number.isFinite(start)||start<0))return '開始時刻が不正です。';
 if(end!==null&&(!Number.isFinite(end)||end<0))return '終了時刻が不正です。';
 if(end!==null&&start===null)return '終了を設定するには、開始時刻が必要です。';
 if(start!==null&&end!==null&&end<=start)return '終了時刻は開始より後にしてください。';
 if(complete&&(start===null||end===null))return '開始・終了の両方を入力してください。';
 if(Number.isFinite(duration)&&duration>0&&
    ((start!==null&&start>duration+.5)||(end!==null&&end>duration+.5)))
    return '音源の長さを超えています。';
 return '';
}
function recordId(song,kind,uuid){return (kind==='short-cut'?SHORT_PREFIX:PREFIX)+':'+encodeURIComponent(song)+':'+uuid;}
function isArrangement(x,song){return !!x&&x.kind==='music-structure'&&x.song===song&&!x.deleted&&!x.syncConflictOf;}
function isShort(x,song){return !!x&&x.kind==='short-cut'&&x.song===song&&!x.deleted&&!x.syncConflictOf;}
function typeLabel(type){return TYPES.find(x=>x[0]===type)?.[1]||'その他';}
function seedFor(song,kind){
 const arr=kind==='short-cut'?seedShorts[song]:seedSections[song];
 return (arr||[]).map((entry,n)=>kind==='short-cut'?
  {label:entry[0],start:entry[1],end:entry[2],note:entry[3],source:'ep-draft-map-v01',sourceSeedKey:'ep-v01:'+kind+':'+n,status:'draft'}:
  {type:entry[0],label:entry[1],start:entry[2],end:entry[3],note:'以前の仮マップから。音源で確認して確定してください。',source:'ep-draft-map-v01',sourceSeedKey:'ep-v01:'+kind+':'+n,status:'draft'});
}
function clipFromSection(region){
 if(!Number.isFinite(region?.start)||!Number.isFinite(region?.end)||region.end<=region.start)return null;
 return {label:'ショート候補｜'+(region.label||typeLabel(region.type)),
  start:region.start,end:Math.min(region.end,Math.round((region.start+25)*100)/100),
  note:'元区間：'+(region.label||typeLabel(region.type))+'。音声を確認して始点・終点を確定してください。',
  sourceRegionId:region.id,source:'selected-music-section',status:'draft'};
}
function exportPlan(song,data,now,ctx){
 const all=Array.isArray(data)?data:[];
 const structure=all.filter(x=>isArrangement(x,song)).sort((a,b)=>(a.start??Infinity)-(b.start??Infinity));
 const clips=all.filter(x=>isShort(x,song)).sort((a,b)=>(a.start??Infinity)-(b.start??Infinity));
 const traditional=all.filter(x=>x.kind==='song-section'&&x.song===song&&!x.deleted&&!x.syncConflictOf)
  .map(x=>({label:x.sectionType==='intro'?'前奏':x.sectionType==='outro'?'後奏':x.sectionType==='interlude'?'間奏':'その他',
    sectionKey:x.sectionKey,start:x.start??null,end:x.end??null,status:x.status}));
 const clean=v=>{
  const mapped=ctx?linkInterval(v,ctx):{start:v.start??null,end:v.end??null,issue:'歌詞タイミング未照合',linked:false};
  const valid=!!mapped.linked&&!mapped.issue;
  const changed=valid&&(Math.abs((v.start??0)-mapped.start)>.02||Math.abs((v.end??0)-mapped.end)>.02);
  return {id:v.id,label:v.label||'',type:v.type||null,start:valid?mapped.start:null,end:valid?mapped.end:null,
   duration:valid?+(mapped.end-mapped.start).toFixed(3):null,
   startLyricIndex:Number.isInteger(v.startLyricIndex)?v.startLyricIndex:null,
   endLyricIndex:Number.isInteger(v.endLyricIndex)?v.endLyricIndex:null,
   lyricVersionId:v.lyricVersionId||null,
   linkage:valid?(changed?'lyrics-updated-recheck':'lyrics-linked'):(mapped.issue||'unlinked'),
   note:v.note||'',status:changed&&v.status==='confirmed'?'needs-reconfirmation':v.status,
   source:v.source||'manual',sourceSeedKey:v.sourceSeedKey||null,sourceRegionId:v.sourceRegionId||null};
 };
 return {schemaVersion:2,source:'REC_NOTE_ARRANGEMENT_SHORT_PLAN',song,exportedAt:(now||new Date()).toISOString(),
  lyricVersionId:ctx?.versionId||null,
  caveat:'歌詞との連動が確認できた区間のみ時刻を出力。未連動・異なる歌詞版・開始終了時刻未登録はnullで警告します。',
  sections:structure.map(clean),shortCandidates:clips.map(clean),existingInstrumentalSections:traditional};
}
function overlapWarnings(list,record){
 if(!Number.isFinite(record?.start)||!Number.isFinite(record?.end))return [];
 return (list||[]).filter(x=>x&&x.id!==record.id&&!x.deleted&&!x.syncConflictOf
  &&x.kind==='music-structure'&&x.song===record.song&&Number.isFinite(x.start)&&Number.isFinite(x.end)
  &&Math.min(x.end,record.end)-Math.max(x.start,record.start)>.15)
  .map(x=>x.label||typeLabel(x.type));
}

/* v19.1: lyric-index anchors are the ONLY authority for section boundaries.
   Never invent timings: pick registered start from first lyric, ending from final
   lyric's registered end or next lyric/instrument start. */
function buildLyricContext(song,read,records,duration){
 const latest=read?.versions?.[0];
 if(!read?.work?.id||!latest?.id||typeof latest.literal_text!=='string')return null;
 const raw=latest.literal_text.split(/\r?\n/),all=Array.isArray(records)?records:[];
 const cues=raw.map((text,index)=>{
  if(!text.trim())return null;
  const id='lyric-line:'+read.work.id+':'+latest.id+':'+index;
  const row=all.find(x=>x.id===id&&!x.deleted&&!x.syncConflictOf);
  const conflict=all.some(x=>x.syncConflictOf===id);
  return {index,text,start:Number.isFinite(row?.start)?row.start:null,
   end:Number.isFinite(row?.end)?row.end:null,status:row?.status||'unregistered',conflict};
 }).filter(Boolean);
 const instrumental=all.filter(x=>x.song===song&&x.kind==='song-section'&&!x.deleted&&!x.syncConflictOf
  &&['interlude','outro'].includes(x.sectionType)&&Number.isFinite(x.start))
  .map(x=>({start:x.start,type:x.sectionType}));
 return {song,workId:read.work.id,versionId:latest.id,versionNo:latest.version_no,cues,
  instrumental,duration:Number.isFinite(duration)&&duration>0?duration:null};
}
function rangeFromLyrics(ctx,first,last){
 if(!ctx?.cues?.length)return {start:null,end:null,issue:'歌詞タイミングを取得できていません。'};
 const a=ctx.cues.find(x=>x.index===Number(first)),b=ctx.cues.find(x=>x.index===Number(last));
 if(!a||!b||a.index>b.index)return {start:null,end:null,issue:'開始・最後の歌詞を正しく選択してください。'};
 if(a.conflict||b.conflict)return {start:null,end:null,issue:'歌詞のタイミングにクラウド競合があります。'};
 if(!Number.isFinite(a.start))return {start:null,end:null,issue:'開始する歌詞に時刻が登録されていません。'};
 if(!Number.isFinite(b.start))return {start:a.start,end:null,issue:'最後の歌詞に開始時刻がありません。'};
 if(b.start<a.start)return {start:a.start,end:null,issue:'歌詞の時刻が逆転しています。'};
 const next=ctx.cues.find(x=>x.index>b.index&&Number.isFinite(x.start)&&x.start>b.start);
 const candidates=[];
 if(Number.isFinite(b.end)&&b.end>b.start)candidates.push({value:b.end,source:'最後の歌詞の終了'});
 if(next)candidates.push({value:next.start,source:'次の歌詞の開始'});
 for(const item of ctx.instrumental||[]){
  if(item.start>b.start)candidates.push({value:item.start,source:'間奏・後奏の開始'});
 }
 // Audio duration is valid only when the selected lyric is the very last lyric.
 if(b.index===ctx.cues.at(-1)?.index&&Number.isFinite(ctx.duration)&&ctx.duration>b.start)
  candidates.push({value:ctx.duration,source:'音源の終わり'});
 candidates.sort((x,y)=>x.value-y.value);
 const chosen=candidates[0],end=chosen?.value??null;
 if(!Number.isFinite(end)||end<=a.start)return {start:a.start,end:null,issue:'最後の歌詞の終了境界がありません。歌詞の時刻を確認してください。'};
 return {start:a.start,end:+end.toFixed(2),issue:'',endSource:chosen.source,
  firstLyric:a.text,lastLyric:b.text,lyricVersionId:ctx.versionId,
  startLyricIndex:a.index,endLyricIndex:b.index};
}
function linkInterval(record,ctx){
 if(!Number.isInteger(record?.startLyricIndex)||!Number.isInteger(record?.endLyricIndex))
  return {start:record?.start??null,end:record?.end??null,issue:'歌詞との連動が未設定です。歌詞を選んで保存してください。',linked:false};
 if(!ctx?.versionId)return {start:null,end:null,issue:'現在の歌詞版を読み込めません。',linked:false};
 if(record.lyricVersionId!==ctx.versionId)return {start:null,end:null,issue:'歌詞の版が更新されています。歌詞の範囲を選び直してください。',linked:false};
 return {...rangeFromLyrics(ctx,record.startLyricIndex,record.endLyricIndex),linked:true};
}
function anchorFromApproximation(ctx,start,end){
 const available=ctx?.cues?.filter(x=>Number.isFinite(x.start))||[];
 if(!available.length||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return null;
 const first=available.find(x=>x.start>=start-.2)||available.at(-1);
 const last=available.filter(x=>x.index>=first.index&&x.start<end-.01).at(-1)||first;
 const range=rangeFromLyrics(ctx,first.index,last.index);
 if(range.issue)return null;
 return {startLyricIndex:first.index,endLyricIndex:last.index,lyricVersionId:ctx.versionId,
  start:range.start,end:range.end};
}

global.RECNOTE_STRUCTURE_CORE=Object.freeze({TYPES,ALLOWED,VER,parseTime,formatTime,validInterval,recordId,
 isArrangement,isShort,typeLabel,seedFor,clipFromSection,exportPlan,overlapWarnings,
 buildLyricContext,rangeFromLyrics,linkInterval,anchorFromApproximation});
})(window);
