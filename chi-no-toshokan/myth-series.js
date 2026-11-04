/* ギリシャ神話連載。一般向け記事は公開、進捗はユーザー固有の note レコードに保存。 */
(()=>{'use strict';
const chapters=Array.isArray(window.MYTH_SERIAL)?window.MYTH_SERIAL:[];
const API='https://nroyxwozdxwnrqyierjx.supabase.co';
const KEY='sb_publishable_dxiidJt1gVcFwkVR2fg1HA_6gHAZNDz';
const id='note:myth-serial-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dom=s=>document.getElementById(s);
const validId=x=>chapters.some(c=>c.id===x);
let owner=null,sb=null,remote=null,cloud='checking',saving=Promise.resolve(),syncMessage='';
let current=0;
const clean=p=>({completed:[...new Set((p?.completed||[]).filter(validId))],lastRead:validId(p?.lastRead)?p.lastRead:chapters[0]?.id||''});
const localKey=()=>owner?'myth-book-progress:'+owner:'myth-book-progress:guest';
function fromLocal(){try{return clean(JSON.parse(localStorage.getItem(localKey())||'null'))}catch{return clean(null)}}
let progress=fromLocal();
function store(){try{localStorage.setItem(localKey(),JSON.stringify(progress))}catch{}}
function getHash(){const h=location.hash.startsWith('#chapter/')?decodeURIComponent(location.hash.slice(9)):'';return chapters.findIndex(c=>c.id===h)}
function setIndex(i,persist=true){if(i<0||i>=chapters.length)return;current=i;progress.lastRead=chapters[i].id;if(persist)store();render();dom('main')?.scrollIntoView({behavior:'auto',block:'start'})}
function go(i){if(i<0||i>=chapters.length)return;const hash='#chapter/'+encodeURIComponent(chapters[i].id);if(location.hash===hash){setIndex(i);queueSync()}else location.hash=hash}
function pulse(){dom('progress-status').textContent=progress.completed.length+' / '+chapters.length+' 話読了';dom('progressbar').setAttribute('aria-valuemax',String(chapters.length));dom('progressbar').setAttribute('aria-valuenow',String(progress.completed.length));dom('progress-fill').style.width=(chapters.length?100*progress.completed.length/chapters.length:0)+'%'}
const groups=[...new Set(chapters.map(c=>c.part))];
function figure(ch){
 const nodes={
  origins:['カオス','ガイア（大地）','ウラノス（天空）'],
  family:['ウラノス','クロノス','ゼウス'],
  succession:['クロノスの支配','神々の争い','ゼウスの秩序'],
  olympus:['ゼウス','ポセイドン','ハデス','アテナ'],
  human:['神々の世界','プロメテウスの火','人間の生活'],
  ages:['黄金','銀','青銅','英雄','鉄'],
  heroes:['英雄たち','トロイア戦争','帰郷の物語'],
  sea:['トロイア','長い航海','パイアケス人','イタケ'],
  history:['線文字B','史料の空白','アルファベット','叙事詩']
 };
 const arr=nodes[ch.figure]||nodes.family,n=arr.length;const width=640,step=width/n,w=Math.min(145,step-17);
 const body=arr.map((t,i)=>{const x=step*i+(step-w)/2;const arrow=i<n-1?'<path d="M '+(x+w+4)+' 91 h'+(step-w-9)+' l-7 -6 m7 6 l-7 6" fill="none" stroke="#70917c" stroke-width="2"/>':'';return '<rect x="'+x+'" y="60" width="'+w+'" height="65" rx="10" fill="'+(i===n-1?'#285c48':'#f5f5ee')+'" stroke="'+(i===n-1?'#285c48':'#b5c9b6')+'"/><text x="'+(x+w/2)+'" y="97" text-anchor="middle" font-size="'+(n>3?'14':'15')+'" font-weight="700" fill="'+(i===n-1?'white':'#28483a')+'">'+esc(t)+'</text>'+arrow}).join('');
 return '<div class="figure"><h3>話の流れが見える図</h3><svg viewBox="0 0 640 180" role="img" aria-label="'+esc(arr.join('、'))+'という物語の流れを示した模式図"><text x="20" y="27" font-size="13" fill="#596d5d">'+esc(ch.part)+'｜関係の整理</text>'+body+'<text x="320" y="160" font-size="11" text-anchor="middle" fill="#68796d">理解のための模式図です。神々の系図や史実の年代を厳密に再現しません。</text></svg><small>図の矢印はこの連載で読む順序です。伝承ごとの異なる筋書きや枝分かれは省略しています。</small></div>'
}
function render(){
 if(!chapters.length){dom('chapter').textContent='連載データを読み込めませんでした。';return}
 current=Math.max(0,Math.min(chapters.length-1,current));
 const ch=chapters[current];
 pulse();
 let html='';
 groups.forEach(g=>{html+='<h3>'+esc(g)+'</h3>';chapters.forEach((c,i)=>{if(c.part!==g)return;html+='<button class="toc-item '+(i===current?'active':'')+'" type="button" data-open="'+i+'" '+(i===current?'aria-current="step"':'')+'><span class="num">'+String(i+1).padStart(2,'0')+'</span><span class="title">'+esc(c.title)+'</span><span class="done">'+(progress.completed.includes(c.id)?'✓':'')+'</span></button>'})});
 dom('toc').innerHTML=html;
 dom('overview').innerHTML=chapters.map((c,i)=>'<a href="#chapter/'+encodeURIComponent(c.id)+'" class="'+(i===current?'active':'')+' '+(progress.completed.includes(c.id)?'done':'')+'" aria-label="第'+(i+1)+'話 '+esc(c.title)+'">'+(i+1)+(progress.completed.includes(c.id)?' ✓':'')+'</a>').join('');
 const refs=ch.sources.map(s=>'<a href="'+esc(s.url)+'" rel="noopener noreferrer" target="_blank">'+esc(s.label)+' ↗</a>').join('');
 const marked=progress.completed.includes(ch.id);
 dom('chapter').innerHTML=
 '<div class="chapter-meta"><span>'+esc(ch.part)+' ／ 第'+(current+1)+'話</span><span>'+(marked?'✓ この話は読了済み':'連載 '+(current+1)+' / '+chapters.length)+'</span></div>'+
 '<div class="episode-kicker">GREEK MYTHOLOGY · EPISODE '+String(current+1).padStart(2,'0')+'</div>'+
 '<h2>'+esc(ch.title)+'</h2><p class="subtitle">'+esc(ch.subtitle)+'</p>'+
 '<p class="chapter-lead">'+esc(ch.lead)+'</p>'+
 figure(ch)+
 '<div class="chapter-body">'+ch.paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('<div class="chapter-sep" aria-hidden="true">◆</div>')+'</div>'+
 '<section class="insight"><h3>今回の大切なポイント</h3><ul>'+ch.points.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></section>'+
 '<section class="pause"><h3>次の問い</h3><p>'+esc(ch.question)+'</p></section>'+
 '<div class="warning"><strong>資料を読むときの注意</strong><div>'+esc(ch.caution)+'</div></div>'+
 '<section class="refs"><h3>この話の参考資料</h3><p class="small">出典は物語の典拠・研究への入口です。各段落の逐語的な検証が完了したという表示ではありません。</p>'+refs+'</section>'+
 '<div class="nav-buttons"><button type="button" class="btn secondary" data-action="previous" '+(current===0?'disabled':'')+'>← '+(current===0?'最初の話です':'前の話に戻る')+'</button><button type="button" class="btn" data-action="next">'+(current===chapters.length-1?(marked?'✓ 全話を読み終えました':'第10話を読了にする'):'ここまで読んで次の話へ →')+'</button></div>'+
 '<div class="reconnect"><strong>続きから再開</strong><div>前後の話へ自由に戻れます。読了の印は、端末内に保存されます。ログイン済みの場合は同じアカウントのクラウドとも同期を試みます。</div><a href="./#article/zeus-titans">図書館の神話・歴史記事も読む ↗</a></div>';
 let status='この端末に進捗を保存します。';
 if(cloud==='checking')status='クラウドログインを確認中。読書はそのまま始められます。';
 if(cloud==='connected')status=syncMessage||'クラウドの読書記録を読み込みました。';
 if(cloud==='guest')status='未ログイン：進捗はこの端末だけに保存します。別端末での同期には図書館からログインしてください。';
 if(cloud==='error')status='クラウドを確認できません。進捗は端末内に残っています。 '+syncMessage;
 dom('sync-status').textContent=status;
 window.MYTH_ENHANCER?.afterRender(ch);
}
async function fetchRemote(){
 const {data,error}=await sb.from('knowledge_records').select('id,user_id,kind,payload,created_at,updated_at').eq('user_id',owner).eq('id',id).maybeSingle();
 if(error)throw error;
 return data||null;
}
function joined(a,b){
 const all=new Set([...(a.completed||[]),...(b.completed||[])]);
 return clean({completed:[...all],lastRead:a.lastRead||b.lastRead});
}
async function writeCloud(){
 if(cloud!=='connected'||!sb||!owner)return;
 const who=owner;
 for(let retry=0;retry<3;retry++){
  if(owner!==who)return;
  const old=remote;
  const date=new Date(Math.max(Date.now(),old?.updated_at?Date.parse(old.updated_at)+1:0)).toISOString();
  const payload={entryType:'myth-serial-progress',version:1,completed:[...progress.completed],lastRead:progress.lastRead,recordedAt:date};
  let result;
  if(!old){result=await sb.from('knowledge_records').insert({id,kind:'note',user_id:who,payload,created_at:date,updated_at:date});}
  else {result=await sb.from('knowledge_records').update({payload,updated_at:date}).eq('user_id',who).eq('id',id).eq('updated_at',old.updated_at).select('id');}
  if(owner!==who)return;
  if(!result.error&&(!old||(Array.isArray(result.data)&&result.data.some(r=>r.id===id)))){
   remote={id,kind:'note',user_id:who,payload,created_at:old?.created_at||date,updated_at:date};
   syncMessage='クラウドにも保存済み。別端末でも同じアカウントから続きを開けます。';
   dom('sync-status').textContent=syncMessage;
   return;
  }
  if(result.error&&result.error.code!=='23505'){throw result.error}
  // 別端末が先に書き換えた可能性: 新しい記録と読了済みの章を統合して再試行。
  remote=await fetchRemote();
  if(remote){progress=joined(progress,clean(remote.payload));store();render();}
 }
 throw new Error('別端末の更新が続いたため、端末内だけに保存しました。あとから再度お試しください。');
}
function queueSync(){
 if(cloud!=='connected')return;
 saving=saving.catch(()=>{}).then(()=>writeCloud()).catch(e=>{cloud='error';syncMessage=String(e.message||e);dom('sync-status').textContent='端末には保存しましたが、クラウドへの反映に失敗しました。 '+syncMessage});
}
function onGo(i){if(i>=0&&i<chapters.length){go(i)}}
function finish(){
 const ch=chapters[current];
 if(!progress.completed.includes(ch.id))progress.completed.push(ch.id);
 progress=clean(progress);store();
 if(current<chapters.length-1){go(current+1)}
 else{render();dom('chapter')?.scrollIntoView({behavior:'auto',block:'start'})}
 queueSync();
}
document.addEventListener('click',e=>{
 const toc=e.target.closest('[data-open]');if(toc){onGo(Number(toc.dataset.open));return}
 const act=e.target.closest('[data-action]')?.dataset.action;
 if(act==='previous')onGo(current-1);
 if(act==='next')finish();
});
window.addEventListener('hashchange',()=>{const i=getHash();if(i!==-1){setIndex(i);queueSync()}});
async function init(){
 try{
  const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm');
  sb=mod.createClient(API,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const {data,error}=await sb.auth.getUser();if(error)throw error;
  const user=data.user;
  if(!user){cloud='guest';render();return}
  owner=user.id;progress=fromLocal();cloud='checking';
  remote=await fetchRemote();
  if(remote){
   const local=progress;progress=joined(clean(remote.payload),local);
   // 認証済みアカウントはクラウドの最後の読書位置を優先。URLで章指定されている場合は尊重。
   if(getHash()===-1&&validId(remote.payload?.lastRead))progress.lastRead=remote.payload.lastRead;
  }
  store();
  if(getHash()===-1){const i=chapters.findIndex(c=>c.id===progress.lastRead);current=Math.max(0,i)}
  cloud='connected';syncMessage='クラウドの記録を読み込みました。';render();
 }catch(e){cloud='error';syncMessage=String(e.message||e);render()}
}
if(!chapters.length){dom('sync-status').textContent='連載データを読み込めませんでした。';return}
const initial=getHash();current=initial===-1?Math.max(0,chapters.findIndex(c=>c.id===progress.lastRead)):initial;
render();init();
window.MYTH_BOOK_DEBUG={count:chapters.length,getState:()=>({cloud,owner:!!owner,current,completed:[...progress.completed]}),chapterIds:chapters.map(c=>c.id)};
})();