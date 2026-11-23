/* REC NOTE v18 - full-page lyric editing workbench.
   Source revisions are append-only; display breaks are stored separately. */
(function(){
'use strict';
if(!/\/lyric-editor(?:\.html)?\/?$/i.test(location.pathname))return;
const bridge=window.RECNOTE_LYRIC_BRIDGE,core=window.RECNOTE_LYRIC_WORKBENCH;
if(!bridge||!core||typeof persist!=='function')return;
const $=id=>document.getElementById(id);
document.title='歌詞を整える | REC NOTE v18';
document.body.classList.add('lyricEditorPage');
const app=document.createElement('div');app.id='lyricEditorApp';
app.innerHTML=[
'<header class="leHeader"><div class="leEyebrow">REC NOTE / LYRIC WORKBENCH</div><div class="leHeadRow"><div><h1>歌詞を整える</h1><p>誤字修正・文章の分割と結合・動画用の自然な改行を、このページで管理します。</p></div><nav><a href="./lyric-sync">タイミング合わせへ</a><a href="./">REC NOTE</a></nav></div></header>',
'<div class="leFrame"><nav id="leSongs" class="leSongTabs" aria-label="楽曲を選ぶ"></nav><div class="leStatusBar"><span id="leStatus" role="status">ログインを確認しています…</span><span id="leSaveStatus">未編集</span></div>',
'<details class="leAuth" id="leAuth"><summary>ログイン・クラウド同期</summary><div id="leCloudHere"></div></details>',
'<div class="leWorkspace"><section class="leSongList"><div class="leCardTitle"><strong id="leSongName">歌詞一覧</strong><label>歌詞の版 <select id="leVersion"></select></label></div><p class="leSmall">行を選ぶと右側で直接編集できます。</p><div id="leLineList" class="leLineList"></div></section>',
'<section class="leMain"><div class="leCardTitle"><strong>歌詞の編集</strong><div class="leModeBar"><button type="button" id="leLineMode" class="active">行ごと</button><button type="button" id="leFullMode">全文</button></div></div>',
'<div id="leLineEdit"><div class="leLineHead"><strong id="leSelectedNo">行を選択</strong><span id="leLineTime"></span></div><label class="leField">歌詞（文字や誤字の修正）<textarea id="leLineText" rows="3" spellcheck="false"></textarea></label><div class="leActions"><button type="button" id="leSplitLine">カーソル位置で行を分割</button><button type="button" id="leJoinPrev">前の行と結合</button><button type="button" id="leAddLine">次に行を追加</button><button type="button" id="leUndo">歌詞の変更を元に戻す</button></div>',
'<section class="leDisplayEditor"><h2>動画での表示・改行</h2><p>ここで入れる改行は歌詞原本を増減させません。縦書きは右の列から左へ、上端を揃えます。</p><label class="leField">表示上の改行（文章は変えず改行だけ入力）<textarea id="leDisplayText" rows="3" spellcheck="false"></textarea></label><div class="leActions"><button type="button" id="leApplyBreaks">この表示改行を保存</button><button type="button" id="leClearBreaks">表示改行を解除</button></div><div id="leVerticalPreview" class="leVertical" aria-label="縦書き表示のプレビュー"></div><span id="leBreakStatus" role="status"></span></section></div>',
'<div id="leFullEdit" hidden><label class="leField">歌詞全文（改行は原文の行区切り）<textarea id="leFullText" rows="24" spellcheck="false"></textarea></label><p class="leSmall">全文の改行を増減した場合、既存時刻は一致する行にのみ安全に引き継ぎます。</p></div>',
'<div class="leSaveArea"><div id="leMigration" class="leMigration">正式な歌詞はまだ変更していません。</div><div class="leActions"><button type="button" id="leSaveDraft">下書きを保存</button><button type="button" id="lePublish" class="lePrimary">正式な歌詞として保存（新しい版）</button></div><p class="leSmall">新しい版を作り、以前の歌詞とタイミングは残します。時刻が不明な箇所は確認待ちになります。</p></div></section></div></div>'
].join('');
document.body.append(app);
const cloud=$('recCloudPanel');if(cloud)$('leCloudHere').append(cloud);
let song=new URLSearchParams(location.search).get('song')||'これからも',work=null,versions=[],version=null,
 editing=[],selected=0,mode='line',pendingChanges=false,displayBreaks={},undo=[],loading=0,saving=false,autoTimer=null;
function message(msg,error=false){$('leStatus').textContent=msg;$('leStatus').dataset.error=error?'true':'false';}
function saveLabel(v){$('leSaveStatus').textContent=v;}
function deepCopy(x){return JSON.parse(JSON.stringify(x));}
function cleanSelected(){selected=Math.max(0,Math.min(selected,editing.length-1));}
function draftState(){return {text:editing.join('\n'),breaks:deepCopy(displayBreaks)};}
function makeCheckpoint(){undo.push(draftState());if(undo.length>40)undo.shift();}
function doRestore(){const d=undo.pop();if(!d)return;editing=core.lines(d.text);displayBreaks=d.breaks;cleanSelected();renderAll();persistDraft();message('変更を1つ元に戻しました。');}
function ensureEdit(){
 if(!version)throw Error('歌詞を読み込んでください');
 if(version.id!==versions[0]?.id)throw Error('過去の版は編集できません。最新の版を選択してください。');
 if(!bridge.isSignedIn())throw Error('先にログインしてください。');
}
function getBreaks(i){
 const fromSession=displayBreaks[i];if(Array.isArray(fromSession))return fromSession;
 const saved=state.drafts?.[core.displayKey(work.id,version.id,i)];
 if(saved?.source===editing[i]&&Array.isArray(saved.breaks))return saved.breaks;
 return [];
}
function renderDisplayText(){
 const src=editing[selected]||'',breaks=getBreaks(selected).filter(x=>Number.isInteger(x)&&x>0&&x<src.length).sort((a,b)=>a-b);
 let prev=0,output='';for(const n of [...breaks,src.length]){output+=(output?'\n':'')+src.slice(prev,n);prev=n;}
 $('leDisplayText').value=output;
 showVertical(output);
}
function showVertical(text){
 const el=$('leVerticalPreview');el.replaceChildren();
 for(const part of text.split('\n')){const span=document.createElement('span');span.textContent=part;el.append(span);}
}
function currentCueInfo(i){
 const t=state.lyricTimings?.find(x=>x.workId===work.id&&x.textVersionId===version.id&&x.lineIndex===i&&!x.syncConflictOf);
 if(!t||!Number.isFinite(t.start))return '時刻未登録';
 const time=v=>{if(!Number.isFinite(v))return '未登録';let x=Math.round(v*100);return Math.floor(x/6000)+':'+String(Math.floor((x%6000)/100)).padStart(2,'0')+'.'+String(x%100).padStart(2,'0');};
 return time(t.start)+' – '+time(t.end);
}
function renderLineList(){
 const root=$('leLineList');root.replaceChildren();editing.forEach((s,i)=>{
  const btn=document.createElement('button');btn.type='button';btn.className='leLyricRow'+(i===selected?' selected':'');
  const line=document.createElement('strong');line.textContent=String(i+1).padStart(2,'0');
  const text=document.createElement('span');text.textContent=s||'（空行）';
  const badge=document.createElement('small');badge.textContent=currentCueInfo(i);
  btn.append(line,text,badge);
  btn.addEventListener('click',()=>{syncLineTextarea();selected=i;renderAll();if(window.matchMedia('(max-width: 760px)').matches)$('leLineEdit').scrollIntoView({behavior:'smooth',block:'start'});});
  root.append(btn);
 });
}
function renderMigration(){
 if(!version)return;
 const text=editing.join('\n'),stat=core.previewMigration(state,version,text);
 $('leMigration').textContent=text===version.literal_text?'歌詞原文に変更はありません。表示改行だけを保存できます。':
  '歌詞原文：'+stat.oldLines+'行 → '+stat.newLines+'行。時刻を引き継ぐ候補 '+stat.preserved+'行、再確認 '+stat.changed+'行、時刻の再設定 '+stat.needsTiming+'行。';
 $('lePublish').disabled=(!pendingChanges&&text===version.literal_text)||text===version.literal_text||saving||version.id!==versions[0]?.id;
}
function renderAll(){
 if(!version)return;cleanSelected();$('leSongName').textContent=song+' · '+editing.length+'行';
 renderLineList();
 $('leSelectedNo').textContent='第'+(selected+1)+'行';$('leLineTime').textContent=currentCueInfo(selected);
 $('leLineText').value=editing[selected]??'';
 $('leFullText').value=editing.join('\n');
 $('leLineEdit').hidden=mode!=='line';$('leFullEdit').hidden=mode!=='full';
 $('leLineMode').classList.toggle('active',mode==='line');$('leFullMode').classList.toggle('active',mode==='full');
 renderDisplayText();renderMigration();
}
function syncLineTextarea(){
 if(mode!=='line'||!version)return;
 const edited=$('leLineText').value;
 if(edited!==editing[selected]){makeCheckpoint();editing[selected]=edited;delete displayBreaks[selected];pendingChanges=true;persistDraft();}
}
function persistDraft(){
 if(!version||!work||!bridge.isSignedIn())return;
 try{
  core.saveDraft(state,work,version,editing.join('\n'));
  const d=state.drafts[core.draftKey(work.id,version.id)];d.displayBreaks=deepCopy(displayBreaks);
  persist();saveLabel('下書き保存中・クラウド同期待ち');
 }catch(e){message(e.message,true);saveLabel('下書き保存失敗');}
}
function scheduleDraft(){
 clearTimeout(autoTimer);saveLabel('編集中…');
 autoTimer=setTimeout(()=>{persistDraft();renderLineList();renderMigration();},650);
}
function reflectLineInput(){
 if(!version)return;try{ensureEdit()}catch(e){message(e.message,true);return;}
 const value=$('leLineText').value;
 if(value===editing[selected])return;
 if(!pendingChanges)makeCheckpoint();
 editing[selected]=value;delete displayBreaks[selected];pendingChanges=true;
 $('leFullText').value=editing.join('\n');renderDisplayText();scheduleDraft();
}
function splitAtCursor(){
 try{ensureEdit()}catch(e){message(e.message,true);return;}
 const field=$('leLineText'),pos=field.selectionStart,txt=editing[selected];
 if(field.selectionStart!==field.selectionEnd||pos<=0||pos>=txt.length){message('分割する位置にカーソルを置いてください。先頭・末尾では分割できません。',true);return;}
 makeCheckpoint();editing.splice(selected,1,txt.slice(0,pos),txt.slice(pos));
 displayBreaks={};pendingChanges=true;selected++;renderAll();persistDraft();message('文章を2行に分けました。正式保存時に時刻の引継ぎを点検します。');
}
function joinPrevious(){
 try{ensureEdit()}catch(e){message(e.message,true);return;}
 if(selected===0)return;
 makeCheckpoint();editing[selected-1]=editing[selected-1]+editing[selected];editing.splice(selected,1);selected--;
 displayBreaks={};pendingChanges=true;renderAll();persistDraft();message('前の行と結合しました。文章の語句は変更していません。');
}
function insertLine(){
 try{ensureEdit()}catch(e){message(e.message,true);return;}
 makeCheckpoint();editing.splice(selected+1,0,'');displayBreaks={};selected++;pendingChanges=true;renderAll();persistDraft();
 message('次の行を追加しました。正式保存前に文字を入力してください。');
}
function applyBreaks(){
 try{ensureEdit()}catch(e){message(e.message,true);return;}
 const raw=$('leDisplayText').value.replace(/\r\n?/g,'\n'),src=editing[selected];
 if(raw.replace(/\n/g,'')!==src){$('leBreakStatus').textContent='歌詞の文字が変わっています。改行以外は上の歌詞欄で修正してください。';$('leBreakStatus').dataset.error='true';return;}
 const cols=raw.split('\n'),breaks=[],total=src.length;let n=0;
 for(const col of cols.slice(0,-1)){n+=col.length;if(n<=0||n>=total||breaks.includes(n)){message('空の列や重複する改行は使えません。',true);return;}breaks.push(n);}
 displayBreaks[selected]=breaks;
 const key=core.displayKey(work.id,version.id,selected),d=state.drafts?.[key];
 if(d?.source===src&&d.splits?.some(x=>breaks.includes(x.pos))){message('独立表示の分割点と重なる場所は調整が必要です。',true);return;}
 // The existing display format is kept; only its line-break offsets change.
 state.drafts=state.drafts||{};
 state.drafts[key]={schema:1,source:src,splits:d?.source===src&&Array.isArray(d.splits)?d.splits:[],
  join:d?.source===src?!!d.join:false,breaks,updatedAt:new Date().toISOString()};
 persist();persistDraft();$('leBreakStatus').dataset.error='false';$('leBreakStatus').textContent='表示上の改行を保存しました。';
 showVertical(raw);
}
function handleFullInput(){
 try{ensureEdit()}catch(e){message(e.message,true);return;}
 editing=core.lines($('leFullText').value);cleanSelected();displayBreaks={};pendingChanges=true;
 renderLineList();renderMigration();scheduleDraft();
}
function changeMode(next){
 if(next===mode)return;
 if(mode==='line')syncLineTextarea();
 mode=next;renderAll();
}
async function publish(){
 if(saving||!version)return;
 try{ensureEdit();syncLineTextarea();
  const newText=core.validation(editing.join('\n'));
  if(newText===version.literal_text){message('原文に変更がありません。表示改行だけなら、そのまま保存されています。');return;}
  const stat=core.previewMigration(state,version,newText);
  const why='歌詞を第'+(version.version_no+1)+'版として保存します。\n以前の版・時刻は削除しません。\n引継ぎ候補：'+stat.preserved+'行／時刻の再確認：'+stat.changed+'行／新規未設定：'+stat.needsTiming+'行。\n続けますか？';
  if(!confirm(why))return;
  saving=true;$('lePublish').disabled=true;message('歌詞の新しい版を保存しています…');
  const base=version,created=await bridge.writeRevision({workId:work.id,baseVersionId:base.id,literalText:newText});
  // Do not roll back an already saved version if local timing persistence fails.
  let migration;
  try{
   migration=core.transfer(state,work.id,song,base,created);
   for(const [rawIndex,breaks] of Object.entries(displayBreaks)){
    const index=Number(rawIndex),line=editing[index];
    if(!line||!Array.isArray(breaks)||!breaks.length)continue;
    const key=core.displayKey(work.id,created.id,index);
    state.drafts[key]={schema:1,source:line,splits:[],join:false,breaks:breaks.filter(v=>v>0&&v<line.length),updatedAt:new Date().toISOString()};
   }
   const old=state.drafts?.[core.draftKey(work.id,base.id)];if(old)old.publishedAs=created.id;
   persist();saveLabel('新しい版を保存・タイムコード同期中');
  }catch(err){message('歌詞の新しい版は保存済みですが、時刻移行が未完了です：'+err.message,true);return;}
  message('第'+created.version_no+'版を保存しました。時刻を'+migration.copied+'行引き継ぎました。変更行は再確認してください。');
  pendingChanges=false;
  await loadSong(song,created.id);
 }catch(err){message('保存できませんでした：'+err.message,true);}
 finally{saving=false;renderMigration();}
}
async function loadSong(name,preferId){
 if(version&&pendingChanges)persistDraft();
 const id=++loading;clearTimeout(autoTimer);song=name;work=null;version=null;editing=[];selected=0;displayBreaks={};
 const tabs=$('leSongs');tabs.replaceChildren();
 const choices=[...new Set(['あなたと','これから','これからも',...(typeof SONGS!=='undefined'?SONGS:[])] )];
 for(const label of choices){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=label===song?'active':'';b.onclick=()=>loadSong(label);tabs.append(b);}
 if(!bridge.isSignedIn()){$('leAuth').open=true;message('REC NOTEにログインすると、歌詞を編集できます。');return;}
 message(song+' の歌詞を読み込んでいます…');
 try{
  const result=await bridge.read(name);
  if(id!==loading)return;
  if(!result?.versions?.length){message('歌詞が見つかりません。この作品はまだ登録されていません。',true);return;}
  work=result.work;versions=result.versions;version=versions.find(x=>x.id===preferId)||versions[0];
  const picker=$('leVersion');picker.replaceChildren();
  for(const v of versions){const o=document.createElement('option');o.value=v.id;o.textContent='第'+v.version_no+'版'+(v.id===versions[0].id?' · 最新':' · 履歴');picker.append(o);}
  picker.value=version.id;
  const draft=core.fetchDraft(state,work,version);
  editing=core.lines(draft?.text??version.literal_text);
  displayBreaks=draft?.displayBreaks||{};pendingChanges=!!draft&&editing.join('\n')!==version.literal_text;
  const requested=Number(new URLSearchParams(location.search).get('line'));
  selected=Number.isInteger(requested)&&requested>=0&&requested<editing.length?requested:0;
  renderAll();message('歌詞を読み込みました。編集した内容は下書きに自動保存されます。');
  saveLabel(draft?'下書き復元済み':'最新の歌詞を読み込み済み');
 }catch(e){if(id===loading)message('歌詞を読み込めません：'+e.message,true);}
}
$('leVersion').onchange=e=>{if(pendingChanges&&!confirm('現在の下書きを保持して別の版を表示しますか？')){e.target.value=version.id;return;}loadSong(song,e.target.value);};
$('leLineText').addEventListener('input',reflectLineInput);
$('leFullText').addEventListener('input',handleFullInput);
$('leSplitLine').onclick=splitAtCursor;$('leJoinPrev').onclick=joinPrevious;$('leAddLine').onclick=insertLine;$('leUndo').onclick=doRestore;
$('leLineMode').onclick=()=>changeMode('line');$('leFullMode').onclick=()=>changeMode('full');
$('leApplyBreaks').onclick=applyBreaks;
$('leClearBreaks').onclick=()=>{$('leDisplayText').value=editing[selected]||'';applyBreaks();};
$('leDisplayText').addEventListener('input',e=>{showVertical(e.target.value);$('leBreakStatus').textContent=e.target.value.replace(/\r\n?/g,'\n').replace(/\n/g,'')===editing[selected]?'':'歌詞の文字は変更せず、改行だけ調整してください。';});
$('leSaveDraft').onclick=()=>{if(mode==='line')syncLineTextarea();persistDraft();message('下書きを端末に保存し、クラウド同期を要求しました。');};
$('lePublish').onclick=publish;
const back=app.querySelector('a[href="./lyric-sync"]');if(back)back.addEventListener('click',()=>{if(version&&pendingChanges)persistDraft();back.href='./lyric-sync?'+new URLSearchParams({song,line:String(selected)}).toString();});
window.addEventListener('recnote:cloud-auth-change',e=>{if(e.detail?.signedIn){$('leAuth').open=false;loadSong(song);}else{$('leAuth').open=true;message('編集にはクラウドログインが必要です。',true);}});
window.addEventListener('recnote:cloud-synced',()=>saveLabel('クラウド同期済み'));
window.addEventListener('beforeunload',()=>{if(version&&pendingChanges)persistDraft();});
loadSong(song);
})();
