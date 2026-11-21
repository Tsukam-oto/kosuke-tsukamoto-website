/* REC NOTE v9: full-song timing on iPhone (intro, any number of interludes, outro).
   Sections use existing owner-scoped lyricTimings 3-way cloud merge records:
   integer negative lineIndex; IDs never overlap with actual lyric lines.
   No changes to original lyric texts, WAVs or REC correction records. */
(function(){
'use strict';
if(!/\/lyric-sync\.html$/i.test(location.pathname)&&new URLSearchParams(location.search).get('sync')!=='1')return;
if(typeof state==='undefined'||typeof persist!=='function'||!window.RECNOTE_CLOUD_MEDIA)return;
const $=id=>document.getElementById(id);
const root=$('syncStudio'),audio=$('audio'),cloud=window.RECNOTE_CLOUD_MEDIA,login=window.RECNOTE_LYRIC_BRIDGE;
if(!root||!audio)return;
const tab=document.createElement('nav');tab.id='fullSongTabs';tab.className='fullSongTabs';
tab.setAttribute('aria-label','曲全体の時間を合わせる');
tab.innerHTML='<button id="fullSongSectionsTab" type="button" aria-pressed="true">前奏・間奏・アウトロ</button><button id="fullSongLyricsTab" type="button" aria-pressed="false">歌詞のタイミング</button>';
const panel=document.createElement('section');panel.id='fullSongSections';panel.className='fullSongSections';
panel.innerHTML=[
 '<div class="fsIntro"><strong>曲全体の時間を合わせる</strong><p>MP3を聴きながら、前奏・間奏・アウトロの開始と終了を記録します。</p></div>',
 '<div class="fsOverview"><strong id="fsProgress">0 / 2 区間を確認済み</strong><span id="fsSaveNote">記録した時間はクラウドに同期されます</span></div>',
 '<div id="fsList" class="fsList"></div>',
 '<button type="button" id="fsAddInterlude" class="fsAdd">＋ 間奏を追加する</button>',
 '<div class="fsEditor" id="fsEditor" hidden>',
  '<strong id="fsTitle">区間を選択</strong><span id="fsRecorded">時間未登録</span>',
  '<div class="fsActions"><button id="fsBegin" type="button">開始を記録</button><button id="fsFinish" type="button">終了を記録</button></div>',
  '<div class="fsOtherActions"><button id="fsListen" type="button">この区間を聴く</button><button id="fsConfirm" type="button">確認済みにする</button></div>',
  '<details id="fsFine" class="fsFine"><summary>時間を細かく修正する</summary>',
   '<div class="fsTimeInputs"><label>開始 <input id="fsStartInput" inputmode="decimal" type="text" placeholder="0:00.00" /></label><label>終了 <input id="fsEndInput" inputmode="decimal" type="text" placeholder="0:15.00" /></label></div>',
   '<div class="fsNudge"><span>開始</span><button data-fs-adjust="start:-0.1" type="button">−0.1秒</button><button data-fs-adjust="start:-0.01" type="button">−0.01秒</button><button data-fs-adjust="start:0.01" type="button">＋0.01秒</button><button data-fs-adjust="start:0.1" type="button">＋0.1秒</button></div>',
   '<div class="fsNudge"><span>終了</span><button data-fs-adjust="end:-0.1" type="button">−0.1秒</button><button data-fs-adjust="end:-0.01" type="button">−0.01秒</button><button data-fs-adjust="end:0.01" type="button">＋0.01秒</button><button data-fs-adjust="end:0.1" type="button">＋0.1秒</button></div>',
   '<button id="fsSave" class="fsSave" type="button">修正した時間を保存する</button>',
   '<button id="fsRemove" class="fsDelete" type="button" hidden>この間奏を削除する</button>',
  '</details>',
  '<div id="fsConflict" class="fsConflicts" hidden></div>',
 '</div>',
 '<div class="fsTools"><button type="button" id="fsExport">曲全体の時間をJSON保存</button></div>',
 '<p class="fsCaution">動画に使用する原音源はWAVです。スマホでは軽量MP3で時間を指定します。音源の読み込みがまだの場合は上の「MP3を登録」から選んでください。</p>'
].join('');
const lyricsAnchor=$('syncModeBar')||$('syncLines');
root.insertBefore(tab,lyricsAnchor);
root.insertBefore(panel,lyricsAnchor);
const covered=[$('syncModeBar'),$('syncLines'),$('syncSourceWarning'),$('syncOverview'),$('syncOneLineHelp'),$('.syncSectionLabel'),$('.syncFineTune'),$('.syncExtra'),$('.syncDock')].filter(Boolean);
let view='sections',selection='intro',previewEnd=null;
const DRAFT_PREFIX='rec_note_section_timing_draft_v9:';
const SELECT_PREFIX='rec_note_section_selected_v9:';
function draftKey(key=selection){return DRAFT_PREFIX+song+':'+key;}
function readDraft(key=selection){try{return JSON.parse(localStorage.getItem(draftKey(key))||'null')}catch(e){return null}}
function saveDraft(){try{localStorage.setItem(draftKey(),JSON.stringify({start:$('fsStartInput').value,end:$('fsEndInput').value}));}catch(e){}}
function clearDraft(key=selection){try{localStorage.removeItem(draftKey(key))}catch(e){}}
function rememberSelection(){try{localStorage.setItem(SELECT_PREFIX+song,selection)}catch(e){}}
function restoreSelection(){try{const last=localStorage.getItem(SELECT_PREFIX+song);selection=last||'intro'}catch(e){selection='intro'}}

const workId=()=> 'rec-note-section:'+song;
const id=key=>'song-section:'+encodeURIComponent(song)+':'+key;
const index=key=>key==='intro'?-100:key==='outro'?-101:-200-Number(key.split('-')[1]||1);
const name=key=>key==='intro'?'前奏':key==='outro'?'アウトロ':'間奏 '+String(Number(key.split('-')[1]||1));
const sections=()=>Array.isArray(state.lyricTimings)?state.lyricTimings:(state.lyricTimings=[]);
const find=key=>sections().find(x=>x.id===id(key)&&x.deleted!==true);
const disputes=key=>sections().filter(x=>x.syncConflictOf===id(key));
const complete=r=>Number.isFinite(r?.start)&&Number.isFinite(r?.end)&&r.end>r.start;
const verified=r=>complete(r)&&r.status==='confirmed';
const validTime=v=>{let x=String(v||'').trim().replace('：',':');if(!x)return null;const match=x.match(/^(\d+):([0-5]?\d)(?:\.(\d{1,3}))?$/);if(match)return Number(match[1])*60+Number(match[2])+Number('0.'+(match[3]||'0'));return /^\d+(?:\.\d{1,3})?$/.test(x)?Number(x):null;};
const display=v=>{if(!Number.isFinite(v))return '—';const n=Math.round(Math.max(0,v)*100),s=Math.floor(n/100);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')+'.'+String(n%100).padStart(2,'0');};
const pos=()=>{let offset=0;try{let v=localStorage.getItem('rec_note_sync_offset_v7:'+song);if(v!==null)offset=Number(v)||0;else if(/_1119\.mp3$/i.test(files[song]?.name||''))offset=-.022;}catch(e){}return Math.max(0,(Number(audio.currentTime)||0)+offset);};
const seek=t=>{if(!(audio.readyState>=1))return;let offset=pos()-(Number(audio.currentTime)||0);audio.currentTime=Math.max(0,Math.min(audio.duration||Infinity,t-offset));};
function ready(){return cloud.isSignedIn()&&Boolean(files[song]?.url)&&audio.readyState>=1;}
function alertStatus(message,bad=false){const n=$('syncNotice');if(n){n.textContent=message;n.classList.toggle('error',bad)}$('fsSaveNote').textContent=message;}
function store(key,patch){
 if(!cloud.isSignedIn()){alertStatus('ログインしてください。',true);return false;}
 const a=sections(),j=a.findIndex(x=>x.id===id(key));
 const old=j>=0?a[j]:{id:id(key),song,workId:workId(),textVersionId:'full-song-structure-v1',lineIndex:index(key),kind:'song-section',sectionKey:key,sectionType:key.split('-')[0],start:null,end:null,status:'draft',deleted:false};
 const rec={...old,...patch,id:id(key),song,workId:workId(),textVersionId:'full-song-structure-v1',lineIndex:index(key),kind:'song-section',sectionKey:key,updatedAt:new Date().toISOString()};
 if(rec.start!==null&&(!Number.isFinite(rec.start)||rec.start<0)){alertStatus('開始時刻が不正です。',true);return false}
 if(rec.end!==null&&(!Number.isFinite(rec.end)||rec.end<0)){alertStatus('終了時刻が不正です。',true);return false}
 if(Number.isFinite(rec.end)&&(!Number.isFinite(rec.start)||rec.end<=rec.start)){alertStatus('終了は開始より後にしてください。',true);return false}
 if(j>=0)a[j]=rec;else a.push(rec);
 persist();clearDraft(key);const badge=$('syncSaveState');if(badge){badge.textContent='端末保存済 · クラウド同期待ち';badge.dataset.status='pending'}
 alertStatus('端末に保存しました。クラウドに同期しています。');
 render();return true;
}
function keys(){
 const k=sections().filter(x=>x.song===song&&x.kind==='song-section'&&!x.deleted&&/^interlude-\d+$/.test(x.sectionKey||'')).map(x=>x.sectionKey);
 return ['intro',...[...new Set(k)].sort((a,b)=>Number(a.split('-')[1])-Number(b.split('-')[1])),'outro'];
}
function render(){
 if(!root.classList.contains('syncReady')){$('fsList').replaceChildren();panel.hidden=view!=='sections';return;}
 const k=keys();if(!k.includes(selection))selection='intro';rememberSelection();
 const list=$('fsList');list.replaceChildren();
 let done=0;
 for(const key of k){
  const r=find(key);if(verified(r))done++;
  const b=document.createElement('button');b.type='button';
  b.className='fsItem'+(key===selection?' active':'')+(verified(r)?' done':'');b.dataset.key=key;
  const text=document.createElement('strong');text.textContent=name(key);
  const time=document.createElement('span');time.textContent=complete(r)?display(r.start)+' – '+display(r.end):Number.isFinite(r?.start)?display(r.start)+' → 終了未設定':'時間未設定';
  const mark=document.createElement('em');mark.textContent=verified(r)?'確認済み':complete(r)?'確認待ち':'未設定';
  b.append(text,time,mark);b.addEventListener('click',()=>{selection=key;render();});
  list.append(b);
 }
 $('fsProgress').textContent=done+' / '+k.length+' 区間を確認済み';
 const r=find(selection),issue=disputes(selection).length>0;
 $('fsEditor').hidden=false;$('fsTitle').textContent=name(selection);
 $('fsRecorded').textContent=complete(r)?display(r.start)+' 〜 '+display(r.end):Number.isFinite(r?.start)?'開始 '+display(r.start)+' ・ 終了未設定':'時間未設定';
  const draft=readDraft();
 const inputActive=document.activeElement&&['fsStartInput','fsEndInput'].includes(document.activeElement.id);
 if(!inputActive){
  $('fsStartInput').value=draft?.start??(Number.isFinite(r?.start)?display(r.start):'');
  $('fsEndInput').value=draft?.end??(Number.isFinite(r?.end)?display(r.end):'');
 }
 $('fsBegin').disabled=!ready()||verified(r);
 $('fsFinish').disabled=!ready()||!Number.isFinite(r?.start)||verified(r);
 $('fsListen').disabled=!ready()||!Number.isFinite(r?.start);
 $('fsConfirm').disabled=!complete(r)||verified(r)||issue;
 $('fsConfirm').textContent=verified(r)?'確認済み ✓':'確認済みにする';
 $('fsRemove').hidden=!selection.startsWith('interlude-');
 const conflict=$('fsConflict');conflict.replaceChildren();conflict.hidden=!issue;
 if(issue){
  let p=document.createElement('p');p.textContent='別端末から同じ区間を編集しています。採用する時間を選んでください。';conflict.append(p);
  for(const candidate of [{...r,_current:true},...disputes(selection)]){
   const button=document.createElement('button');button.type='button';
   button.textContent=(candidate._current?'現在の時間':'もう一方の端末')+'　'+display(candidate.start)+'〜'+display(candidate.end);
   button.addEventListener('click',()=>resolve(candidate));conflict.append(button);
  }
 }
}
function resolve(chosen){
 const key=selection,primary=id(key);const a=sections();
 const next=a.filter(r=>r.syncConflictOf!==primary);
 const i=next.findIndex(r=>r.id===primary);
 if(i<0)return;
 next[i]={...next[i],start:chosen.start??null,end:chosen.end??null,status:'draft',confirmedAt:null,updatedAt:new Date().toISOString()};
 state.lyricTimings=next;persist();alertStatus('競合を解消しました。歌声を確認してください。');render();
}
function capture(which){
 const key=selection,r=find(key);
 if(!ready()){alertStatus('ログインして、MP3を読み込んでください。',true);return;}
 if(verified(r)){alertStatus('確認済みです。時間を変える場合は「時間を細かく修正する」を開いてください。',true);return;}
 const t=Math.round(pos()*100)/100;
 if(which==='start')store(key,{start:t,end:Number.isFinite(r?.end)&&r.end>t?r.end:null,status:'draft',confirmedAt:null});
 else {if(!Number.isFinite(r?.start)){alertStatus('先に開始を記録してください。',true);return;}store(key,{end:t,status:'draft',confirmedAt:null});}
}
function saveEdit(){
 const a=validTime($('fsStartInput').value);
 const b=$('fsEndInput').value.trim()?validTime($('fsEndInput').value):null;
 if(a===null||($('fsEndInput').value.trim()&&b===null)){alertStatus('時刻は 1:20.35 の形式で入力してください。',true);return;}
 if(store(selection,{start:a,end:b,status:'draft',confirmedAt:null}))$('fsFine').open=false;
}
function switchView(to){
 view=to==='lyrics'?'lyrics':'sections';previewEnd=null;
 root.classList.toggle('syncStructureView',view==='sections');
 root.classList.toggle('syncLyricsView',view==='lyrics');
 $('fullSongSectionsTab').setAttribute('aria-pressed',String(view==='sections'));
 $('fullSongLyricsTab').setAttribute('aria-pressed',String(view==='lyrics'));
 panel.hidden=view!=='sections';
 if(view==='sections')render();
}
$('fullSongSectionsTab').addEventListener('click',()=>switchView('sections'));
$('fullSongLyricsTab').addEventListener('click',()=>switchView('lyrics'));
$('fsBegin').addEventListener('click',()=>capture('start'));
$('fsFinish').addEventListener('click',()=>capture('end'));
$('fsConfirm').addEventListener('click',()=>{const r=find(selection);if(!complete(r)){alertStatus('開始と終了を記録してから確認してください。',true);return;}if(disputes(selection).length){alertStatus('先に編集競合を解消してください。',true);return;}store(selection,{status:'confirmed',confirmedAt:new Date().toISOString()});});
$('fsListen').addEventListener('click',()=>{
 const r=find(selection);if(!ready()||!Number.isFinite(r?.start)){alertStatus('開始時刻を先に登録してください。',true);return;}
 seek(Math.max(0,r.start-0.6));previewEnd=Number.isFinite(r.end)?r.end+0.7:r.start+7;
 audio.play().catch(e=>alertStatus('再生できません：'+e.message,true));
});
audio.addEventListener('timeupdate',()=>{if(previewEnd!==null&&pos()>=previewEnd){audio.pause();previewEnd=null;}});
$('fsSave').addEventListener('click',saveEdit);
for(const key of ['fsStartInput','fsEndInput'])$(key).addEventListener('input',saveDraft);
for(const b of panel.querySelectorAll('[data-fs-adjust]'))b.addEventListener('click',()=>{
 const [field,shift]=b.dataset.fsAdjust.split(':'),input=$(field==='start'?'fsStartInput':'fsEndInput'),t=validTime(input.value);
 if(t===null){alertStatus('先に時刻を登録してください。',true);return;}
 input.value=display(Math.max(0,t+Number(shift)));
});
$('fsAddInterlude').addEventListener('click',()=>{
 if(!cloud.isSignedIn()){alertStatus('先にログインしてください。',true);return;}
 const seqs=sections().filter(x=>x.song===song&&x.kind==='song-section'&&/^interlude-\d+$/.test(x.sectionKey||'')).map(x=>Number(x.sectionKey.split('-')[1])).filter(Number.isFinite);
 const key='interlude-'+(Math.max(0,...seqs)+1);
 if(store(key,{start:null,end:null,status:'draft',deleted:false})){selection=key;render();}
});
$('fsRemove').addEventListener('click',()=>{
 if(!selection.startsWith('interlude-'))return;
 if(!confirm('この間奏の時間を削除しますか？（歌詞の時間は変更しません）'))return;
 const key=selection;if(store(key,{deleted:true,status:'draft'})){selection='intro';render();}
});
$('fsExport').addEventListener('click',()=>{
 const sectionData=keys().map(key=>{const r=find(key);return {label:name(key),type:key.split('-')[0],key,start:r?.start??null,end:r?.end??null,status:r?.status||'unassigned'};});
 const lyricData=sections().filter(x=>x.song===song&&Number.isInteger(x.lineIndex)&&x.lineIndex>=0&&typeof x.textVersionId==='string').map(x=>({lineIndex:x.lineIndex,start:x.start??null,end:x.end??null,status:x.status||'unassigned',textVersionId:x.textVersionId}));
 const exported={schemaVersion:1,source:'REC_NOTE_FULL_SONG_TIMING',song,exportedAt:new Date().toISOString(),sections:sectionData,lyrics:lyricData};
 const url=URL.createObjectURL(new Blob([JSON.stringify(exported,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='FULL_SONG_TIMING_'+song+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
});
for(const b of root.querySelectorAll('[data-song]'))b.addEventListener('click',()=>{restoreSelection();previewEnd=null;render();});
window.addEventListener('recnote:cloud-synced',render);
window.addEventListener('recnote:cloud-auth-change',()=>{if(!cloud.isSignedIn()){previewEnd=null;panel.hidden=true;$('fsList').replaceChildren();$('fsRecorded').textContent='';$('fsTitle').textContent='ログインしてください';}else render();});
audio.addEventListener('loadedmetadata',render);
window.addEventListener('focus',render);
restoreSelection();switchView('sections');
})();