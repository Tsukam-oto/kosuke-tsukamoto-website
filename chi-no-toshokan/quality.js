/* 根拠の表示は記事の正確さ・研究の強度の採点ではありません。 */
(()=>{'use strict';
const topics=Array.isArray(window.KNOWLEDGE)?window.KNOWLEDGE:[];
const evid=window.KNOWLEDGE_EVIDENCE||{};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid=e=>e&&Array.isArray(e.claims)&&e.claims.some(c=>Array.isArray(c.sources)&&c.sources.length>0);
const isGoodUrl=url=>{try{return new URL(url).protocol==='https:'}catch{return false}};
let status='all',query='';
const allReviewed=topics.filter(t=>valid(evid[t.id]));
const totalClaims=allReviewed.reduce((n,t)=>n+evid[t.id].claims.filter(c=>c.sources?.some(id=>evid[t.id].sources?.some(s=>s.id===id&&isGoodUrl(s.url)))).length,0);
document.getElementById('metric-all').textContent=topics.length;
document.getElementById('metric-reviewed').textContent=allReviewed.length;
document.getElementById('metric-claims').textContent=totalClaims;
function draw(){
 const matches=topics.filter(t=>(status==='all'||(status==='reviewed')===!!valid(evid[t.id]))&&(!query||(t.title+' '+t.domain).toLocaleLowerCase('ja').includes(query))).sort((a,b)=>Number(!!valid(evid[b.id]))-Number(!!valid(evid[a.id])));
 document.getElementById('result-count').textContent=matches.length+'件の記事を表示';
 document.getElementById('cards').innerHTML=matches.map(t=>{
 const e=evid[t.id],reviewed=!!valid(e);
 const linked=reviewed?e.claims.filter(c=>c.sources?.some(id=>e.sources?.some(s=>s.id===id&&isGoodUrl(s.url)))).length:0;
 const labels=reviewed?['論点 '+linked+'件','参照資料 '+(e.sources?.length||0)+'件',e.visual?'図解あり':'図解なし']:[];
 return '<article class="card"><span class="tag '+(reviewed?'':'pending')+'">'+(reviewed?'論点ごとの資料照合あり':'個別の論点照合は未完了')+'</span><div class="small">'+esc(t.domain)+'</div><h3>'+esc(t.title)+'</h3><p class="small">'+(reviewed?esc(e.overview):'参考資料があっても、記事の各主張との対応づけは完了していません。')+'</p><div>'+labels.map(l=>'<span class="chip">'+esc(l)+'</span>').join('')+'</div><a href="./#article/'+encodeURIComponent(t.id)+'">記事を開いて確認する ↗</a></article>';
 }).join('')||'<div class="empty">該当する記事がありません。</div>';
}
document.querySelectorAll('[data-status]').forEach(btn=>btn.addEventListener('click',()=>{status=btn.dataset.status;document.querySelectorAll('[data-status]').forEach(el=>el.setAttribute('aria-pressed',String(el===btn)));draw()}));
document.getElementById('filter').addEventListener('input',e=>{query=e.target.value.trim().toLocaleLowerCase('ja');draw()});
draw();
window.LIBRARY_QUALITY={topics:topics.length,reviewed:allReviewed.length,linkedClaims:totalClaims};
})();