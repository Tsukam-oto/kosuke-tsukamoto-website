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
function exportPlan(song,data,now){
 const all=Array.isArray(data)?data:[];
 const structure=all.filter(x=>isArrangement(x,song)).sort((a,b)=>(a.start??Infinity)-(b.start??Infinity));
 const clips=all.filter(x=>isShort(x,song)).sort((a,b)=>(a.start??Infinity)-(b.start??Infinity));
 const traditional=all.filter(x=>x.kind==='song-section'&&x.song===song&&!x.deleted&&!x.syncConflictOf)
  .map(x=>({label:x.sectionType==='intro'?'前奏':x.sectionType==='outro'?'後奏':x.sectionType==='interlude'?'間奏':'その他',
    sectionKey:x.sectionKey,start:x.start??null,end:x.end??null,status:x.status}));
 const clean=(v)=>({id:v.id,label:v.label||'',type:v.type||null,start:v.start??null,end:v.end??null,
    duration:Number.isFinite(v.start)&&Number.isFinite(v.end)?+(v.end-v.start).toFixed(3):null,
    note:v.note||'',status:v.status,source:v.source||'manual',sourceSeedKey:v.sourceSeedKey||null,sourceRegionId:v.sourceRegionId||null});
 return {schemaVersion:1,source:'REC_NOTE_ARRANGEMENT_SHORT_PLAN',song,exportedAt:(now||new Date()).toISOString(),
  caveat:'編集・確認用の区間マップです。動画MP4ではありません。draftは正式な楽曲構成確定ではありません。',
  sections:structure.map(clean),shortCandidates:clips.map(clean),existingInstrumentalSections:traditional};
}
function overlapWarnings(list,record){
 if(!Number.isFinite(record?.start)||!Number.isFinite(record?.end))return [];
 return (list||[]).filter(x=>x&&x.id!==record.id&&!x.deleted&&!x.syncConflictOf
  &&x.kind==='music-structure'&&x.song===record.song&&Number.isFinite(x.start)&&Number.isFinite(x.end)
  &&Math.min(x.end,record.end)-Math.max(x.start,record.start)>.15)
  .map(x=>x.label||typeLabel(x.type));
}
global.RECNOTE_STRUCTURE_CORE=Object.freeze({TYPES,ALLOWED,VER,parseTime,formatTime,validInterval,recordId,
 isArrangement,isShort,typeLabel,seedFor,clipFromSection,exportPlan,overlapWarnings});
})(window);
