/* Article preparation is NOT claim verification. 20 topic editorial checklists. */
(()=>{'use strict';
const el=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const hosts=new Set(['doi.org','openalex.org','pubmed.ncbi.nlm.nih.gov','musicbrainz.org','www.metmuseum.org','www.theoi.com']);
const safe=url=>{try{const u=new URL(url);return u.protocol==='https:'&&hosts.has(u.hostname)?u.href:''}catch{return ''}};
const safeImage=(u,rights)=>{try{const url=new URL(u);return rights==='Met Open Access / CC0'&&url.protocol==='https:'&&url.hostname==='images.metmuseum.org'?url.href:''}catch{return ''}};
let dossiers=[],area='all',coverage='all',query='';
function sourceCard(s){
 const u=safe(s.url);if(!u)return '';
 const authors=(s.authors||[]).filter(Boolean).join('／');
 const pieces=[s.year||'',s.publication||'',authors].filter(Boolean).map(esc);
 const image=safeImage(s.imageUrl,s.imageRights);
 const info=s.titleMatchesSearch?'題名に検索語が含まれます（関連性は未確認）':'題名と検索語の一致は未確認';
 return '<article class="source"><div class="tag">'+esc(s.sourceType)+' ／ '+esc(s.reviewStatus||'本文未照合')+'</div><h4>'+esc(s.title)+'</h4>'+
 '<div class="meta">'+pieces.join(' · ')+'</div><div class="meta">情報提供元：'+esc((s.providers||[]).join(' / '))+'</div>'+
 '<div class="meta">'+esc(s.publicationTypeHint)+'</div><div class="warn">'+esc(info)+'</div>'+
 (image?'<img src="'+esc(image)+'" loading="lazy" decoding="async" alt="'+esc(s.title)+'（The Met公開画像）">':'')+
 (s.note?'<p>'+esc(s.note)+'</p>':'')+
 '<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">出典元の情報を開く ↗</a></article>';
}
function sheet(d,i){
 const warnings=(d.warnings||[]).map(x=>'<li>'+esc(x)+'</li>').join('');
 const checks=(d.reviewChecks||[]).map(x=>'<li>'+esc(x)+'</li>').join('');
 const storyboard=(d.storyboard||[]).map(x=>'<li>'+esc(x.section)+'：'+esc(x.status)+'</li>').join('');
 const related=typeof d.relatedPage==='string'&&/^\.\//.test(d.relatedPage)?'<a href="'+esc(d.relatedPage)+'" style="font-size:12px;font-weight:800">関連する図書館記事へ ↗</a>':'';
 return '<details class="sheet" id="topic-'+esc(d.id)+'"><summary>'+
 '<span class="num">'+String(i+1).padStart(2,'0')+'</span><span class="sheet-heading"><strong>'+esc(d.question)+'</strong><span>'+esc(d.area)+' ／ 候補資料 '+Number(d.sourceCount||0)+'件</span></span>'+
 '<span class="sheet-flag">検証前</span><span class="chev" aria-hidden="true">⌄</span></summary><div class="sheet-body">'+
 '<div class="info"><section><h3>まず確認すること</h3><ul>'+checks+'</ul></section><section><h3>記事にするための構成案</h3><ul>'+storyboard+'</ul></section></div>'+
 (warnings?'<div class="next-step"><strong>不足している確認事項</strong><ul style="padding-left:19px;margin:5px 0">'+warnings+'</ul></div>':'')+
 '<h3 class="h3">自動収集した参考資料の候補</h3>'+
 ((d.sources||[]).length?'<div class="sourcegrid">'+d.sources.map(sourceCard).join('')+'</div>':'<div class="empty">このテーマは候補がありません。検索語の見直しや一次資料の追加が必要です。</div>')+
 '<p class="next-step"><strong>公開前の条件：</strong>本文の原典・研究結果を照合し、個別の主張と資料の対応、反対の知見、画像の権利を確認します。現在この調査票から自動で本文を公開することはありません。</p>'+related+'</div></details>';
}
function draw(){
 const visible=dossiers.filter(d=>(area==='all'||area===d.area)&&(coverage==='all'||(coverage==='ready'?d.sourceCount>=2:d.sourceCount<=1))&&(!query||(d.question+' '+d.area+' '+d.searchQuery).toLocaleLowerCase('ja').includes(query)));
 el('found').textContent=visible.length+'件の調査票を表示';
 if(!visible.length){el('sheets').innerHTML='<p class="empty">該当する調査票はありません。</p>';return}
 el('sheets').innerHTML=visible.map((d,i)=>sheet(d,dossiers.indexOf(d))).join('');
}
async function init(){
 try{
  const response=await fetch('./research-dossiers.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Not available');
  const data=await response.json();
  if(data.schemaVersion!==1||!Array.isArray(data.dossiers)||!data.counts)throw new Error('Unexpected data');
  dossiers=data.dossiers.filter(d=>d&&typeof d.question==='string'&&Array.isArray(d.sources)&&d.readyToPublish===false);
  const total=dossiers.reduce((sum,d)=>sum+d.sources.length,0);
  el('topic-count').textContent=dossiers.length;
  el('source-count').textContent=total;
  el('review-count').textContent=data.counts.verifiedClaims||0;
  const areas=[...new Set(dossiers.map(d=>d.area).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'));
  for(const name of areas){const option=document.createElement('option');option.value=name;option.textContent=name;el('area').appendChild(option)}
  draw();
  const deep=decodeURIComponent(location.hash.slice(1)||'');
  if(deep.startsWith('topic/')){const t=dossiers.find(d=>d.id===deep.slice(6));const node=t?el('topic-'+t.id):null;if(node){node.open=true;node.scrollIntoView({behavior:'auto',block:'start'})}}
 }catch(_e){el('found').textContent='調査データ未取得';el('sheets').innerHTML='<p class="empty">自動生成した調査票をまだ取得できません。収集処理の実行状況をご確認ください。</p>'}
}
el('search').addEventListener('input',e=>{query=e.target.value.trim().toLocaleLowerCase('ja');draw()});
el('area').addEventListener('change',e=>{area=e.target.value;draw()});
el('coverage').addEventListener('change',e=>{coverage=e.target.value;draw()});
init();
})();