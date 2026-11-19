/* REC NOTE v6.4 — teaser maker. No public media uploads; renders in browser. */
(function(){
  'use strict';
  if(typeof state==='undefined'||typeof song==='undefined'||typeof persist!=='function'||typeof fmt!=='function')return;
  const $t=id=>document.getElementById(id);
  const modes=document.querySelector('.modeDock');
  if(!modes)return;
  state.teaserPresets=state.teaserPresets&&typeof state.teaserPresets==='object'?state.teaserPresets:{};
  const panel=document.createElement('section');
  panel.id='teaserBuilder';
  panel.className='teaserBuilder';
  panel.hidden=activeMode==='REC';
  panel.innerHTML=[
    '<div class="teaserHeader"><div><div class="teaserEyebrow">VIDEO STUDIO</div><h2>ティザー動画を作る</h2><p>保存済み音源を使い、ジャケット・歌詞・映像を組み合わせて書き出します。</p></div><span class="teaserStep">① 音と時間　② 画面　③ 書き出し</span></div>',
    '<div class="teaserLayout"><div class="teaserSettings">',
    '<div class="teaserField"><label for="teaserStyle">動画の種類</label><select id="teaserStyle"><option value="jacket">ジャケットティザー</option><option value="lyrics">歌詞ティザー</option><option value="mv">MV予告（動画素材）</option></select></div>',
    '<div class="teaserTwo">',
    '<div class="teaserField"><label for="teaserRatio">動画の向き</label><select id="teaserRatio"><option value="9:16">縦 9:16</option><option value="16:9">横 16:9</option><option value="1:1">正方形 1:1</option></select></div>',
    '<div class="teaserField"><label for="teaserAudio">使う音源</label><select id="teaserAudio"><option value="A">音源A</option><option value="B">音源B（修正版）</option></select></div></div>',
    '<div class="teaserTwo">',
    '<div class="teaserField"><label for="teaserStart">原曲の開始時間</label><div class="teaserInline"><input id="teaserStart" inputmode="decimal" value="0:00.0" placeholder="1:28.0"/><button id="teaserCapture" type="button" title="再生位置を使用">現在位置</button></div></div>',
    '<div class="teaserField"><label for="teaserLength">動画の長さ</label><select id="teaserLength"><option value="10">10秒</option><option value="15" selected>15秒</option><option value="20">20秒</option><option value="30">30秒</option></select></div></div>',
    '<button type="button" class="teaserTakeRange" id="teaserRange">今選んでいる指示の区間から設定</button>',
    '<div class="teaserField"><label for="teaserTitle">表示する曲名</label><input id="teaserTitle" maxlength="140" /></div>',
    '<div class="teaserField"><label for="teaserMessage">告知文（任意）</label><input id="teaserMessage" maxlength="140" placeholder="ご自身の告知文や配信日を入力" /></div>',
    '<div class="teaserAssets">',
    '<label class="teaserPick">ジャケット・写真を選ぶ<input id="teaserImageFile" type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" hidden/></label>',
    '<label class="teaserPick">動画素材を選ぶ<input id="teaserVideoFile" type="file" accept="video/*,.mov,.mp4,.webm" hidden/></label>',
    '</div>',
    '<div class="teaserField"><label class="teaserCheck"><input type="checkbox" id="teaserShowLyrics"/> 登録済み歌詞を時間に合わせて表示</label></div>',
    '<p class="teaserHelp" id="teaserAssetInfo">映像素材はこの端末内だけに保存します。歌詞は「余白」の原文を読み取り、変更しません。</p>',
    '</div>',
    '<div class="teaserOutput"><div class="teaserPreviewShell"><canvas id="teaserCanvas" width="540" height="960" aria-label="ティザー映像プレビュー"></canvas></div>',
    '<div class="teaserControls"><button id="teaserPreview" type="button">▶ 音つきで試聴</button><button id="teaserStop" type="button">■ 停止</button></div>',
    '<button id="teaserExport" type="button" class="teaserExport">動画を書き出す（MP4 / WebM）</button>',
    '<div class="teaserStatus" role="status" id="teaserStatus">曲を選び、必要なら画像・動画を追加してください。</div>',
    '<p class="teaserNote">書き出しはブラウザ内で行います。MP4非対応のブラウザはWebMで保存します。Macでの利用を推奨します。素材を外部へ自動送信しません。</p>',
    '</div></div>'
  ].join('');
  modes.insertAdjacentElement('afterend',panel);

  const style=$t('teaserStyle'),ratio=$t('teaserRatio'),source=$t('teaserAudio');
  const start=$t('teaserStart'),length=$t('teaserLength'),title=$t('teaserTitle');
  const message=$t('teaserMessage'),withLyrics=$t('teaserShowLyrics'),preview=$t('teaserCanvas');
  const status=$t('teaserStatus');
  const ctx=preview.getContext('2d',{alpha:false});
  if(!ctx){status.textContent='Canvasが利用できないブラウザです。';return;}
  let art=null, artUrl='',videoUrl='', backgroundVideo=null, videoName='';
  let live=null, restoring=0, setting=false, activeExport=false;

  function tell(m,bad=false){status.textContent=m;status.dataset.level=bad?'error':'info';}
  function getSrc(){
    const name=source.value;
    return name==='B'?window.RECNOTE_MEDIA?.getCompareSource?.(song):files[song];
  }
  function options(){
    return {
      style:style.value,ratio:ratio.value,audio:source.value,start:start.value.trim(),
      length:Number(length.value),title:title.value,message:message.value,showLyrics:withLyrics.checked
    };
  }
  function save(){
    if(setting)return;
    state.teaserPresets[song]=options();
    persist();
    paint(ctx,preview,0);
  }
  function restore(){
    setting=true;
    const p=state.teaserPresets[song]||{};
    style.value=['jacket','lyrics','mv'].includes(p.style)?p.style:'jacket';
    ratio.value=['9:16','16:9','1:1'].includes(p.ratio)?p.ratio:(activeMode==='MV'?'16:9':'9:16');
    source.value=['A','B'].includes(p.audio)?p.audio:'A';
    start.value=typeof p.start==='string'?p.start:'0:00.0';
    length.value=[10,15,20,30].includes(Number(p.length))?String(p.length):'15';
    title.value=typeof p.title==='string'?p.title:song;
    message.value=typeof p.message==='string'?p.message:'';
    withLyrics.checked=typeof p.showLyrics==='boolean'?p.showLyrics:style.value==='lyrics';
    setting=false;
    setCanvasAspect();
    restoreAssets(song);
    paint(ctx,preview,0);
  }
  function getTime(){
    const t=parseTime(start.value);
    if(t===null||!Number.isFinite(t)||t<0)throw Error('開始時間は 1:28.0 の形式で入力してください。');
    const src=getSrc();
    if(!src?.url)throw Error('先に音源AまたはBを選んでください。保存済み音源は自動復元されます。');
    const end=Number(src.duration);
    if(Number.isFinite(end)&&end>0&&t>=end)throw Error('開始時間が音源の終わりを超えています。');
    return t;
  }
  function viewSize(r,quality=false){
    const short=r==='9:16',wide=r==='16:9';
    const max=quality?(window.matchMedia('(max-width:700px)').matches?720:1080):540;
    return short?{w:Math.round(max*9/16),h:max}:wide?{w:max,h:Math.round(max*9/16)}:{w:max,h:max};
  }
  function setCanvasAspect(){
    const d=viewSize(ratio.value,false);
    preview.width=d.w;preview.height=d.h;
    preview.style.aspectRatio=String(d.w)+' / '+String(d.h);
    paint(ctx,preview,0);
  }
  function coverDraw(c,media,w,h,scale=1){
    const mw=media.videoWidth||media.naturalWidth||media.width||1;
    const mh=media.videoHeight||media.naturalHeight||media.height||1;
    if(mw<2||mh<2)return false;
    const d=Math.max(w/mw,h/mh)*scale;
    const iw=mw*d,ih=mh*d;
    c.drawImage(media,(w-iw)/2,(h-ih)/2,iw,ih);
    return true;
  }
  function multiline(c,text,x,y,maxW,lineH,maxLines=3){
    const all=String(text||'').split('\n'),lines=[];
    for(const seg of all){
      if(!seg){lines.push('');continue;}
      let buf='';
      for(const char of Array.from(seg)){
        if(c.measureText(buf+char).width>maxW && buf){lines.push(buf);buf=char;} else buf+=char;
      }
      if(buf)lines.push(buf);
    }
    const selected=lines.slice(0,maxLines);
    selected.forEach((line,i)=>c.fillText(line,x,y+i*lineH,maxW));
    return selected.length*lineH;
  }
  function currentLyric(absoluteTime){
    const lines=window.RECNOTE_LYRICS?.getTimedLines?.()||[];
    for(let i=lines.length-1;i>=0;i--){
      const item=lines[i];
      if(!Number.isFinite(item.start)||item.start>absoluteTime)continue;
      let end=Number.isFinite(item.end)?item.end:Infinity;
      if(!Number.isFinite(item.end)){
        const next=lines.slice(i+1).find(x=>Number.isFinite(x.start)&&x.start>item.start);
        end=next?next.start:Math.min(item.start+7,absoluteTime+1);
      }
      if(absoluteTime<end)return item.text;
    }
    return '';
  }
  function paint(c,canvas,elapsed){
    if(!c||!canvas)return;
    const w=canvas.width,h=canvas.height;
    const typ=style.value,clipLen=Math.max(1,Number(length.value)||15);
    c.save();
    c.clearRect(0,0,w,h);
    c.fillStyle='#191919';c.fillRect(0,0,w,h);
    const gradient=c.createLinearGradient(0,0,w,h);
    gradient.addColorStop(0,'#30302d');gradient.addColorStop(.55,'#181818');gradient.addColorStop(1,'#55534f');
    c.fillStyle=gradient;c.fillRect(0,0,w,h);
    const zoom=1+Math.min(1,elapsed/clipLen)*.055;
    let drew=false;
    if(typ==='mv'&&backgroundVideo&&backgroundVideo.readyState>=2){
      try{drew=coverDraw(c,backgroundVideo,w,h,1)}catch(e){}
    }
    if(!drew&&art?.complete){
      try{drew=coverDraw(c,art,w,h,zoom)}catch(e){}
    }
    c.fillStyle='rgba(0,0,0,.42)';
    c.fillRect(0,0,w,h);
    const unit=Math.min(w/9,h/16);
    const pad=Math.max(18,unit*.7);
    c.fillStyle='rgba(255,255,255,.93)';
    c.textAlign='center';
    c.textBaseline='alphabetic';
    const focus=typ==='lyrics' || withLyrics.checked;
    let lyric='';
    if(focus){
      const st=parseTime(start.value)??0;
      lyric=currentLyric(st+elapsed);
    }
    if(lyric){
      c.font='600 '+Math.max(21,Math.round(unit*.49))+'px system-ui, "Hiragino Kaku Gothic ProN", sans-serif';
      multiline(c,lyric,w/2,h*.51,w-pad*2,unit*.8,4);
    }else if(typ==='jacket' || typ==='mv'){
      c.font='500 '+Math.max(22,Math.round(unit*.65))+'px system-ui, "Hiragino Kaku Gothic ProN", sans-serif';
      multiline(c,title.value||song,w/2,h*.5,w-pad*2,unit*.9,3);
    }else{
      c.font='500 '+Math.max(22,Math.round(unit*.55))+'px system-ui, sans-serif';
      c.fillText(title.value||song,w/2,h*.53,w-pad*2);
    }
    c.font='600 '+Math.max(11,Math.round(unit*.28))+'px system-ui, sans-serif';
    c.textBaseline='bottom';
    c.fillStyle='#d9d7d1';
    c.fillText(title.value||song,w/2,h-pad*2,w-pad*2);
    if(message.value.trim()){
      c.font='400 '+Math.max(12,Math.round(unit*.32))+'px system-ui, sans-serif';
      c.fillStyle='#ffffff';
      multiline(c,message.value.trim(),w/2,h-pad*1.15,w-pad*2,unit*.44,2);
    }
    // Gentle 0.35s fade on the first and last frames.
    const alpha=Math.max(Math.max(0,(.3-elapsed)/.3),Math.max(0,(elapsed-(clipLen-.4))/.4));
    if(alpha>0){c.fillStyle='rgba(0,0,0,'+Math.min(1,alpha).toFixed(3)+')';c.fillRect(0,0,w,h);}
    c.restore();
  }
  function makeBackground(file,type){
    if(type==='image'){
      if(artUrl)URL.revokeObjectURL(artUrl);
      artUrl=URL.createObjectURL(file);
      art=new Image();art.onload=()=>paint(ctx,preview,0);
      art.onerror=()=>tell('画像を読み込めませんでした。JPEG/PNGなどをご利用ください。',true);
      art.src=artUrl;
    }else{
      if(videoUrl)URL.revokeObjectURL(videoUrl);
      videoUrl=URL.createObjectURL(file);videoName=file.name;
      backgroundVideo?.pause();
      backgroundVideo=document.createElement('video');
      backgroundVideo.playsInline=true;backgroundVideo.muted=true;backgroundVideo.loop=true;
      backgroundVideo.preload='auto';backgroundVideo.src=videoUrl;
      backgroundVideo.load();
      backgroundVideo.addEventListener('loadeddata',()=>paint(ctx,preview,0),{once:true});
    }
    const name=file.name;
    $t('teaserAssetInfo').textContent=type==='image'?
      '画像：'+name+'（端末内保存。歌詞原文は「余白」を参照）':
      '背景動画：'+name+'（音声は使用せず、REC NOTEの音源を使います）';
    paint(ctx,preview,0);
  }
  async function storeAsset(type,file,targetSong){
    if(file.size>125*1024*1024){tell('素材が大きいため端末保存を省略しました。再訪時は素材を選び直してください。');return;}
    try{
      const db=await openAudioDB();
      await new Promise((res,rej)=>{
        const tx=db.transaction('tracks','readwrite');
        tx.objectStore('tracks').put({file,name:file.name,size:file.size,updatedAt:new Date().toISOString()},'teaser:'+type+':'+targetSong);
        tx.oncomplete=res;tx.onerror=()=>rej(tx.error);
      });
      db.close();
    }catch(e){tell('素材の端末内保存に失敗しました。ブラウザ容量をご確認ください。',true);}
  }
  async function storedAsset(type,targetSong){
    try{
      const db=await openAudioDB();
      const data=await new Promise((res,rej)=>{
        const tx=db.transaction('tracks','readonly'),q=tx.objectStore('tracks').get('teaser:'+type+':'+targetSong);
        q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);
      });
      db.close();return data?.file||null;
    }catch(e){return null;}
  }
  async function restoreAssets(targetSong){
    const token=++restoring;
    backgroundVideo?.pause();backgroundVideo=null;art=null;
    if(artUrl)URL.revokeObjectURL(artUrl);artUrl='';
    if(videoUrl)URL.revokeObjectURL(videoUrl);videoUrl='';
    $t('teaserAssetInfo').textContent='画像・動画を未登録の場合は端末から選択してください。';
    for(const typ of ['image','video']){
      const file=await storedAsset(typ,targetSong);
      if(token!==restoring||targetSong!==song)return;
      if(file)makeBackground(file,typ);
    }
    paint(ctx,preview,0);
  }
  $t('teaserImageFile').addEventListener('change',e=>{
    const f=e.target.files?.[0];e.target.value='';if(!f)return;
    makeBackground(f,'image');storeAsset('image',f,song);
  });
  $t('teaserVideoFile').addEventListener('change',e=>{
    const f=e.target.files?.[0];e.target.value='';if(!f)return;
    makeBackground(f,'video');storeAsset('video',f,song);
  });
  for(const input of [style,ratio,source,start,length,title,message,withLyrics]){
    input.addEventListener('change',()=>{if(input===style){withLyrics.checked=style.value==='lyrics';if(style.value==='mv'&&ratio.value==='9:16')ratio.value='16:9';}if(input===ratio)setCanvasAspect();save();});
    if(input===title||input===message)input.addEventListener('input',save);
  }
  $t('teaserCapture').addEventListener('click',()=>{start.value=fmt(current);save();});
  $t('teaserRange').addEventListener('click',()=>{
    const r=state.records.find(x=>x.id===selectedId&&x.song===song);
    const startVal=r?.start??parseTime($t('startInput').value);
    const endVal=r?.end??parseTime($t('endInput').value);
    if(!Number.isFinite(startVal)){tell('先に波形や指示一覧で範囲を選択してください。',true);return;}
    start.value=fmt(startVal);
    if(Number.isFinite(endVal)&&endVal>startVal){
      const sec=Math.round(endVal-startVal);
      length.value=String([10,15,20,30].reduce((a,b)=>Math.abs(b-sec)<Math.abs(a-sec)?b:a,15));
    }
    save();tell('選択中の時間を取り込みました。');
  });

  function stopSession(abort=false){
    if(!live)return;
    const session=live;live=null;
    session.audio.pause();
    session.video?.pause();
    cancelAnimationFrame(session.raf);
    if(abort)session.cancelled=true;
    const cleanup=()=>{
      if(session.context)session.context.close().catch(()=>{});
      if(session.stream)session.stream.getTracks().forEach(t=>t.stop());
    };
    if(session.recorder&&session.recorder.state!=='inactive'){
      const oldStop=session.recorder.onstop;
      session.recorder.onstop=(e)=>{
        try{if(typeof oldStop==='function')oldStop(e);}finally{cleanup();}
      };
      session.recorder.stop();
    }else cleanup();
    $t('teaserPreview').disabled=false;$t('teaserExport').disabled=false;
    activeExport=false;
  }
  function playbackLoop(session){
    if(live!==session)return;
    const elapsed=Math.max(0,session.audio.currentTime-session.start);
    paint(session.ctx,session.canvas,elapsed);
    if(elapsed>=session.duration-.02||session.audio.ended){
      stopSession(false);
      if(!session.recorder)tell('試聴を終了しました。');
      return;
    }
    session.raf=requestAnimationFrame(()=>playbackLoop(session));
  }
  async function prepareAudio(src,startTime){
    const player=document.createElement('audio');
    player.preload='auto';
    player.src=src.url;
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('音源の読込が完了しませんでした。')),14000);
      player.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve();},{once:true});
      player.addEventListener('error',()=>{clearTimeout(timer);reject(Error('音源を再生できません。'));},{once:true});
      player.load();
    });
    player.currentTime=startTime;
    return player;
  }
  function mime(){
    if(typeof MediaRecorder!=='function')return null;
    const tests=[
      'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    return tests.find(t=>MediaRecorder.isTypeSupported?.(t))||null;
  }
  async function begin(exportMode){
    if(live){tell('先に停止してください。',true);return;}
    const startTime=getTime(),music=getSrc();
    let player;
    try{player=await prepareAudio(music,startTime);}catch(err){tell(err.message,true);return;}
    const duration=Math.min(Number(length.value),Math.max(0,player.duration-startTime));
    if(duration<.4){tell('選択区間の残り時間が短すぎます。',true);return;}
    audio.pause();
    let c=ctx,canvas=preview;
    if(exportMode){
      if(!preview.captureStream||!mime()){tell('このブラウザは音付き動画の書き出しに対応していません。MacのSafari/Chromeをご利用ください。',true);return;}
      canvas=document.createElement('canvas');
      const dims=viewSize(ratio.value,true);
      canvas.width=dims.w;canvas.height=dims.h;
      c=canvas.getContext('2d',{alpha:false});
    }
    paint(c,canvas,0);
    const session={audio:player,canvas,ctx:c,start:startTime,duration,raf:0,video:backgroundVideo,recorder:null,context:null,stream:null,cancelled:false};
    try{
      if(session.video&&style.value==='mv'){
        try{session.video.currentTime=0;await session.video.play();}catch(e){tell('動画素材の再生が制限されたため静止画で試します。');}
      }
      if(exportMode){
        const aCtx=new (window.AudioContext||window.webkitAudioContext)();
        session.context=aCtx;
        const element=aCtx.createMediaElementSource(player);
        const dest=aCtx.createMediaStreamDestination();
        element.connect(dest);
        element.connect(aCtx.destination);
        const canvasStream=canvas.captureStream(30);
        session.stream=new MediaStream([...canvasStream.getVideoTracks(),...dest.stream.getAudioTracks()]);
        const options={mimeType:mime(),videoBitsPerSecond:5000000,audioBitsPerSecond:192000};
        const recorder=new MediaRecorder(session.stream,options);
        session.recorder=recorder;
        const chunks=[];
        recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
        recorder.onerror=e=>tell('動画書き出しに失敗しました。ブラウザの保存機能をご確認ください。',true);
        recorder.onstop=()=>{
          if(session.cancelled||!chunks.length)return;
          const mt=recorder.mimeType||options.mimeType;
          const ext=mt.startsWith('video/mp4')?'mp4':'webm';
          const blob=new Blob(chunks,{type:mt});
          if(blob.size<1024){tell('動画ファイルが空です。素材とブラウザを確認してください。',true);return;}
          const url=URL.createObjectURL(blob),a=document.createElement('a');
          a.href=url;a.download='REC_NOTE_'+song.replace(/[\/:*?"<>|]/g,'_')+'_'+Math.floor(startTime)+'s_'+Number(length.value)+'s.'+ext;
          document.body.appendChild(a);a.click();a.remove();
          setTimeout(()=>URL.revokeObjectURL(url),15000);
          tell('動画を書き出しました：'+ext.toUpperCase()+'（'+(blob.size/1048576).toFixed(1)+'MB）');
        };
        recorder.start(500);
        await aCtx.resume();
        tell('動画を書き出し中です。音源に合わせて実時間で録画します。');
      }else tell('プレビュー再生中…');
      live=session;activeExport=exportMode;
      $t('teaserPreview').disabled=true;$t('teaserExport').disabled=true;
      await player.play();
      playbackLoop(session);
    }catch(err){
      session.cancelled=true;
      if(live===session)stopSession(true);
      else{
        player.pause();session.video?.pause();
        if(session.recorder?.state==='recording')session.recorder.stop();
        if(session.context)session.context.close().catch(()=>{});
        session.stream?.getTracks().forEach(t=>t.stop());
      }
      tell('動画を開始できませんでした：'+err.message,true);
    }
  }
  $t('teaserPreview').addEventListener('click',()=>begin(false).catch(e=>tell(e.message,true)));
  $t('teaserStop').addEventListener('click',()=>{if(live){const wasExport=activeExport;stopSession(true);tell(wasExport?'書き出しをキャンセルしました。':'停止しました。');}});
  $t('teaserExport').addEventListener('click',()=>begin(true).catch(e=>tell(e.message,true)));

  const previousSong=setSong;setSong=function(next){
    const before=song;
    if(live)stopSession(true);
    previousSong(next);
    if(before!==song)restore();
  };
  const previousMode=setMode;setMode=function(next){
    if(live)stopSession(true);
    previousMode(next);
    panel.hidden=activeMode==='REC';
    if(activeMode==='SHORT'&&!state.teaserPresets[song]){setting=true;style.value='jacket';ratio.value='9:16';setting=false;setCanvasAspect();}
    if(activeMode==='MV'&&!state.teaserPresets[song]){setting=true;ratio.value='16:9';style.value='mv';setting=false;setCanvasAspect();}
  };
  window.addEventListener('recnote:cloud-synced',()=>{if(!live&&!document.activeElement?.closest?.('#teaserBuilder'))restore();});
  window.addEventListener('beforeunload',()=>{if(live)stopSession(true);});
  restore();
})();