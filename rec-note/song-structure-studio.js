/* REC NOTE v19: musical sections (A/B/chorus) and short-cut planning.
   Music structure lives in lyricTimings as independent owner-scoped records.
   NEVER edits source lyrics or changes existing lyric or intro/interlude/outro records. */
(function(){
'use strict';
if(!/\/lyric-sync(?:\.html)?\/?$/i.test(location.pathname))return;
if(typeof state==='undefined'||typeof persist!=='function'||!window.RECNOTE_STRUCTURE_CORE)return;
const core=window.RECNOTE_STRUCTURE_CORE;
const $=id=>document.getElementById(id),root=$('syncStudio'),audio=$('audio');
const cloud=window.RECNOTE_CLOUD_MEDIA;
if(!root||!audio||!cloud)return;
const open=document.createElement('button');open.id='ssOpen';open.type='button';
open.textContent='楽曲構成・ショート';open.setAttribute('aria-expanded','false');
const nav=$('fullSongTabs')||$('syncModeBar');
if(!nav)return;
nav.append(open);
const panel=document.createElement('section');panel.id='ssPanel';panel.className='ssPanel';
panel.hidden=true;
panel.innerHTML=[
 '<header class="ssHeader"><div><small>SONG MAP / SHORT CUTS</small><h2>楽曲構成・ショート候補</h2><p>歌詞は変更せず、Aメロ・Bメロ・サビなどを時間で管理します。</p></div><button type="button" id="ssClose">歌詞に戻る ×</button></header>',
 '<div id="ssStatus" class="ssStatus" role="status">区間データを読み込んでいます。</div>',
 '<nav class="ssTabs" aria-label="楽曲構成とショート候補"><button id="ssTabSection" type="button">楽曲構成</button><button id="ssTabShort" type="button">ショート候補</button></nav>',
 '<div class="ssLayout"><section class="ssListArea"><div class="ssSubHead"><strong id="ssListTitle">登録済み区間</strong><button type="button" id="ssAdd">＋ 区間を追加</button></div>',
 '<div id="ssList" class="ssList"></div>',
 '<details class="ssSeed" id="ssSeed"><summary>前回の仮マップを利用する</summary><p>前回整理した曲構成は、音源による確定前の推定です。既存データを上書きせず、未登録分だけ「確認待ち」で追加します。</p><button id="ssImport" type="button">この曲の仮候補を取り込む</button></details>',
 '<details class="ssOld" id="ssOld"><summary>登録済みの前奏・間奏・後奏を見る（読み取り専用）</summary><div id="ssOldList"></div></details></section>',
 '<section class="ssEditArea" id="ssEditArea"><div class="ssSubHead"><strong id="ssFormTitle">区間を追加</strong><span id="ssEditorStatus">未登録</span></div>',
 '<div class="ssRow"><label id="ssTypeWrap">構成の種類<select id="ssType"></select></label><label>表示名<input id="ssName" type="text" maxlength="80" placeholder="例：Aメロ1／ラスサビ"></label></div>',
 '<div class="ssRow ssTimeRow"><label>開始時刻<input id="ssStart" type="text" inputmode="decimal" placeholder="1:20.00"></label><label>終了時刻<input id="ssEnd" type="text" inputmode="decimal" placeholder="1:45.00"></label></div>',
 '<div class="ssRow ssCapture"><button id="ssCaptureStart" type="button">再生位置を開始に設定</button><button id="ssCaptureEnd" type="button">再生位置を終了に設定</button><button id="ssPreview" type="button">この区間を再生</button></div>',
 '<div class="ssNudges"><button type="button" data-ss-nudge="start:-0.1">開始 −0.1秒</button><button type="button" data-ss-nudge="start:0.1">開始 ＋0.1秒</button><button type="button" data-ss-nudge="end:-0.1">終了 −0.1秒</button><button type="button" data-ss-nudge="end:0.1">終了 ＋0.1秒</button></div>',
 '<label class="ssNote">制作メモ<textarea id="ssNote" rows="2" placeholder="盛り上がり、ショート向きの理由など"></textarea></label>',
 '<p id="ssOverlap" class="ssHint"></p>',
 '<div class="ssActions"><button id="ssSave" class="ssMain" type="button">下書き保存</button><button id="ssApprove" type="button">音源で確認済みにする</button><button id="ssMakeShort" type="button">この区間からショート候補</button><button id="ssDelete" type="button">削除</button></div>',
 '<p class="ssFootnote">確認前の区間は「仮」。音源を聴いて開始・終了を決めてから確定してください。歌詞の編集は専用ページのみです。</p></section></div>',
 '<div class="ssBottom"><button id="ssExport" type="button">構成＋ショート候補をJSON保存</button><a href="./lyric-editor" id="ssLyricsLink">歌詞の編集専用ページ</a></div>'
].join('');
root.insertBefore(panel,$('fullSongSections')?.nextSibling||$('syncModeBar'));
for(const [type,label] of core.TYPES){
 const option=document.createElement('option');option.value=type;option.textContent=label;$('ssType').append(option);
}
let mode='music-structure',selectedId=null,previewStop=null,initialForm=null,formChanged=false,draftTimer=null,shortSourceRegionId=null;
const inputIds=['ssType','ssName','ssStart','ssEnd','ssNote'];
const records=()=>Array.isArray(state.lyricTimings)?state.lyricTimings:(state.lyricTimings=[]);
const targetList=()=>records().filter(x=>mode==='music-structure'?core.isArrangement(x,song):core.isShort(x,song))
 .sort((a,b)=>(a.start??Infinity)-(b.start??Infinity)||(a.label||'').localeCompare(b.label||''));
const current=()=>selectedId?records().find(x=>x.id===selectedId&&!x.deleted&&!x.syncConflictOf):null;
const conflicts=id=>records().filter(x=>x.syncConflictOf===id);
const loggedIn=()=>cloud.isSignedIn();
const ready=()=>loggedIn()&&audio.readyState>=1;
const nowTime=()=>{
 let offset=0;
 try{
  const key=localStorage.getItem('rec_note_sync_offset_v7:'+song);
  if(key!==null)offset=Number(key)||0;
  else if(/_1119\.mp3$/i.test(files[song]?.name||''))offset=-.022;
 }catch(_e){}
 return Math.round(Math.max(0,(Number(audio.currentTime)||0)+offset)*100)/100;
};
const seekOriginal=t=>{
 if(audio.readyState<1)return;
 const offset=nowTime()-(Number(audio.currentTime)||0);
 audio.currentTime=Math.max(0,Math.min(audio.duration||Infinity,t-offset));
};
function status(msg,error=false){$('ssStatus').textContent=msg;$('ssStatus').dataset.error=error?'true':'false';}
function formKey(id=selectedId,what=mode){return 'recnote-structure-form-v1:'+song+':'+what+':'+(id||'new');}
function formValues(){
 return {type:mode==='music-structure'?$('ssType').value:null,label:$('ssName').value,start:$('ssStart').value,end:$('ssEnd').value,note:$('ssNote').value,sourceRegionId:mode==='short-cut'?shortSourceRegionId:null};
}
function restoreForm(data){
 shortSourceRegionId=mode==='short-cut'?(data?.sourceRegionId||null):null;
 $('ssType').value=core.ALLOWED.has(data?.type)?data.type:'verse';
 $('ssName').value=data?.label||'';
 $('ssStart').value=Number.isFinite(data?.start)?core.formatTime(data.start):data?.start||'';
 $('ssEnd').value=Number.isFinite(data?.end)?core.formatTime(data.end):data?.end||'';
 $('ssNote').value=data?.note||'';
 formChanged=false;initialForm=JSON.stringify(formValues());
}
function saveFormDraft(){
 if(!formChanged||!loggedIn())return;
 state.drafts=state.drafts&&typeof state.drafts==='object'?state.drafts:{};
 state.drafts[formKey()]={...formValues(),schema:1,updatedAt:new Date().toISOString()};
 persist();
 $('ssEditorStatus').textContent='入力を下書き保存';
}
function flushDraft(){clearTimeout(draftTimer);saveFormDraft();}
function clearFormDraft(id=selectedId,what=mode){
 if(state.drafts&&state.drafts[formKey(id,what)])delete state.drafts[formKey(id,what)];
}
function setMode(next){
 if(next===mode)return;
 flushDraft();mode=next;selectedId=null;previewStop=null;
 restoreForm(state.drafts?.[formKey()]||{type:'verse'});
 render();
}
function selectRecord(id){
 flushDraft();selectedId=id;previewStop=null;
 const raw=current();
 restoreForm(state.drafts?.[formKey()]||raw||{type:'verse'});
 render();
 $('ssEditArea').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function newRecord(){
 flushDraft();selectedId=null;previewStop=null;
 restoreForm(state.drafts?.[formKey()]||{type:'verse'});
 render();
}
function renderOld(){
 const list=$('ssOldList');list.replaceChildren();
 const data=records().filter(x=>x.kind==='song-section'&&x.song===song&&!x.deleted&&!x.syncConflictOf)
  .sort((a,b)=>(a.start??Infinity)-(b.start??Infinity));
 if(!data.length){list.textContent='前奏・間奏・後奏は未登録です。';return;}
 for(const x of data){
  const item=document.createElement('div');item.className='ssReadOnly';
  const title=x.sectionType==='intro'?'前奏':x.sectionType==='outro'?'後奏':x.sectionType==='interlude'?'間奏':'その他';
  item.textContent=title+'｜'+core.formatTime(x.start)+' ～ '+core.formatTime(x.end)+(x.status==='confirmed'?'（確認済み）':'（仮）');
  list.append(item);
 }
}
function render(){
 if(panel.hidden)return;
 const locked=!loggedIn();
 $('ssTabSection').classList.toggle('active',mode==='music-structure');
 $('ssTabShort').classList.toggle('active',mode==='short-cut');
 $('ssTypeWrap').hidden=mode==='short-cut';
 $('ssListTitle').textContent=mode==='music-structure'?'曲の区間':'切り出し候補';
 $('ssAdd').textContent=mode==='music-structure'?'＋ 区間を追加':'＋ ショート候補';
 $('ssSeed').querySelector('summary').textContent=mode==='music-structure'?'前回の構成仮マップを利用する':'前回のショート候補を利用する';
 $('ssImport').textContent=mode==='music-structure'?'この曲の構成候補を取り込む':'この曲のショート候補を取り込む';
 $('ssMakeShort').hidden=mode==='short-cut';
 $('ssFormTitle').textContent=(selectedId?'編集：':'新規：')+(mode==='music-structure'?'楽曲構成':'ショート候補');
 const r=current(),conflict=r&&conflicts(r.id).length;
 $('ssDelete').hidden=!r;
 $('ssApprove').disabled=locked||!r||!!conflict||r?.status==='confirmed';
 $('ssSave').disabled=locked||!!conflict;
 $('ssImport').disabled=locked;
 $('ssMakeShort').disabled=locked||!r||!Number.isFinite(r?.start)||!Number.isFinite(r?.end);
 $('ssEditorStatus').textContent=conflict?'クラウド競合：編集不可':r?.status==='confirmed'?'確認済み':r?'登録済み・確認待ち':'未登録';
 if(mode==='short-cut'&&shortSourceRegionId&&r?.sourceRegionId) $('ssOverlap').textContent='元になった楽曲構成から作成した候補です。';
 $('ssLyricsLink').href='./lyric-editor?'+new URLSearchParams({song}).toString();
 $('ssCaptureStart').disabled=!ready();$('ssCaptureEnd').disabled=!ready();
 $('ssPreview').disabled=!ready();
 const list=$('ssList');list.replaceChildren();
 const rows=targetList(),confirmed=rows.filter(x=>x.status==='confirmed').length;
 if(!rows.length){
  const empty=document.createElement('p');empty.className='ssEmpty';
  empty.textContent=mode==='music-structure'?'まだ構成区間がありません。＋追加、または仮マップを取り込んでください。':'まだショート候補がありません。曲の区間から作成できます。';
  list.append(empty);
 }
 for(const x of rows){
  const item=document.createElement('button');item.type='button';item.className='ssItem'+(x.id===selectedId?' selected':'');
  const head=document.createElement('strong');head.textContent=x.label||core.typeLabel(x.type);
  const detail=document.createElement('small');detail.textContent=
   (mode==='music-structure'?core.typeLabel(x.type)+' ・ ':'')+core.formatTime(x.start)+' – '+core.formatTime(x.end);
  const tag=document.createElement('span');tag.className='ssTag';tag.textContent=x.status==='confirmed'?'確認済み':'仮';
  item.append(head,detail,tag);
  item.onclick=()=>selectRecord(x.id);
  list.append(item);
 }
 $('ssListTitle').textContent=(mode==='music-structure'?'曲の区間':'切り出し候補')+'　'+rows.length+'件（確認済み '+confirmed+'件）';
 renderOld();
 if(locked)status('ログインすると区間を保存できます。保存済みの歌詞・時刻には影響しません。');
 else if(!formChanged)status('クラウド同期対象として区間を管理します。歌詞や録音の時刻とは別のデータです。');
 const overlap=core.overlapWarnings(records(),{...formTyped(false),id:selectedId,song});
 $('ssOverlap').textContent=overlap.length?'他の楽曲構成と時間が重なります：'+overlap.join('／'):'';
}
function formTyped(strict=true){
 const a=core.parseTime($('ssStart').value),b=core.parseTime($('ssEnd').value);
 const v={type:mode==='music-structure'?$('ssType').value:null,label:$('ssName').value.trim(),start:a,end:b,note:$('ssNote').value.trim().slice(0,1000),sourceRegionId:mode==='short-cut'?shortSourceRegionId:null};
 if(strict){
  if(!v.label||v.label.length>80)throw Error('区間名を1～80文字で入力してください。');
  if(mode==='music-structure'&&!core.ALLOWED.has(v.type))throw Error('構成の種類を選択してください。');
  const error=core.validInterval(v.start,v.end,audio.readyState>=1?audio.duration:null);
  if(error)throw Error(error);
 }
 return v;
}
function uid(){
 if(typeof crypto!=='undefined'&&crypto.randomUUID)return crypto.randomUUID();
 const b=new Uint8Array(16);crypto.getRandomValues(b);
 return [...b].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function write(confirmed=false){
 if(!loggedIn()){status('先にログインしてください。',true);return false;}
 try{
  const value=formTyped(true),r=current();
  if(r&&conflicts(r.id).length)throw Error('別端末との編集競合があります。解消するまで上書きできません。');
  const error=core.validInterval(value.start,value.end,audio.readyState>=1?audio.duration:null,confirmed);
  if(error)throw Error(error);
  const id=r?.id||core.recordId(song,mode,uid());
  const row={...r,...value,id,kind:mode,song,
   workId:'recnote-arrangement:'+song,textVersionId:core.VER,
   lineIndex:mode==='music-structure'?-10000:-20000,
   status:confirmed?'confirmed':'draft',
   confirmedAt:confirmed?new Date().toISOString():null,
   deleted:false,source:r?.source||'manual',updatedAt:new Date().toISOString()};
  const all=records(),idx=all.findIndex(x=>x.id===id);
  if(idx>=0)all[idx]=row;else all.push(row);
  clearFormDraft();
  selectedId=id;formChanged=false;initialForm=JSON.stringify(formValues());
  persist();render();
  status(confirmed?'区間を確認済みとして保存しました。':'下書きを保存しました。クラウド同期を確認してください。');
  window.dispatchEvent(new CustomEvent('recnote:structure-updated',{detail:{song,kind:mode}}));
  return true;
 }catch(e){status(e.message,true);return false;}
}
function remove(){
 const r=current();if(!r||!loggedIn())return;
 if(conflicts(r.id).length){status('競合がある区間は削除できません。',true);return;}
 if(!confirm('「'+(r.label||'未記名')+'」を削除しますか？ 歌詞と録音の時刻は変更しません。'))return;
 const all=records(),idx=all.findIndex(x=>x.id===r.id);
 all[idx]={...r,deleted:true,status:'draft',confirmedAt:null,updatedAt:new Date().toISOString()};
 clearFormDraft();persist();selectedId=null;restoreForm({type:'verse'});render();status('区間を削除しました。');
}
function importDraftMap(){
 if(!loggedIn()){status('先にログインしてください。',true);return;}
 const source=core.seedFor(song,mode);if(!source.length){status('この曲の仮マップはありません。',true);return;}
 const existing=targetList();
 const pending=source.filter(x=>!existing.some(y=>Math.abs(y.start-x.start)<.03&&Math.abs(y.end-x.end)<.03));
 if(!pending.length){status('仮マップの候補はすでに登録されています。');return;}
 if(!confirm('この曲の'+pending.length+'件を「仮・確認待ち」で追加しますか？ 既存データは上書きしません。'))return;
 const all=records();
 for(const v of pending){
  all.push({...v,id:core.recordId(song,mode,uid()),kind:mode,song,
   workId:'recnote-arrangement:'+song,textVersionId:core.VER,
   lineIndex:mode==='music-structure'?-10000:-20000,
   confirmedAt:null,deleted:false,updatedAt:new Date().toISOString()});
 }
 persist();render();status(pending.length+'件の仮候補を追加しました。音源を聴いて確認してください。');
}
function addFromSection(){
 const r=current(),preset=core.clipFromSection(r);
 if(!preset){status('開始・終了が登録されている区間から作成してください。',true);return;}
 flushDraft();mode='short-cut';selectedId=null;restoreForm(preset);
 formChanged=true;saveFormDraft();render();status('ショート候補の下書きを作成しました。時刻と内容を確認して保存してください。');
}
function capture(field){
 if(!ready()){status('再生可能な音源とログインが必要です。',true);return;}
 $(field==='start'?'ssStart':'ssEnd').value=core.formatTime(nowTime());onEdit();
}
function listen(){
 if(!ready()){status('音源を読み込んでください。',true);return;}
 try{
  const x=formTyped(true);
  if(x.start===null)throw Error('開始時刻を設定してください。');
  seekOriginal(Math.max(0,x.start-.25));
  previewStop=Number.isFinite(x.end)?x.end+.5:x.start+15;
  audio.play().catch(e=>status('再生できません：'+e.message,true));
 }catch(e){status(e.message,true);}
}
function download(){
 const info=core.exportPlan(song,records(),new Date());
 const blob=new Blob([JSON.stringify(info,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='楽曲構成とショート候補_'+song+'.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
 status('区間一覧・ショート候補・既存の前奏／間奏／後奏のJSONを書き出しました。');
}
function onEdit(){
 formChanged=JSON.stringify(formValues())!==initialForm;
 $('ssEditorStatus').textContent=formChanged?'編集中・自動下書き保存':'変更なし';
 const typed=formTyped(false),overlap=core.overlapWarnings(records(),{...typed,song,id:selectedId});
 $('ssOverlap').textContent=overlap.length?'他の構成区間と重なります：'+overlap.join('／'):'';
 clearTimeout(draftTimer);
 if(formChanged)draftTimer=setTimeout(saveFormDraft,650);
}
function changeSong(){
 flushDraft();selectedId=null;restoreForm(state.drafts?.[formKey()]||{type:'verse'});
 if(!panel.hidden)render();
}
function openPanel(){
 if(!$('fullSongSections')?.hidden)$('fsClose')?.click();
 panel.hidden=false;root.classList.add('syncArrangementActive');open.setAttribute('aria-expanded','true');
 if(!initialForm)restoreForm(state.drafts?.[formKey()]||{type:'verse'});
 render();panel.scrollIntoView({block:'start',behavior:'smooth'});
}
function closePanel(){
 flushDraft();panel.hidden=true;root.classList.remove('syncArrangementActive');
 open.setAttribute('aria-expanded','false');previewStop=null;
}
open.onclick=()=>panel.hidden?openPanel():closePanel();
$('ssClose').onclick=closePanel;
$('ssTabSection').onclick=()=>setMode('music-structure');
$('ssTabShort').onclick=()=>setMode('short-cut');
$('ssAdd').onclick=newRecord;
$('ssSave').onclick=()=>write(false);
$('ssApprove').onclick=()=>{
 const r=current();if(!r){status('先に区間を保存してください。',true);return;}
 if(!confirm('音源を聴いて区間を確認しましたか？ 確認済みとして登録します。'))return;
 write(true);
};
$('ssDelete').onclick=remove;
$('ssImport').onclick=importDraftMap;
$('ssMakeShort').onclick=addFromSection;
$('ssCaptureStart').onclick=()=>capture('start');
$('ssCaptureEnd').onclick=()=>capture('end');
$('ssPreview').onclick=listen;
$('ssExport').onclick=download;
for(const id of inputIds){$(id).addEventListener('input',onEdit);$(id).addEventListener('change',onEdit);}
for(const b of panel.querySelectorAll('[data-ss-nudge]')){
 b.onclick=()=>{
  const [side,offset]=b.dataset.ssNudge.split(':'),input=$(side==='start'?'ssStart':'ssEnd'),value=core.parseTime(input.value);
  if(value===null||!Number.isFinite(value)){status('先に開始・終了時刻を入力してください。',true);return;}
  input.value=core.formatTime(Math.max(0,value+Number(offset)));onEdit();
 };
}
audio.addEventListener('timeupdate',()=>{
 if(previewStop!==null&&nowTime()>=previewStop){audio.pause();previewStop=null;}
});
window.addEventListener('recnote:cloud-synced',()=>{if(!panel.hidden)render();});
window.addEventListener('recnote:cloud-auth-change',()=>{if(!panel.hidden)render();});
audio.addEventListener('loadedmetadata',()=>{if(!panel.hidden)render();});
for(const b of root.querySelectorAll('[data-song]'))b.addEventListener('click',changeSong);
for(const id of ['fsOpenIntro','fsOpenInterlude','fsOpenOutro'])$(id)?.addEventListener('click',()=>{if(!panel.hidden)closePanel();});
window.addEventListener('pagehide',flushDraft);
restoreForm(state.drafts?.[formKey()]||{type:'verse'});
window.RECNOTE_STRUCTURE_STUDIO=Object.freeze({open:openPanel,close:closePanel});
})();
