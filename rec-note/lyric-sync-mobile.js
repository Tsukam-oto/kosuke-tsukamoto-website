/* REC NOTE v17: cloud lyric timing and non-destructive display plans. */
(function(){
'use strict';
// Dedicated full-song timing page only. The audio-corrections page has its own navigation.
if(new URLSearchParams(location.search).get('sync')!=='1'&&!/\/lyric-sync(?:\.html)?\/?$/i.test(location.pathname))return;
const bridge=window.RECNOTE_LYRIC_BRIDGE,media=window.RECNOTE_CLOUD_MEDIA;
if(!bridge||!media||typeof persist!=='function')return;
document.body.classList.add('syncPage');document.title='曲のタイミング合わせ | REC NOTE v18.4';
const $=id=>document.getElementById(id);
const root=document.createElement('div');root.id='syncStudio';
root.innerHTML=[
'<header class="syncHeading"><div><small>LYRIC SYNC</small><h1>曲のタイミング合わせ</h1></div><a href="./">REC NOTE</a></header>',
'<details id="syncAccount"><summary><span id="syncAccountSummary">クラウドにログイン</span><b id="syncAuthState">確認中</b></summary><div id="syncCloudSlot"></div></details>',
'<nav class="syncSongs" aria-label="楽曲選択"><button data-song="あなたと">あなたと</button><button data-song="これから">これから</button><button data-song="これからも">これからも</button></nav>',
'<p id="syncNotice" class="syncNotice" role="status">準備しています…</p>',
'<section class="syncPlayer"><div class="syncSongHead"><strong id="syncTitle">—</strong><span id="syncFile">音源を確認しています</span></div>',
'<div class="syncTime"><strong id="syncClock">0:00.00</strong><span id="syncLength">/ 0:00.00</span></div>',
'<input id="syncSlider" type="range" min="0" max="100" value="0" step="1" aria-label="再生位置"/>',
'<div class="syncTransport"><button id="syncBack">−3秒</button><button class="syncEmphasis" id="syncPlay">▶ 再生</button><button id="syncNext">＋3秒</button><label>速度 <select id="syncSpeed"><option value="0.65">0.65×</option><option value="0.8">0.8×</option><option value="1" selected>1×</option></select></label></div>',
'<label class="syncOffsetLabel">WAV基準の時刻補正 <select id="syncOffset"><option value="-0.022">11/19版MP3：−0.022秒</option><option value="0">補正なし：0秒</option></select><small>原本WAVとの実測差。Safariでずれがなければ「補正なし」に変更できます。</small></label>',
'<div class="syncMedia" id="syncMedia"><p id="syncMediaHelp">MP3はクラウドから復元します。</p><label>音源を選ぶ<input id="syncUpload" type="file" accept=".mp3,.m4a,audio/mpeg,audio/mp4"/></label><span id="syncUploadState"></span></div></section>',
'<div class="syncOverview"><strong id="syncCount">0 / 0 行</strong><span id="syncBreakdown">確認待ち</span><div class="syncMeter"><i id="syncMeterFill"></i></div></div>',
'<div class="syncSectionLabel"><div><strong>歌詞</strong><small>行をタップすると選べます</small></div><label><input id="syncTapMode" type="checkbox" checked/>次の行へ</label></div>',
'<p id="syncSourceWarning" class="syncWarning" hidden></p>',
'<label class="syncVersion">歌詞の版 <select id="syncVersion"></select></label>',
'<div id="syncLines" class="syncLines"></div>',
'<section id="syncEditor" class="syncEditor" hidden><small id="syncLineNumber">選択中の歌詞</small><h2 id="syncSelected"></h2>',
'<div id="syncConflictBox" class="syncConflictBox" hidden></div>',
'<div class="syncFields"><label>開始 <input type="text" inputmode="decimal" id="syncStart" placeholder="1:20.25"/></label><label>終了 <input type="text" inputmode="decimal" id="syncEnd" placeholder="1:24.50"/></label></div>',
'<div class="syncEditorActions"><button id="syncCaptureStart">現在位置を開始に</button><button id="syncCaptureEnd">現在位置を終了に</button><button id="syncSave">時刻保存</button></div>',
'<div class="syncNudge"><span>開始の微調整</span><button data-adjust-start="-0.1">−0.10</button><button data-adjust-start="-0.01">−0.01</button><button data-adjust-start="0.01">＋0.01</button><button data-adjust-start="0.1">＋0.10</button></div>',
'<div class="syncNudge"><span>終了の微調整</span><button data-adjust-end="-0.1">−0.10</button><button data-adjust-end="-0.01">−0.01</button><button data-adjust-end="0.01">＋0.01</button><button data-adjust-end="0.1">＋0.10</button></div>',
'<div class="syncEditorActions"><button id="syncReplay">前後を聴く</button><button class="syncEmphasis" id="syncConfirm">確認済みにする</button><button id="syncUnconfirm">確認を解除</button></div><p id="syncEditorHelp"></p></section>',
'<div class="syncTools"><button id="syncUndo">元に戻す</button><button id="syncFindNext">未確認へ移動</button><button id="syncPush">クラウド同期</button><button id="syncSrt">SRT保存</button><button id="syncJson">JSON保存</button></div>',
'<p class="syncFoot">原文は変更しません。同期時刻は端末に即時保存し、ログイン中は本人専用クラウドへ同期します。未校正の歌詞は別途原文照合が必要です。動画の高音質音声にはWAV原本を使用します。</p>',
'<footer class="syncDock"><div><strong id="syncDockLyric">歌詞を選択</strong><small id="syncDockClock">0:00.00</small></div><button id="syncDockPlay" aria-label="再生・一時停止">▶</button><button class="syncEmphasis" id="syncTapNow">歌い始めを記録</button></footer>'
].join('');
document.body.append(root);
document.getElementById('syncInit')?.remove();
/* Simplified focus-mode shell: onboarding only until ready, one large record action.
   Existing event handlers, storage keys and timing records are preserved. */
const intro=document.createElement('section');intro.className='syncIntro';intro.id='syncIntro';
intro.innerHTML='<strong id="syncIntroTitle">ログインして始めます</strong><p id="syncIntroText">同じアカウントでMac・iPhoneから続けられます。</p>';
root.insertBefore(intro,root.querySelector('.syncPlayer'));
const hint=document.createElement('p');hint.className='syncOneLineHelp';hint.textContent='①再生 → ②歌い始めたら画面下の「記録」を押す';
root.insertBefore(hint,$('syncLines'));
const modeBar=document.createElement('nav');modeBar.id='syncModeBar';modeBar.className='syncModeBar';modeBar.setAttribute('aria-label','作業の切り替え');
modeBar.innerHTML='<button type="button" id="syncRecordMode" class="active" aria-pressed="true">① 時刻を記録</button><button type="button" id="syncReviewMode" aria-pressed="false">② 聴いて確認</button>';
root.insertBefore(modeBar,$('syncLines'));
const fillMissing=document.createElement('button');
fillMissing.type='button';fillMissing.id='syncFillMissing';
fillMissing.className='syncFillMissing';fillMissing.hidden=true;
fillMissing.textContent='終了時刻が未設定の行だけ補完する';
root.insertBefore(fillMissing,$('syncLines'));
const saveBadge=document.createElement('span');saveBadge.id='syncSaveState';saveBadge.className='syncSaveState';saveBadge.textContent='接続を確認中';saveBadge.setAttribute('aria-live','polite');
root.insertBefore(saveBadge,root.querySelector('.syncOverview'));

const review=document.createElement('div');review.className='syncQuickReview';review.id='syncQuickReview';
review.innerHTML='<span class="syncQuickNote">選択中の行</span><button id="syncQuickListen" type="button">前後を聴く</button><button id="syncQuickEnd" type="button">いま終了</button><button id="syncQuickConfirm" type="button">確認済み</button><button id="syncQuickAdjust" type="button">時刻を直す</button>';
root.insertBefore(review,$('syncEditor'));
const adjust=document.createElement('details');adjust.id='syncFineTune';adjust.className='syncFineTune';
adjust.innerHTML='<summary>時刻を細かく調整する</summary>';
root.insertBefore(adjust,$('syncEditor'));adjust.append($('syncEditor'));

const quickEdit=document.createElement('details');quickEdit.className='syncTimingPanel';quickEdit.id='syncTimingPanel';
quickEdit.innerHTML='<summary>登録済み時刻をすぐ直す</summary><p>再生位置で上書き、または0.1秒ずつ調整できます。変更はその場で保存します。</p><div id="syncTimingButtons"></div><button id="syncTimingUndo" type="button">直前の時刻修正を戻す</button>';
root.insertBefore(quickEdit,$('syncFineTune'));
// Lyrics and display layout have a single editing entry point: /lyric-editor.
const navToEditor=document.createElement('a');
navToEditor.className='syncEditorNav';navToEditor.id='syncEditorNav';
navToEditor.textContent='歌詞の修正・分割・改行（専用ページ）';
navToEditor.href='./lyric-editor';
root.querySelector('.syncHeading').append(navToEditor);
function mountInline(){
 if(!work||!version||selected<0){contextHost.hidden=true;return;}
 const node=$('syncLines').querySelector('[data-line="'+selected+'"]');
 if(!node){contextHost.hidden=true;return;}
 if(node.nextElementSibling!==contextHost)node.after(contextHost);
 contextHost.hidden=false;
 const visibleRows=rows();
 const offset=visibleRows.findIndex(row=>row.i===selected);
 $('syncContextPosition').textContent='時刻を合わせる歌詞 '+(offset+1)+' / '+visibleRows.length;
 $('syncContextPrev').disabled=offset<=0;
 $('syncContextNext').disabled=offset>=visibleRows.length-1;
 const target='./lyric-editor?'+new URLSearchParams({song,line:String(selected)}).toString();
 $('syncContextLyricLink').href=target;
 navToEditor.href='./lyric-editor?'+new URLSearchParams({song}).toString();
}
const contextHost=document.createElement('aside');contextHost.id='syncContextEditor';contextHost.className='syncContextEditor';contextHost.setAttribute('aria-label','選択した歌詞の時刻調整');
root.insertBefore(contextHost,$('syncLines').nextSibling);
contextHost.hidden=true;
// Reuse the existing timing, text and display editors as ONE selected-row card.
const contextNavigation=document.createElement('nav');contextNavigation.className='syncContextNavigation';
contextNavigation.setAttribute('aria-label','選択中の歌詞を移動');
contextNavigation.innerHTML='<strong id="syncContextPosition">時刻を合わせる歌詞</strong><div><button type="button" id="syncContextPrev">前の行</button><button type="button" id="syncContextNext">次の行</button><button type="button" id="syncContextClose">閉じる</button></div><a id="syncContextLyricLink" class="syncContextLyricLink" href="./lyric-editor">この歌詞の文章・表示改行を専用ページで編集</a>';
contextHost.append(contextNavigation,root.querySelector('.syncDock'),quickEdit,review,adjust);
for(const [name,direction] of [['syncContextPrev',-1],['syncContextNext',1]]){
 $(name).addEventListener('click',()=>{
  const list=rows(),position=list.findIndex(row=>row.i===selected);
  const next=list[position+direction];
  if(next){choose(next.i,false,false);requestAnimationFrame(()=>contextHost.scrollIntoView({block:'nearest',behavior:'smooth'}));}
 });
}
$('syncContextClose').addEventListener('click',()=>{contextHost.hidden=true;});
const extra=document.createElement('details');extra.id='syncExtra';extra.className='syncExtra';
extra.innerHTML='<summary>その他の設定・書き出し</summary>';
root.insertBefore(extra,$('syncTools'));
extra.append(root.querySelector('.syncSectionLabel label'),root.querySelector('.syncTransport label'),root.querySelector('.syncOffsetLabel'),root.querySelector('.syncVersion'),$('syncTools'),root.querySelector('.syncFoot'));
const dockEdit=document.createElement('button');dockEdit.type='button';dockEdit.id='syncDockEdit';dockEdit.textContent='修正';dockEdit.setAttribute('aria-label','選択した歌詞の時刻を修正');root.querySelector('.syncDock').insertBefore(dockEdit,$('syncTapNow'));
dockEdit.addEventListener('click',()=>{if($('syncEditor').hidden)return;adjust.open=!adjust.open;});
const closeEdit=document.createElement('button');closeEdit.type='button';closeEdit.id='syncCloseEdit';closeEdit.textContent='閉じる';closeEdit.setAttribute('aria-label','時刻修正を閉じる');
adjust.insertBefore(closeEdit,$('syncEditor'));
closeEdit.addEventListener('click',()=>{adjust.open=false;dockEdit.focus();});
adjust.addEventListener('keydown',e=>{if(e.key==='Escape'){adjust.open=false;dockEdit.focus();}});

const cloudPanel=$('recCloudPanel');if(cloudPanel)$('syncCloudSlot').append(cloudPanel);
const audio=$('audio'),STACK=[],DRAFT_PREFIX='rec_note_sync_edit_draft_v7:',OFFSET_PREFIX='rec_note_sync_offset_v7:',RESUME_PREFIX='rec_note_sync_resume_v81:';
let syncMode='record';
function saveBadgeStatus(status,kind='pending'){
 const el=$('syncSaveState');if(!el)return;el.textContent=status;el.dataset.status=kind;
}
function checkpointKey(){return RESUME_PREFIX+song+':'+(version?.id||'');}
function saveCheckpoint(){if(!version||selected<0)return;try{localStorage.setItem(checkpointKey(),String(selected));}catch(e){}}
function readCheckpoint(){try{const s=localStorage.getItem(checkpointKey());return s===null?null:Number(s);}catch(e){return null;}}

function audioOffset(){const saved=localStorage.getItem(OFFSET_PREFIX+song);if(saved!==null&&Number.isFinite(Number(saved)))return Number(saved);return /_1119\.mp3$/i.test(files[song]?.name||'')?-0.022:0;}
function wavPosition(){return Math.max(0,(Number(audio.currentTime)||0)+audioOffset());}
function refreshOffsetSelector(){$('syncOffset').value=String(audioOffset());}
let work=null,versions=[],version=null,lines=[],selected=-1,lastTap=-1,seq=0,replayEnd=null;
function timestamp(v){const t=Math.max(0,Math.round((Number(v)||0)*100)),s=Math.floor(t/100);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')+'.'+String(t%100).padStart(2,'0');}
function parse(v){v=String(v||'').trim().replace('：',':');if(!v)return null;const m=v.match(/^(\d+):([0-5]?\d)(?:\.(\d{1,3}))?$/);if(m)return Number(m[1])*60+Number(m[2])+Number('0.'+(m[3]||'0'));return /^\d+(?:\.\d{1,3})?$/.test(v)?Number(v):null;}
function notice(message,error=false){$('syncNotice').textContent=message;$('syncNotice').classList.toggle('error',error);}
function all(){if(!Array.isArray(state.lyricTimings))state.lyricTimings=[];return state.lyricTimings;}
function id(i){return 'lyric-line:'+work.id+':'+version.id+':'+i;}
function get(i){return work&&version?all().find(x=>x.id===id(i)):null;}
function conflict(i){return all().some(x=>x.syncConflictOf===id(i));}
function rows(){return lines.map((text,i)=>({text,i,time:get(i)})).filter(x=>x.text.trim());}
function started(t){return Number.isFinite(t?.start);}
function complete(t){return started(t)&&Number.isFinite(t?.end)&&t.end>t.start;}
function confirmed(t){return complete(t)&&t.status==='confirmed';}
// Read-only candidate. Existing ends and confirmed cues always win.
// Interlude/outro starts prevent a lyric from spilling through an instrumental passage.
function candidateEnd(i){
 const t=get(i);if(!started(t)||!version||!work)return null;
 const options=rows().filter(x=>x.i>i&&started(x.time)&&x.time.start>t.start).map(x=>x.time.start);
 for(const x of all()){
  if(x.song!==song||x.kind!=='song-section'||x.deleted||!['interlude','outro'].includes(x.sectionType))continue;
  if(Number.isFinite(x.start)&&x.start>t.start)options.push(x.start);
 }
 return options.length?Math.round(Math.min(...options)*100)/100:null;
}
function fillableRows(){
 return rows().filter(x=>started(x.time)&&!Number.isFinite(x.time.end)&&x.time.status!=='confirmed'&&!conflict(x.i)&&Number.isFinite(candidateEnd(x.i)));
}
function completeMissingEnds(onlyBeforeIndex=null){
 if(!version||!work||!bridge.isSignedIn())return 0;
 const possible=fillableRows();
 let targets=possible;
 if(Number.isInteger(onlyBeforeIndex)){
  // Only the immediately preceding started line may be automatically closed.
  const previous=rows().filter(x=>x.i<onlyBeforeIndex&&started(x.time)).at(-1);
  targets=previous?possible.filter(x=>x.i===previous.i):[];
 }
 if(!targets.length)return 0;
 const list=all();
 STACK.push(JSON.stringify(list));if(STACK.length>15)STACK.shift();
 let updated=0;
 for(const x of targets){
  const index=list.findIndex(t=>t.id===id(x.i));
  if(index<0)continue;
  const current=list[index],end=candidateEnd(x.i);
  if(!started(current)||Number.isFinite(current.end)||current.status==='confirmed'||conflict(x.i)||!Number.isFinite(end)||end<=current.start)continue;
  list[index]={...current,end,autoEndSource:'next-start-or-section',updatedAt:new Date().toISOString()};
  updated++;
 }
 if(updated){
  persist();
  saveBadgeStatus('端末保存済 · クラウド同期待ち','pending');
  renderRows();if(selected>=0)fillEditor();
 }
 return updated;
}
function closeLyricBeforeInstrument(boundary){
 if(!work||!version||!bridge.isSignedIn()||!Number.isFinite(boundary))return;
 const prev=rows().filter(x=>started(x.time)&&x.time.start<boundary).at(-1);
 if(!prev||complete(prev.time)||prev.time.status==='confirmed'||conflict(prev.i)||Number.isFinite(prev.time.end))return;
 const end=candidateEnd(prev.i),list=all(),j=list.findIndex(t=>t.id===id(prev.i));
 if(j<0||!Number.isFinite(end)||end<=prev.time.start)return;
 STACK.push(JSON.stringify(list));if(STACK.length>15)STACK.shift();
 list[j]={...list[j],end,autoEndSource:'instrument-start',updatedAt:new Date().toISOString()};
 persist();renderRows();if(selected>=0)fillEditor();
}
function closeOpenInterludeAt(start){
 // A first lyric closes the intro; the next lyric closes an open interlude.
 // Never overwrite recorded ends, confirmed cues or conflict candidates.
 if(!bridge.isSignedIn()||!Number.isFinite(start))return;
 const list=all(),cues=rows().filter(x=>started(x.time)).map(x=>x.time.start);
 const candidates=list.filter(x=>x.song===song&&x.kind==='song-section'&&
  ['intro','interlude'].includes(x.sectionType)&&!x.deleted&&x.status!=='confirmed'&&
  Number.isFinite(x.start)&&x.start<start&&!Number.isFinite(x.end)&&!x.syncConflictOf&&
  !list.some(z=>z.syncConflictOf===x.id));
 if(!candidates.length)return;
 const changes=[];
 for(const target of candidates){
  const boundaries=[start];
  for(const t of cues)if(t>target.start&&t<=start)boundaries.push(t);
  for(const other of list){
   if(other===target||other.song!==song||other.kind!=='song-section'||other.deleted||
      !Number.isFinite(other.start)||other.start<=target.start||other.start>start)continue;
   boundaries.push(other.start);
  }
  const ending=Math.round(Math.min(...boundaries)*100)/100;
  if(ending>target.start)changes.push({id:target.id,end:ending});
 }
 if(!changes.length)return;
 STACK.push(JSON.stringify(list));if(STACK.length>15)STACK.shift();
 for(const change of changes){
  const j=list.findIndex(x=>x.id===change.id);
  if(j>=0)list[j]={...list[j],end:change.end,autoEndSource:'following-start',updatedAt:new Date().toISOString()};
 }
 persist();saveBadgeStatus('端末保存済 · クラウド同期待ち','pending');
 window.dispatchEvent(new CustomEvent('recnote:timing-updated',{detail:{song}}));
}
function draftKey(){return DRAFT_PREFIX+song+':'+(version?.id||'')+':'+selected;}
function clearDraft(){try{localStorage.removeItem(draftKey());}catch(e){}}
function saveDraft(){if(selected<0)return;try{localStorage.setItem(draftKey(),JSON.stringify({a:$('syncStart').value,b:$('syncEnd').value}));}catch(e){}}
function resolveConflict(chosen){
 if(selected<0||!work||!version)return;
 const main=id(selected),current=all().find(x=>x.id===main),variants=all().filter(x=>x.syncConflictOf===main);
 if(!current||!variants.length){notice('この行の競合はありません。');return;}
 STACK.push(JSON.stringify(all()));if(STACK.length>15)STACK.shift();
 state.lyricTimings=all().filter(x=>x.syncConflictOf!==main);
 const at=state.lyricTimings.findIndex(x=>x.id===main);
 const target=chosen?{...current,start:chosen.start??null,end:chosen.end??null,status:'draft',confirmedAt:null,updatedAt:new Date().toISOString()}:current;
 if(at>=0)state.lyricTimings[at]=target;
 persist();renderRows();fillEditor();notice('選択した時刻で競合を解消しました。音声を聴き直して確認してください。');
}
function saveRecord(i,patch){
 if(i<0||!version)return false;
 if(conflict(i)){notice('別端末との時刻競合を先に解消してください。',true);return false;}
 const list=all(),key=id(i),at=list.findIndex(x=>x.id===key);
 const previous=at>=0?list[at]:{id:key,song,workId:work.id,textVersionId:version.id,lineIndex:i,start:null,end:null,status:'draft'};
 const next={...previous,...patch,id:key,song,workId:work.id,textVersionId:version.id,lineIndex:i,updatedAt:new Date().toISOString()};
 if(next.start!==null&&(!Number.isFinite(next.start)||next.start<0)){notice('開始時刻が不正です。',true);return false;}
 if(next.end!==null&&(!Number.isFinite(next.end)||next.end<0)){notice('終了時刻が不正です。',true);return false;}
 if(Number.isFinite(next.end)&&(!Number.isFinite(next.start)||next.end<=next.start)){notice('終了時刻は開始より後にしてください。',true);return false;}
 STACK.push(JSON.stringify(list));if(STACK.length>15)STACK.shift();
 if(at>=0)list[at]=next;else list.push(next);
 persist();$('syncAuthState').textContent=media.isSignedIn()?'クラウド同期待ち':'端末内のみ';saveBadgeStatus(media.isSignedIn()?'端末保存済 · 同期待ち':'端末内のみ保存',media.isSignedIn()?'pending':'offline');notice('端末に保存しました。クラウド同期を実行しています。');return true;
}
function renderRows(){
 renderQuickTiming();
 // Rebuilding status rows must not discard a textarea's cursor or keyboard focus.
 const focusNode=document.activeElement;
 const focusInEditor=!!focusNode&&contextHost.contains(focusNode);
 let caret=null;
 if(focusInEditor){try{caret=[focusNode.selectionStart,focusNode.selectionEnd];}catch(_e){}}
 const view=$('syncLines');view.replaceChildren();
 let begin=0,end=0,done=0;const data=rows();
 for(let n=0;n<data.length;n++){
  const x=data[n],t=x.time;
  if(started(t))begin++;if(complete(t))end++;if(confirmed(t))done++;
  const b=document.createElement('button');b.type='button';b.dataset.line=String(x.i);
  b.className='syncLine'+(x.i===selected?' selected':'')+(confirmed(t)?' confirmed':complete(t)?' complete':started(t)?' started':'')+(conflict(x.i)?' conflict':'');
  const number=document.createElement('span');number.className='syncLineNumber';number.textContent=String(n+1).padStart(2,'0');
  const content=document.createElement('span');content.className='syncLineText';content.textContent=x.text;
  const time=document.createElement('span');time.className='syncLineStamp';const suggested=started(t)&&!Number.isFinite(t?.end)?candidateEnd(x.i):null;time.textContent=confirmed(t)?'✓ '+timestamp(t.start):complete(t)?timestamp(t.start)+'–'+timestamp(t.end):started(t)?timestamp(t.start)+(Number.isFinite(suggested)?' → '+timestamp(suggested)+'（自動候補）':' / 終了未設定'):'未記録';
  b.append(number,content,time);
  b.addEventListener('click',()=>{
   choose(x.i,false,false);
   if(syncMode==='review'&&started(get(x.i)))seek(Math.max(0,get(x.i).start-0.8));
   requestAnimationFrame(()=>contextHost.scrollIntoView({block:'nearest',behavior:'smooth'}));
  });
  view.append(b);
 }
 mountInline();
 if(focusInEditor&&focusNode?.isConnected&&typeof focusNode.focus==='function'){
  focusNode.focus({preventScroll:true});
  if(caret&&Number.isInteger(caret[0]))try{focusNode.setSelectionRange(caret[0],caret[1]);}catch(_e){}
 }
 window.dispatchEvent(new CustomEvent('recnote:instrument-rail-refresh',{detail:{song}}));
 $('syncCount').textContent=done+' / '+data.length+' 行 確認済み';
 $('syncBreakdown').textContent='開始 '+begin+'・終了 '+end+'・確認済み '+done;
 $('syncMeterFill').style.width=(data.length?100*done/data.length:0)+'%';
 const missing=fillableRows().length;fillMissing.hidden=missing===0;fillMissing.textContent=missing+'行の終了未設定を自動補完';
}
function choose(i,scroll,seekAudio){
 if(!lines[i]?.trim())return;
 selected=i;const t=get(i);
 if(seekAudio&&started(t))seek(t.start);
 for(const el of $('syncLines').querySelectorAll('.syncLine'))el.classList.toggle('selected',Number(el.dataset.line)===i);
 const node=$('syncLines').querySelector('[data-line="'+i+'"]');if(scroll)node?.scrollIntoView({block:'nearest',behavior:'smooth'});
 mountInline();fillEditor();saveCheckpoint();updatePrimary();
}
function fillEditor(){
 renderQuickTiming();
 $('syncEditor').hidden=selected<0;
 if(selected<0)return;
 const t=get(selected);$('syncLineNumber').textContent='行 '+(rows().findIndex(x=>x.i===selected)+1)+' / '+rows().length;
 $('syncSelected').textContent=lines[selected];$('syncDockLyric').textContent=lines[selected];
 let d=null;try{d=JSON.parse(localStorage.getItem(draftKey())||'null');}catch(e){}
 $('syncStart').value=d?.a??(started(t)?timestamp(t.start):'');
 $('syncEnd').value=d?.b??(Number.isFinite(t?.end)?timestamp(t.end):'');
 $('syncConfirm').disabled=!complete(t)||confirmed(t)||conflict(selected);
 $('syncUnconfirm').disabled=!confirmed(t);
 $('syncEditorHelp').textContent=conflict(selected)?'別端末の記録と競合しています。下の候補を比較して解消してください。':confirmed(t)?'開始・終了を照合済みです。':started(t)?'終了位置も記録してから、音声を確認してください。':'歌われ始めた瞬間に記録してください。';
 const box=$('syncConflictBox');box.replaceChildren();
 const variants=all().filter(x=>x.syncConflictOf===id(selected));
 box.hidden=!variants.length;
 if(variants.length){
  const header=document.createElement('p');header.textContent='別端末との編集競合：採用する時刻を選択してください。';box.append(header);
  const current=document.createElement('button');current.textContent='現在の時刻 '+(started(t)?timestamp(t.start):'未記録')+' を採用';
  current.addEventListener('click',()=>resolveConflict(null));box.append(current);
  for(const entry of variants){
   const option=document.createElement('button');
   option.textContent='競合側 '+(started(entry)?timestamp(entry.start):'未記録')+(complete(entry)?'〜'+timestamp(entry.end):'')+' を採用';
   option.addEventListener('click',()=>resolveConflict(entry));box.append(option);
  }
 }

}
function updatePrimary(){
 const button=$('syncTapNow');if(!button)return;
 const t=get(selected),usable=selected>=0&&!!lines[selected]?.trim();
 if(syncMode==='review'){
  button.textContent=confirmed(t)?'確認済み ✓':'確認済みにする';
  button.disabled=!usable||!complete(t)||confirmed(t)||conflict(selected);
 }else{
  const next=usable&&started(t)?rows().find(x=>x.i>selected&&!started(x.time)):null;
  button.textContent=started(t)?(next?'次の歌詞の開始を記録':'歌詞の開始は記録済み'):'歌い始めを記録';
  button.disabled=!usable||!hasAudio()||(started(t)&&!next);
 }
}
function switchSyncMode(mode){
 syncMode=mode==='review'?'review':'record';
 for(const [id,v] of [['syncRecordMode','record'],['syncReviewMode','review']]){
  const b=$(id);b.classList.toggle('active',syncMode===v);b.setAttribute('aria-pressed',String(syncMode===v));
 }
 hint.textContent=syncMode==='review'?'行を選ぶ → 聴いて確認 → 画面下のボタンで確定':'開始を順番に記録。前奏・間奏・後奏は右側のボタンから開始し、次の開始で前の区間が自動終了します。';
 if(syncMode==='review'){
  const next=rows().find(x=>complete(x.time)&&!confirmed(x.time));
  if(next)choose(next.i,true,true);
 }
 updatePrimary();
}
function primaryAction(){
 if(syncMode==='review'){confirm();return;}
 const t=get(selected);
 // Never require (or write) an end timestamp on the primary button.
 if(started(t)){
  const next=rows().find(x=>x.i>selected&&!started(x.time));
  if(!next){notice('歌詞の開始はすべて記録済みです。後奏があれば右側の「後奏開始」を押してください。');updatePrimary();return;}
  tap(next.i);updatePrimary();return;
 }
 tap(selected);updatePrimary();
}
function hasAudio(){return !!(files[song]?.url)&&audio.readyState>=1;}
function tap(i){
 if(!hasAudio()){choose(i,true,false);notice('先にMP3を読み込んでください。',true);return;}
 if(confirmed(get(i))){choose(i,true,false);notice('確認済みです。編集するには確認を解除してください。',true);return;}
 const now=Math.round(wavPosition()*100)/100,t=get(i);
 if(started(t)){notice('この歌詞の開始は登録済みです。既存の時刻は変更しません。');return;}
 if(!saveRecord(i,{start:now,end:null,status:'draft'}))return;
 completeMissingEnds(i);closeOpenInterludeAt(now);
 lastTap=i;selected=i;clearDraft();renderRows();
 const next=$('syncTapMode').checked?rows().find(x=>x.i>i&&!started(x.time)):null;choose(next?.i??i,true,false);
 notice(timestamp(now)+' に記録。'+(next?'次の歌詞へ進みました。':'開始を保存しました。'));
}
function editorSave(){
 if(selected<0)return;
 const a=parse($('syncStart').value),b=$('syncEnd').value.trim()?parse($('syncEnd').value):null;
 if(a===null||($('syncEnd').value.trim()&&b===null)){notice('時刻の形式は 1:20.25 です。',true);return;}
 if(saveRecord(selected,{start:a,end:b,status:'draft'})){completeMissingEnds(selected);closeOpenInterludeAt(a);clearDraft();renderRows();fillEditor();updatePrimary();}
}
function capture(kind){
 if(selected<0)return;if(!hasAudio()){notice('音源を先に再生してください。',true);return;}
 const t=get(selected),now=Math.round(wavPosition()*100)/100;
 let a=kind==='start'?now:parse($('syncStart').value)??t?.start??null;
 let b=kind==='end'?now:parse($('syncEnd').value)??t?.end??null;
 if(kind==='start'&&Number.isFinite(b)&&b<=a)b=null;
 if(a===null){notice('先に開始時刻を記録してください。',true);return;}
 if(saveRecord(selected,{start:a,end:b,status:'draft'})){if(kind==='start'){completeMissingEnds(selected);closeOpenInterludeAt(a);}clearDraft();renderRows();fillEditor();}
}
function shift(kind,amount){
 const field=$(kind==='start'?'syncStart':'syncEnd'),current=parse(field.value);
 if(current===null){notice('先に時刻を入力してください。',true);return;}
 field.value=timestamp(Math.max(0,current+amount));saveDraft();editorSave();
}
function confirm(){
 const t=get(selected);if(!complete(t)){notice('開始と終了を設定してから確認してください。',true);return;}
 if(conflict(selected)){notice('この行にはクラウド編集競合があります。',true);return;}
 if(saveRecord(selected,{status:'confirmed',confirmedAt:new Date().toISOString()})){
  renderRows();fillEditor();notice('この歌詞を確認済みにしました。');
  if(syncMode==='review'){
   const following=rows().find(x=>complete(x.time)&&!confirmed(x.time));
   if(following)choose(following.i,true,true);
  }
  updatePrimary();
 }
}
function seek(t){if(!hasAudio())return;audio.currentTime=Math.max(0,Math.min(t-audioOffset(),audio.duration||t));clock();}
function clock(){
 const t=wavPosition(),d=Number.isFinite(audio.duration)?audio.duration:0;
 refreshOffsetSelector();
 $('syncClock').textContent=timestamp(t);$('syncDockClock').textContent=timestamp(t);$('syncLength').textContent='/ '+timestamp(d);
 const slider=$('syncSlider');slider.max=String(Math.max(1,Math.round(d*100)));if(document.activeElement!==slider)slider.value=String(Math.round(t*100));
 $('syncPlay').textContent=audio.paused?'▶ 再生':'Ⅱ 一時停止';$('syncDockPlay').textContent=audio.paused?'▶':'Ⅱ';
 $('syncFile').textContent=hasAudio()?(files[song].name||'再生可能'):'音源未登録';
 const cloud=media.isSignedIn()&&media.list(song).some(m=>m.kind==='A');
 $('syncMediaHelp').textContent=cloud?'クラウドのMP3が登録されています。別端末でも自動復元できます。':hasAudio()?'端末では再生できます。外出先用にはMP3をクラウドへ登録してください。':'Dropboxの tsukamoto_mix にある、この曲のMP3を一度だけ登録してください。以降は外出先でも使えます。';
 $('syncMedia').classList.toggle('registered',cloud);
 focusState();
}
function focusState(){
 const signed=bridge.isSignedIn(),has=hasAudio(),stored=signed&&media.list(song).some(m=>m.kind==='A');
 root.classList.toggle('syncNeedsLogin',!signed);
 root.classList.toggle('syncNeedsAudio',signed&&!has);
 root.classList.toggle('syncReady',signed&&has);
 $('syncAccountSummary').textContent=signed?'保存先：クラウド':'ログインして始める';
 const label=$('syncIntroTitle'),info=$('syncIntroText');
 if(!signed){label.textContent='まずログイン';info.textContent='REC NOTEに使っているアカウントでログインしてください。';}
 else if(!has){label.textContent=stored?'音源を読み込んでいます':'最初にMP3を登録';info.textContent=stored?'クラウドに保存済みの音源を復元します。読み込まれないときは下から選択できます。':'曲を選び、MP3を一度登録してください。次からは自動で開きます。';}
 $('syncMedia').hidden=stored&&has;
 const t=get(selected),some=rows().some(x=>started(x.time));
 $('syncQuickReview').hidden=!signed||!has||!some||selected<0;
 $('syncQuickConfirm').disabled=!complete(t)||confirmed(t)||conflict(selected);
 $('syncQuickEnd').disabled=!started(t)||confirmed(t);
 $('syncQuickEnd').hidden=complete(t);
 $('syncDockLyric').title=selected>=0?lines[selected]:'';updatePrimary();
}
function toggleAudio(){if(!hasAudio()){notice('先にMP3を選んでください。',true);return;}if(audio.paused)audio.play().catch(e=>notice('再生できません：'+e.message,true));else audio.pause();}
async function loadLyrics(){
 const request=++seq,target=song;work=null;version=null;versions=[];lines=[];lastTap=-1;selected=-1;
 $('syncTitle').textContent=target;$('syncLines').replaceChildren();$('syncEditor').hidden=true;
 for(const b of root.querySelectorAll('[data-song]'))b.classList.toggle('active',b.dataset.song===target);
 $('syncVersion').replaceChildren();$('syncSourceWarning').hidden=true;renderRows();clock();
 if(!bridge.isSignedIn()){$('syncAccount').open=true;notice('歌詞を取得するにはクラウドにログインしてください。',true);return;}
 notice('歌詞を読み込んでいます…');
 try{
  const res=await bridge.read(target);if(request!==seq||song!==target)return;
  if(!res?.versions?.length){notice('この曲の歌詞原文が見つかりません。',true);return;}
  work=res.work;versions=res.versions;
  for(const v of versions){const o=document.createElement('option');o.value=v.id;o.textContent='第'+v.version_no+'版 '+(v.text_status==='unverified_pdf_extract'?'PDF未照合':v.text_status==='author_original'?'原文':v.text_status==='author_revision'?'作者修正版':'登録版');$('syncVersion').append(o);}
  changeVersion(versions[0].id);notice('歌詞を読み込みました。');
 }catch(e){if(request===seq)notice('歌詞取得に失敗：'+e.message,true);}
}
function changeVersion(v){
 version=versions.find(x=>x.id===v)||versions[0];lines=String(version.literal_text||'').replace(/\r\n?/g,'\n').split('\n');
 $('syncVersion').value=version.id;
 $('syncSourceWarning').hidden=version.text_status!=='unverified_pdf_extract';
 $('syncSourceWarning').textContent='この歌詞はPDF抽出による未校正版です。時間合わせと原文校正は別工程です。';
 const saved=readCheckpoint(),unconfirmed=rows().find(x=>!confirmed(x.time));
 const fromEditor=Number(new URLSearchParams(location.search).get('line'));
 selected=Number.isInteger(fromEditor)&&fromEditor>=0&&lines[fromEditor]?.trim()?fromEditor: Number.isInteger(saved)&&lines[saved]?.trim()&&!confirmed(get(saved))?saved:(unconfirmed?.i??rows()[0]?.i??-1);
 renderRows();if(selected>=0)choose(selected,true,false);
}
function download(name,content,type){
 const url=URL.createObjectURL(new Blob([content],{type:type||'text/plain;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),6000);
}
function srt(){
 const arr=rows().filter(x=>confirmed(x.time)).sort((a,b)=>a.time.start-b.time.start);
 if(!arr.length){notice('確認済みの歌詞がありません。',true);return;}
 const stamp=t=>{const ms=Math.round(t*1000);return String(Math.floor(ms/3600000)).padStart(2,'0')+':'+String(Math.floor(ms%3600000/60000)).padStart(2,'0')+':'+String(Math.floor(ms%60000/1000)).padStart(2,'0')+','+String(ms%1000).padStart(3,'0');};
 download('LYRIC_SYNC_'+song+'_確認済み.srt',arr.map((x,i)=>(i+1)+'\n'+stamp(x.time.start)+' --> '+stamp(x.time.end)+'\n'+x.text+'\n').join('\n'));
}

// Timing-only editor. Lyric spelling, source line breaks, cue splits and
// display typography are edited ONLY in /lyric-editor.
function renderQuickTiming(){
 const active=!!work&&!!version&&selected>=0&&!!lines[selected]?.trim();
 quickEdit.hidden=!active;
 if(!active)return;
 const i=selected,t=get(i);
 $('syncTimingUndo').disabled=!STACK.length;
 const view=$('syncTimingButtons');view.replaceChildren();
 for(const kind of ['start','end']){
  const group=document.createElement('div'),label=document.createElement('strong');
  label.textContent=(kind==='start'?'開始':'終了')+' '+(Number.isFinite(t?.[kind])?timestamp(t[kind]):'未登録');
  group.append(label);
  for(const [value,labelText] of [['now','再生位置で上書き'],[-0.1,'−0.1秒'],[0.1,'＋0.1秒']]){
   const button=document.createElement('button');button.type='button';button.textContent=labelText;
   button.disabled=!!conflict(i)||(value==='now'?!hasAudio():!Number.isFinite(t?.[kind]));
   button.addEventListener('click',()=>dispQuick(kind,value));group.append(button);
  }
  view.append(group);
 }
}
function dispQuick(kind,change){
 if(selected<0||conflict(selected)){notice('この歌詞の時刻競合を確認してください。',true);return;}
 const t=get(selected)||{},v=change==='now'?(hasAudio()?wavPosition():NaN):Number(t[kind])+change;
 if(!Number.isFinite(v)){notice('登録時刻または音源を確認してください。',true);return;}
 const v2=Math.round(v*100)/100;
 const start=kind==='start'?v2:(Number.isFinite(t.start)?t.start:null);
 const end=kind==='end'?v2:(Number.isFinite(t.end)?t.end:null);
 if(start===null||start<0||(end!==null&&end<=start)){
  notice('時刻が前後します。既存データは変更しません。',true);return;
 }
 if(start===t.start&&end===t.end)return;
 if(saveRecord(selected,{start,end,status:'draft',confirmedAt:null})){
  clearDraft();renderRows();fillEditor();updatePrimary();
  notice('時刻を変更して保存しました。確認済みの場合は再確認待ちになります。');
 }
}
$('syncTimingUndo').addEventListener('click',()=>$('syncUndo').click());

function json(){
 if(!version)return;
 download('LYRIC_SYNC_'+song+'_同期.json',JSON.stringify({schema_version:3,source:'REC_NOTE_CLOUD_LYRIC_SYNC',song,workId:work.id,textVersionId:version.id,textStatus:version.text_status,exportedAt:new Date().toISOString(),cues:rows().map(x=>({lineIndex:x.i,text:x.text,start:x.time?.start??null,end:x.time?.end??null,status:x.time?.status||'unassigned'}))},null,2),'application/json');
}
$('syncQuickListen').addEventListener('click',()=>$('syncReplay').click());
$('syncQuickEnd').addEventListener('click',()=>$('syncCaptureEnd').click());
$('syncQuickConfirm').addEventListener('click',()=>$('syncConfirm').click());
$('syncQuickAdjust').addEventListener('click',()=>{const item=$('syncFineTune');item.open=true;item.scrollIntoView({behavior:'smooth',block:'start'});});
for(const b of root.querySelectorAll('[data-song]'))b.addEventListener('click',()=>{if(song!==b.dataset.song){setSong(b.dataset.song);loadLyrics();}});
$('syncVersion').addEventListener('change',e=>changeVersion(e.target.value));
$('syncPlay').addEventListener('click',toggleAudio);$('syncDockPlay').addEventListener('click',toggleAudio);
$('syncBack').addEventListener('click',()=>seek(wavPosition()-3));
$('syncNext').addEventListener('click',()=>seek(wavPosition()+3));
$('syncSpeed').addEventListener('change',e=>audio.playbackRate=Number(e.target.value));
$('syncOffset').addEventListener('change',e=>{localStorage.setItem(OFFSET_PREFIX+song,e.target.value);clock();notice('この端末のWAV基準補正を更新しました。登録済み時刻は書き換えません。');});
$('syncSlider').addEventListener('input',e=>{$('syncClock').textContent=timestamp(e.target.value/100);});
$('syncSlider').addEventListener('change',e=>seek(e.target.value/100));
$('syncCaptureStart').addEventListener('click',()=>capture('start'));
$('syncCaptureEnd').addEventListener('click',()=>capture('end'));
$('syncSave').addEventListener('click',editorSave);
for(const f of [$('syncStart'),$('syncEnd')])f.addEventListener('input',saveDraft);
for(const b of root.querySelectorAll('[data-adjust-start]'))b.addEventListener('click',()=>shift('start',Number(b.dataset.adjustStart)));
for(const b of root.querySelectorAll('[data-adjust-end]'))b.addEventListener('click',()=>shift('end',Number(b.dataset.adjustEnd)));
$('syncConfirm').addEventListener('click',confirm);
$('syncUnconfirm').addEventListener('click',()=>{if(selected>=0&&saveRecord(selected,{status:'draft',confirmedAt:null})){renderRows();fillEditor();}});
$('syncTapNow').addEventListener('click',primaryAction);
fillMissing.addEventListener('click',()=>{
 const count=completeMissingEnds();
 if(count)notice(count+'行の終了時刻を、次の歌詞または間奏の開始から補完しました。既存の時刻は変更していません。');
 else notice('補完できる終了未設定の行はありません。');
});
$('syncRecordMode').addEventListener('click',()=>switchSyncMode('record'));
$('syncReviewMode').addEventListener('click',()=>switchSyncMode('review'));
$('syncUndo').addEventListener('click',()=>{if(!STACK.length){notice('戻せる操作がありません。');return;}state.lyricTimings=JSON.parse(STACK.pop());persist();renderRows();fillEditor();updatePrimary();notice('前の状態に戻しました。');});
$('syncFindNext').addEventListener('click',()=>{const item=rows().find(x=>!confirmed(x.time));if(!item){notice('全行が確認済みです。');return;}$('syncTapMode').checked=false;choose(item.i,true,true);});
$('syncReplay').addEventListener('click',()=>{const t=get(selected);if(!started(t)){notice('開始位置を記録してください。',true);return;}seek(Math.max(0,t.start-1));replayEnd=Number.isFinite(t.end)?t.end+1:t.start+6;audio.play().catch(e=>notice(e.message,true));});
$('syncPush').addEventListener('click',()=>{if(!media.isSignedIn()){$('syncAccount').open=true;notice('ログインしてください。',true);return;}$('recCloudSync')?.click();notice('同期を要求しました。完了表示をご確認ください。');});
$('syncSrt').addEventListener('click',srt);$('syncJson').addEventListener('click',json);
$('syncTapMode').addEventListener('change',()=>lastTap=-1);
audio.addEventListener('timeupdate',()=>{clock();if(replayEnd!==null&&wavPosition()>=replayEnd){audio.pause();replayEnd=null;}});
audio.addEventListener('loadedmetadata',clock);audio.addEventListener('play',clock);audio.addEventListener('pause',clock);
$('syncUpload').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 if(!media.isSignedIn()){$('syncAccount').open=true;notice('先にログインしてください。',true);return;}
 if(file.size>45000000){notice('クラウド上限は45MBです。MP3またはM4Aを選んでください。',true);return;}
 if(!/\.(mp3|m4a)$/i.test(file.name)){notice('MP3またはM4Aの音源を選択してください。',true);return;}const target=song;$('syncUploadState').textContent='登録中…';
 try{await loadAudio(target,file,true);const m=await media.upload('A',file,target);if(!m?.id)throw Error('クラウド保存に失敗しました');
 $('syncUploadState').textContent='クラウド保存済み';notice('MP3を非公開で保存しました。外出先でも使用できます。');clock();}
 catch(err){$('syncUploadState').textContent='保存失敗';notice(err.message,true);}
});
window.addEventListener('recnote:cloud-auth-change',()=>{
 const signed=bridge.isSignedIn();$('syncAuthState').textContent=signed?'接続中':'ログインが必要';
 if(signed){$('syncAccount').open=false;saveBadgeStatus('クラウド接続中','pending');loadLyrics();}
 else {audio.pause();work=null;version=null;versions=[];lines=[];selected=-1;lastTap=-1;renderRows();$('syncEditor').hidden=true;$('syncFineTune').open=false;$('syncDockLyric').textContent='歌詞を選択';$('syncAccount').open=true;saveBadgeStatus('ログインが必要','offline');notice('ログインしてください。',true);}focusState();
});
window.addEventListener('recnote:instrument-start',e=>{if(e.detail?.song===song)closeLyricBeforeInstrument(Number(e.detail.start));});
window.addEventListener('recnote:interlude-started',e=>{
 if(e.detail?.song!==song||e.detail?.source==='rail'||!work||!version||syncMode!=='record')return;
 // Stay in the lyric flow. If the current line was already timed, focus the
 // next untimed lyric without jumping to the top of the page.
 if(selected>=0&&!started(get(selected)))return;
 const following=rows().find(x=>x.i>selected&&!started(x.time));
 if(following)choose(following.i,true,false);
});

window.addEventListener('recnote:cloud-synced',()=>{
 $('syncAuthState').textContent='クラウド同期済み';saveBadgeStatus('クラウド同期済み','saved');
 renderRows();if(!document.activeElement?.closest('.syncEditor'))fillEditor();clock();
});
window.addEventListener('focus',clock);
window.addEventListener('offline',()=>saveBadgeStatus('オフライン · 端末保存','offline'));
window.addEventListener('online',()=>{saveBadgeStatus('再接続 · 同期待ち','pending');clock();});
if(typeof MutationObserver==='function'){
 const status=$('recCloudStatus');
 if(status){
  const refresh=()=>{
   if(!bridge.isSignedIn())return;
   const level=status.dataset.level;
   if(level==='bad')saveBadgeStatus('クラウド未同期 · 要確認','error');
   else if(level==='busy')saveBadgeStatus('クラウド保存中…','pending');
   else if(level==='good')saveBadgeStatus('クラウド同期済み','saved');
  };
  new MutationObserver(refresh).observe(status,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['data-level']});
 }
}
const incomingSong=new URLSearchParams(location.search).get('song');if(incomingSong&&typeof SONGS!=='undefined'&&SONGS.includes(incomingSong)&&incomingSong!==song)setSong(incomingSong);
// Keep the playback transport available without occupying half the screen
// while scrolling through 40+ lyric lines.
function updateCompactPlayer(){root.classList.toggle('syncScrolled',window.scrollY>260);}
window.addEventListener('scroll',updateCompactPlayer,{passive:true});
updateCompactPlayer();
clock();loadLyrics();
})();
