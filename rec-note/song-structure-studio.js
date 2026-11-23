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
 '<header class="ssHeader"><div><small>SONG MAP / SHORT CUTS</small><h2>楽曲構成・ショート候補</h2><p>歌詞の最初と最後を選ぶだけで、登録済みの歌詞タイミングから自動で区間が決まります。</p></div><button type="button" id="ssClose">歌詞に戻る ×</button></header>',
 '<div id="ssStatus" class="ssStatus" role="status">区間データを読み込んでいます。</div>',
 '<nav class="ssTabs" aria-label="楽曲構成とショート候補"><button id="ssTabSection" type="button">楽曲構成</button><button id="ssTabShort" type="button">ショート候補</button></nav>',
 '<div class="ssLayout"><section class="ssListArea"><div class="ssSubHead"><strong id="ssListTitle">登録済み区間</strong><button type="button" id="ssAdd">＋ 区間を追加</button></div>',
 '<div id="ssList" class="ssList"></div>',
 '<details class="ssSeed" id="ssSeed"><summary>前回の仮マップを利用する</summary><p>前回整理した曲構成は、音源による確定前の推定です。既存データを上書きせず、未登録分だけ「確認待ち」で追加します。</p><button id="ssImport" type="button">この曲の仮候補を取り込む</button></details>',
 '<details class="ssOld" id="ssOld"><summary>登録済みの前奏・間奏・後奏を見る（読み取り専用）</summary><div id="ssOldList"></div></details></section>',
 '<section class="ssEditArea" id="ssEditArea"><div class="ssSubHead"><strong id="ssFormTitle">区間を追加</strong><span id="ssEditorStatus">未登録</span></div>',
 '<div class="ssRow"><label id="ssTypeWrap">構成の種類<select id="ssType"></select></label><label>表示名<input id="ssName" type="text" maxlength="80" placeholder="例：Aメロ1／ラスサビ"></label></div>',
 '<div class="ssLyricSelect"><label>開始する歌詞<select id="ssFirstLyric"><option value="">歌詞を読み込み中…</option></select></label>',
 '<label>最後の歌詞（この行まで含む）<select id="ssLastLyric"><option value="">歌詞を読み込み中…</option></select></label></div>',
 '<div class="ssDerivedTime" id="ssDerivedTime" role="status">登録済みの歌詞タイミングから区間を自動取得します。</div>',
 '<div class="ssRow ssCapture"><button id="ssPreview" type="button">選んだ歌詞の範囲を試聴</button></div>',
 '<label class="ssNote">制作メモ<textarea id="ssNote" rows="2" placeholder="盛り上がり、ショート向きの理由など"></textarea></label>',
 '<p id="ssOverlap" class="ssHint"></p>',
 '<div class="ssActions"><button id="ssSave" class="ssMain" type="button">下書き保存</button><button id="ssApprove" type="button">音源で確認済みにする</button><button id="ssMakeShort" type="button">この区間からショート候補</button><button id="ssDelete" type="button">削除</button></div>',
 '<p class="ssFootnote">区間の時刻は歌詞のタイミングに連動します。時刻を修正する場合は従来の歌詞タイミング画面から行ってください。歌詞の文面は専用ページで編集します。</p></section></div>',
 '<div class="ssBottom"><button id="ssExport" type="button">構成＋ショート候補をJSON保存</button><a href="./lyric-editor" id="ssLyricsLink">歌詞の編集専用ページ</a></div>'
].join('');
root.insertBefore(panel,$('fullSongSections')?.nextSibling||$('syncModeBar'));
for(const [type,label] of core.TYPES){
 const option=document.createElement('option');option.value=type;option.textContent=label;$('ssType').append(option);
}
let mode='music-structure',selectedId=null,previewStop=null,initialForm=null,formChanged=false,draftTimer=null,shortSourceRegionId=null;
let lyricRead=null,lyricCtx=null,lyricSeq=0,selectedFirst=null,selectedLast=null,lyricIssue='';
const bridge=window.RECNOTE_LYRIC_BRIDGE;
const inputIds=['ssType','ssName','ssNote'];
const records=()=>Array.isArray(state.lyricTimings)?state.lyricTimings:(state.lyricTimings=[]);
const targetList=()=>records().filter(x=>mode==='music-structure'?core.isArrangement(x,song):core.isShort(x,song))
 .sort((a,b)=>((core.linkInterval(a,lyricCtx).start??Infinity)-(core.linkInterval(b,lyricCtx).start??Infinity))||(a.label||'').localeCompare(b.label||''));
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
function updateLyricContext(){
 lyricCtx=lyricRead?.work?.id?core.buildLyricContext(song,lyricRead,records(),audio.readyState>=1?audio.duration:null):null;
}
async function loadLyricCues(){
 const requestedSong=song,request=++lyricSeq;
 if(!bridge?.isSignedIn()){
  lyricRead=null;lyricCtx=null;lyricIssue='歌詞を取得するにはREC NOTEへログインしてください。';
  fillLyricSelectors();if(!panel.hidden)render();return;
 }
 lyricIssue='登録済みの歌詞と時刻を読み込んでいます…';
 if(!panel.hidden)status(lyricIssue);
 try{
  const data=await bridge.read(requestedSong);
  if(request!==lyricSeq||requestedSong!==song)return;
  lyricRead=data;updateLyricContext();
  lyricIssue=lyricCtx?'':'最新版の歌詞が見つかりません。';
  if(!formChanged){
   const saved=state.drafts?.[formKey()]||current()||{};
   restoreForm(saved);
  }else fillLyricSelectors();
  if(!panel.hidden)render();
 }catch(e){
  if(request!==lyricSeq)return;
  lyricRead=null;lyricCtx=null;lyricIssue='歌詞の読み込みに失敗：'+e.message;
  fillLyricSelectors();if(!panel.hidden)render();
 }
}
function fillLyricSelectors(){
 for(const [id,selectedValue] of [['ssFirstLyric',selectedFirst],['ssLastLyric',selectedLast]]){
  const select=$(id);select.replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';
  placeholder.textContent=lyricCtx?.cues?.length?'歌詞を選択してください':(lyricIssue||'歌詞のタイミングを読み込み中…');
  select.append(placeholder);
  for(const cue of lyricCtx?.cues||[]){
   const option=document.createElement('option');option.value=String(cue.index);
   option.textContent=String(cue.index+1).padStart(2,'0')+' '+core.formatTime(cue.start)+'｜'+cue.text.replace(/\s+/g,' ').slice(0,48);
   select.append(option);
  }
  select.value=Number.isInteger(selectedValue)?String(selectedValue):'';
  if(select.value!==String(selectedValue))select.value='';
 }
}
function currentRange(){
 return core.rangeFromLyrics(lyricCtx,selectedFirst,selectedLast);
}
function formValues(){
 return {type:mode==='music-structure'?$('ssType').value:null,
  label:$('ssName').value,startLyricIndex:selectedFirst,endLyricIndex:selectedLast,
  lyricVersionId:lyricCtx?.versionId||null,note:$('ssNote').value,
  sourceRegionId:mode==='short-cut'?shortSourceRegionId:null};
}
function restoreForm(data){
 shortSourceRegionId=mode==='short-cut'?(data?.sourceRegionId||null):null;
 $('ssType').value=core.ALLOWED.has(data?.type)?data.type:'verse';
 $('ssName').value=data?.label||'';
 $('ssNote').value=data?.note||'';
 let first=Number.isInteger(data?.startLyricIndex)?data.startLyricIndex:null;
 let last=Number.isInteger(data?.endLyricIndex)?data.endLyricIndex:null;
 const oldStart=Number.isFinite(data?.start)?data.start:core.parseTime(data?.start);
 const oldEnd=Number.isFinite(data?.end)?data.end:core.parseTime(data?.end);
 if((first===null||last===null)&&Number.isFinite(oldStart)&&Number.isFinite(oldEnd)){
  const inferred=core.anchorFromApproximation(lyricCtx,oldStart,oldEnd);
  if(inferred){first=inferred.startLyricIndex;last=inferred.endLyricIndex;}
 }
 selectedFirst=first;selectedLast=last;fillLyricSelectors();
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
 const locked=!loggedIn(),ctxReady=!!lyricCtx?.cues?.length;
 $('ssTabSection').classList.toggle('active',mode==='music-structure');
 $('ssTabShort').classList.toggle('active',mode==='short-cut');
 $('ssTypeWrap').hidden=mode==='short-cut';
 $('ssAdd').textContent=mode==='music-structure'?'＋ 区間を追加':'＋ ショート候補';
 $('ssSeed').querySelector('summary').textContent=mode==='music-structure'?'前回の構成仮マップを利用する':'前回のショート候補を利用する';
 $('ssImport').textContent=mode==='music-structure'?'この曲の構成候補を取り込む':'この曲のショート候補を取り込む';
 $('ssMakeShort').hidden=mode==='short-cut';
 $('ssFormTitle').textContent=(selectedId?'編集：':'新規：')+(mode==='music-structure'?'楽曲構成':'ショート候補');
 const currentRecord=current(),conflict=currentRecord&&conflicts(currentRecord.id).length;
 const range=currentRange(),rangeComplete=!range.issue&&Number.isFinite(range.start)&&Number.isFinite(range.end);
 const savedRange=currentRecord?core.linkInterval(currentRecord,lyricCtx):null;
 const changed=!!savedRange?.linked&&!savedRange.issue&&
  (Math.abs((currentRecord?.start??0)-savedRange.start)>.02||Math.abs((currentRecord?.end??0)-savedRange.end)>.02);
 $('ssDelete').hidden=!currentRecord;
 $('ssApprove').disabled=locked||!ctxReady||!currentRecord||!!conflict||
  (currentRecord.status==='confirmed'&&!changed);
 $('ssSave').disabled=locked||!ctxReady||!!conflict;
 $('ssImport').disabled=locked||!ctxReady;
 $('ssMakeShort').disabled=locked||!currentRecord||!!conflict||!!savedRange?.issue;
 $('ssEditorStatus').textContent=conflict?'クラウド競合：編集不可':
  currentRecord?.status==='confirmed'&&!changed?'確認済み':
  currentRecord?.status==='confirmed'&&changed?'歌詞時刻が変化・要再確認':
  currentRecord?'登録済み・確認待ち':'新規・未登録';
 $('ssLyricsLink').href='./lyric-editor?'+new URLSearchParams({song}).toString();
 $('ssPreview').disabled=!ready()||!rangeComplete;
 $('ssFirstLyric').disabled=!ctxReady;$('ssLastLyric').disabled=!ctxReady;
 const linked=$('ssDerivedTime');
 linked.dataset.error=range.issue?'true':'false';
 linked.textContent=range.issue
  ?(lyricIssue||range.issue)
  :('自動取得：'+core.formatTime(range.start)+' ～ '+core.formatTime(range.end)+
     '（'+(range.end-range.start).toFixed(2)+'秒）　｜終了境界：'+range.endSource);
 const list=$('ssList');list.replaceChildren();
 const rows=targetList(),confirmed=rows.filter(x=>x.status==='confirmed').length;
 if(!rows.length){
  const empty=document.createElement('p');empty.className='ssEmpty';
  empty.textContent=mode==='music-structure'
   ?'まだ構成区間がありません。「仮マップを利用する」で登録済み歌詞から候補を作れます。'
   :'まだショート候補がありません。構成区間から歌詞範囲を選んで作成できます。';
  list.append(empty);
  if(ctxReady){
   // Show the old map as click-to-select suggestions without silently writing records.
   for(const proposal of core.seedFor(song,mode)){
    const anchor=core.anchorFromApproximation(lyricCtx,proposal.start,proposal.end);
    if(!anchor)continue;
    const preview=document.createElement('button');preview.type='button';
    preview.className='ssItem ssProposal';
    const title=document.createElement('strong');title.textContent=proposal.label;
    const clock=document.createElement('small');
    clock.textContent='歌詞から自動取得｜'+core.formatTime(anchor.start)+' – '+core.formatTime(anchor.end);
    const badge=document.createElement('span');badge.className='ssTag';badge.textContent='未登録の仮候補';
    preview.append(title,clock,badge);
    preview.onclick=()=>{
     flushDraft();selectedId=null;restoreForm({...proposal,...anchor});
     render();status('仮候補を選びました。歌詞範囲を確認して「下書き保存」を押してください。');
     $('ssEditArea').scrollIntoView({block:'nearest',behavior:'smooth'});
    };
    list.append(preview);
   }
  }
 }
 for(const x of rows){
  const derived=core.linkInterval(x,lyricCtx),valid=derived.linked&&!derived.issue;
  const shifted=valid&&(Math.abs((x.start??0)-derived.start)>.02||Math.abs((x.end??0)-derived.end)>.02);
  const item=document.createElement('button');item.type='button';item.className='ssItem'+(x.id===selectedId?' selected':'');
  const head=document.createElement('strong');head.textContent=x.label||core.typeLabel(x.type);
  const detail=document.createElement('small');
  detail.textContent=valid
   ?(mode==='music-structure'?core.typeLabel(x.type)+' ・ ':'')+
    core.formatTime(derived.start)+' – '+core.formatTime(derived.end)+
    (mode==='short-cut'?'（'+(derived.end-derived.start).toFixed(1)+'秒）':'')
   :(derived.issue||'歌詞の連動が未設定です。');
  const tag=document.createElement('span');tag.className='ssTag';
  tag.textContent=derived.issue?'要連動':shifted?'要再確認':x.status==='confirmed'?'確認済み':'仮';
  item.append(head,detail,tag);
  item.onclick=()=>selectRecord(x.id);
  list.append(item);
 }
 $('ssListTitle').textContent=(mode==='music-structure'?'曲の区間':'切り出し候補')+'　'+rows.length+'件（確認済み '+confirmed+'件）';
 renderOld();
 if(locked)status('ログインすると既存の歌詞時刻と連動できます。');
 else if(!ctxReady)status(lyricIssue||'歌詞を読み込み中…',!!lyricIssue&&!lyricIssue.includes('読み込んでいます'));
 else if(!formChanged)status('歌詞の開始行と最後の行を選ぶだけです。時間を計り直す必要はありません。');
 const live=records().filter(x=>core.isArrangement(x,song)).map(x=>{
  const d=core.linkInterval(x,lyricCtx);return {...x,start:d.issue?null:d.start,end:d.issue?null:d.end};
 });
 const overlap=core.overlapWarnings(live,{...formTyped(false),id:selectedId,song});
 $('ssOverlap').textContent=overlap.length?'他の構成区間と重なります：'+overlap.join('／'):'';
}
function formTyped(strict=true){
 const selectedRange=currentRange();
 const v={type:mode==='music-structure'?$('ssType').value:null,
  label:$('ssName').value.trim(),start:selectedRange.start??null,end:selectedRange.end??null,
  startLyricIndex:selectedFirst,endLyricIndex:selectedLast,lyricVersionId:lyricCtx?.versionId||null,
  note:$('ssNote').value.trim().slice(0,1000),
  sourceRegionId:mode==='short-cut'?shortSourceRegionId:null};
 if(strict){
  if(!v.label||v.label.length>80)throw Error('区間名を1～80文字で入力してください。');
  if(mode==='music-structure'&&!core.ALLOWED.has(v.type))throw Error('構成の種類を選択してください。');
  if(selectedRange.issue)throw Error(selectedRange.issue);
  const error=core.validInterval(v.start,v.end,audio.readyState>=1?audio.duration:null,true);
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
 if(!lyricCtx){status('先に歌詞と時刻を読み込んでください。',true);return;}
 const source=core.seedFor(song,mode);if(!source.length){status('この曲の仮マップはありません。',true);return;}
 const existing=records().filter(x=>x.song===song&&x.kind===mode&&!x.syncConflictOf);
 const pending=source.filter(x=>!existing.some(y=>
  (x.sourceSeedKey&&y.sourceSeedKey===x.sourceSeedKey)||
  (!y.deleted&&Number.isFinite(y.start)&&Number.isFinite(y.end)&&Math.abs(y.start-x.start)<.03&&Math.abs(y.end-x.end)<.03)));
 if(!pending.length){status('仮マップの候補はすでに登録されています。');return;}
 const linked=pending.map(item=>{
  const anchor=core.anchorFromApproximation(lyricCtx,item.start,item.end);
  return anchor?{...item,...anchor}:null;
 }).filter(Boolean);
 const skipped=pending.length-linked.length;
 if(!linked.length){status('この候補は歌詞の時刻に紐づきませんでした。歌詞タイミングを確認してください。',true);return;}
 if(!confirm('歌詞から計算した'+linked.length+'区間を「仮・確認待ち」で登録しますか？'+
  (skipped?'　時刻が揃わない'+skipped+'件は追加しません。':'')+' 以前の歌詞・時刻には触れません。'))return;
 const all=records();
 for(const v of linked){
  all.push({...v,id:core.recordId(song,mode,uid()),kind:mode,song,
   workId:'recnote-arrangement:'+song,textVersionId:core.VER,
   lineIndex:mode==='music-structure'?-10000:-20000,
   confirmedAt:null,deleted:false,updatedAt:new Date().toISOString()});
 }
 persist();render();
 status(linked.length+'件を歌詞タイミングと連動して登録しました。'+
  (skipped?skipped+'件は未登録のままです。':'')+' あとは各区間がAメロ・サビ等か音で確認してください。');
}
function addFromSection(){
 const r=current(),linked=r?core.linkInterval(r,lyricCtx):null;
 if(!r||!linked||linked.issue){status(linked?.issue||'歌詞と連動する区間を選択してください。',true);return;}
 // Prefer a self-contained 15-30 second group of actual lyric cues; no arbitrary 25s trim.
 let last=r.endLyricIndex,best=Infinity;
 for(const c of lyricCtx.cues){
  if(c.index<r.startLyricIndex||c.index>r.endLyricIndex)continue;
  const part=core.rangeFromLyrics(lyricCtx,r.startLyricIndex,c.index);
  if(part.issue)continue;
  const dur=part.end-part.start;
  if(dur>=15&&dur<=30&&Math.abs(dur-24)<best){best=Math.abs(dur-24);last=c.index;}
 }
 const part=core.rangeFromLyrics(lyricCtx,r.startLyricIndex,last);
 flushDraft();mode='short-cut';selectedId=null;
 restoreForm({label:'ショート候補｜'+(r.label||core.typeLabel(r.type)),
  startLyricIndex:r.startLyricIndex,endLyricIndex:last,lyricVersionId:lyricCtx.versionId,
  start:part.start,end:part.end,
  note:'元区間：'+(r.label||core.typeLabel(r.type))+'。前後の歌詞を選んで長さを調整してください。',
  sourceRegionId:r.id});
 formChanged=true;saveFormDraft();render();
 status('ショート候補を歌詞の時刻から作成しました。最後の歌詞を選ぶだけで長さを変更できます。');
}
function listen(){
 if(!ready()){status('音源を読み込んでください。',true);return;}
 const range=currentRange();
 if(range.issue){status(range.issue,true);return;}
 seekOriginal(Math.max(0,range.start-.25));
 previewStop=range.end+.5;
 audio.play().catch(e=>status('再生できません：'+e.message,true));
}
function download(){
 const info=core.exportPlan(song,records(),new Date(),lyricCtx);
 const blob=new Blob([JSON.stringify(info,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='楽曲構成とショート候補_'+song+'.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
 status('区間一覧・ショート候補・既存の前奏／間奏／後奏のJSONを書き出しました。');
}
function onEdit(){
 selectedFirst=$('ssFirstLyric').value!==''?Number($('ssFirstLyric').value):null;
 selectedLast=$('ssLastLyric').value!==''?Number($('ssLastLyric').value):null;
 formChanged=JSON.stringify(formValues())!==initialForm;
 $('ssEditorStatus').textContent=formChanged?'編集中・自動下書き保存':'変更なし';
 const range=currentRange(),ok=!range.issue;
 $('ssDerivedTime').dataset.error=ok?'false':'true';
 $('ssDerivedTime').textContent=ok
  ?'自動取得：'+core.formatTime(range.start)+' ～ '+core.formatTime(range.end)+
   '（'+(range.end-range.start).toFixed(2)+'秒）｜'+range.endSource
  :range.issue;
 $('ssPreview').disabled=!ready()||!ok;
 const typed=formTyped(false),live=records().filter(x=>core.isArrangement(x,song)).map(x=>{
  const d=core.linkInterval(x,lyricCtx);return {...x,start:d.issue?null:d.start,end:d.issue?null:d.end};
 });
 const overlap=core.overlapWarnings(live,{...typed,song,id:selectedId});
 $('ssOverlap').textContent=overlap.length?'他の構成区間と重なります：'+overlap.join('／'):'';
 clearTimeout(draftTimer);
 if(formChanged)draftTimer=setTimeout(saveFormDraft,650);
}
function changeSong(){
 flushDraft();++lyricSeq;lyricRead=null;lyricCtx=null;lyricIssue='歌詞の読み込み中…';
 selectedId=null;restoreForm(state.drafts?.[formKey()]||{type:'verse'});
 if(!panel.hidden){render();loadLyricCues();}
}
function openPanel(){
 if(!$('fullSongSections')?.hidden)$('fsClose')?.click();
 panel.hidden=false;root.classList.add('syncArrangementActive');open.setAttribute('aria-expanded','true');
 if(!initialForm)restoreForm(state.drafts?.[formKey()]||{type:'verse'});
 render();if(!lyricCtx)loadLyricCues();panel.scrollIntoView({block:'start',behavior:'smooth'});
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
$('ssPreview').onclick=listen;
$('ssExport').onclick=download;
for(const id of inputIds){$(id).addEventListener('input',onEdit);$(id).addEventListener('change',onEdit);}
for(const id of ['ssFirstLyric','ssLastLyric'])$(id).addEventListener('change',onEdit);
audio.addEventListener('timeupdate',()=>{
 if(previewStop!==null&&nowTime()>=previewStop){audio.pause();previewStop=null;}
});
window.addEventListener('recnote:cloud-synced',()=>{if(lyricRead)updateLyricContext();if(!panel.hidden)render();});
window.addEventListener('recnote:cloud-auth-change',()=>{if(bridge?.isSignedIn())loadLyricCues();else{lyricRead=null;lyricCtx=null;lyricIssue='ログインが必要です。';if(!panel.hidden)render();}});
audio.addEventListener('loadedmetadata',()=>{if(lyricRead)updateLyricContext();if(!panel.hidden)render();});
for(const b of root.querySelectorAll('[data-song]'))b.addEventListener('click',changeSong);
for(const id of ['fsOpenIntro','fsOpenInterlude','fsOpenOutro'])$(id)?.addEventListener('click',()=>{if(!panel.hidden)closePanel();});
window.addEventListener('pagehide',flushDraft);
restoreForm(state.drafts?.[formKey()]||{type:'verse'});
window.RECNOTE_STRUCTURE_STUDIO=Object.freeze({open:openPanel,close:closePanel,refresh:loadLyricCues});
})();
