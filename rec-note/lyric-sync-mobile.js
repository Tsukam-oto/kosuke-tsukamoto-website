/* REC NOTE v17: cloud lyric timing and non-destructive display plans. */
(function(){
'use strict';
// Dedicated full-song timing page only. The audio-corrections page has its own navigation.
if(new URLSearchParams(location.search).get('sync')!=='1'&&!/\/lyric-sync(?:\.html)?\/?$/i.test(location.pathname))return;
const bridge=window.RECNOTE_LYRIC_BRIDGE,media=window.RECNOTE_CLOUD_MEDIA;
if(!bridge||!media||typeof persist!=='function')return;
document.body.classList.add('syncPage');document.title='曲のタイミング合わせ | REC NOTE v17';
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
const displayEdit=document.createElement('details');displayEdit.className='syncTimingPanel';displayEdit.id='syncDisplayPanel';
displayEdit.innerHTML='<summary>歌詞の分割・結合・改行</summary><p>歌詞原本は変更せず、動画に表示する単位だけ編集します。</p><p id="syncDisplaySource"></p><div class="syncDisplayFields"><label>切る位置の言葉<input id="syncDisplayPhrase" type="text" placeholder="例：でも、どうか"/></label><label>言葉の<select id="syncDisplaySide"><option value="before">前で切る</option><option value="after">後で切る</option></select></label></div><div class="syncDisplayActions"><button id="syncDisplaySplitNow" type="button">別画面に分割・いまの時刻</button><button id="syncDisplaySplitDraft" type="button">別画面に分割・時刻は後で</button><button id="syncDisplayBreak" type="button">同じ画面内で改行</button><button id="syncDisplayJoin" type="button">前の歌詞と同じ画面</button></div><div id="syncDisplayResults"></div><div class="syncDisplayActions"><button id="syncDisplayUndo" type="button">表示変更を元に戻す</button><button id="syncDisplayReset" type="button">この行の表示設定を初期化</button><button id="syncDisplayExport" type="button">動画用JSON保存</button></div><p id="syncDisplayStatus" role="status"></p>';
root.insertBefore(displayEdit,$('syncFineTune'));
const extraStyle=document.createElement('style');extraStyle.textContent='.syncTimingPanel{background:#fff;border:1px solid #dce3eb;padding:10px 12px;border-radius:12px;margin:12px 0}.syncTimingPanel summary{font-weight:700;color:#15538b;padding:7px;cursor:pointer}.syncTimingPanel p{font-size:12px;color:#566476}.syncDisplayFields,.syncDisplayActions,#syncTimingButtons>div{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin:9px 0}.syncDisplayFields label{font-size:12px;flex:1;min-width:128px}.syncDisplayFields input,.syncDisplayFields select{display:block;padding:7px;border:1px solid #cfd6e1;border-radius:7px;width:100%}.syncDisplayActions button,#syncTimingButtons button,#syncDisplayResults button{font-size:12px;min-height:32px;padding:5px 8px}#syncDisplaySource{white-space:pre-wrap;background:#f4f6f8;padding:10px;border-radius:8px}#syncDisplayResults>article{background:#f6f8fa;border:1px solid #e3e7eb;padding:9px;border-radius:9px;margin:9px 0}#syncDisplayResults .vertical{writing-mode:vertical-rl;text-orientation:mixed;display:flex;gap:14px;background:#292832;color:#f5f1ea;max-height:240px;min-height:90px;padding:15px;margin-top:7px;overflow:auto;line-height:1.9}#syncDisplayResults .vertical span{display:block}#syncDisplayResults input{max-width:115px;padding:6px;margin:5px;border:1px solid #d0d7e2;border-radius:7px}#syncDisplayStatus[data-error="yes"]{color:#b72b2b}';document.head.append(extraStyle);


// v18 inline editing, mounted immediately after selected lyric row.
const inlinePanel=document.createElement('section');inlinePanel.id='syncInlineEdit';inlinePanel.className='syncInlineEdit';
inlinePanel.innerHTML='<div class="syncInlineHeading"><strong>選択中の歌詞を整える</strong><a id="syncInlineFull" href="./lyric-editor">専用ページで編集</a></div><label>歌詞の誤字・言葉を修正<textarea id="syncInlineSource" rows="2" spellcheck="false"></textarea></label><div class="syncInlineActions"><button id="syncInlineSave" type="button">修正案を保存</button><button id="syncInlineCommit" type="button">正式歌詞へ反映</button><button id="syncInlineOriginal" type="button">この行を元に戻す</button></div><p id="syncInlineNote">ここで編集した文字は、正式保存まで原文を変更しません。</p>';
root.insertBefore(inlinePanel,$('syncLines').nextSibling);
const navToEditor=document.createElement('a');navToEditor.className='syncEditorNav';navToEditor.id='syncEditorNav';navToEditor.textContent='歌詞の編集・改行';navToEditor.href='./lyric-editor';
root.querySelector('.syncHeading').append(navToEditor);
let inlineTimer=0,inlineDirty=false;
function inlineProposed(){
 const c=window.RECNOTE_LYRIC_WORKBENCH;
 const d=work&&version?c?.fetchDraft(state,work,version):null;
 return d?c.lines(d.text):lines.slice();
}
function refreshInline(){
 if(!work||!version||selected<0){inlinePanel.hidden=true;return;}
 inlinePanel.hidden=false;
 const text=inlineProposed()[selected]??lines[selected]??'',input=$('syncInlineSource');
 if(document.activeElement!==input)input.value=text;
 const params=new URLSearchParams({song,line:String(selected)});
 $('syncInlineFull').href='./lyric-editor?'+params.toString();
 navToEditor.href='./lyric-editor?'+new URLSearchParams({song}).toString();
 $('syncInlineCommit').disabled=version.id!==versions[0]?.id||inlineProposed().join('\n')===version.literal_text;
 $('syncInlineOriginal').disabled=text===(lines[selected]??'');
 $('syncInlineNote').textContent=text!==(lines[selected]??'')?'この行には修正案があります。正式版への反映はまだです。':'表示上の分割・改行は、すぐ下で調整できます。';
}
function mountInline(){
 if(!work||!version||selected<0)return;
 const node=$('syncLines').querySelector('[data-line="'+selected+'"]');
 if(node){node.after(inlinePanel,displayEdit,quickEdit,review,adjust);refreshInline();}
}
function saveInline(announce){
 const c=window.RECNOTE_LYRIC_WORKBENCH;if(!c||selected<0||!version)return false;
 const draft=inlineProposed();
 if(draft.length!==lines.length){notice('行数が変わった下書きは専用ページで続けて編集してください。',true);return false;}
 draft[selected]=$('syncInlineSource').value;
 try{c.saveDraft(state,work,version,draft.join('\n'));inlineDirty=false;persist();saveBadgeStatus('歌詞修正案を保存 · クラウド同期待ち','pending');refreshInline();if(announce)notice('歌詞の修正案を保存しました。');return true;}
 catch(e){notice(e.message,true);return false;}
}
async function publishInline(){
 const c=window.RECNOTE_LYRIC_WORKBENCH;
 if(!bridge.writeRevision||!c||!saveInline(false))return;
 const d=c.fetchDraft(state,work,version);if(!d||d.text===version.literal_text)return;
 if(!confirm('修正した歌詞を新しい正式版として保存しますか？ 古い歌詞と時刻は残ります。変更行の時刻は確認待ちになります。'))return;
 const from=version,w=work,oldSong=song,idx=selected;
 $('syncInlineCommit').disabled=true;notice('正式歌詞を保存中…');
 try{
  const to=await bridge.writeRevision({workId:w.id,baseVersionId:from.id,literalText:d.text});
  const report=c.transfer(state,w.id,oldSong,from,to);
  const draft=state.drafts[c.draftKey(w.id,from.id)];if(draft)draft.publishedAs=to.id;
  persist();await loadLyrics();
  if(lines[idx]?.trim())choose(idx,true,false);
  notice('第'+to.version_no+'版を保存しました。'+report.copied+'行の時刻を引き継ぎました。');
 }catch(e){notice('正式保存に失敗しました：'+e.message,true);}
 finally{refreshInline();}
}
$('syncInlineSave').addEventListener('click',()=>saveInline(true));
$('syncInlineCommit').addEventListener('click',publishInline);
$('syncInlineOriginal').addEventListener('click',()=>{$('syncInlineSource').value=lines[selected]??'';saveInline(true);});
$('syncInlineSource').addEventListener('input',()=>{clearTimeout(inlineTimer);inlineDirty=true;$('syncInlineNote').textContent='編集中…';inlineTimer=setTimeout(()=>{if(inlineDirty)saveInline(false);},850);});

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
 if(inlineDirty&&selected>=0){clearTimeout(inlineTimer);saveInline(false);}
 dispRender();
 const view=$('syncLines'),position=view.scrollTop;view.replaceChildren();
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
  b.addEventListener('click',()=>{choose(x.i,true,false);if(syncMode==='review'&&started(get(x.i)))seek(Math.max(0,get(x.i).start-0.8));});
  view.append(b);
 }
 mountInline();
 view.scrollTop=position;
 window.dispatchEvent(new CustomEvent('recnote:instrument-rail-refresh',{detail:{song}}));
 $('syncCount').textContent=done+' / '+data.length+' 行 確認済み';
 $('syncBreakdown').textContent='開始 '+begin+'・終了 '+end+'・確認済み '+done;
 $('syncMeterFill').style.width=(data.length?100*done/data.length:0)+'%';
 const missing=fillableRows().length;fillMissing.hidden=missing===0;fillMissing.textContent=missing+'行の終了未設定を自動補完';
}
function choose(i,scroll,seekAudio){
 if(!lines[i]?.trim())return;
 if(inlineDirty&&selected>=0&&i!==selected){clearTimeout(inlineTimer);saveInline(false);}
 selected=i;const t=get(i);
 if(seekAudio&&started(t))seek(t.start);
 for(const el of $('syncLines').querySelectorAll('.syncLine'))el.classList.toggle('selected',Number(el.dataset.line)===i);
 const node=$('syncLines').querySelector('[data-line="'+i+'"]');if(scroll)node?.scrollIntoView({block:'nearest',behavior:'smooth'});
 mountInline();fillEditor();saveCheckpoint();updatePrimary();
}
function fillEditor(){
 dispRender();
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
 selected=Number.isInteger(saved)&&lines[saved]?.trim()&&!confirmed(get(saved))?saved:(unconfirmed?.i??rows()[0]?.i??-1);
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

// v17 display-only cue structure stored in the already cloud-synced state.drafts.
const dispUndo=[];let dispLast=-100;
function dispKey(i){return 'lyric-display-v1:'+work.id+':'+version.id+':'+i;}
function dispConflict(i){const p=dispKey(i)+'__local_';return Object.keys(state.drafts||{}).some(k=>k.startsWith(p));}
function dispPlan(i){
 const x=state.drafts?.[dispKey(i)];
 if(!x||x.source!==lines[i]||!Array.isArray(x.splits)||!Array.isArray(x.breaks))return {splits:[],breaks:[],join:false};
 return {splits:x.splits.map(a=>({pos:a.pos,time:Number.isFinite(a.time)?a.time:null})),breaks:x.breaks.slice(),join:!!x.join};
}
function dispMessage(text,bad=false){$('syncDisplayStatus').textContent=text;$('syncDisplayStatus').dataset.error=bad?'yes':'no';if(bad)notice(text,true);}
function dispSave(i,x){
 if(dispConflict(i)){dispMessage('別端末の表示設定と競合しています。クラウドのバックアップを確認してください。',true);return false;}
 const len=lines[i].length,valid=n=>Number.isInteger(n)&&n>0&&n<len;
 const allPositions=[...x.splits.map(a=>a.pos),...x.breaks];
 if(allPositions.some(n=>!valid(n))||new Set(x.splits.map(a=>a.pos)).size!==x.splits.length||new Set(x.breaks).size!==x.breaks.length){dispMessage('分割位置が不正です。',true);return false;}
 const time=get(i),sorted=x.splits.slice().sort((a,b)=>a.pos-b.pos);
 let previous=Number.isFinite(time?.start)?time.start:null;
 for(const v of sorted){if(v.time!==null&&(!Number.isFinite(v.time)||v.time<0||(previous!==null&&v.time<=previous)||(Number.isFinite(time?.end)&&v.time>=time.end))){dispMessage('分割の開始時刻が前後の時刻と矛盾しています。',true);return false;}if(v.time!==null)previous=v.time;}
 const key=dispKey(i);dispUndo.push({key,old:state.drafts?.[key]??null});if(dispUndo.length>30)dispUndo.shift();
 if(!state.drafts||typeof state.drafts!=='object')state.drafts={};
 state.drafts[key]={schema:1,source:lines[i],splits:sorted,breaks:x.breaks.slice().sort((a,b)=>a-b),join:!!x.join,updatedAt:new Date().toISOString()};
 persist();saveBadgeStatus('表示を端末保存 · 同期待ち','pending');dispRender();
 window.dispatchEvent(new CustomEvent('recnote:display-updated',{detail:{song}}));return true;
}
function dispUnits(i){
 const p=dispPlan(i),txt=lines[i],points=[0,...p.splits.map(x=>x.pos).sort((a,b)=>a-b),txt.length],out=[];
 for(let j=0;j<points.length-1;j++){
  const from=points[j],to=points[j+1],breaks=p.breaks.filter(x=>x>from&&x<to).sort((a,b)=>a-b);
  let at=from;const cols=[];for(const b of [...breaks,to]){cols.push(txt.slice(at,b));at=b;}
  out.push({lineIndex:i,from,to,text:txt.slice(from,to),columns:cols,start:j===0?get(i)?.start??null:p.splits.find(x=>x.pos===from)?.time??null,end:j===points.length-2?get(i)?.end??null:p.splits.find(x=>x.pos===to)?.time??null});
 }
 return out;
}
function dispCues(){
 const allCues=[];
 for(const row of rows()){
  const p=dispPlan(row.i);
  for(const [n,u] of dispUnits(row.i).entries()){
   const cue={text:u.text,columns:u.columns,start:u.start,end:u.end,source:[{lineIndex:u.lineIndex,from:u.from,to:u.to}],confirmed:false};
   if(n===0&&p.join&&allCues.length){
    const previous=allCues[allCues.length-1];previous.text+='\n'+cue.text;previous.columns.push(...cue.columns);previous.end=cue.end;previous.source.push(...cue.source);
   }else allCues.push(cue);
  }
 }
 return allCues;
}
function dispAt(){
 if(selected<0){dispMessage('歌詞を選んでください。',true);return null;}
 const q=$('syncDisplayPhrase').value,txt=lines[selected];if(!q){dispMessage('区切りたい言葉を入力してください。',true);return null;}
 const first=txt.indexOf(q);if(first<0||txt.indexOf(q,first+1)>=0){dispMessage('言葉が見つからないか複数あります。もう少し長く入力してください。',true);return null;}
 const p=first+($('syncDisplaySide').value==='after'?q.length:0);
 if(p<=0||p>=txt.length){dispMessage('行の先頭・末尾では区切れません。',true);return null;}return p;
}
function dispRender(){
 const active=!!work&&!!version&&selected>=0&&!!lines[selected]?.trim();
 displayEdit.hidden=!active;quickEdit.hidden=!active;if(!active)return;
 if(dispLast!==selected){$('syncDisplayPhrase').value='';dispLast=selected;}
 const i=selected,p=dispPlan(i),t=get(i);$('syncDisplaySource').textContent=lines[i];
 $('syncDisplayJoin').textContent=p.join?'前の歌詞との結合を解除':'前の歌詞と同じ画面';
 $('syncDisplayJoin').disabled=!rows().some(x=>x.i<i)||dispConflict(i);
 $('syncDisplayUndo').disabled=!dispUndo.length;$('syncTimingUndo').disabled=!STACK.length;
 const timeUI=$('syncTimingButtons');timeUI.replaceChildren();
 for(const kind of ['start','end']){
  const group=document.createElement('div'),label=document.createElement('strong');
  label.textContent=(kind==='start'?'開始':'終了')+' '+(Number.isFinite(t?.[kind])?timestamp(t[kind]):'未登録');group.append(label);
  for(const [value,text] of [['now','再生位置で上書き'],[-0.1,'−0.1秒'],[0.1,'＋0.1秒']]){
   const btn=document.createElement('button');btn.type='button';btn.textContent=text;
   btn.disabled=!!conflict(i)||(value==='now'?!hasAudio():!Number.isFinite(t?.[kind]));
   btn.addEventListener('click',()=>dispQuick(kind,value));group.append(btn);
  }timeUI.append(group);
 }
 const container=$('syncDisplayResults');container.replaceChildren();
 for(const [n,u] of dispUnits(i).entries()){
  const box=document.createElement('article'),head=document.createElement('div');
  const title=document.createElement('strong');title.textContent='画面'+(n+1)+'（'+(Number.isFinite(u.start)?timestamp(u.start):'開始未登録')+'〜'+(Number.isFinite(u.end)?timestamp(u.end):'終了未登録')+'）';head.append(title);
  if(n>0){
   const inp=document.createElement('input');inp.value=Number.isFinite(u.start)?timestamp(u.start):'';inp.placeholder='1:20.25';inp.setAttribute('aria-label','分割後の開始時刻');
   const save=document.createElement('button');save.textContent='時刻保存';
   save.addEventListener('click',()=>{const plan=dispPlan(i),v=plan.splits.find(x=>x.pos===u.from),value=inp.value.trim()?parse(inp.value):null;if(inp.value.trim()&&value===null){dispMessage('時刻形式は1:20.25です。',true);return;}v.time=value;if(dispSave(i,plan))dispMessage('分割の時刻を保存しました。');});
   const now=document.createElement('button');now.textContent='いまの時刻';now.disabled=!hasAudio();
   now.addEventListener('click',()=>{const plan=dispPlan(i),v=plan.splits.find(x=>x.pos===u.from);v.time=Math.round(wavPosition()*100)/100;if(dispSave(i,plan))dispMessage('再生位置で時刻を更新しました。');});
   const remove=document.createElement('button');remove.textContent='分割を解除';
   remove.addEventListener('click',()=>{const plan=dispPlan(i);plan.splits=plan.splits.filter(x=>x.pos!==u.from);if(dispSave(i,plan))dispMessage('分割を解除しました。');});
   head.append(inp,save,now,remove);
  }
  const preview=document.createElement('div');preview.className='vertical';
  for(const col of u.columns){const span=document.createElement('span');span.textContent=col;preview.append(span);}
  box.append(head,preview);container.append(box);
 }
 if(dispConflict(i))dispMessage('別端末の表示データに競合があります。編集前に確認してください。',true);
 else $('syncDisplayStatus').textContent='表示設定は原文と独立して保存され、クラウドと同期されます。';
}
function dispQuick(kind,change){
 if(selected<0||conflict(selected)){notice('この歌詞の時刻競合を確認してください。',true);return;}
 const t=get(selected)||{},v=change==='now'?(hasAudio()?wavPosition():NaN):Number(t[kind])+change;
 if(!Number.isFinite(v)){notice('登録時刻または音源を確認してください。',true);return;}
 const v2=Math.round(v*100)/100,start=kind==='start'?v2:(Number.isFinite(t.start)?t.start:null),end=kind==='end'?v2:(Number.isFinite(t.end)?t.end:null);
 if(start===null||start<0||(end!==null&&end<=start)){notice('時刻が前後します。既存データは変更しません。',true);return;}
 if(start===t.start&&end===t.end)return;
 if(saveRecord(selected,{start,end,status:'draft',confirmedAt:null})){clearDraft();renderRows();fillEditor();updatePrimary();notice('時刻を変更して保存しました。確認済みの場合は再確認待ちになります。');}
}
function dispSplit(withTime){
 const at=dispAt();if(at===null)return;if(withTime&&!hasAudio()){dispMessage('再生する音源が必要です。',true);return;}
 const p=dispPlan(selected);if(p.splits.some(x=>x.pos===at)){dispMessage('この位置は分割済みです。',true);return;}
 p.splits.push({pos:at,time:withTime?Math.round(wavPosition()*100)/100:null});
 if(dispSave(selected,p))dispMessage('歌詞の表示を分割しました。');
}
function dispExport(){
 if(!work||!version)return;
 const cues=dispCues(),payload={schema_version:1,source:'REC_NOTE_DISPLAY_V17',song,workId:work.id,textVersionId:version.id,generatedAt:new Date().toISOString(),
  sourceLines:rows().map(x=>({lineIndex:x.i,text:x.text})),displayCues:cues,needsTimingReview:cues.some(x=>!Number.isFinite(x.start)||!Number.isFinite(x.end)||x.end<=x.start)};
 download('歌詞表示_'+song+'_動画制作.json',JSON.stringify(payload,null,2),'application/json');
}
for(const [id,handler] of [
 ['syncDisplaySplitNow',()=>dispSplit(true)],['syncDisplaySplitDraft',()=>dispSplit(false)],
 ['syncDisplayBreak',()=>{const at=dispAt();if(at===null)return;const p=dispPlan(selected);p.breaks=p.breaks.includes(at)?p.breaks.filter(x=>x!==at):[...p.breaks,at];if(dispSave(selected,p))dispMessage('同じ画面内の改行を更新しました。');}],
 ['syncDisplayJoin',()=>{const p=dispPlan(selected);p.join=!p.join;if(dispSave(selected,p))dispMessage('前の歌詞との結合設定を更新しました。');}],
 ['syncDisplayUndo',()=>{const last=dispUndo.pop();if(!last)return;if(!state.drafts||typeof state.drafts!=='object')state.drafts={};if(last.old===null)delete state.drafts[last.key];else state.drafts[last.key]=last.old;persist();dispRender();dispMessage('表示変更を元に戻しました。');}],
 ['syncDisplayReset',()=>{if(selected<0||!confirm('この行の表示設定を初期化しますか？ 歌詞原本と時刻は残ります。'))return;if(dispSave(selected,{splits:[],breaks:[],join:false}))dispMessage('この行の表示を初期化しました。');}],
 ['syncDisplayExport',dispExport],['syncTimingUndo',()=>$('syncUndo').click()]
])$(id).addEventListener('click',handler);

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
clock();loadLyrics();
})();
