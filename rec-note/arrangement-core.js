/* REC NOTE: song arrangement is one canonical timeline per song.
 * No lyric edits, no new login, no parallel database or short-specific records. */
(function(global){
'use strict';
const VERSION='recnote-arrangement-v1';
const PRESET=Object.freeze([
 ['intro','イントロ','intro'],
 ['a1','Aメロ','verse'],
 ['a2','Aメロ2','verse'],
 ['b1','Bメロ','prechorus'],
 ['chorus1','サビ','chorus'],
 ['interlude','間奏','interlude'],
 ['c1','Cメロ1','bridge'],
 ['c2','Cメロ2','bridge'],
 ['b2','Bメロ','prechorus'],
 ['chorus2','サビ','chorus'],
 ['chorus3','サビ2','chorus'],
 ['outro','後奏','outro']
].map((r,order)=>Object.freeze({key:r[0],label:r[1],type:r[2],order:order*10})));
const LABELS=Object.freeze({intro:'イントロ',verse:'Aメロ',prechorus:'Bメロ',chorus:'サビ',bridge:'Cメロ',interlude:'間奏',outro:'後奏',instrumental:'器楽',other:'その他'});
function recordId(song,key){return 'song-arrangement:'+encodeURIComponent(song)+':'+key;}
function isOwn(r,song){return !!r&&r.kind==='song-arrangement'&&r.song===song&&!r.deleted&&!r.syncConflictOf;}
function hasConflict(records,id){return (records||[]).some(x=>x?.syncConflictOf===id&&!x.deleted);}
function slots(records,song){
 const all=Array.isArray(records)?records:[];
 const byKey=new Map(all.filter(x=>isOwn(x,song)).map(x=>[x.slotKey,x]));
 const base=PRESET.map(s=>({...s,...(byKey.get(s.key)||{}),key:s.key,label:s.label,type:(byKey.get(s.key)?.type||s.type),order:Number.isFinite(byKey.get(s.key)?.order)?byKey.get(s.key).order:s.order}));
 const custom=all.filter(x=>isOwn(x,song)&&typeof x.slotKey==='string'&&x.slotKey.startsWith('custom-')&& !PRESET.some(s=>s.key===x.slotKey))
   .map(x=>({...x,key:x.slotKey,label:LABELS[x.type]||LABELS.other,order:Number.isFinite(x.order)?x.order:1000}));
 return [...base,...custom].sort((a,b)=>a.order-b.order||String(a.key).localeCompare(String(b.key)));
}
function validateStart(value,duration){
 if(value===null)return '';
 if(!Number.isFinite(value)||value<0)return '開始時刻は0秒以上の数値にしてください。';
 if(Number.isFinite(duration)&&duration>0&&value>duration+0.2)return '音源の長さを超えています。';
 return '';
}
function arrangement(records,song,duration){
 const all=Array.isArray(records)?records:[];
 const list=slots(all,song),active=list.filter(x=>!x.disabled);
 return list.map(s=>{
  const id=recordId(song,s.key),start=Number.isFinite(s.start)?s.start:null;
  const manual=Number.isFinite(s.end)?s.end:null;
  const here=active.findIndex(x=>x.key===s.key);
  const next=here>=0?active[here+1]:null;
  const nextStart=Number.isFinite(next?.start)?next.start:null;
  let end=null,endSource='',issue='';
  if(s.disabled)issue='この区間は使用しません。';
  else if(hasConflict(all,id))issue='別端末との編集競合があります。';
  else if(start===null)issue='開始未登録';
  else if(validateStart(start,duration))issue=validateStart(start,duration);
  else if(manual!==null){
   if(manual<=start||nextStart!==null&&manual>nextStart+0.02||Number.isFinite(duration)&&manual>duration+0.2)issue='終了時刻が範囲外です。';
   else {end=manual;endSource='手動指定';}
  } else if(next && nextStart!==null && nextStart>start){end=nextStart;endSource='次の区間の開始';}
  else if(next)issue=nextStart===null?'次の区間の開始を記録してください。':'区間の順序と開始時刻を確認してください。';
  else if(Number.isFinite(duration)&&duration>start){end=Math.round(duration*100)/100;endSource='音源の終端（要確認）';}
  else issue='終了時刻が必要です。';
  const previous=here>0?active[here-1]:null;
  if(!issue&&Number.isFinite(previous?.start)&&previous.start>=start)issue='前の区間より開始が早くなっています。';
  return {key:s.key,id,label:s.label,type:s.type,order:s.order,start,end,endSource,issue,
    status:s.status==='confirmed'?'confirmed':'draft',disabled:!!s.disabled,manualEnd:manual!==null,
    usable:!issue&&Number.isFinite(start)&&Number.isFinite(end)&&end>start,
    isPreset:PRESET.some(p=>p.key===s.key)};
 });
}
function exportPlan(records,song,duration){
 const sections=arrangement(records,song,duration);
 return {schemaVersion:1,source:'REC_NOTE_SONG_ARRANGEMENT',song,
   generatedAt:new Date().toISOString(),readOnlyForVideoStudio:true,
   sections:sections.filter(x=>!x.disabled).map(x=>({id:x.id,label:x.label,type:x.type,order:x.order,start:x.usable?x.start:null,end:x.usable?x.end:null,
    timingStatus:x.usable?(x.status==='confirmed'?'confirmed':'needs-review'):'incomplete',
    issue:x.issue,endSource:x.endSource}))};
}
global.RECNOTE_ARRANGEMENT_CORE=Object.freeze({VERSION,PRESET,LABELS,recordId,hasConflict,slots,validateStart,arrangement,exportPlan});
})(window);
