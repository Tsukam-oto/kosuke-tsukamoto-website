/* REC NOTE v6.3 — media persistence coordinator.
 * Saved audio is reused from IndexedDB; when unavailable the latest private-cloud
 * copy is fetched once and cached. Existing audio versions are never deleted.
 */
(function(){
  'use strict';
  const cloud=window.RECNOTE_CLOUD_MEDIA;
  if(!cloud || typeof openAudioDB!=='function' || typeof restoreSongAudio!=='function' || !document.getElementById('audioFile')) return;
  const $=id=>document.getElementById(id);
  const PREF='rec_note_audio_cloud_optin_v1';
  const BOUND='rec_note_audio_cloud_binding_v1:';
  const MAX=45000000;
  let optIn=true;
  try{optIn=localStorage.getItem(PREF)!=='off';}catch(e){}
  const working=new Set();
  const tasks=new Map();
  let uiVersion=0;

  // The only automatic upload trigger is a user selecting a file while this opt-in is on.
  const bar=document.createElement('section');
  bar.id='recMediaPersistence';
  bar.className='recMediaPersistence';
  bar.setAttribute('aria-label','音源の保存と再利用');
  bar.innerHTML=[
    '<div class="recMediaStatus"><strong>音源の保存</strong><span id="recMediaStatusText" role="status">端末内の音源を確認中…</span></div>',
    '<div class="recMediaOptions">',
    '<label class="recMediaOptin"><input id="recMediaAutoCloud" type="checkbox"/> 新しく選ぶ音源をクラウドにも保存 <small>（ログイン中・45MB以下）</small></label>',
    '<button type="button" id="recMediaSaveCached" class="small">端末の音源をクラウドにも保存</button>',
    '</div>',
    '<p id="recMediaHelp" class="recMediaHelp">次回からは端末の保存済み音源を自動で開きます。端末にない場合はクラウドの音源を自動取得します。</p>'
  ].join('');
  const header=document.querySelector('.layout > .panel > .panelHead');
  if(header)header.insertAdjacentElement('afterend',bar);
  else document.querySelector('.layout > .panel .panelBody')?.insertAdjacentElement('afterbegin',bar);
  $('recMediaAutoCloud').checked=optIn;
  $('recMediaAutoCloud').addEventListener('change',e=>{
    optIn=e.target.checked;
    try{localStorage.setItem(PREF,optIn?'on':'off');}catch(e){}
    showAudioStatus();
  });

  function cacheKey(s,kind){return kind==='B'?s+'::B':s;}
  function bindingKey(s,kind){return BOUND+(cloud.ownerId()||'unknown')+':'+s+':'+kind;}
  function bound(s,kind){try{return localStorage.getItem(bindingKey(s,kind))||'';}catch(e){return '';}}
  function bind(s,kind,id){try{localStorage.setItem(bindingKey(s,kind),id);}catch(e){}}
  function unbind(s,kind){try{localStorage.removeItem(bindingKey(s,kind));}catch(e){}}
  function currentCloud(s,kind){
    return cloud.list(s).filter(m=>m.kind===kind)
      .sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0))[0]||null;
  }
  async function fromCache(s,kind){
    try{
      const db=await openAudioDB();
      const value=await new Promise((resolve,reject)=>{
        const tx=db.transaction('tracks','readonly');
        const q=tx.objectStore('tracks').get(cacheKey(s,kind));
        q.onsuccess=()=>resolve(q.result||null);
        q.onerror=()=>reject(q.error);
      });
      db.close();
      return value;
    }catch(e){return null;}
  }
  async function inMemory(s,kind){
    let source=null;
    if(kind==='A')source=files[s]||null;
    else source=window.RECNOTE_MEDIA?.getCompareSource?.(s)||null;
    if(!source?.url)return null;
    try{
      const response=await fetch(source.url);
      if(!response.ok)return null;
      const blob=await response.blob();
      return new File([blob],source.name||s+(kind==='B'?'_B':'')+'.mp3',{type:blob.type||'audio/mpeg'});
    }catch(e){return null;}
  }
  async function localFile(s,kind){
    const row=await fromCache(s,kind);
    return row?.file||await inMemory(s,kind);
  }
  function sameSource(row,m){
    const file=row?.file;
    if(!file||!m)return false;
    return file.name===m.name&&file.size===m.size&&
      ((Number(file.lastModified||0)>0&&Number(m.lastModified||0)>0&&
        Number(file.lastModified)===Number(m.lastModified))||
       (Number(file.lastModified||0)===0&&Number(m.lastModified||0)===0));
  }
  async function showAudioStatus(){
    const n=++uiVersion,targetSong=song;
    const cached=await fromCache(targetSong,'A');
    if(n!==uiVersion || targetSong!==song)return;
    const exists=Boolean(cached?.file || files[targetSong]?.url);
    const cloudCopy=cloud.isSignedIn()?currentCloud(targetSong,'A'):null;
    const stored=exists?'端末に保存済み':'端末には未保存';
    const online=cloud.isSignedIn()?(cloudCopy?'クラウドにも保存済み':'クラウド未登録'):'クラウド未接続';
    $('recMediaStatusText').textContent=stored+' / '+online;
    $('recMediaSaveCached').disabled=working.size>0 || !cloud.isSignedIn();
    $('recMediaSaveCached').title=cloud.isSignedIn()?'端末に保存済みのA・B音源を再選択せずにアップロード':'先にクラウドへログインしてください';
    $('recMediaHelp').textContent=cloud.isSignedIn()?
      '音源A/Bは端末から自動復元します。別端末で足りない音源は非公開クラウドから自動取得します。動画は手動読み込みです。':
      '端末の音源は再訪時に自動復元します。別端末でも使うには上のクラウドにログインし、この曲の音源を一度保存してください。';
  }

  async function uploadFile(s,kind,file){
    if(!file||!cloud.isSignedIn())return false;
    if(file.size>MAX){
      notify('音源が45MBを超えています。端末では再利用できますが、クラウドへの保存にはMP3/M4Aなどが必要です。');
      return false;
    }
    const taskKey=s+'\u001f'+kind;
    if(working.has(taskKey))return false;
    working.add(taskKey);
    $('recMediaSaveCached').disabled=true;
    try{
      const m=await cloud.upload(kind,file,s);
      if(m?.id){
        bind(s,kind,m.id);
        return true;
      }
      return false;
    }finally{
      working.delete(taskKey);
      showAudioStatus();
    }
  }

  // Called only by native file-picker actions in the main player and A/B selector.
  window.addEventListener('recnote:media-user-selected',e=>{
    const {song:targetSong,kind,file}=e.detail||{};
    if(!targetSong||!['A','B'].includes(kind)||!file)return;
    unbind(targetSong,kind);
    showAudioStatus();
    if(!optIn || !cloud.isSignedIn())return;
    uploadFile(targetSong,kind,file).catch(err=>console.warn('Audio cloud upload:',err));
  });

  $('recMediaSaveCached').addEventListener('click',async()=>{
    if(!cloud.isSignedIn()){
      notify('先にクラウドにログインしてください。');return;
    }
    const s=song;
    const entries=[];
    for(const kind of ['A','B']){
      const file=await localFile(s,kind);
      if(file){
        const remote=currentCloud(s,kind);
        // Reusing the exact same file must never create another cloud copy.
        if(remote && sameSource({file},remote)){bind(s,kind,remote.id);continue;}
        entries.push({kind,file});
      }
    }
    if(!entries.length){
      notify('未保存の端末音源はありません。すでにクラウド登録済みの場合はそのまま使えます。');
      showAudioStatus();return;
    }
    let uploaded=0;
    for(const x of entries)if(await uploadFile(s,x.kind,x.file))uploaded++;
    notify(uploaded+'件の音源をクラウドに保存しました。次回から別端末でも自動復元します。');
  });

  // Older cloud copies remain available in the existing file list. Use the latest
  // as the default only when no local audio exists or another device uploaded newer.
  async function restoreMedia(targetSong){
    if(!cloud.isSignedIn() || tasks.has(targetSong))return;
    const task=(async()=>{
      try{
        for(const kind of ['A','B']){
          if(!cloud.isSignedIn())break;
          const remote=currentCloud(targetSong,kind);
          if(!remote)continue;
          if(kind==='A' && !files[targetSong]?.url)await restoreSongAudio(targetSong);
          const local=await fromCache(targetSong,kind);
          const memory=kind==='A'?Boolean(files[targetSong]?.url):Boolean(window.RECNOTE_MEDIA?.hasCompare?.(targetSong));
          const exists=Boolean(local?.file||memory);
          let shouldFetch=!exists;
          const linked=bound(targetSong,kind);
          if(exists && sameSource(local,remote)){
            if(linked!==remote.id)bind(targetSong,kind,remote.id);
          }else if(exists && linked && linked!==remote.id){
            shouldFetch=true;
          }else if(exists && !linked && local?.updatedAt){
            const localTime=Date.parse(local.updatedAt||0);
            const cloudTime=Date.parse(remote.createdAt||0);
            if(Number.isFinite(localTime)&&Number.isFinite(cloudTime)&&cloudTime>localTime+3000)shouldFetch=true;
          }
          // Never interrupt listening to a track already loaded and playing.
          if(shouldFetch&&targetSong===song&&!audio.paused&&memory)continue;
          if(shouldFetch){
            const ok=await cloud.retrieve(remote);
            if(ok)bind(targetSong,kind,remote.id);
          }
        }
      }catch(e){console.warn('Cloud media restoration:',e);}
      finally{tasks.delete(targetSong);showAudioStatus();}
    })();
    tasks.set(targetSong,task);
    return task;
  }

  // A complete metadata pull is required before choosing which cloud version to load.
  window.addEventListener('recnote:cloud-synced',()=>{restoreMedia(song);showAudioStatus();});
  window.addEventListener('recnote:cloud-auth-change',()=>showAudioStatus());

  const originalSong=setSong;
  setSong=function(next){
    const previous=song;
    originalSong(next);
    if(previous!==song){
      showAudioStatus();
      if(cloud.isSignedIn())restoreMedia(song);
    }
  };
  showAudioStatus();

  // Non-sensitive read-only helper for local smoke tests.
  window.RECNOTE_MEDIA_CACHE_INFO=Object.freeze({hasDeviceAudio:async(s,k)=>Boolean((await fromCache(s,k))?.file)});
})();