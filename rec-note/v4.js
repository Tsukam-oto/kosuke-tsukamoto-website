/* REC NOTE v4 — non-destructive production-tool extension. Existing v3 localStorage key and records retained. */
'use strict';
(function(){
  const byId = id => document.getElementById(id);
  const root = document.querySelector('.layout > .panel .panelBody');
  if(!root || !byId('wave') || !byId('audio')) return;

  const audioTools = document.createElement('section');
  audioTools.className='studioTools'; audioTools.id='studioTools';
  audioTools.setAttribute('aria-label','区間試聴と音源比較');
  audioTools.innerHTML=`<div class="studioHeading"><span>区間を聴く・修正前後を比較する</span><span class="studioKicker">AUDIO REVIEW / v4</span></div>
    <div class="studioRow"><button type="button" id="loopBtn" class="soft">↻ 選択区間をループ</button><button type="button" id="preRollBtn">前後2秒を再生</button><button type="button" id="loopStop">■ 停止</button><span id="loopInfo" class="toolHint">開始と終了を選ぶと、その範囲を試聴できます。</span></div>
    <div class="versionGroup"><span class="versionLabel">音源 A/B</span><button type="button" class="activeTool" id="versionA">A 変更前</button><button type="button" id="versionB">B 変更後</button><label class="filePill"><span id="compareFileName">＋ Bの音源を選ぶ</span><input id="compareFile" type="file" accept="audio/*,.wav,.mp3,.m4a,.aiff,.aif,.flac" /></label><span id="compareInfo" class="toolHint">同じ時刻で聴き比べられます。</span></div>`;
  const playerBar=root.querySelector('.playerBar');
  playerBar.insertAdjacentElement('beforebegin',audioTools);
  const waveShade=document.createElement('div');waveShade.className='studioWaveRange';waveShade.id='waveShade';
  byId('wave').insertBefore(waveShade, byId('markLayer'));
  const videoPanel=document.createElement('section');
  videoPanel.className='studioVideo';videoPanel.id='studioVideo';videoPanel.hidden=true;
  videoPanel.innerHTML=`<div class="studioHeading"><span>動画プレビュー・フレーム指定</span><span class="studioKicker">VISUAL REVIEW</span></div>
    <div class="studioRow"><label class="filePill" title="動画はアップロードせず、端末上で再生します"><span id="videoName">＋ 動画を選ぶ（MP4 / MOVなど）</span><input id="videoFile" type="file" accept="video/*,.mp4,.mov,.webm" /></label><span class="toolHint">動画ファイルはこの端末内でのみ再生します。</span></div>
    <div class="noVideo" id="noVideo">動画を読み込むと、ここで映像を確認できます。</div>
    <video id="videoPlayer" controls playsinline preload="metadata" hidden></video>
    <div class="studioRow"><span class="videoClock" id="videoClock">0:00.0</span><button type="button" id="videoToCue">このフレームを指示に指定</button><button type="button" id="videoToSource">現在フレーム→原曲へ</button><button type="button" id="captureFrame">フレームをPNG保存</button></div>
    <div class="studioMobileHint">SHORTは完成動画の時間でフレームを指定します。MVは原曲の時間に対応します。PNGは端末に保存されます。</div>`;
  byId('shortStoryboard').insertAdjacentElement('afterend',videoPanel);
  const extraFields=document.createElement('div');extraFields.id='studioExtraFields';extraFields.className='fields';
  extraFields.innerHTML=`<div class="field span2"><label class="label" for="subtitleInput">字幕の文字（任意・歌詞と別に管理）</label><textarea id="subtitleInput" placeholder="歌詞字幕やテロップの文章を入力します。SRT書き出し時に使用します。"></textarea><div class="v4FieldNote">字幕はご自身が入力した文章を使用します。歌詞の原文は変更しません。</div></div>
    <div class="field"><label class="label" for="frameTimeInput">確認フレーム（動画の時間）</label><input id="frameTimeInput" placeholder="例：0:12.3" inputmode="decimal" /></div>
    <div class="field"><label class="label">動画側で指定</label><button type="button" id="useVideoFrame" style="width:100%">現在フレームを入力</button></div>`;
  byId('productionFields').append(extraFields);
  const aud=document.createElement('div');aud.id='shortAudition';aud.innerHTML=`<select id="shortVariant" aria-label="仮試聴する制作案"><option value="">制作案を選択</option></select><button id="shortPlay" type="button" class="soft">▶ この構成を音で試聴</button><button id="shortStop" type="button">■ 停止</button><span class="auditionStatus" id="auditionInfo">完成動画の時間を設定した指示を、原曲の区間順につなげて試聴します。完成動画の書き出しではありません。</span>`;
  byId('shortTrack').insertAdjacentElement('beforebegin',aud);
  const srtBtn=document.createElement('button');srtBtn.id='srtBtn';srtBtn.textContent='字幕SRT出力';srtBtn.title='字幕を時間指定つきSRTに書き出します';byId('mailBtn').insertAdjacentElement('afterend',srtBtn);

  const compareFiles=Object.create(null),videoFiles=Object.create(null);
  const video=byId('videoPlayer');
  let activeVersion='A',loopRange=null,loopPadding=0,shortQueue=[],shortIndex=0,shortActive=false;
  let switchToken=0;
  const fileForVersion = v => v==='B' ? compareFiles[song] : files[song];
  const videoKey=()=>song+'\u001f'+activeMode;
  const previewForMode=()=>videoFiles[videoKey()];
  const isPlayable=()=>Boolean(audio.currentSrc || audio.src);
  const fmts = time => Number.isFinite(time)?fmt(time):'—';

  function setVersionButtons(){
    byId('versionA').classList.toggle('activeTool',activeVersion==='A');
    byId('versionB').classList.toggle('activeTool',activeVersion==='B');
    byId('versionA').setAttribute('aria-pressed',String(activeVersion==='A'));
    byId('versionB').setAttribute('aria-pressed',String(activeVersion==='B'));
    byId('compareFileName').textContent=compareFiles[song]?.name||'＋ Bの音源を選ぶ';
    byId('compareInfo').textContent=activeVersion==='B'?'Bを再生中（元の時刻を共有）':compareFiles[song]?'Bを読み込み済み。A/Bを切替可能':'Bの音源を選ぶと比較できます';
  }
  async function switchVersion(next,{resume=true}={}){
    if(next!=='A'&&next!=='B') return false;
    const file=fileForVersion(next);
    if(!file?.url){notify(next==='B'?'先に修正後音源Bを選んでください。':'先に音源Aを選んでください。');return false;}
    if(activeVersion===next && audio.src===file.url){setVersionButtons();return true;}
    const t=Number.isFinite(audio.currentTime)?audio.currentTime:current,wasPlaying=!audio.paused;
    audio.pause();
    const token=++switchToken;activeVersion=next;
    audio.src=file.url; audio.load();
    peaks=file.peaks||null;waveDuration=file.duration||null;
    setVersionButtons();drawWave();renderMarks();
    const seekAndResume=()=>{
      if(token!==switchToken)return;
      const lim=Number.isFinite(audio.duration)?audio.duration:t;
      try{audio.currentTime=Math.min(t,Math.max(0,lim-.05));}catch(e){}
      current=audio.currentTime||t;updateCursor();redrawHeader();
      if(resume&&wasPlaying)audio.play().catch(()=>notify('音源の再生を開始できませんでした。'));
    };
    if(audio.readyState>=1)seekAndResume();else audio.addEventListener('loadedmetadata',seekAndResume,{once:true});
    return true;
  }
  byId('versionA').addEventListener('click',()=>{stopShort();switchVersion('A')});
  byId('versionB').addEventListener('click',()=>{stopShort();switchVersion('B')});
  byId('compareFile').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    const targetSong=song;
    const saved=loadCompare(file,targetSong,true);
    window.dispatchEvent(new CustomEvent('recnote:media-user-selected',{detail:{kind:'B',song:targetSong,file}}));
    if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
    await saved;e.target.value='';
  });
  async function loadCompare(file,targetSong,save=true){
    if(compareFiles[targetSong]?.url)URL.revokeObjectURL(compareFiles[targetSong].url);
    const entry={url:URL.createObjectURL(file),name:file.name,duration:null,peaks:null};compareFiles[targetSong]=entry;
    if(save)storeSongAudio(targetSong+'::B',file);
    if(song===targetSong)setVersionButtons();
    try{
      if(file.size>350*1024*1024)throw Error('file too large for waveform');
      const bytes=await file.arrayBuffer();
      const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
      const ac=new Ctx();let buf;
      try{buf=await ac.decodeAudioData(bytes)}finally{await ac.close()}
      if(compareFiles[targetSong]!==entry)return;
      const arr=[],channel=buf.getChannelData(0),step=Math.max(1,Math.floor(channel.length/3200));
      for(let i=0;i<channel.length;i+=step){let peak=0;for(let j=i;j<Math.min(channel.length,i+step);j+=Math.max(1,Math.floor(step/80)))peak=Math.max(peak,Math.abs(channel[j]));arr.push(peak)}
      entry.peaks=arr;entry.duration=buf.duration;
      if(targetSong===song&&activeVersion==='B'){peaks=arr;drawWave()}
    }catch(err){console.warn('Compare waveform:',err)}
  }
  async function restoreCompare(targetSong){
    if(compareFiles[targetSong])return;
    try{const db=await openAudioDB();const data=await new Promise((resolve,reject)=>{const tx=db.transaction('tracks','readonly'),q=tx.objectStore('tracks').get(targetSong+'::B');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});db.close();if(data?.file&&!compareFiles[targetSong])await loadCompare(data.file,targetSong,false)}catch(err){console.warn('Comparison audio restore:',err)}
  }

  function selectedRange(){
    const r=state.records.find(x=>x.id===selectedId&&x.song===song&&recordMode(x)===activeMode);
    const start=r?r.start:(parseTime(byId('startInput').value)??rangeStart);
    let end=r?.end??parseTime(byId('endInput').value);
    if(end==null||end<=start)end=start+5;
    const duration=Number.isFinite(audio.duration)?audio.duration:totalDuration();
    return {start:Math.max(0,Math.min(start,duration)),end:Math.max(0,Math.min(end,duration))};
  }
  function showRange(){
    const r=loopRange || (selectedId||byId('endInput').value.trim()?selectedRange():null);
    const shade=byId('waveShade');if(!r||r.end<=r.start){shade.style.display='none';return}
    const [left,right]=getViewport(),width=right-left;
    if(r.end<=left||r.start>=right){shade.style.display='none';return}
    shade.style.display='block';shade.style.left=(100*Math.max(0,r.start-left)/width)+'%';shade.style.width=(100*(Math.min(right,r.end)-Math.max(left,r.start))/width)+'%';
  }
  function stopLoop(silent=false){loopRange=null;loopPadding=0;byId('loopBtn').classList.remove('activeTool');byId('loopInfo').textContent='開始と終了を選ぶと、その範囲を試聴できます。';showRange();if(!silent)notify('区間ループを停止しました')}
  function startLoop(pad=0){
    if(!fileForVersion(activeVersion)?.url){notify('先に音源を選んでください。');return}
    stopShort();const r=selectedRange();loopPadding=pad;
    loopRange={start:Math.max(0,r.start-pad),end:Math.min(Number.isFinite(audio.duration)?audio.duration:totalDuration(),r.end+pad)};
    if(loopRange.end<=loopRange.start){notify('再生区間を確認してください。');return}
    audio.currentTime=loopRange.start;current=loopRange.start;
    byId('loopBtn').classList.toggle('activeTool',pad===0);
    byId('loopInfo').textContent=(pad===0?'ループ中：':'前後2秒：')+fmts(loopRange.start)+'〜'+fmts(loopRange.end);
    showRange();audio.play().catch(()=>notify('再生に失敗しました。'));
  }
  byId('loopBtn').onclick=()=>loopRange&&loopPadding===0?stopLoop():startLoop(0);
  byId('preRollBtn').onclick=()=>startLoop(2);
  byId('loopStop').onclick=()=>{stopLoop(true);audio.pause();redrawHeader();};

  function loadVideo(file,key){
    if(videoFiles[key]?.url)URL.revokeObjectURL(videoFiles[key].url);
    videoFiles[key]={url:URL.createObjectURL(file),name:file.name};
    displayVideo();
  }
  function displayVideo(){
    const show=activeMode!=='REC';
    videoPanel.hidden=!show;
    if(!show){video.pause();return}
    const entry=previewForMode();
    if(!entry){video.pause();video.removeAttribute('src');video.load();video.hidden=true;byId('noVideo').hidden=false;byId('videoName').textContent='＋ 動画を選ぶ（MP4 / MOVなど）';return}
    if(video.src!==entry.url){video.pause();video.src=entry.url;video.load()}
    video.hidden=false;byId('noVideo').hidden=true;byId('videoName').textContent=entry.name;
  }
  byId('videoFile').addEventListener('change',e=>{const f=e.target.files?.[0];if(f)loadVideo(f,videoKey());e.target.value=''});
  video.addEventListener('timeupdate',()=>{byId('videoClock').textContent=fmts(video.currentTime)});
  video.addEventListener('loadedmetadata',()=>{byId('videoClock').textContent=fmts(video.currentTime)});
  function videoFrameToSource(){
    const t=video.currentTime;
    if(activeMode==='MV')return t;
    const candidates=modeRecords().filter(r=>r.outputStart!=null&&r.outputEnd!=null&&r.end!=null&&r.outputStart<=t&&r.outputEnd>=t);
    if(!candidates.length)return null;
    candidates.sort((a,b)=>a.outputStart-b.outputStart);
    const r=candidates.at(-1);
    const ratio=(r.end-r.start)/Math.max(.01,r.outputEnd-r.outputStart);
    return r.start+(t-r.outputStart)*ratio;
  }
  function useVideoFrame(){
    if(!video.currentSrc||video.readyState<1){notify('先に動画を読み込んでください。');return}
    byId('frameTimeInput').value=fmts(video.currentTime);
    byId('frameTimeInput').dispatchEvent(new Event('input',{bubbles:true}));
    notify('確認フレーム '+fmts(video.currentTime)+' を指定しました');
  }
  byId('useVideoFrame').onclick=useVideoFrame;
  byId('videoToCue').onclick=useVideoFrame;
  byId('videoToSource').onclick=()=>{if(!video.currentSrc){notify('先に動画を選んでください。');return}const source=videoFrameToSource();if(source==null){notify('この完成動画時刻に対応する原曲区間がありません。');return}seek(source);rangeStart=source;updateTimeLabels();notify('原曲 '+fmts(source)+' に移動しました')};
  byId('captureFrame').onclick=()=>{
    if(!video.currentSrc||video.readyState<2||!video.videoWidth){notify('動画のフレームを読み込んでください。');return}
    const cvs=document.createElement('canvas');cvs.width=video.videoWidth;cvs.height=video.videoHeight;
    const c=cvs.getContext('2d');c.drawImage(video,0,0,cvs.width,cvs.height);
    cvs.toBlob(blob=>{if(!blob){notify('フレームの保存に失敗しました');return}const filename='REC_NOTE_'+song.replace(/[\\/:*?"<>|]/g,'_')+'_'+fmt(video.currentTime).replace(':','-')+'.png';const url=URL.createObjectURL(blob),a=document.createElement('a');a.download=filename;a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),6000)},'image/png');
  };

  function updateVariants(){
    const select=byId('shortVariant'),prev=select.value;
    const names=[...new Set(modeRecords(song,'SHORT').filter(r=>r.outputStart!=null).map(r=>r.variant||'名称未設定'))];
    select.replaceChildren();
    for(const name of names){const opt=document.createElement('option');opt.value=name;opt.textContent=name;select.append(opt)}
    if(names.includes(prev))select.value=prev;
    if(!names.length){const opt=document.createElement('option');opt.textContent='制作案がありません';opt.value='';select.append(opt)}
    byId('shortPlay').disabled=!names.length;
  }
  function stopShort(){shortActive=false;shortQueue=[];shortIndex=0;byId('auditionInfo').textContent='原曲の区間を並べて音で仮試聴します。完成動画の書き出しではありません。';byId('shortPlay').classList.remove('activeTool')}
  function startShort(){
    const name=byId('shortVariant').value;
    const list=modeRecords(song,'SHORT').filter(r=>(r.variant||'名称未設定')===name&&Number.isFinite(r.outputStart)&&Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.end>r.start).sort((a,b)=>a.outputStart-b.outputStart);
    if(!list.length){notify('原曲の開始・終了、完成動画の開始を登録した構成が必要です。');return}
    if(!files[song]?.url){notify('原曲の音源Aを読み込んでください。');return}
    stopLoop(true);stopShort();
    // The preview concatenates source sections; it does not render video, transitions or silence.
    shortQueue=list;shortIndex=0;shortActive=true;
    byId('shortPlay').classList.add('activeTool');
    switchVersion('A',{resume:false}).then(()=>{
      if(!shortActive)return;
      audio.currentTime=list[0].start;audio.play().catch(()=>notify('音声を再生できませんでした'));
      byId('auditionInfo').textContent='仮試聴中：'+name+'（'+list.length+'区間） / 映像・間・エフェクトは未反映';
    });
  }
  byId('shortPlay').onclick=()=>{if(shortActive){stopShort();audio.pause();}else startShort()};
  byId('shortStop').onclick=()=>{stopShort();audio.pause();redrawHeader()};

  function updateTimeAutomation(){
    if(!audio.readyState || audio.paused)return;
    if(shortActive){
      const clip=shortQueue[shortIndex];
      if(!clip){stopShort();audio.pause();return}
      if(audio.currentTime>=clip.end-.045){
        shortIndex++;
        if(shortIndex>=shortQueue.length){stopShort();audio.pause();notify('ショート音声の仮試聴が終了しました');return}
        const next=shortQueue[shortIndex];
        audio.currentTime=next.start;
        byId('auditionInfo').textContent='仮試聴：'+(shortIndex+1)+' / '+shortQueue.length+' 区間（完成動画ではありません）';
      }
      return;
    }
    if(loopRange&&audio.currentTime>=loopRange.end-.045){
      if(loopPadding>0){stopLoop(true);audio.pause();return}
      audio.currentTime=loopRange.start;
    }
  }
  audio.addEventListener('timeupdate',updateTimeAutomation);
  audio.addEventListener('ended',()=>{if(shortActive){stopShort();return}if(loopRange&&loopPadding===0){audio.currentTime=loopRange.start;audio.play().catch(()=>{})}});

  function timeSrt(t){const ms=Math.max(0,Math.round(t*1000)),h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60,rest=ms%1000;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(rest).padStart(3,'0')}`}
  function exportSRT(){
    if(activeMode==='REC'){notify('MVまたはSHORTで字幕を登録してください。');return}
    const variantName=activeMode==='SHORT'?byId('shortVariant').value:null;
    const records=modeRecords().filter(r=>(!variantName||(r.variant||'名称未設定')===variantName) && (r.subtitleText?.trim() || ((r.category||r.type||'').includes('歌詞テロップ')&&r.lyric?.trim())));
    const cues=[];
    for(const r of records){
      const start=activeMode==='SHORT'?r.outputStart:r.start;
      const end=activeMode==='SHORT'?r.outputEnd:r.end;
      if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)continue;
      cues.push({start,end,text:(r.subtitleText||r.lyric).trim()});
    }
    if(!cues.length){notify('字幕の開始・終了時間を設定した指示がありません。');return}
    cues.sort((a,b)=>a.start-b.start);
    const srt=cues.map((c,i)=>`${i+1}\n${timeSrt(c.start)} --> ${timeSrt(c.end)}\n${c.text}\n`).join('\n');
    downloadText('REC_NOTE_'+song.replace(/[\\/:*?"<>|]/g,'_')+'_'+activeMode+'_字幕_'+today()+'.srt',srt,'text/plain;charset=utf-8');
    notify(cues.length+'件の字幕をSRTで保存しました');
  }
  srtBtn.onclick=exportSRT;

  const originalSave=saveForm;
  saveForm=function(){
    const idBefore=editId,countBefore=state.records.length;
    const subtitle=byId('subtitleInput').value;
    const frameStr=byId('frameTimeInput').value.trim();
    if(activeMode!=='REC'&&frameStr&&parseTime(frameStr)==null){notify('確認フレームは 0:12.3 の形式で指定してください');return}
    originalSave();
    const successful=idBefore? !editId && selectedId===idBefore : state.records.length===countBefore+1;
    if(successful){const r=state.records.find(x=>x.id===selectedId);if(r&&recordMode(r)!=='REC'){r.subtitleText=subtitle;r.frameTime=frameStr?parseTime(frameStr):null;persist()}}
  };
  byId('saveBtn').onclick=saveForm;
  const originalEdit=startEdit;
  startEdit=function(r){originalEdit(r);byId('subtitleInput').value=r.subtitleText||'';byId('frameTimeInput').value=Number.isFinite(r.frameTime)?fmts(r.frameTime):''};
  const originalReset=resetForm;
  resetForm=function(...args){originalReset(...args);byId('subtitleInput').value='';byId('frameTimeInput').value=''};
  byId('resetBtn').onclick=resetForm;
  const originalSaveDraft=saveDraft;
  saveDraft=function(){originalSaveDraft();if(editId)return;const extraText=byId('subtitleInput').value,frameText=byId('frameTimeInput').value;let draft=state.drafts[draftKey()];if(!draft&&(extraText.trim()||frameText.trim()))draft=state.drafts[draftKey()]={};if(draft){draft.subtitleInput=extraText;draft.frameTimeInput=frameText;persist()}};
  const originalRestoreDraft=restoreDraft;
  restoreDraft=function(){originalRestoreDraft();const draft=state.drafts[draftKey()];if(draft){byId('subtitleInput').value=draft.subtitleInput||'';byId('frameTimeInput').value=draft.frameTimeInput||''}};
  for(const id of ['subtitleInput','frameTimeInput']){byId(id).addEventListener('input',saveDraft);byId(id).addEventListener('change',saveDraft)}

  const originalSelect=selectRecord;
  selectRecord=function(id){originalSelect(id);const r=state.records.find(x=>x.id===id);if(!r)return;
    if(activeMode!=='REC'&&video.currentSrc&&video.readyState>=1){
      const v=Number.isFinite(r.frameTime)?r.frameTime:(activeMode==='SHORT'?r.outputStart:r.start);
      if(Number.isFinite(v)){try{video.currentTime=Math.min(v,video.duration||v)}catch(err){}}
    }
    showRange();
  };
  const originalSetMode=setMode;
  setMode=function(next){if(next===activeMode)return;stopLoop(true);stopShort();video.pause();originalSetMode(next);displayVideo();updateVariants();srtBtn.classList.toggle('visible',activeMode!=='REC')};
  const originalSetSong=setSong;
  setSong=function(next){if(next===song)return;stopLoop(true);stopShort();video.pause();activeVersion='A';originalSetSong(next);setVersionButtons();displayVideo();restoreCompare(song)};
  const originalLoad=loadAudio;
  loadAudio=async function(target,file,save){
    if(target===song){stopLoop(true);stopShort();activeVersion='A';++switchToken;}
    const r=await originalLoad(target,file,save);setVersionButtons();return r;
  };
  const originalUpdate=updateAll;
  updateAll=function(){originalUpdate();showRange();updateVariants();};
  const originalSeek=seek;
  seek=function(t){const file=fileForVersion(activeVersion);if(activeVersion==='B' && file?.url){
      current=clamp(t);if(audio.readyState>=1)try{audio.currentTime=Math.min(Math.max(0,current),audio.duration||current)}catch(e){}updateCursor();return;
    }
    originalSeek(t);
  };
  const originalPlay=playAudio;
  playAudio=function(){if(activeVersion==='B'){
    if(!compareFiles[song]?.url){notify('音源Bを読み込んでください。');return}
    if(audio.paused)audio.play().then(redrawHeader).catch(()=>notify('再生できませんでした。'));else{audio.pause();redrawHeader()}return;
  } originalPlay()};
  const originalDuration=totalDuration;
  totalDuration=function(){if(activeVersion==='B'&&Number.isFinite(compareFiles[song]?.duration))return compareFiles[song].duration;return originalDuration()};
  const originalHeader=redrawHeader;
  redrawHeader=function(){originalHeader();byId('loopBtn').setAttribute('aria-pressed',String(Boolean(loopRange&&loopPadding===0)))};
  // Update the original V3 form reset after it runs on save or mode changes.
  restoreDraft();
  displayVideo();setVersionButtons();updateVariants();srtBtn.classList.toggle('visible',activeMode!=='REC');restoreCompare(song);
  document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(e.code==='KeyL'){e.preventDefault();if(loopRange)stopLoop();else startLoop()}});
  window.addEventListener('beforeunload',()=>{video.pause()});
  // Used exclusively to load user-selected files retrieved from private cloud storage.
  window.RECNOTE_MEDIA=Object.freeze({
    loadCompare:(targetSong,file)=>loadCompare(file,targetSong,true),
    hasCompare:(targetSong)=>Boolean(compareFiles[targetSong]?.url),
    loadVideo:(file,key)=>loadVideo(file,key)
  });
})();