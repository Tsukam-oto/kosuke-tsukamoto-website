/* REC NOTE arrangement editor. Separate from lyric source and old instrument cues. */
(function(){
'use strict';
if(new URLSearchParams(location.search).get('sync')!=='1'&&!/\/lyric-sync(?:\.html)?\/?$/i.test(location.pathname))return;
const CORE=window.RECNOTE_ARRANGEMENT_CORE;
if(!CORE||typeof state==='undefined'||typeof persist!=='function'||typeof song==='undefined')return;
const root=document.getElementById('syncStudio'),audio=document.getElementById('audio'),cloud=window.RECNOTE_CLOUD_MEDIA;
if(!root||!audio||!cloud)return;
const panel=document.createElement('details');panel.id='arrangementStudio';panel.className='arrangementStudio';
panel.innerHTML=[
'<summary><span>楽曲構成の時刻を合わせる</span><small>12区間を基本に、フルMV・ショートで共用</small></summary>',
'<div class="asgBody">',
'<p class="asgHelp">曲を再生 → 区間を選ぶ →「この位置を開始に」を押します。次の区間の開始時刻から終了時刻を自動計算します。歌詞原文や歌詞の時刻は変更しません。</p>',
'<div class="asgMeta"><strong id="asgCount">0 / 12 区間</strong><span id="asgSong">—</span></div>',
'<div id="asgList" class="asgList" aria-label="楽曲構成の区間一覧"></div>',
'<div class="asgEditor" id="asgEditor" hidden>',
'<div class="asgEditorHead"><strong id="asgSelected">区間を選択</strong><span id="asgStatus"></span></div>',
'<div class="asgMainActions"><button type="button" id="asgMark" class="asgPrimary">この位置を開始に</button><button type="button" id="asgListen">この区間を聴く</button></div>',
'<div class="asgFields"><label>開始時刻<input id="asgStart" type="text" inputmode="decimal" placeholder="1:20.25"></label><label>終了時刻（任意）<input id="asgEnd" type="text" inputmode="decimal" placeholder="次の区間から自動計算"></label></div>',
'<div class="asgMainActions"><button type="button" id="asgSave">時刻を保存</button><button type="button" id="asgConfirm">この区間を確認済みにする</button></div>',
'<details class="asgAdvanced"><summary>区間の追加・順序・既存時刻</summary>',
'<div class="asgMainActions"><button type="button" id="asgPrevious">上へ移動</button><button type="button" id="asgNext">下へ移動</button><button type="button" id="asgDisabled">この区間を使用しない</button></div>',
'<div class="asgMainActions"><button type="button" id="asgImport">既存の前奏・間奏・後奏から読み込む</button></div>',
'<p class="asgAdvancedHelp">既存の前奏・間奏・後奏は別記録のまま残します。ここへの反映はボタンを押した場合だけです。</p>',
'</details>',
'</div>',
'<div class="asgAdd"><label>区間を追加<select id="asgType"></select></label><button type="button" id="asgAdd">＋追加</button></div>',
'<div class="asgFooter"><button id="asgExport" type="button">動画用の構成JSONを保存</button><p id="asgNotice" role="status">操作をすると端末に保存され、接続中のクラウドへ同期されます。</p></div>',
'</div>'
].join('');
const anchor=document.getElementById('fullSongTabs')||document.getElementById('syncModeBar')||root.querySelector('.syncOverview');
if(anchor)root.insertBefore(panel,anchor);else root.append(panel);
const $=id=>document.getElementById(id);
const all=()=>Array.isArray(state.lyricTimings)?state.lyricTimings:(state.lyricTimings=[]);
const currentSong=()=>String(song);
let selected='intro',playingEnd=null,playingSong='',ignoreTyping=false;
function offset(){
 let v=0;try{const raw=localStorage.getItem('rec_note_sync_offset_v7:'+currentSong());if(raw!==null&&Number.isFinite(Number(raw)))v=Number(raw);
 else if(/_1119\.mp3$/i.test(files[currentSong()]?.name||''))v=-.022;}catch(e){}
 return v;
}
function position(){return Math.max(0,(Number(audio.currentTime)||0)+offset());}
function duration(){const d=Number(audio.duration);return Number.isFinite(d)&&d>0?Math.max(0,d+offset()):null;}
function fmt(v){if(!Number.isFinite(v))return '—';const n=Math.round(Math.max(0,v)*100);return Math.floor(n/6000)+':'+String(Math.floor(n/100)%60).padStart(2,'0')+'.'+String(n%100).padStart(2,'0');}
function parse(v){
 const s=String(v??'').trim().replace(/：/g,':');if(!s)return null;
 const m=s.match(/^(\d+):([0-5]?\d)(?:\.(\d{1,3}))?$/);
 if(m)return Math.round((Number(m[1])*60+Number(m[2])+Number('0.'+(m[3]||'0')))*1000)/1000;
 return /^\d+(?:\.\d{1,3})?$/.test(s)?Number(s):NaN;
}
function view(){return CORE.arrangement(all(),currentSong(),duration());}
function note(message,bad=false){const el=$('asgNotice');el.textContent=message;el.dataset.error=String(bad);}
function current(){return view().find(s=>s.key===selected);}
function recordFor(s,patch){
 const id=CORE.recordId(currentSong(),s.key),old=all().find(x=>x.id===id);
 return {...(old||{}),id,song:currentSong(),workId:'rec-note-arrangement:'+encodeURIComponent(currentSong()),
  textVersionId:CORE.VERSION,lineIndex:-480,kind:'song-arrangement',slotKey:s.key,type:s.type,order:s.order,
  start:old?.start??null,end:old?.end??null,status:'draft',deleted:false,...patch,updatedAt:new Date().toISOString()};
}
function neighborsOkay(slots,key,start){
 if(start===null)return '';
 const idx=slots.findIndex(x=>x.key===key);
 if(idx<0)return '区間が見つかりません。';
 const enabled=slots.filter(x=>!x.disabled||x.key===key),j=enabled.findIndex(x=>x.key===key);
 const before=enabled.slice(0,j).reverse().find(x=>Number.isFinite(x.start));
 const after=enabled.slice(j+1).find(x=>Number.isFinite(x.start));
 if(before&&start<=before.start)return '直前の区間より後の時刻にしてください。';
 if(after&&start>=after.start)return '次の区間より前の時刻にしてください。';
 return '';
}
function saveOne(key,patch){
 if(!cloud.isSignedIn()){note('先にクラウドへログインしてください。',true);return false;}
 const slots=view(),s=slots.find(x=>x.key===key);
 if(!s){note('区間が見つかりません。',true);return false;}
 const id=CORE.recordId(currentSong(),key);
 if(CORE.hasConflict(all(),id)){note('別端末との編集競合があります。先に競合を解消してください。',true);return false;}
 const next={...s,...patch};
 if(Object.hasOwn(patch,'start')){
  const issue=CORE.validateStart(next.start,duration())||neighborsOkay(slots,key,next.start);
  if(issue){note(issue,true);return false;}
 }
 if(Number.isFinite(next.end)&&(!Number.isFinite(next.start)||next.end<=next.start)){note('終了時刻は開始より後にしてください。',true);return false;}
 if(Number.isFinite(next.end)&&Number.isFinite(duration())&&next.end>duration()+.2){note('終了時刻が音源を超えています。',true);return false;}
 const arr=all(),before=CORE.arrangement(arr,currentSong(),duration());
 const rec=recordFor(s,patch),i=arr.findIndex(x=>x.id===id);
 if(i>=0)arr[i]=rec;else arr.push(rec);
 // If an adjacent boundary moved, a previously confirmed duration must be checked again.
 const after=CORE.arrangement(arr,currentSong(),duration());
 for(const old of before){
  const fresh=after.find(x=>x.id===old.id);
  if(!fresh||old.status!=='confirmed')continue;
  if(old.start!==fresh.start||old.end!==fresh.end||old.disabled!==fresh.disabled||old.order!==fresh.order){
   const j=arr.findIndex(x=>x.id===old.id);if(j>=0)arr[j]={...arr[j],status:'draft',confirmedAt:null,updatedAt:new Date().toISOString()};
  }
 }
 persist();note('端末保存済み。クラウド同期待ちです。');render();return true;
}
function mutateOrder(direction){
 const slots=view(),idx=slots.findIndex(x=>x.key===selected),other=slots[idx+direction];
 if(!other||!cloud.isSignedIn()){note('移動できません。ログイン状態を確認してください。',true);return;}
 if(CORE.hasConflict(all(),slots[idx].id)||CORE.hasConflict(all(),other.id)){note('編集競合があります。',true);return;}
 const a=slots[idx],b=other,arr=all();
 for(const [s,order] of [[a,b.order],[b,a.order]]){
  const next=recordFor(s,{order,status:'draft',confirmedAt:null});
  const j=arr.findIndex(x=>x.id===next.id);if(j>=0)arr[j]=next;else arr.push(next);
 }
 // Reordering affects inferred ends, so all confirmed arrangement boundaries need rechecking.
 for(let i=0;i<arr.length;i++)if(arr[i].song===currentSong()&&arr[i].kind==='song-arrangement'&&arr[i].status==='confirmed')arr[i]={...arr[i],status:'draft',confirmedAt:null,updatedAt:new Date().toISOString()};
 persist();note('順序を更新しました。区間の終了時刻を確認してください。');render();
}
function legacy(s){
 const type=s.type;if(!['intro','interlude','outro'].includes(type))return {issue:'既存の時刻候補はありません。'};
 const rows=all().filter(x=>x.song===currentSong()&&x.kind==='song-section'&&x.sectionType===type&&!x.deleted&&!x.syncConflictOf&&Number.isFinite(x.start));
 const unique=[];for(const r of rows)if(!unique.some(x=>Math.abs(x.start-r.start)<.03))unique.push(r);
 if(unique.length===0)return {issue:'該当する既存の時刻はありません。'};
 if(unique.length!==1)return {issue:'既存の時刻に複数候補があります。先に前奏・間奏・後奏の画面で確認してください。'};
 return {start:unique[0].start,end:Number.isFinite(unique[0].end)?unique[0].end:null};
}
function fillEditor(){
 const s=current();$('asgEditor').hidden=!s;if(!s)return;
 $('asgSelected').textContent=(view().findIndex(x=>x.key===selected)+1).toString().padStart(2,'0')+'　'+s.label;
 $('asgStatus').textContent=s.disabled?'使用しない':s.issue&&s.issue!=='開始未登録'?'要確認':s.status==='confirmed'&&s.usable?'確認済み':s.usable?'下書き':'未登録';
 $('asgStart').value=Number.isFinite(s.start)?fmt(s.start):'';
 $('asgEnd').value=s.manualEnd?fmt(s.explicitEnd):'';
 $('asgMark').disabled=!cloud.isSignedIn()||audio.readyState<1||s.disabled;
 $('asgListen').disabled=!s.usable||audio.readyState<1;
 $('asgConfirm').disabled=!s.usable||s.status==='confirmed'||!cloud.isSignedIn();
 $('asgDisabled').textContent=s.disabled?'この区間を使用する':'この区間を使用しない';
 $('asgImport').disabled=!['intro','interlude','outro'].includes(s.type)||!cloud.isSignedIn();
 const idx=view().findIndex(x=>x.key===selected);
 $('asgPrevious').disabled=idx<=0;$('asgNext').disabled=idx===view().length-1;
}
function render(){
 if(!panel.open)return;
 const sections=view(),rootList=$('asgList'),active=sections.filter(x=>!x.disabled),done=active.filter(x=>x.usable).length;
 $('asgSong').textContent=currentSong();
 $('asgCount').textContent=done+' / '+active.length+' 区間の時刻が揃っています';
 rootList.replaceChildren();
 sections.forEach((s,i)=>{
  const b=document.createElement('button');b.type='button';b.className='asgRow'+(s.key===selected?' selected':'')+(s.disabled?' disabled':'');
  b.dataset.key=s.key;
  const name=document.createElement('strong');name.textContent=String(i+1).padStart(2,'0')+'　'+s.label;
  const times=document.createElement('span');times.textContent=s.disabled?'使用しない':Number.isFinite(s.start)?fmt(s.start)+' ～ '+fmt(s.end):'開始未登録';
  const mark=document.createElement('small');mark.textContent=s.disabled?'対象外':s.issue&&s.issue!=='開始未登録'?s.issue:s.status==='confirmed'&&s.usable?'確認済み':s.usable?'下書き':'未登録';
  b.append(name,times,mark);b.addEventListener('click',()=>{selected=s.key;fillEditor();render();$('asgEditor').scrollIntoView({behavior:'smooth',block:'nearest'});});
  rootList.append(b);
 });
 if(!sections.some(x=>x.key===selected))selected=sections[0]?.key||'intro';
 fillEditor();
}
$('asgMark').addEventListener('click',()=>{
 const t=Math.round(position()*100)/100;
 if(audio.readyState<1){note('音源を読み込んでから記録してください。',true);return;}
 const selectedKey=selected,oldOrder=view().findIndex(x=>x.key===selectedKey);
 if(saveOne(selectedKey,{start:t,end:null,status:'draft',confirmedAt:null})){
  const next=view().slice(oldOrder+1).find(x=>!x.disabled&&!Number.isFinite(x.start));
  if(next){selected=next.key;render();}
 }
});
$('asgSave').addEventListener('click',()=>{
 const inputStart=$('asgStart').value.trim(),inputEnd=$('asgEnd').value.trim();
 const start=inputStart?parse(inputStart):null,end=inputEnd?parse(inputEnd):null;
 if(inputStart&&!Number.isFinite(start)||inputEnd&&!Number.isFinite(end)){note('時刻は 1:20.25 の形式で入力してください。',true);return;}
 saveOne(selected,{start,end,status:'draft',confirmedAt:null});
});
$('asgListen').addEventListener('click',()=>{
 const s=current();if(!s?.usable||audio.readyState<1)return;
 playingEnd=s.end;playingSong=currentSong();audio.currentTime=Math.max(0,s.start-offset());
 audio.play().catch(e=>{playingEnd=null;note('再生に失敗しました：'+e.message,true);});
});
audio.addEventListener('timeupdate',()=>{
 if(playingEnd===null)return;if(playingSong!==currentSong()){playingEnd=null;return;}
 if(position()>=playingEnd){audio.pause();playingEnd=null;}
});
$('asgConfirm').addEventListener('click',()=>{
 const s=current();if(!s?.usable){note('開始・終了を記録してから確認してください。',true);return;}
 saveOne(selected,{status:'confirmed',confirmedAt:new Date().toISOString()});
});
$('asgDisabled').addEventListener('click',()=>{
 const s=current();if(!s)return;saveOne(selected,{disabled:!s.disabled,status:'draft',confirmedAt:null});
});
$('asgPrevious').addEventListener('click',()=>mutateOrder(-1));
$('asgNext').addEventListener('click',()=>mutateOrder(1));
$('asgImport').addEventListener('click',()=>{
 const s=current();if(!s)return;const x=legacy(s);
 if(x.issue){note(x.issue,true);return;}saveOne(selected,{start:x.start,end:x.end,status:'draft',confirmedAt:null});
});
const select=$('asgType');for(const [type,label] of Object.entries(CORE.LABELS)){
 const opt=document.createElement('option');opt.value=type;opt.textContent=label;select.append(opt);
}
$('asgAdd').addEventListener('click',()=>{
 if(!cloud.isSignedIn()){note('ログインしてください。',true);return;}
 const type=select.value;if(!CORE.LABELS[type])return;
 const key='custom-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
 const orders=view().map(s=>s.order),order=Math.max(0,...orders)+10;
 const s={key,type,label:CORE.LABELS[type],order};
 const rec=recordFor(s,{start:null,end:null,status:'draft',disabled:false});
 all().push(rec);selected=key;persist();note('区間を追加しました。名前の入力は不要です。');render();
});
$('asgExport').addEventListener('click',()=>{
 const plan=CORE.exportPlan(all(),currentSong(),duration());
 if(plan.sections.some(s=>s.timingStatus==='incomplete'))note('未登録・競合の区間があります。動画制作には未確定として出力します。',true);
 else note('動画制作向け構成JSONを書き出しました。');
 const blob=new Blob([JSON.stringify(plan,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='REC_NOTE_楽曲構成_'+currentSong()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
});
panel.addEventListener('toggle',()=>{if(panel.open)render();});
for(const b of root.querySelectorAll('[data-song]'))b.addEventListener('click',()=>{selected='intro';playingEnd=null;render();});
window.addEventListener('recnote:cloud-synced',()=>{if(!panel.contains(document.activeElement))render();});
window.addEventListener('recnote:cloud-auth-change',()=>render());
audio.addEventListener('loadedmetadata',()=>render());
window.RECNOTE_ARRANGEMENT=Object.freeze({
 getSections:(requestedSong=currentSong(),audioLength=null)=>CORE.arrangement(all(),requestedSong,audioLength),
 exportSong:(requestedSong=currentSong(),audioLength=null)=>CORE.exportPlan(all(),requestedSong,audioLength)
});
if(location.hash==='#arrangementStudio')panel.open=true;
})();
