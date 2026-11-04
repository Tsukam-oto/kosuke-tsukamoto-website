/* 知の特集｜出典と個別の主張を対応づけた公開用エディトリアル */
(()=>{'use strict';
const DATA=window.KNOWLEDGE_SPECIALS||{stories:[]};
const STORIES=DATA.stories||[];
const index=Object.fromEntries(STORIES.map(s=>[s.id,s]));
const E=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const $=id=>document.getElementById(id);
const sourceHosts=['www.sfu.ca','phys.libretexts.org','www.math.drexel.edu','www.mtosmt.org','www.theoi.com','pubmed.ncbi.nlm.nih.gov','pmc.ncbi.nlm.nih.gov'];
const candidateHosts=['doi.org','openalex.org','musicbrainz.org','www.metmuseum.org','www.theoi.com'];
function safeUrl(url,hosts){try{const x=new URL(url);return x.protocol==='https:'&&hosts.includes(x.hostname)?x.href:null}catch{return null}}
const quizzes={
 piano:{q:'12回の純正5度と7オクターヴはぴったり一致する？',options:['一致する','少しずれる'],correct:1,note:'約1.36%のずれが生じます。だから複数の調で演奏できるよう、調律法が必要になるのです。'},
 chaos:{q:'ヘシオドスは「ガイアはカオスの娘」と明記している？',options:['その親子関係は明記していない','明記している'],correct:0,note:'「先に登場する」ことと「親である」ことを区別します。カオスから生まれたと書かれるのは別の存在です。'},
 alliance:{q:'相関 r=.278 は、治療の成功率が27.8%という意味？',options:['そうである','そうではない'],correct:1,note:'相関係数は二つの量の関連を示します。個人の改善率や因果効果を表す数字ではありません。'}
};
let active='piano',audio=null;
function numericDiagram(){
 const et=Math.pow(2,7/12),diff=(Math.pow(1.5,12)/Math.pow(2,7)-1)*100;
 return '<div class="visual"><div class="kicker">SOUND EXPERIMENT / 耳で試す</div><h3>二つの完全5度を比べてみる</h3>'+
 '<p>440Hzを基準に、ブラウザが合成する二種類の響きを比較します。違いはごくわずかです。</p>'+
 '<div class="metric-grid"><div class="metric"><span>純正な完全5度</span><b>3：2</b><span>440Hz → 660Hz</span></div>'+
 '<div class="metric"><span>12平均律の完全5度</span><b>'+et.toFixed(6)+'</b><span>440Hz → '+(440*et).toFixed(2)+'Hz</span></div></div>'+
 '<svg viewBox="0 0 640 156" role="img" aria-label="純正5度の1.5と平均律の1.4983の比を並べる図"><rect x="0" y="0" width="640" height="156" rx="12" fill="#f6f9f3"/>'+
 '<text x="22" y="44" font-size="15" fill="#37614a">純正</text><text x="22" y="99" font-size="15" fill="#37614a">平均律</text>'+
 '<rect x="106" y="22" width="420" height="30" rx="7" fill="#9ac2a1"/><rect x="106" y="77" width="'+(420*et/1.5).toFixed(2)+'" height="30" rx="7" fill="#376f59"/>'+
 '<text x="538" y="44" font-size="16" fill="#254d3d">1.5000</text><text x="538" y="99" font-size="16" fill="#254d3d">1.4983</text>'+
 '<text x="106" y="138" font-size="13" fill="#6a806d">差は小さいため、2本の棒はほぼ同じ長さに見えます。</text></svg>'+
 '<div class="control-row"><button type="button" class="primary" data-audio="pure">純正5度を聴く ♫</button><button type="button" data-audio="equal">平均律の5度を聴く ♫</button></div>'+
 '<p class="visual-note">教育用に合成した音です。実際のピアノ演奏ではありません。小音量でお試しください。</p>'+
 '<div class="metric-grid"><div class="metric"><span>純正5度を12回</span><b>'+Math.pow(1.5,12).toFixed(3)+'</b></div>'+
 '<div class="metric"><span>7オクターヴ</span><b>128.000</b></div></div>'+
 '<p style="font-weight:800;color:#285744">到着点には約'+diff.toFixed(2)+'%の差が残ります。</p></div>'
}
function mythDiagram(){
 const nodes=[['カオス',14],['ガイア',178],['タルタロス',342],['エロス',506]];
 return '<div class="visual"><div class="kicker">PRIMARY SOURCE / 原典の図解</div><h3>登場順と親子関係は別</h3>'+
 '<svg viewBox="0 0 670 232" role="img" aria-label="カオス、ガイア、タルタロス、エロスが横に並び、ガイアからだけウラノスへ親子を示す矢印が出る"><rect width="670" height="232" rx="12" fill="#f5f8f2"/>'+
 '<text x="17" y="27" fill="#577362" font-size="12">横の並び：原初の存在として登場</text>'+
 nodes.map(([name,x],i)=>'<rect x="'+x+'" y="53" width="149" height="55" rx="12" fill="'+(i===1?'#285b49':'#e0eae0')+'"/>'+
 '<text x="'+(x+74)+'" y="87" fill="'+(i===1?'white':'#2b5240')+'" font-size="17" font-weight="700" text-anchor="middle">'+name+'</text>').join('')+
 '<path d="M251 112V146" stroke="#45865e" stroke-width="4"/><path d="M243 137L251 149L259 137" fill="none" stroke="#45865e" stroke-width="3"/>'+
 '<rect x="166" y="157" width="168" height="49" rx="10" fill="#c9ddd1"/><text x="250" y="187" fill="#29533f" font-size="16" text-anchor="middle" font-weight="700">ウラノス</text>'+
 '<text x="475" y="172" fill="#617a64" font-size="13" text-anchor="middle">矢印：生み出した関係</text><text x="475" y="191" fill="#617a64" font-size="12" text-anchor="middle">『神統記』116行以降</text></svg>'+
 '<p class="visual-note">原典を理解するための自作模式図です。古代の作品を再現した図ではありません。</p></div>'
}
function psychologyDiagram(){
 return '<div class="visual"><div class="kicker">RESEARCH / データを読む</div><h3>関連を示す相関係数と、因果の違い</h3>'+
 '<div class="number-highlight">r = .278 <small>相関係数</small></div>'+
 '<p>295の独立した研究、3万人以上の患者を含む2018年のメタ分析から。</p>'+
 '<svg viewBox="0 0 640 155" role="img" aria-label="相関係数0から1までのうち0.278の位置、95パーセント信頼区間0.256から0.299の範囲を示す"><rect width="640" height="155" rx="12" fill="#f5f8f2"/>'+
 '<line x1="60" y1="70" x2="588" y2="70" stroke="#b7cabc" stroke-width="14" stroke-linecap="round"/>'+
 '<line x1="60" y1="70" x2="'+(60+528*.278)+'" y2="70" stroke="#368265" stroke-width="14" stroke-linecap="round"/>'+
 '<line x1="'+(60+528*.256)+'" y1="42" x2="'+(60+528*.299)+'" y2="42" stroke="#b68a47" stroke-width="5"/>'+
 '<line x1="'+(60+528*.278)+'" y1="34" x2="'+(60+528*.278)+'" y2="89" stroke="#255542" stroke-width="3"/>'+
 '<text x="60" y="112" font-size="13" text-anchor="middle">0</text><text x="324" y="112" font-size="13" text-anchor="middle">.5</text><text x="588" y="112" font-size="13" text-anchor="middle">1</text>'+
 '<text x="205" y="23" font-size="12" text-anchor="middle" fill="#88683b">95%信頼区間 .256–.299</text>'+
 '<text x="324" y="136" font-size="12" text-anchor="middle" fill="#6c7d6f">成功率ではなく、関連の強さの指標です</text></svg>'+
 '<div class="metric-grid"><div class="metric"><span>独立した研究</span><b>295研究</b></div><div class="metric"><span>患者数</span><b>3万人以上</b></div></div>'+
 '<p class="visual-note">相関と因果は異なります。集団の結果から個人の治療結果は予測できません。</p></div>'
}
function quiz(s){
 const q=quizzes[s.id];
 return '<section class="challenge"><div class="kicker">PAUSE & THINK / まず予想する</div><h3>'+E(q.q)+'</h3>'+
 '<div class="btn-row">'+q.options.map((v,i)=>'<button data-guess="'+i+'" type="button" aria-pressed="false">'+E(v)+'</button>').join('')+'</div>'+
 '<p id="quiz-reveal" class="reveal" role="status" hidden></p></section>'
}
function sourceSection(s){
 return '<section class="story-section sources"><h3>出典を確かめる</h3><p>文献の種類と、この特集で参照した内容を示します。出典のリンクはその資料を公開しているサイトへ移動します。</p><ul class="source-list">'+s.sources.map(x=>{
 const u=safeUrl(x.url,sourceHosts);
 return u?'<li id="source-'+E(x.id)+'"><span class="source-type">'+E(x.kind)+' · '+E(x.id)+'</span>'+
 '<a href="'+E(u)+'" target="_blank" rel="noopener noreferrer">'+E(x.title)+' ↗</a><small>'+E(x.detail)+'</small></li>':'';
 }).join('')+'</ul><p class="small-note">資料の確認日：'+E(DATA.verifiedAsOf)+'。自動収集された未照合資料は、こちらには混入させません。</p></section>'
}
function story(s){
 return '<div class="story-layout"><header class="story-header"><div class="overline">'+E(s.theme)+' ／ '+E(s.duration)+'</div>'+
 '<h2>'+E(s.title)+'</h2><p class="subtitle">'+E(s.kicker)+'</p>'+
 '<div class="story-meta"><span>主張ごとの出典付き</span><span>オリジナル図解</span></div>'+
 '<p class="lede">'+E(s.opening)+'</p></header>'+quiz(s)+
 '<section class="story-section"><h3>まず、仕組みから</h3><p style="line-height:2.05">'+E(s.lead)+'</p>'+
 (s.id==='piano'?numericDiagram():s.id==='chaos'?mythDiagram():psychologyDiagram())+'</section>'+
 '<section class="story-section"><h3>根拠を一つずつ読む</h3>'+s.claims.map((c,i)=>
 '<div class="claim"><span class="label">検証可能な主張 '+(i+1)+'</span><p>'+E(c.text)+'</p><div class="refs">'+c.ids.map(id=>
 '<a href="#source-'+E(id)+'" data-source="'+E(id)+'" class="source-tag">出典 '+E(id)+' ↗</a>'
 ).join('')+'</div></div>').join('')+'</section>'+
 '<section class="answer"><div class="kicker">THE TAKEAWAY / 今回の発見</div><h3>何が分かったか</h3><p>'+E(s.insight)+'</p></section>'+
 '<section class="caution"><b>言い過ぎないための注記</b><p>'+E(s.limitation)+'</p></section>'+sourceSection(s)+
 '<div class="next-steps"><span>次の疑問：'+E(s.next)+'</span><a href="'+E(s.follow)+'">続きを探究する ↗</a></div></div>'
}
function select(id,scroll){
 if(!index[id])id='piano';active=id;
 $('story').innerHTML=story(index[id]);
 document.querySelectorAll('[data-story]').forEach(a=>{
 const on=a.dataset.story===id;a.classList.toggle('current',on);
 if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
 });
 document.title=index[id].title+'｜知の図書館';
 if(scroll)$('story-switcher').scrollIntoView({block:'start',behavior:'auto'});
}
function play(mode){
 const Audio=window.AudioContext||window.webkitAudioContext;
 if(!Audio){$('toast').textContent='このブラウザでは音声を合成できません。';$('toast').classList.add('shown');return}
 try{
  if(!audio)audio=new Audio();
  const begin=()=>{
   const t=audio.currentTime+.05,base=440,other=base*(mode==='pure'?1.5:Math.pow(2,7/12));
   const master=audio.createGain();master.gain.value=.12;master.connect(audio.destination);
   [[base,.6],[base*2,.13],[base*3,.17],[other,.48],[other*2,.18]].forEach(([freq,v])=>{
    const osc=audio.createOscillator(),gain=audio.createGain();
    osc.type='sine';osc.frequency.value=freq;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(v,t+.05);
    gain.gain.setValueAtTime(v,t+2.5);gain.gain.linearRampToValueAtTime(0,t+2.9);
    osc.connect(gain);gain.connect(master);osc.start(t);osc.stop(t+2.95);
   });
  };
  if(audio.state==='suspended')audio.resume().then(begin).catch(()=>{});else begin();
 }catch(e){$('toast').textContent='音声を再生できませんでした。';$('toast').classList.add('shown')}
}
document.addEventListener('click',e=>{
 const sound=e.target.closest('[data-audio]');if(sound){play(sound.dataset.audio);return}
 const guess=e.target.closest('[data-guess]');if(guess){
  const q=quizzes[active],i=Number(guess.dataset.guess);
  document.querySelectorAll('[data-guess]').forEach(b=>b.setAttribute('aria-pressed',String(b===guess)));
  const r=$('quiz-reveal');r.hidden=false;r.textContent=(i===q.correct?'正解です。':'ここは注意が必要です。')+q.note;
  return;
 }
 const cite=e.target.closest('[data-source]');if(cite){
  e.preventDefault();
  const node=$('source-'+cite.dataset.source);if(node)node.scrollIntoView({block:'center',behavior:'smooth'});
 }
});
window.addEventListener('hashchange',()=>{
 const h=decodeURIComponent(location.hash.replace('#',''));
 if(index[h]&&active!==h)select(h,true);
});
async function loadCandidates(){
 const node=$('fresh-sources');
 try{
  const r=await fetch('./research-candidates.json',{cache:'no-store'});
  if(!r.ok)throw Error('network');
  const d=await r.json();if(d.schemaVersion!==1||!Array.isArray(d.items))throw Error('schema');
  const items=[],areas=new Set();
  for(const x of d.items){
   if(x.kind!=='research-metadata'||!x.title||!x.area||!safeUrl(x.url,candidateHosts)||areas.has(x.area))continue;
   items.push(x);areas.add(x.area);if(items.length===3)break;
  }
  node.innerHTML=items.length?items.map(x=>
   '<article class="candidate"><span class="type">'+E(x.area)+' ／ 書誌情報・未照合</span><h3>'+E(x.title)+'</h3>'+
   '<p>発見した資料のタイトルです。研究結果の内容は未検証で、ここでは断定しません。</p>'+
   '<a target="_blank" rel="noopener noreferrer" href="'+E(safeUrl(x.url,candidateHosts))+'">資料元で内容を確認 ↗</a></article>'
  ).join(''):'<div class="loading">現在表示できる候補がありません。</div>';
  const at=d.lastRunAt?new Date(d.lastRunAt):null;
  $('fresh-at').textContent='自動収集候補 '+d.items.length+'件'+(at&&!isNaN(at.getTime())?' ／ 最終取得 '+at.toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo'}):'')+'。根拠として承認された件数ではありません。';
 }catch(e){node.innerHTML='<div class="loading">現在、候補一覧を取得できません。特集本文には影響しません。</div>'}
}
select(decodeURIComponent(location.hash.replace('#',''))||'piano',false);
loadCandidates();
window.KNOWLEDGE_SPECIALS_DEBUG={
 count:STORIES.length,
 validCitations:STORIES.every(s=>s.claims.every(c=>c.ids.every(id=>s.sources.some(x=>x.id===id&&!!safeUrl(x.url,sourceHosts))))),
 state:()=>active
};
})();
