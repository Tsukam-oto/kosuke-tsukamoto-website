/* REC NOTE 7.0: mobile cloud lyric timing; existing record schema and authentication. */
(function(){
'use strict';
const link=document.createElement('a');link.href='./?sync=1';link.className='syncShortcut';link.textContent='歌詞同期';
document.querySelector('.headops')?.prepend(link);
if(new URLSearchParams(location.search).get('sync')!=='1')return;
const bridge=window.RECNOTE_LYRIC_BRIDGE,media=window.RECNOTE_CLOUD_MEDIA;
if(!bridge||!media||typeof persist!=='function')return;
document.body.classList.add('syncPage');document.title='歌詞同期 | REC NOTE';
const $=id=>document.getElementById(id);
const root=document.createElement('div');root.id='syncStudio';
root.innerHTML=[
'<header class="syncHeading"><div><small>REC NOTE / LYRIC SYNC</small><h1>歌詞の時間を合わせる</h1></div><a href="./">REC NOTEに戻る</a></header>',
'<details id="syncAccount"><summary>ログイン・同期 <b id="syncAuthState">確認中</b></summary><div id="syncCloudSlot"></div></details>',
'<nav class="syncSongs" aria-label="楽曲選択"><button data-song="あなたと">あなたと</button><button data-song="これから">これから</button><button data-song="これからも">これからも</button></nav>',
'<p id="syncNotice" class="syncNotice" role="status">読み込み中…</p>',
'<section class="syncPlayer"><div class="syncSongHead"><strong id="syncTitle">—</strong><span id="syncFile">音源を確認しています</span></div>',
'<div class="syncTime"><strong id="syncClock">0:00.00</strong><span id="syncLength">/ 0:00.00</span></div>',
'<input id="syncSlider" type="range" min="0" max="100" value="0" step="1" aria-label="再生位置"/>',
'<div class="syncTransport"><button id="syncBack">−3秒</button><button class="syncEmphasis" id="syncPlay">▶ 再生</button><button id="syncNext">＋3秒</button><label>速度 <select id="syncSpeed"><option value="0.65">0.65×</option><option value="0.8">0.8×</option><option value="1" selected>1×</option></select></label></div>',
'<label class="syncOffsetLabel">WAV基準の時刻補正 <select id="syncOffset"><option value="-0.022">11/19版MP3：−0.022秒</option><option value="0">補正なし：0秒</option></select><small>原本WAVとの実測差。Safariでずれがなければ「補正なし」に変更できます。</small></label>',
'<div class="syncMedia" id="syncMedia"><p id="syncMediaHelp">MP3はクラウドから復元します。</p><label>MP3を一度だけ登録<input id="syncUpload" type="file" accept=".mp3,.m4a,audio/mpeg,audio/mp4"/></label><span id="syncUploadState"></span></div></section>',
'<div class="syncOverview"><strong id="syncCount">0 / 0 行</strong><span id="syncBreakdown">確認待ち</span><div class="syncMeter"><i id="syncMeterFill"></i></div></div>',
'<div class="syncSectionLabel"><div><strong>歌詞をタップして記録</strong><small>再生中、歌われ始めた行をタップ</small></div><label><input id="syncTapMode" type="checkbox" checked/>連続タップ</label></div>',
'<p id="syncSourceWarning" class="syncWarning" hidden></p>',
'<label class="syncVersion">歌詞の版 <select id="syncVersion"></select></label>',
'<div id="syncLines" class="syncLines"></div>',
'<section id="syncEditor" class="syncEditor" hidden><small id="syncLineNumber">選択中の歌詞</small><h2 id="syncSelected"></h2>',
'<div class="syncFields"><label>開始 <input type="text" inputmode="decimal" id="syncStart" placeholder="1:20.25"/></label><label>終了 <input type="text" inputmode="decimal" id="syncEnd" placeholder="1:24.50"/></label></div>',
'<div class="syncEditorActions"><button id="syncCaptureStart">現在位置を開始に</button><button id="syncCaptureEnd">現在位置を終了に</button><button id="syncSave">時刻保存</button></div>',
'<div class="syncNudge"><span>開始の微調整</span><button data-adjust-start="-0.1">−0.10</button><button data-adjust-start="-0.01">−0.01</button><button data-adjust-start="0.01">＋0.01</button><button data-adjust-start="0.1">＋0.10</button></div>',
'<div class="syncNudge"><span>終了の微調整</span><button data-adjust-end="-0.1">−0.10</button><button data-adjust-end="-0.01">−0.01</button><button data-adjust-end="0.01">＋0.01</button><button data-adjust-end="0.1">＋0.10</button></div>',
'<div class="syncEditorActions"><button id="syncReplay">前後を聴く</button><button class="syncEmphasis" id="syncConfirm">確認済みにする</button><button id="syncUnconfirm">確認を解除</button></div><p id="syncEditorHelp"></p></section>',
'<div class="syncTools"><button id="syncUndo">元に戻す</button><button id="syncFindNext">未確認へ移動</button><button id="syncPush">クラウド同期</button><button id="syncSrt">SRT保存</button><button id="syncJson">JSON保存</button></div>',
'<p class="syncFoot">原文は変更しません。同期時刻は端末に即時保存し、ログイン中は本人専用クラウドへ同期します。未校正の歌詞は別途原文照合が必要です。動画の高音質音声にはWAV原本を使用します。</p>',
'<footer class="syncDock"><div><strong id="syncDockLyric">歌詞を選択</strong><small id="syncDockClock">0:00.00</small></div><button id="syncDockPlay">▶</button><button class="syncEmphasis" id="syncTapNow">この歌詞の開始を記録</button></footer>'
].join('');
document.body.append(root);
const cloudPanel=$('recCloudPanel');if(cloudPanel)$('syncCloudSlot').append(cloudPanel);
const audio=$('audio'),STACK=[],DRAFT_PREFIX='rec_note_sync_edit_draft_v7:',OFFSET_PREFIX='rec_note_sync_offset_v7:';
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
function draftKey(){return DRAFT_PREFIX+song+':'+(version?.id||'')+':'+selected;}
function clearDraft(){try{localStorage.removeItem(draftKey());}catch(e){}}
function saveDraft(){if(selected<0)return;try{localStorage.setItem(draftKey(),JSON.stringify({a:$('syncStart').value,b:$('syncEnd').value}));}catch(e){}}
function saveRecord(i,patch){
 if(i<0||!version)return false;
 const list=all(),key=id(i),at=list.findIndex(x=>x.id===key);
 const previous=at>=0?list[at]:{id:key,song,workId:work.id,textVersionId:version.id,lineIndex:i,start:null,end:null,status:'draft'};
 const next={...previous,...patch,id:key,song,workId:work.id,textVersionId:version.id,lineIndex:i,updatedAt:new Date().toISOString()};
 if(next.start!==null&&(!Number.isFinite(next.start)||next.start<0)){notice('開始時刻が不正です。',true);return false;}
 if(next.end!==null&&(!Number.isFinite(next.end)||next.end<0)){notice('終了時刻が不正です。',true);return false;}
 if(Number.isFinite(next.end)&&(!Number.isFinite(next.start)||next.end<=next.start)){notice('終了時刻は開始より後にしてください。',true);return false;}
 STACK.push(JSON.stringify(list));if(STACK.length>15)STACK.shift();
 if(at>=0)list[at]=next;else list.push(next);
 persist();$('syncAuthState').textContent=media.isSignedIn()?'クラウド同期待ち':'端末内のみ';notice('端末に保存しました。クラウド同期を実行しています。');return true;
}
function renderRows(){
 const view=$('syncLines'),position=view.scrollTop;view.replaceChildren();
 let begin=0,end=0,done=0;const data=rows();
 for(let n=0;n<data.length;n++){
  const x=data[n],t=x.time;
  if(started(t))begin++;if(complete(t))end++;if(confirmed(t))done++;
  const b=document.createElement('button');b.type='button';b.dataset.line=String(x.i);
  b.className='syncLine'+(x.i===selected?' selected':'')+(confirmed(t)?' confirmed':complete(t)?' complete':started(t)?' started':'')+(conflict(x.i)?' conflict':'');
  const number=document.createElement('span');number.className='syncLineNumber';number.textContent=String(n+1).padStart(2,'0');
  const content=document.createElement('span');content.className='syncLineText';content.textContent=x.text;
  const time=document.createElement('span');time.className='syncLineStamp';time.textContent=confirmed(t)?'✓ '+timestamp(t.start):complete(t)?timestamp(t.start)+'–'+timestamp(t.end):started(t)?timestamp(t.start)+' / 終了未設定':'未記録';
  b.append(number,content,time);
  b.addEventListener('click',()=>{if($('syncTapMode').checked&&hasAudio()&&!confirmed(get(x.i)))tap(x.i);else choose(x.i,true,true);});
  view.append(b);
 }
 view.scrollTop=position;$('syncCount').textContent=done+' / '+data.length+' 行 確認済み';
 $('syncBreakdown').textContent='開始 '+begin+'・終了 '+end+'・確認済み '+done;
 $('syncMeterFill').style.width=(data.length?100*done/data.length:0)+'%';
}
function choose(i,scroll,seekAudio){
 if(!lines[i]?.trim())return;
 selected=i;const t=get(i);
 if(seekAudio&&started(t))seek(t.start);
 for(const el of $('syncLines').querySelectorAll('.syncLine'))el.classList.toggle('selected',Number(el.dataset.line)===i);
 const node=$('syncLines').querySelector('[data-line="'+i+'"]');if(scroll)node?.scrollIntoView({block:'nearest',behavior:'smooth'});
 fillEditor();
}
function fillEditor(){
 $('syncEditor').hidden=selected<0;
 if(selected<0)return;
 const t=get(selected);$('syncLineNumber').textContent='行 '+(rows().findIndex(x=>x.i===selected)+1)+' / '+rows().length;
 $('syncSelected').textContent=lines[selected];$('syncDockLyric').textContent=lines[selected];
 let d=null;try{d=JSON.parse(localStorage.getItem(draftKey())||'null');}catch(e){}
 $('syncStart').value=d?.a??(started(t)?timestamp(t.start):'');
 $('syncEnd').value=d?.b??(Number.isFinite(t?.end)?timestamp(t.end):'');
 $('syncConfirm').disabled=!complete(t)||confirmed(t)||conflict(selected);
 $('syncUnconfirm').disabled=!confirmed(t);
 $('syncEditorHelp').textContent=conflict(selected)?'別端末との編集競合が保存されています。確認してください。':confirmed(t)?'開始・終了を照合済みです。':started(t)?'終了位置も記録してから、音声を確認してください。':'歌われ始めた瞬間に記録してください。';
}
function hasAudio(){return !!(files[song]?.url)&&audio.readyState>=1;}
function tap(i){
 if(!hasAudio()){choose(i,true,false);notice('先にMP3を読み込んでください。',true);return;}
 if(confirmed(get(i))){choose(i,true,false);notice('確認済みです。編集するには確認を解除してください。',true);return;}
 const now=Math.round(wavPosition()*100)/100,t=get(i);
 if(lastTap>=0&&lastTap!==i){
  const prev=get(lastTap);
  if(prev&&started(prev)&&!Number.isFinite(prev.end)&&prev.start<now&&!confirmed(prev))saveRecord(lastTap,{end:now,status:'draft'});
 }
 if(!saveRecord(i,{start:now,end:Number.isFinite(t?.end)&&t.end>now?t.end:null,status:'draft'}))return;
 lastTap=i;selected=i;clearDraft();renderRows();
 const next=rows().find(x=>x.i>i);choose(next?.i??i,true,false);
 notice(timestamp(now)+' に記録しました。'+(next?'次の歌詞を選択しています。':'最後の行です。'));
}
function editorSave(){
 if(selected<0)return;
 const a=parse($('syncStart').value),b=$('syncEnd').value.trim()?parse($('syncEnd').value):null;
 if(a===null||($('syncEnd').value.trim()&&b===null)){notice('時刻の形式は 1:20.25 です。',true);return;}
 if(saveRecord(selected,{start:a,end:b,status:'draft'})){clearDraft();renderRows();fillEditor();}
}
function capture(kind){
 if(selected<0)return;if(!hasAudio()){notice('音源を先に再生してください。',true);return;}
 const t=get(selected),now=Math.round(wavPosition()*100)/100;
 let a=kind==='start'?now:parse($('syncStart').value)??t?.start??null;
 let b=kind==='end'?now:parse($('syncEnd').value)??t?.end??null;
 if(kind==='start'&&Number.isFinite(b)&&b<=a)b=null;
 if(a===null){notice('先に開始時刻を記録してください。',true);return;}
 if(saveRecord(selected,{start:a,end:b,status:'draft'})){clearDraft();renderRows();fillEditor();}
}
function shift(kind,amount){
 const field=$(kind==='start'?'syncStart':'syncEnd'),current=parse(field.value);
 if(current===null){notice('先に時刻を入力してください。',true);return;}
 field.value=timestamp(Math.max(0,current+amount));saveDraft();editorSave();
}
function confirm(){
 const t=get(selected);if(!complete(t)){notice('開始と終了を設定してから確認してください。',true);return;}
 if(conflict(selected)){notice('この行にはクラウド編集競合があります。',true);return;}
 if(saveRecord(selected,{status:'confirmed',confirmedAt:new Date().toISOString()})){renderRows();fillEditor();notice('この歌詞を確認済みにしました。');}
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
  for(const v of versions){const o=document.createElement('option');o.value=v.id;o.textContent='第'+v.version_no+'版 '+(v.text_status==='unverified_pdf_extract'?'PDF未照合':v.text_status==='author_original'?'原文':'登録版');$('syncVersion').append(o);}
  changeVersion(versions[0].id);notice('歌詞を読み込みました。');
 }catch(e){if(request===seq)notice('歌詞取得に失敗：'+e.message,true);}
}
function changeVersion(v){
 version=versions.find(x=>x.id===v)||versions[0];lines=String(version.literal_text||'').replace(/\r\n?/g,'\n').split('\n');
 $('syncVersion').value=version.id;
 $('syncSourceWarning').hidden=version.text_status!=='unverified_pdf_extract';
 $('syncSourceWarning').textContent='この歌詞はPDF抽出による未校正版です。時間合わせと原文校正は別工程です。';
 selected=rows()[0]?.i??-1;renderRows();if(selected>=0)choose(selected,false,false);
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
function json(){
 if(!version)return;
 download('LYRIC_SYNC_'+song+'_同期.json',JSON.stringify({schema_version:3,source:'REC_NOTE_CLOUD_LYRIC_SYNC',song,workId:work.id,textVersionId:version.id,textStatus:version.text_status,exportedAt:new Date().toISOString(),cues:rows().map(x=>({lineIndex:x.i,text:x.text,start:x.time?.start??null,end:x.time?.end??null,status:x.time?.status||'unassigned'}))},null,2),'application/json');
}
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
$('syncTapNow').addEventListener('click',()=>tap(selected));
$('syncUndo').addEventListener('click',()=>{if(!STACK.length){notice('戻せる操作がありません。');return;}state.lyricTimings=JSON.parse(STACK.pop());persist();renderRows();fillEditor();notice('前の状態に戻しました。');});
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
 if(signed){$('syncAccount').open=false;loadLyrics();}else {work=null;version=null;versions=[];lines=[];selected=-1;lastTap=-1;renderRows();$('syncEditor').hidden=true;$('syncDockLyric').textContent='歌詞を選択';$('syncAccount').open=true;notice('ログインしてください。',true);}
});
window.addEventListener('recnote:cloud-synced',()=>{$('syncAuthState').textContent='クラウド同期済み';renderRows();if(!document.activeElement?.closest('.syncEditor'))fillEditor();clock();});
window.addEventListener('focus',clock);
clock();loadLyrics();
})();
