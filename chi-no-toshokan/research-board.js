/* Public candidate records only. Never labels unreviewed material as verified. */
(()=>{'use strict';
const el=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const allowed=new Set(['doi.org','openalex.org','musicbrainz.org','www.metmuseum.org','www.theoi.com']);
const permitted=url=>{try{const u=new URL(url);return u.protocol==='https:'&&allowed.has(u.hostname)?u.href:''}catch{return ''}};
const permittedImage=(url,rights)=>{try{const u=new URL(url);return rights==='Met Open Access / CC0'&&u.protocol==='https:'&&u.hostname==='images.metmuseum.org'?u.href:''}catch{return ''}};
const kinds={
 'research-metadata':'学術書誌・研究候補',
 'music-work-metadata':'音楽作品のメタデータ',
 'museum-object':'博物館の収蔵品',
 'curated-reference-path':'事前登録した原典への道筋'
};
let items=[],area='all',kind='all',query='';
function render(){
 const result=items.filter(x=>(area==='all'||x.area===area)&&(kind==='all'||x.kind===kind)&&(!query||([x.title,x.area,x.publication,(x.authors||[]).join(' '),(x.topicIds||[]).join(' ')].join(' ')).toLocaleLowerCase('ja').includes(query)));
 el('count').textContent=result.length+'件の資料候補を表示';
 if(!result.length){el('cards').innerHTML='<p class="empty">条件に合う候補はありません。</p>';return}
 el('cards').innerHTML=result.slice(0,250).map(x=>{
  const url=permitted(x.url);
  if(!url)return '';
  const lic=permittedImage(x.imageUrl,x.imageRights);
  const authors=(x.authors||[]).filter(Boolean).slice(0,3).join('／');
  const notes=[x.year||x.objectDate||'',x.publication||'',authors].filter(Boolean).map(esc).join(' · ');
  const origin=(x.providers||[]).map(esc).join(' / ');
  const desc=x.note?'<p class="desc">'+esc(x.note)+'</p>':'';
  const img=lic?'<img class="media" loading="lazy" decoding="async" src="'+esc(lic)+'" alt="'+esc(x.title)+'（The Met公開画像）">':'';
  const rights=lic?'<div class="meta">画像：'+esc(x.imageRights)+'</div>':'';
  return '<article class="card"><span class="type">'+esc(x.area)+' ／ '+esc(kinds[x.kind]||'資料情報')+'</span><span class="status">未照合・資料候補</span><h3>'+esc(x.title)+'</h3>'+
   '<div class="meta">'+(notes||'刊行年などは資料元でご確認ください')+'</div><div class="meta">情報源：'+origin+'</div>'+
   desc+img+rights+
   '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">元の資料情報を開く ↗</a></article>';
 }).join('');
}
function summary(data){
 const date=data.lastRunAt?new Date(data.lastRunAt):null;
 el('total').textContent=items.length;
 el('sources').textContent=data.runSummary?.providerCallsSucceeded??0;
 el('latest').textContent=date&&!Number.isNaN(date.getTime())
  ?date.toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric'})+
    ' '+date.toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'})
  :'未実行';
 const errors=data.runSummary?.errors||[];
 el('run-errors').textContent=!data.lastRunAt?
  '自動収集の初回実行結果はまだありません。初期表示は事前登録した原典リンクです。':
  errors.length?'前回の収集で一部の接続が失敗しました（'+errors.length+'件）。失敗したAPIの資料は新たに確認済みとは扱いません。':
  '前回の収集では接続エラーの記録がありません。個々の資料の内容は引き続き未照合です。';
 const areaSelect=el('area');
 [...new Set(items.map(x=>x.area).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja')).forEach(s=>{
  const o=document.createElement('option');o.value=s;o.textContent=s;areaSelect.appendChild(o);
 });
}
async function init(){
 try{
  const response=await fetch('./research-candidates.json',{cache:'no-store'});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const data=await response.json();
  if(data.schemaVersion!==1||!Array.isArray(data.items))throw new Error('Invalid candidate schema');
  items=data.items.filter(x=>x&&typeof x.id==='string'&&typeof x.title==='string'&&permitted(x.url));
  summary(data);render();
 }catch(_e){
  el('cards').innerHTML='<p class="empty">候補データを取得できませんでした。収集処理の設定と公開状況をご確認ください。</p>';
  el('count').textContent='データ未取得';
  el('run-errors').textContent='収集データを取得できませんでした。既存の本文には影響しません。';
 }
}
el('query').addEventListener('input',e=>{query=e.target.value.trim().toLocaleLowerCase('ja');render()});
el('area').addEventListener('change',e=>{area=e.target.value;render()});
el('kind').addEventListener('change',e=>{kind=e.target.value;render()});
init();
})();
