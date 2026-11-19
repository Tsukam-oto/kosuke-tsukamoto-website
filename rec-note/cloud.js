/* REC NOTE v5 CLOUD — personal synchronized production notes.
 * Only a Supabase publishable key is included. No service-role secrets.
 * Existing localStorage data remain the offline source and are never cleared.
 */
(function () {
  'use strict';
  const API = 'https://nroyxwozdxwnrqyierjx.supabase.co';
  const KEY = 'sb_publishable_dxiidJt1gVcFwkVR2fg1HA_6gHAZNDz';
  const BUCKET = 'rec-note-private-media';
  const SESSION_KEY = 'rec_note_cloud_session_v1';
  const BASE_PREFIX = 'rec_note_cloud_base_v1_';
  const OWNER_KEY = 'rec_note_cloud_device_owner';
  const MAX_UPLOAD = 45000000;
  const $c = id => document.getElementById(id);
  if (typeof state === 'undefined' || typeof persist !== 'function' || !$c('songTabs')) return;
  let session = null, owner = null, base = null, syncing = false;
  let suppress = false, dirty = false, syncTimer = 0, lastError = '', syncConflicts = 0;
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const clone = x => JSON.parse(JSON.stringify(x));
  const randomId = () => {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    if (globalThis.crypto?.getRandomValues) {
      const b=new Uint8Array(16);crypto.getRandomValues(b);
      b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
      const hex=Array.from(b,n=>n.toString(16).padStart(2,'0')).join('');
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }
    throw Error('HTTPSなど安全な接続で開いてください');
  };
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const uid = () => owner?.id;
  const cloudPayload = () => ({
    version: 5,
    records: clone(Array.isArray(state.records) ? state.records : []),
    sourceMessages: clone(state.sourceMessages || {}),
    songs: clone(SONGS),
    drafts: clone(state.drafts || {}),
    lyricTimings: clone(Array.isArray(state.lyricTimings) ? state.lyricTimings : []),
    cloudMedia: clone(state.cloudMedia || [])
  });
  const normalized = d => ({
    version: 5,
    records: Array.isArray(d?.records) ? d.records.filter(x=>x && typeof x.id==='string' && typeof x.song==='string') : [],
    sourceMessages: d?.sourceMessages && typeof d.sourceMessages==='object' ? d.sourceMessages : {},
    songs: Array.isArray(d?.songs) ? d.songs.filter(x=>typeof x==='string' && x.trim()) : [],
    drafts: d?.drafts && typeof d.drafts==='object' ? d.drafts : {},
    lyricTimings: Array.isArray(d?.lyricTimings) ? d.lyricTimings.filter(x=>x && typeof x.id==='string' && typeof x.workId==='string' && typeof x.textVersionId==='string' && Number.isInteger(x.lineIndex)) : [],
    cloudMedia: Array.isArray(d?.cloudMedia) ? d.cloudMedia.filter(x=>x && typeof x.id==='string' && typeof x.path==='string') : []
  });

  // Three-way merge: unchanged rows follow the changed side, independent edits
  // are combined, and conflicting edits are retained as two entries rather than lost.
  function mergeItems(baseline,local,remote,{copyConflicts=false}={}) {
    const key = x => x.id;
    const b = new Map((baseline||[]).map(x=>[key(x),x]));
    const l = new Map((local||[]).map(x=>[key(x),x]));
    const r = new Map((remote||[]).map(x=>[key(x),x]));
    const output=[], conflicts=[];
    for (const id of new Set([...b.keys(),...l.keys(),...r.keys()])) {
      const old=b.get(id), a=l.get(id), z=r.get(id);
      const aChange=!same(a,old), zChange=!same(z,old);
      if (!aChange) { if (z) output.push(z); continue; }
      if (!zChange || same(a,z)) { if (a) output.push(a); continue; }
      if (!a) { if (z) output.push(z); conflicts.push(id+'（端末で削除）'); continue; }
      if (!z) { output.push(a); conflicts.push(id+'（クラウドで削除）'); continue; }
      if(copyConflicts) {
        output.push(z);
        const copy={...a,id:id+'-local-'+randomId().slice(0,8),syncConflictOf:id};
        output.push(copy);
      } else { output.push(z,a); }
      conflicts.push(id);
    }
    return {output,conflicts};
  }
  function mergeObject(baseObj,localObj,remoteObj) {
    const b=baseObj||{},l=localObj||{},r=remoteObj||{};
    const out={},conflicts=[];
    for(const k of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){
      const bc=b[k],lc=l[k],rc=r[k],a=!same(lc,bc),z=!same(rc,bc);
      if(!a){if(rc!==undefined)out[k]=rc;continue;}
      if(!z||same(lc,rc)){if(lc!==undefined)out[k]=lc;continue;}
      if(rc!==undefined)out[k]=rc;
      if(lc!==undefined)out[k+'__local_'+randomId().slice(0,6)]=lc;
      conflicts.push(k);
    }
    return {out,conflicts};
  }
  function mergeDocuments(baseDoc,localDoc,remoteDoc) {
    const b=normalized(baseDoc), l=normalized(localDoc), r=normalized(remoteDoc);
    const m=mergeItems(b.records,l.records,r.records,{copyConflicts:true});
    const msgs=mergeObject(b.sourceMessages,l.sourceMessages,r.sourceMessages);
    const drafts=mergeObject(b.drafts,l.drafts,r.drafts);
    const media=mergeItems(b.cloudMedia,l.cloudMedia,r.cloudMedia,{copyConflicts:true});
    const timings=mergeItems(b.lyricTimings,l.lyricTimings,r.lyricTimings,{copyConflicts:true});
    return {
      doc:{version:5,records:m.output,sourceMessages:msgs.out,drafts:drafts.out,
        cloudMedia:media.output,lyricTimings:timings.output,
        songs:[...new Set([...b.songs,...l.songs,...r.songs,...m.output.map(x=>x.song)])]},
      conflicts:[...m.conflicts,...msgs.conflicts,...drafts.conflicts,...media.conflicts,...timings.conflicts]
    };
  }

  function showStatus(message,level='neutral') {
    const el=$c('recCloudStatus');
    if(el){el.textContent=message;el.dataset.level=level;}
    const small=$c('cloudBadge');
    if(small){small.textContent=level==='good'?'クラウド同期済':level==='bad'?'要同期':level==='busy'?'同期中':session?'クラウド接続中':'未接続'; small.dataset.level=level;}
  }
  function showAuth(){
    const logged=Boolean(session&&owner);
    $c('recCloudLogin').hidden=logged;
    $c('recCloudConnected').hidden=!logged;
    $c('recCloudUser').textContent=logged?(owner.email||'ログイン中'):'';
    $c('recCloudPanel').classList.toggle('connected',logged);
    renderMedia();
    window.dispatchEvent(new CustomEvent('recnote:cloud-auth-change',{detail:{signedIn:logged}}));
  }
  function loadBase() {
    if(!uid())return null;
    try{
      const v=JSON.parse(localStorage.getItem(BASE_PREFIX+uid())||'null');
      return v && v.owner===uid() && Number.isInteger(v.revision) ? v : null;
    }catch(e){return null;}
  }
  function saveBase(revision,payload){
    base={owner:uid(),revision,payload:clone(normalized(payload)),savedAt:Date.now()};
    try{localStorage.setItem(BASE_PREFIX+uid(),JSON.stringify(base));localStorage.setItem(OWNER_KEY,uid());}catch(e){}
  }
  function makeError(data,status){
    const msg=data?.msg||data?.message||data?.error_description||data?.error||`HTTP ${status}`;
    return new Error(String(msg).slice(0,260));
  }
  async function parseResponse(res) {
    const text=await res.text();let parsed=null;
    try{parsed=text?JSON.parse(text):null;}catch(e){parsed={message:text.slice(0,140)};}
    if(!res.ok)throw makeError(parsed,res.status);
    return parsed;
  }
  async function requestToken(refresh=false,credentials=null){
    const url=API+'/auth/v1/token?grant_type='+(refresh?'refresh_token':'password');
    const body=refresh?{refresh_token:session?.refresh_token}:credentials;
    const res=await fetch(url,{method:'POST',headers:{'apikey':KEY,'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    const data=await parseResponse(res);
    if(!data?.access_token||!data?.refresh_token)throw Error('ログイン情報が取得できませんでした');
    session={access_token:data.access_token,refresh_token:data.refresh_token,expiresAt:Date.now()+((data.expires_in||3600)*1000)};
    try{localStorage.setItem(SESSION_KEY,JSON.stringify(session));}catch(e){}
    return session;
  }
  async function api(path,opts={}) {
    if(!session)throw Error('クラウドにログインしてください');
    if(Date.now()>=session.expiresAt-90000)await requestToken(true);
    const res=await fetch(API+path,{...opts,headers:{'apikey':KEY,'authorization':'Bearer '+session.access_token,...opts.headers}});
    return parseResponse(res);
  }
  async function whoAmI(){const data=await api('/auth/v1/user');if(!data?.id)throw Error('本人確認に失敗しました');return {id:data.id,email:data.email||''};}

  // Read-only bridge to the existing private lyric archive (the source remains unchanged).
  async function readLyricWork(requestedSong) {
    if (!session || !owner) throw Error('歌詞の閲覧にはクラウドへのログインが必要です');
    const title=String(requestedSong||'').trim();
    if(!title)throw Error('曲名が未設定です');
    const works=await api('/rest/v1/lyric_master_works?select=id,title,verification_status&sky=eq.choir&form=eq.song&title=eq.'+encodeURIComponent(title)+'&limit=3');
    if(!Array.isArray(works)||!works.length)return null;
    if(works.length!==1)throw Error('同名作品が複数あります。歌詞原本を確認してください');
    const work=works[0];
    const versions=await api('/rest/v1/lyric_master_text_versions?select=id,version_no,literal_text,text_status,created_at&work_id=eq.'+encodeURIComponent(work.id)+'&order=version_no.desc&limit=20');
    return {work,versions:Array.isArray(versions)?versions:[]};
  }
  window.RECNOTE_LYRIC_BRIDGE=Object.freeze({
    read:readLyricWork,
    isSignedIn:()=>Boolean(session&&owner)
  });

  async function getRemote(){
    const query=`?select=owner_id,payload,revision,updated_at&owner_id=eq.${encodeURIComponent(uid())}&limit=1`;
    const rows=await api('/rest/v1/rec_note_cloud_documents'+query);
    return rows?.[0]||null;
  }
  function applySnapshot(doc){
    const x=normalized(doc);suppress=true;
    const oldMode=activeMode,oldSong=song;
    state.records=clone(x.records); state.sourceMessages=clone(x.sourceMessages);
    state.drafts=clone(x.drafts);state.cloudMedia=clone(x.cloudMedia);
    state.lyricTimings=clone(x.lyricTimings);
    SONGS=[...new Set([...x.songs,...x.records.map(r=>r.song)])];
    if(!SONGS.length)SONGS=['これからも','これから','あなたと'];
    if(!SONGS.includes(song))song=SONGS[0];
    state.activeMode=oldMode;
    // Retain playback and unsaved UI selection on the same song when possible.
    if(oldSong!==song && typeof setSong==='function') {song=oldSong;setSong(SONGS[0]);}
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify({...state,songs:SONGS}));}catch(e){showStatus('端末への保存に失敗しました。JSONバックアップをご利用ください。','bad');}
    if(selectedId && !state.records.some(r=>r.id===selectedId))selectedId=null;
    if(typeof updateAll==='function')updateAll();
    if(typeof renderProject==='function')renderProject();
    if(typeof renderMedia==='function')renderMedia();
    suppress=false;
    window.dispatchEvent(new CustomEvent('recnote:cloud-synced'));
  }
  // Called by legacy code after every edit; never clears offline data.
  const oldPersist=persist;
  persist=function(){
    const v=oldPersist();
    if(!suppress){dirty=true;if(session&&owner){showStatus('端末に保存済み・クラウド同期待ち','busy');scheduleSync();}}
    return v;
  };
  function scheduleSync(ms=1700) {
    clearTimeout(syncTimer);
    if(!session||!owner)return;
    syncTimer=setTimeout(()=>syncNow().catch(err=>{lastError=err.message;showStatus('未同期：'+err.message,'bad');}),ms);
  }
  function finishSync(serverRevision,serverDocument,localBeforeWrite){
    const latest=cloudPayload();
    const after=mergeDocuments(localBeforeWrite,latest,serverDocument).doc;
    saveBase(serverRevision,serverDocument);
    applySnapshot(after);
    dirty=!same(normalized(after),normalized(serverDocument));
    if(dirty)scheduleSync(700);
  }
  async function syncNow({forcePull=false}={}){
    if(syncing||!session||!owner)return;
    syncing=true;
    showStatus('クラウドを確認中…','busy');
    const syncStartDoc=cloudPayload();
    try {
      for(let attempt=0;attempt<4;attempt++){
        const remote=await getRemote();
        const freshLocal=cloudPayload();
        const baseline=base?.payload||null;
        const merged=mergeDocuments(baseline,freshLocal,remote?.payload||{});
        const newDoc=normalized(merged.doc);
        syncConflicts=merged.conflicts.length;
        if(remote && same(normalized(remote.payload),newDoc)){
          finishSync(remote.revision,newDoc,freshLocal);break;
        }
        if(!remote){
          try{
            const created=await api('/rest/v1/rec_note_cloud_documents',{
              method:'POST',headers:{'content-type':'application/json','Prefer':'return=representation'},
              body:JSON.stringify({owner_id:uid(),payload:newDoc,revision:1})});
            if(created?.[0]){finishSync(1,newDoc,freshLocal);break;}
          }catch(e){if(attempt===3)throw e;await pause(100*(attempt+1));continue;}
        }else{
          const result=await api(`/rest/v1/rec_note_cloud_documents?owner_id=eq.${encodeURIComponent(uid())}&revision=eq.${remote.revision}&select=revision`,{
            method:'PATCH',headers:{'content-type':'application/json','Prefer':'return=representation'},
            body:JSON.stringify({payload:newDoc,revision:remote.revision+1,updated_at:new Date().toISOString()})});
          if(result?.length){finishSync(remote.revision+1,newDoc,freshLocal);break;}
        }
        if(attempt===3)throw Error('別端末との更新が重なりました。もう一度同期してください。');
        await pause(120*(attempt+1));
      }
      lastError='';
      showStatus(syncConflicts?'同期済み（競合'+syncConflicts+'件を両方保存）':'Mac・iPhoneで同期済み','good');
      $c('recCloudTime').textContent='最終同期 '+new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    }catch(e){
      dirty=true;lastError=e.message;
      showStatus('クラウド未同期（端末に保存済み）：'+e.message,'bad');
      throw e;
    }finally{
      syncing=false;
      if(!same(syncStartDoc,cloudPayload()) && dirty)scheduleSync(2800);
      renderMedia();
    }
  }

  const panel=document.createElement('section');
  panel.id='recCloudPanel';panel.className='recCloudPanel';
  panel.innerHTML=`<div class="recCloudHead"><div><strong>クラウド同期</strong><span class="recCloudSub">同じアカウントでMac・iPhoneからアクセス</span></div><span class="recCloudBadge" id="cloudBadge">未接続</span></div>
    <div class="recCloudLogin" id="recCloudLogin"><label>ログイン用メール<input id="recCloudEmail" type="email" autocomplete="username" inputmode="email" placeholder="メールアドレス" /></label><label>パスワード<input id="recCloudPassword" type="password" autocomplete="current-password" placeholder="パスワード" /></label><button id="recCloudSignIn" class="primary" type="button">ログインして同期</button><p class="recCloudSub">既存の「余白」と同じSupabaseアカウントでログインできます。パスワードは保存しません。</p></div>
    <div class="recCloudConnected" id="recCloudConnected" hidden><div class="recCloudLine"><span id="recCloudUser"></span><button id="recCloudSync" type="button" class="primary">今すぐ同期</button><button id="recCloudSignOut" type="button">ログアウト</button></div><div class="recCloudLine"><label class="recCloudUpload">音源Aをアップロード<input id="recCloudUploadA" type="file" accept="audio/*,.wav,.mp3,.m4a,.aiff,.flac" hidden></label><label class="recCloudUpload">音源Bをアップロード<input id="recCloudUploadB" type="file" accept="audio/*,.wav,.mp3,.m4a,.aiff,.flac" hidden></label><label class="recCloudUpload">動画をアップロード<input id="recCloudUploadVideo" type="file" accept="video/*,.mp4,.mov,.webm" hidden></label></div><div id="recCloudMedia" class="recCloudMedia"></div></div>
    <div id="recCloudStatus" class="recCloudStatus" role="status">未接続：端末内保存のみ</div><div id="recCloudTime" class="recCloudSub"></div>
    <p class="recCloudSub">修正記録は自動同期します。音源・動画は「アップロード」を選んだファイルだけ非公開で保存します（1ファイル45MBまで）。同期中もJSONバックアップを残してください。</p>`;
  const modes=document.querySelector('.modeDock');
  if(modes)modes.insertAdjacentElement('afterend',panel);
  else $c('songTabs').insertAdjacentElement('afterend',panel);
  $c('recCloudLogin').hidden=false;$c('recCloudConnected').hidden=true;

  async function signIn(){
    const email=$c('recCloudEmail').value.trim(),pass=$c('recCloudPassword').value;
    if(!email||!pass){showStatus('メールとパスワードを入力してください','bad');return;}
    $c('recCloudSignIn').disabled=true;showStatus('本人確認中…','busy');
    try{
      await requestToken(false,{email,password:pass});
      $c('recCloudPassword').value='';
      owner=await whoAmI();
      const lastOwner=localStorage.getItem(OWNER_KEY);
      if(lastOwner&&lastOwner!==uid() && cloudPayload().records.length){
        showStatus('この端末には別アカウントの記録があります。誤送信防止のため同期を停止しました。','bad');
        session=null;owner=null;localStorage.removeItem(SESSION_KEY);showAuth();return;
      }
      base=loadBase();showAuth();await syncNow();
    }catch(err){showStatus('接続できません：'+err.message,'bad');}
    finally{$c('recCloudPassword').value='';$c('recCloudSignIn').disabled=false;}
  }
  function signOut(){
    session=null;owner=null;base=null;dirty=false;
    try{localStorage.removeItem(SESSION_KEY);}catch(e){}
    clearTimeout(syncTimer);showAuth();showStatus('ログアウトしました。端末内の記録は保持しています。','neutral');
  }
  $c('recCloudSignIn').addEventListener('click',signIn);
  $c('recCloudPassword').addEventListener('keydown',e=>{if(e.key==='Enter')signIn();});
  $c('recCloudSync').addEventListener('click',()=>syncNow().catch(()=>{}));
  $c('recCloudSignOut').addEventListener('click',signOut);
  // An explicit file selection is required; no silent upload of personal files.
  async function upload(kind,file) {
    if(!owner||!session){showStatus('先にログインしてください','bad');return;}
    if(!file||!file.size)return;
    if(file.size>MAX_UPLOAD){showStatus('ファイルが45MBを超えています。MP3/M4Aなどで小さくして再度選択してください。','bad');return;}
    const targetSong=song,targetMode=activeMode;
    const ext=(file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,7)||'bin';
    const path=uid()+'/'+randomId()+'.'+ext;
    showStatus(file.name+' を非公開ストレージにアップロード中…','busy');
    try{
      await api('/storage/v1/object/'+BUCKET+'/'+path,{
        method:'POST',headers:{'content-type':file.type||'application/octet-stream','x-upsert':'false'},body:file
      });
      state.cloudMedia=Array.isArray(state.cloudMedia)?state.cloudMedia:[];
      const media={id:randomId(),song:targetSong,kind:kind==='VIDEO'?('VIDEO_'+targetMode):kind,path,name:file.name,size:file.size,mime:file.type||'',createdAt:new Date().toISOString()};
      state.cloudMedia.push(media);
      persist(); await syncNow();renderMedia();
      showStatus(file.name+' を非公開で保存しました','good');
    }catch(e){showStatus('アップロード／同期に失敗：'+e.message,'bad');}
  }
  for(const [id,kind] of [['recCloudUploadA','A'],['recCloudUploadB','B'],['recCloudUploadVideo','VIDEO']]){
    $c(id).addEventListener('change',e=>{const f=e.target.files?.[0];e.target.value='';if(f)upload(kind,f);});
  }
  async function retrieve(m){
    showStatus('音源を読み込み中：'+m.name,'busy');
    try {
      const d=await api('/storage/v1/object/sign/'+BUCKET+'/'+m.path,{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({expiresIn:600})});
      const signed=d?.signedURL||d?.signedUrl;
      if(!signed)throw Error('一時URLが取得できませんでした');
      const url=signed.startsWith('http')?signed:API+(signed.startsWith('/storage/v1')?'':'/storage/v1')+(signed.startsWith('/')?'':'/')+signed;
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok)throw Error('取得できません：HTTP '+res.status);
      const blob=await res.blob();
      const file=new File([blob],m.name,{type:m.mime||blob.type});
      if(m.kind==='A')await loadAudio(m.song,file,true);
      else if(m.kind==='B'){
        if(!window.RECNOTE_MEDIA?.loadCompare)throw Error('A/B比較機能の読み込みに失敗しました');
        await window.RECNOTE_MEDIA.loadCompare(m.song,file);
      }else if(m.kind.startsWith('VIDEO_')){
        if(!window.RECNOTE_MEDIA?.loadVideo)throw Error('動画機能の読み込みに失敗しました');
        await window.RECNOTE_MEDIA.loadVideo(file,m.song+'\u001f'+m.kind.slice(6));
      }
      showStatus(m.name+' を読み込みました。必要に応じて再生してください。','good');
    }catch(e){showStatus('ファイルの読込失敗：'+e.message,'bad');}
  }
  function renderMedia(){
    const root=$c('recCloudMedia');if(!root)return;
    root.replaceChildren();
    if(!owner)return;
    const entries=(state.cloudMedia||[]).filter(m=>m.song===song).slice().reverse();
    if(!entries.length){const p=document.createElement('span');p.className='recCloudSub';p.textContent='この曲のクラウド音源は未登録です。';root.append(p);return;}
    for(const m of entries){
      const row=document.createElement('div');row.className='recCloudMediaRow';
      const name=document.createElement('span');name.textContent=`${m.kind.replace('_',' / ')}｜${m.name}`;name.title=m.name;
      const btn=document.createElement('button');btn.type='button';btn.textContent='読み込む';
      btn.addEventListener('click',()=>retrieve(m));row.append(name,btn);root.append(row);
    }
  }
  const oldUpdate=updateAll;
  updateAll=function(){oldUpdate();renderMedia()};
  const oldSetSong=setSong;
  setSong=function(s){oldSetSong(s);renderMedia()};
  const oldSetMode=setMode;
  setMode=function(m){oldSetMode(m);renderMedia()};
  async function restore(){
    try{
      const saved=localStorage.getItem(SESSION_KEY);if(!saved)return;
      session=JSON.parse(saved);
      if(!session?.refresh_token){session=null;return;}
      if(Date.now()>=(session.expiresAt||0)-90000)await requestToken(true);
      owner=await whoAmI();base=loadBase();showAuth();await syncNow({forcePull:true});
    }catch(e){session=null;owner=null;showAuth();showStatus('再ログインが必要です。端末内の記録は残っています。','bad');}
  }
  window.addEventListener('online',()=>{if(session&&owner)scheduleSync(500)});
  window.addEventListener('visibilitychange',()=>{if(!document.hidden&&session&&owner)scheduleSync(400)});
  setInterval(()=>{if(!document.hidden&&session&&owner&&!syncing)syncNow().catch(()=>{})},45000);
  showAuth();showStatus('未接続：この端末には保存されます。クラウドを使うにはログインしてください。');
  restore();
  // Pure helpers are exposed only for local, non-mutating smoke tests.
  window.RECNOTE_CLOUD_TEST={mergeDocuments,normalized};
})();