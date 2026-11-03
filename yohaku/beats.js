(()=>{'use strict';
const $=id=>document.getElementById(id);
const ctx=()=>window.YOHAKU_BEAT_CONTEXT;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bucket='yohaku-beats';
let beats=[], signed=new Map(), current=null, listFilter='', inFlight=false;
const getClient=()=>ctx()?.getClient?.();
const getUser=()=>ctx()?.getUser?.();
const notify=t=>ctx()?.toast?.(t);
function relevant(){const id=ctx()?.getSelected?.();return beats.filter(x=>x.lyric_note_id===id)}
function updateLinked(){const wrap=$('linkedBeatBox');if(!wrap)return;const items=relevant();wrap.classList.toggle('hide',!getUser());$('linkedBeatText').textContent=items.length?items.map(x=>x.title).join('、'):'この歌詞に合うビートを登録できます';}
async function fetchBeats(){
 const c=getClient(),u=getUser();if(!c||!u)return;
 const {data,error}=await c.from('yohaku_beats').select('*').eq('user_id',u.id).order('updated_at',{ascending:false});
 if(error)throw error;beats=data||[];
 signed.clear();
 const tracks=beats.filter(x=>x.audio_path);
 await Promise.all(tracks.map(async beat=>{
  const {data,error}=await c.storage.from(bucket).createSignedUrl(beat.audio_path,1800);
  if(!error&&data?.signedUrl)signed.set(beat.id,{url:data.signedUrl,expires:Date.now()+1500000});
 }));
 const el=$('beatShelf');if(el)el.textContent='♫ BEATS '+beats.length;
 updateLinked();
}
function onLogout(){beats=[];signed.clear();current=null;const a=$('beatAudio');if(a){a.pause();a.removeAttribute('src');a.load()}$('beatPlayer')?.classList.add('hide');if($('beatShelf'))$('beatShelf').textContent='♫ BEATS';updateLinked();}
async function onLogin(){try{await fetchBeats()}catch(e){notify('ビート一覧を読み込めません: '+e.message)}}
async function playBeat(id){
 const beat=beats.find(x=>x.id===id);if(!beat)return;
 if(!beat.audio_path){if(beat.source_url){window.open(beat.source_url,'_blank','noopener,noreferrer');return}notify('このビートにはMP3もリンクもありません');return}
 const audio=$('beatAudio');
 if(current===id&&!audio.paused){audio.pause();return}
 let signedLink=signed.get(id);
 if(!signedLink||signedLink.expires<Date.now()){
   const {data,error}=await getClient().storage.from(bucket).createSignedUrl(beat.audio_path,1800);
   if(error)throw error;
   signedLink={url:data.signedUrl,expires:Date.now()+1500000};signed.set(id,signedLink);
 }
 if(current!==id||audio.src!==signedLink.url){
   audio.pause();audio.src=signedLink.url;current=id;
 }
 $('beatPlayer').classList.remove('hide');
 $('beatPlayingTitle').textContent=beat.title;
 $('beatPlayingSubtitle').textContent=[beat.creator,beat.bpm?beat.bpm+' BPM':'',beat.musical_key].filter(Boolean).join(' / ')||'MP3 PLAYER';
 audio.loop=$('beatLoop').checked;
 try{await audio.play()}catch(e){notify('自動再生できません。再生バーの▶を押してください')}
}
function openShelf(onlyLinked=false){
 if(!getUser()){notify('ログイン後にご利用ください');return}
 const panel=document.createElement('div');panel.className='beat-panel';
 panel.innerHTML='<div class="beat-hint">気に入ったビートのURLを保存できます。MP3は非公開で保存し、Mac・iPad・iPhoneで再生できます。YouTubeやSoundCloudのリンクは元サイトで開きます。</div><div class="beat-controls"><input id="beatSearch" type="search" placeholder="ビート・制作者・メモを検索" aria-label="ビート検索"><button id="beatNew" class="primary" type="button">＋ ビート追加</button></div><div id="beatRows" class="beat-rows"></div><div style="display:flex;justify-content:flex-end"><button id="beatExport" class="secondary" type="button">一覧JSON保存</button></div>';
 ctx().openModal(onlyLinked?'このリリックのビート':'BEAT LIBRARY',panel,[{text:'閉じる',click:ctx().closeModal}]);
 listFilter='';const search=panel.querySelector('#beatSearch');
 search.oninput=()=>{listFilter=search.value;renderRows(onlyLinked)};
 panel.querySelector('#beatNew').onclick=()=>showForm(null);
 panel.querySelector('#beatExport').onclick=()=>{
   const payload={app:'余白 BEAT LIBRARY',version:1,exportedAt:new Date().toISOString(),beats:beats.map(b=>({id:b.id,title:b.title,creator:b.creator,source_url:b.source_url,bpm:b.bpm,musical_key:b.musical_key,note_text:b.note_text,lyric_note_id:b.lyric_note_id,favorite:b.favorite,audio_file:!!b.audio_path}))};
   const a=document.createElement('a'),blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
   a.href=url;a.download='yohaku-beats-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   notify('ビート一覧を保存しました（MP3本体は含まれません）');
 };
 renderRows(onlyLinked);
}
function renderRows(onlyLinked){
 const root=$('beatRows');if(!root)return;root.innerHTML='';
 const q=listFilter.trim().toLowerCase(),noteId=ctx().getSelected();
 const rows=beats.filter(b=>(!onlyLinked||b.lyric_note_id===noteId)&&(!q||[b.title,b.creator,b.note_text,b.musical_key].join(' ').toLowerCase().includes(q))).sort((a,b)=>Number(b.favorite)-Number(a.favorite)||new Date(b.updated_at)-new Date(a.updated_at));
 if(!rows.length){root.innerHTML='<div class="beat-empty">該当するビートはありません。上の「＋ ビート追加」から登録できます。</div>';return}
 rows.forEach(beat=>{
  const el=document.createElement('div');el.className='beat-row';
  const info=document.createElement('div');info.className='beat-row-info';
  const title=document.createElement('strong');title.textContent=(beat.favorite?'★ ':'')+beat.title;info.append(title);
  const sub=document.createElement('small');sub.textContent=[beat.creator,beat.bpm?beat.bpm+' BPM':'',beat.musical_key,beat.audio_path?'MP3あり':'',beat.lyric_note_id?'歌詞と紐づけ済み':''].filter(Boolean).join(' · ')||'URL・MP3を登録できます';info.append(sub);el.append(info);
  const btns=document.createElement('div');btns.className='beat-row-btns';
  const action=(label,func,cls='')=>{let b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.onclick=()=>Promise.resolve(func()).catch(e=>notify(e.message));btns.append(b)};
  if(beat.audio_path)action('▶ 再生',()=>playBeat(beat.id),'beat-play-btn');
  if(beat.source_url)action('↗ 開く',()=>window.open(beat.source_url,'_blank','noopener,noreferrer'));
  action('編集',()=>showForm(beat));
  action(beat.favorite?'★':'☆',async()=>{const next=!beat.favorite;const {error}=await getClient().from('yohaku_beats').update({favorite:next,updated_at:new Date().toISOString()}).eq('id',beat.id).eq('user_id',getUser().id);if(error)throw error;beat.favorite=next;renderRows(onlyLinked)});
  el.append(btns);root.append(el);
 });
}
function showForm(beat){
 const isEdit=!!beat;
 const shell=document.createElement('form');shell.className='beat-form';shell.noValidate=true;
 shell.innerHTML='<div class="beat-grid"><label style="grid-column:1/-1">ビート名（必須）<input id="beatTitle" maxlength="160" required placeholder="気に入ったビート"></label><label>制作者・チャンネル<input id="beatCreator" maxlength="160"></label><label>BPM（任意）<input id="beatBpm" type="number" min="30" max="300" placeholder="例：92"></label></div><label>ビートのURL（YouTube / SoundCloud 等）<input id="beatUrl" type="url" placeholder="https://..." autocomplete="url"></label><div class="beat-grid"><label>キー（任意）<input id="beatKey" maxlength="32" placeholder="例：Am"></label><label>関連するリリック<select id="beatLyric"></select></label></div><label>メモ<textarea id="beatMemo" maxlength="4000" placeholder="雰囲気、作りたい曲、ライセンス条件など"></textarea></label><label>MP3（任意・20MBまで）<input id="beatFile" type="file" accept=".mp3,audio/mpeg"></label><p class="beat-file-hint" id="beatFileHint">MP3は非公開のクラウドストレージに保存します。購入・利用許諾等がある音源のみアップロードしてください。</p><label style="display:flex;flex-direction:row;align-items:center;gap:7px"><input id="beatRights" type="checkbox">アップロードするMP3の保存・利用が許可されていることを確認しました</label><label style="display:flex;flex-direction:row;align-items:center;gap:7px"><input id="beatFav" type="checkbox">お気に入り</label><div class="beat-form-actions"><button type="button" class="secondary" id="beatCancel">一覧へ</button><button type="submit" class="primary" id="beatSave">保存</button></div><div id="beatFormStatus" role="status" style="font-size:11px;color:#797f73"></div>';
 const v=id=>shell.querySelector('#'+id);
 v('beatTitle').value=beat?.title||'';v('beatCreator').value=beat?.creator||'';v('beatUrl').value=beat?.source_url||'';
 v('beatBpm').value=beat?.bpm||'';v('beatKey').value=beat?.musical_key||'';v('beatMemo').value=beat?.note_text||'';v('beatFav').checked=!!beat?.favorite;
 if(beat?.audio_path)v('beatFileHint').textContent='登録済みMP3あり。新しいMP3を選ぶと差し替えます（20MBまで）。';
 const sel=v('beatLyric'),empty=document.createElement('option');empty.value='';empty.textContent='関連なし';sel.append(empty);
 ctx().getNotes().forEach(n=>{const opt=document.createElement('option');opt.value=n.id;opt.textContent=n.title||'無題のメモ';sel.append(opt)});
 sel.value=beat?.lyric_note_id||ctx().getSelected()||'';
 v('beatCancel').onclick=()=>openShelf();
 const actions=[{text:'閉じる',click:ctx().closeModal}];
 if(isEdit)actions.unshift({text:'削除',click:()=>deleteBeat(beat),class:'secondary'});
 ctx().openModal(isEdit?'ビートを編集':'新しいビート',shell,actions);
 shell.onsubmit=async ev=>{
  ev.preventDefault();if(inFlight)return;
  const title=v('beatTitle').value.trim(),url=v('beatUrl').value.trim(),raw=v('beatFile').files[0];
  if(!title){v('beatFormStatus').textContent='ビート名を入力してください';return}
  if(url){try{const u=new URL(url);if(u.protocol!=='https:')throw Error()}catch{v('beatFormStatus').textContent='https:// で始まるURLを指定してください';return}}
  if(raw&&(!/\.mp3$/i.test(raw.name)||raw.size>20971520||raw.size===0||!v('beatRights').checked)){
   v('beatFormStatus').textContent='20MB以下のMP3を選び、音源の利用権限を確認してください';return
  }
  if(!raw&&!url&&!beat?.audio_path){v('beatFormStatus').textContent='URLまたはMP3のどちらかを登録してください';return}
  const bpm=v('beatBpm').value?Number(v('beatBpm').value):null;
  if(bpm!==null&&(!Number.isInteger(bpm)||bpm<30||bpm>300)){v('beatFormStatus').textContent='BPMは30〜300で指定してください';return}
  inFlight=true;v('beatSave').disabled=true;v('beatFormStatus').textContent='保存中…';
  const c=getClient(),u=getUser();let uploaded=null;
  try{
   if(raw){
    uploaded=u.id+'/'+crypto.randomUUID()+'.mp3';
    const {error}=await c.storage.from(bucket).upload(uploaded,raw,{contentType:'audio/mpeg',cacheControl:'3600',upsert:false});
    if(error)throw error;
   }
   const row={user_id:u.id,title,creator:v('beatCreator').value.trim(),source_url:url||null,bpm,musical_key:v('beatKey').value.trim(),note_text:v('beatMemo').value.trim(),lyric_note_id:v('beatLyric').value||null,audio_path:uploaded||beat?.audio_path||null,favorite:v('beatFav').checked,updated_at:new Date().toISOString()};
   let result;
   if(isEdit)result=await c.from('yohaku_beats').update(row).eq('id',beat.id).eq('user_id',u.id).select().single();
   else result=await c.from('yohaku_beats').insert(row).select().single();
   if(result.error)throw result.error;
   if(uploaded&&beat?.audio_path&&uploaded!==beat.audio_path){
     await c.storage.from(bucket).remove([beat.audio_path]);
     if(current===beat.id){$('beatAudio').pause();current=null;$('beatPlayer').classList.add('hide')}
   }
   await fetchBeats();notify('ビートを保存しました');openShelf();
  }catch(e){
   if(uploaded)await c.storage.from(bucket).remove([uploaded]);
   v('beatFormStatus').textContent='保存できません: '+e.message;
  }finally{inFlight=false;v('beatSave').disabled=false;}
 };
}
async function deleteBeat(beat){
 if(!confirm('「'+beat.title+'」を削除しますか？\n保存したMP3も削除します。'))return;
 const c=getClient(),u=getUser(),{error}=await c.from('yohaku_beats').delete().eq('id',beat.id).eq('user_id',u.id);
 if(error){notify('削除できません: '+error.message);return}
 if(beat.audio_path){const x=await c.storage.from(bucket).remove([beat.audio_path]);if(x.error)notify('MP3の削除に失敗しました: '+x.error.message)}
 if(current===beat.id){$('beatAudio').pause();current=null;$('beatPlayer').classList.add('hide')}
 await fetchBeats();notify('ビートを削除しました');openShelf();
}
function init(){
 $('beatShelf').onclick=()=>openShelf();
 $('beatForNote').onclick=()=>openShelf(true);
 $('beatLoop').onchange=()=>{$('beatAudio').loop=$('beatLoop').checked};
 $('beatAudio').onerror=()=>notify('MP3を再生できません。ネットワークや音声ファイルを確認してください');
}
window.YOHAKU_BEATS={onLogin,onLogout,onNotesChanged:updateLinked,openShelf,refresh:fetchBeats};
document.addEventListener('DOMContentLoaded',init);
})();
