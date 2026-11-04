/* 音楽の図書館：端末内保存 + 本人のクラウド同期。
   STATUS 'later', 'done', 'none' は手動の記録。再生を検知したものではない。 */
window.MUSIC_PROGRESS=(()=>{
 'use strict';
 const API='https://nroyxwozdxwnrqyierjx.supabase.co';
 const PUBLIC_KEY='sb_publishable_dxiidJt1gVcFwkVR2fg1HA_6gHAZNDz';
 const RECORD_ID='note:music-listening-v1';
 const allowed=new Set((window.MUSIC_LIBRARY_CATALOG?.works||[]).map(w=>w.id));
 const observers=new Set();
 let owner='',client=null,remote=null,phase='checking',error='',entries={},writes=Promise.resolve(),generation=0,lastRefresh=0;
 const key=uid=>'knowledge-music-listening-v1:'+ (uid||'guest');
 const validState=new Set(['later','done','none']);
 const timestamp=t=>{const d=Date.parse(t||'');return Number.isFinite(d)?d:0};
 function sanitize(value){
  const safe={};
  if(!value||typeof value!=='object'||Array.isArray(value))return safe;
  for(const [id,item] of Object.entries(value)){
   if(!allowed.has(id)||!item||!validState.has(item.status))continue;
   if(!timestamp(item.at))continue;
   safe[id]={status:item.status,at:new Date(timestamp(item.at)).toISOString()};
  }
  return safe;
 }
 function merge(left,right){
  const a=sanitize(left),b=sanitize(right),combined={...a};
  for(const [id,v] of Object.entries(b)){
   // Same timestamp: preserve the remote/left version to avoid oscillation.
   if(!combined[id]||timestamp(v.at)>timestamp(combined[id].at))combined[id]=v;
  }
  return combined;
 }
 function diskRead(uid){try{return sanitize(JSON.parse(localStorage.getItem(key(uid))||'{}'))}catch{return {}}}
 function diskWrite(){try{localStorage.setItem(key(owner),JSON.stringify(entries));return true}catch{error='端末への保存に失敗しました。空き容量とブラウザ設定をご確認ください。';return false}}
 function emit(){const snap=state();for(const fn of observers){try{fn(snap)}catch(e){/* subscribers cannot break saving */}}}
 function state(){
  const values=Object.values(entries);
  const guestValues=Object.values(diskRead(''));
  const guestAvailable=owner?guestValues.filter(x=>x.status!=='none').length:0;
  return {phase,error,owner:!!owner,guestAvailable,entries:JSON.parse(JSON.stringify(entries)),later:values.filter(x=>x.status==='later').length,done:values.filter(x=>x.status==='done').length};
 }
 function subscribe(fn){if(typeof fn==='function'){observers.add(fn);fn(state());return ()=>observers.delete(fn)}return ()=>{}}
 function set(id,status){
  if(!allowed.has(id)||!validState.has(status))return false;
  if(phase==='checking')return false;
  // Monotonically increase the local timestamp when edits occur within one millisecond.
  const previous=timestamp(entries[id]?.at);
  const at=new Date(Math.max(Date.now(),previous+1)).toISOString();
  entries[id]={status,at};
  const stored=diskWrite();
  if(owner&&client){phase='syncing';error='';queueSync()}
  emit();
  return stored;
 }
 async function getRemote(uid){
  const {data,error:e}=await client.from('knowledge_records')
   .select('id,user_id,kind,payload,created_at,updated_at')
   .eq('user_id',uid).eq('id',RECORD_ID).maybeSingle();
  if(e)throw e;
  return data||null;
 }
 async function syncOnce(uid,expectedGeneration){
  if(!uid||owner!==uid||generation!==expectedGeneration)return;
  if(!Object.keys(entries).length){phase='ready';error='';emit();return}
  for(let tries=0;tries<3;tries++){
   if(owner!==uid||generation!==expectedGeneration)return;
   const prior=remote;
   const updatedAt=new Date(Math.max(Date.now(),timestamp(prior?.updated_at)+1)).toISOString();
   const snapshot=sanitize(entries);
   const payload={entryType:'music-listening-progress',version:1,entries:snapshot};
   let result;
   if(prior){
    result=await client.from('knowledge_records').update({payload,updated_at:updatedAt})
      .eq('user_id',uid).eq('id',RECORD_ID).eq('updated_at',prior.updated_at).select('id');
   }else{
    result=await client.from('knowledge_records').insert({id:RECORD_ID,kind:'note',user_id:uid,payload,created_at:updatedAt,updated_at:updatedAt});
   }
   if(owner!==uid||generation!==expectedGeneration)return;
   const ok=!result.error&&(!prior||Array.isArray(result.data)&&result.data.some(x=>x.id===RECORD_ID));
   if(ok){
    remote={id:RECORD_ID,user_id:uid,kind:'note',created_at:prior?.created_at||updatedAt,updated_at:updatedAt,payload};
    phase='ready';error='';emit();
    return;
   }
   if(result.error&&result.error.code!=='23505')throw result.error;
   // Another device changed the record first; merge each work's latest explicit choice.
   remote=await getRemote(uid);
   if(owner!==uid||generation!==expectedGeneration)return;
   entries=merge(remote?.payload?.entries,entries);
   diskWrite();emit();
  }
  throw new Error('別端末の更新と競合しました。端末には保存済みです。再同期をお試しください。');
 }
 function queueSync(){
  if(!owner||!client)return;
  const uid=owner,g=generation;
  writes=writes.catch(()=>{}).then(()=>syncOnce(uid,g)).catch(e=>{
   if(owner!==uid||generation!==g)return;
   phase='error';error='クラウドへの反映に失敗しました。端末の記録は残っています。'+(e?.message?' '+e.message:'');emit();
  });
 }
 function importGuest(){
  if(!owner||phase==='checking')return false;
  const guest=diskRead('');
  if(!Object.values(guest).some(x=>x.status!=='none'))return false;
  entries=merge(entries,guest);
  const stored=diskWrite();
  if(!stored){emit();return false}
  // Explicit import only. Remove the unowned copy after the per-user copy is safe.
  try{localStorage.removeItem(key(''))}catch{}
  phase='syncing';error='';emit();queueSync();
  return true;
 }
 async function retry(){
  if(!owner||!client)return false;
  const uid=owner,g=generation;
  phase='syncing';error='';emit();
  try{
   remote=await getRemote(uid);
   if(owner!==uid||generation!==g)return false;
   entries=merge(remote?.payload?.entries,entries);
   diskWrite();
   queueSync();emit();return true;
  }catch(e){if(owner===uid&&generation===g){phase='error';error='再接続できませんでした。'+(e?.message||'');emit()}return false}
 }
 async function refresh(){
  if(!owner||!client||phase==='checking')return false;
  if(Date.now()-lastRefresh<20000)return false;
  lastRefresh=Date.now();
  const uid=owner,g=generation;
  try{
   // Do not race a foreground refresh with writes already in progress.
   await writes.catch(()=>{});
   if(owner!==uid||generation!==g)return false;
   const latest=await getRemote(uid);
   if(owner!==uid||generation!==g)return false;
   remote=latest;
   entries=merge(latest?.payload?.entries,entries);
   diskWrite();
   phase='ready';error='';emit();
   if(Object.keys(entries).length&&JSON.stringify(sanitize(latest?.payload?.entries))!==JSON.stringify(entries))queueSync();
   return true;
  }catch(e){
   if(owner===uid&&generation===g){phase='error';error='再読込に失敗しました。端末内の記録を保持しています。';emit()}
   return false;
  }
 }
 function swapOwner(uid){
  generation++;
  lastRefresh=0;
  owner=uid||'';remote=null;entries=diskRead(owner);
  phase=owner?'checking':'guest';error='';emit();
 }
 async function start(){
  const session=generation;
  try{
   const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm');
   if(session!==generation)return;
   client=mod.createClient(API,PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
   const response=await client.auth.getUser();
   if(response.error)throw response.error;
   const uid=response.data?.user?.id||'';
   if(!uid){swapOwner('');return}
   swapOwner(uid);
   const g=generation;
   try{
    remote=await getRemote(uid);
    if(owner!==uid||generation!==g)return;
    const local=diskRead(uid);
    entries=merge(remote?.payload?.entries,local);
    diskWrite();phase='ready';error='';emit();
    // If this device added information while offline, bring the server up to date.
    if(JSON.stringify(sanitize(remote?.payload?.entries))!==JSON.stringify(entries)&&Object.keys(entries).length)queueSync();
   }catch(e){if(owner===uid&&generation===g){phase='error';error='ログインは確認できましたがクラウド記録を取得できません。端末の記録を保持しています。';emit()}}
   client.auth.onAuthStateChange((event,sessionInfo)=>{
    const next=sessionInfo?.user?.id||'';
    if(event==='SIGNED_OUT'||event==='SIGNED_IN'&&next!==owner){
     // Authentication listeners must not call auth methods synchronously.
     queueMicrotask(()=>{if(next!==owner){swapOwner(next);if(next)retry()}});
    }
   });
  }catch(e){
   if(session!==generation)return;
   if(!owner){phase='guest';error='ログイン状態を確認できないため、この端末だけに保存します。';emit()}
  }
 }
 // Keep controls inactive while checking login. Otherwise an early tap could be
 // written to the guest namespace and appear to disappear when the owner loads.
 entries=diskRead('');
 phase='checking';emit();
 start();
 // iPhoneでApple Musicから戻ったときに、別端末の変更を取り込みます。
 if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
 window.addEventListener?.('pageshow',event=>{if(event.persisted)refresh()});
 return {state,subscribe,set,retry,importGuest,refresh,start};
})();
