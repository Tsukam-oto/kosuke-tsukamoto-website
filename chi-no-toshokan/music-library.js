/* 知の図書館｜音楽分室：理論のデモ音は合成した純音です。録音はApple Music Classical側で提供されます。 */
(()=>{'use strict';
const C=window.MUSIC_LIBRARY_CATALOG||{works:[],composers:[],theory:[]};
const W=Array.isArray(C.works)?C.works:[];
const P=Array.isArray(C.composers)?C.composers:[];
const T=Array.isArray(C.theory)?C.theory:[];
const workById=Object.fromEntries(W.map(x=>[x.id,x]));
const people=Object.fromEntries(P.map(x=>[x.id,x]));
const lesson=Object.fromEntries(T.map(x=>[x.id,x]));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const validApple=url=>/^https:\/\/classical\.music\.apple\.com\/jp\/album\/[0-9]+$/.test(url);
const dom=id=>document.getElementById(id);
let tab='works',filter='すべて',query='',audioCtx=null;
const moodLabels=['すべて','静かに集中','構造を聴く','音色を楽しむ','声と合唱','刺激を受ける','響きを味わう'];
const intervalNames=['同度','短2度','長2度','短3度','長3度','完全4度','増4度・減5度','完全5度','短6度','長6度','短7度','長7度','オクターヴ'];
let semis=7,earFlag='平均律';
function tabOfHash(){
 const s=decodeURIComponent(location.hash.slice(1)||'');
 if(s.startsWith('theory/'))return 'theory';
 if(s.startsWith('composer/'))return 'composers';
 if(s.startsWith('work/'))return 'works';
 return ['works','composers','theory'].includes(s)?s:'works';
}
function route(){
 tab=tabOfHash();
 document.querySelectorAll('[data-tab]').forEach(btn=>{
  const active=btn.dataset.tab===tab;
  btn.classList.toggle('active',active);
  if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
 });
 render();
 const hash=decodeURIComponent(location.hash.slice(1)||'');
 const id=hash.split('/')[1],node=dom('item-'+id);
 if(node){node.scrollIntoView({block:'center',behavior:'auto'});node.style.outline='2px solid #b99958';setTimeout(()=>{node.style.outline=''},1800)}
}
function heading(title,desc,n){
 return '<div class="section-head"><div><h2>'+esc(title)+'</h2><p>'+esc(desc)+'</p></div><div class="stats">'+n+' 件</div></div>';
}
function trackMarkup(w){
 const c=people[w.composer];
 const focus=(w.focus||[]).map(s=>'<li>'+esc(s)+'</li>').join('');
 const url=validApple(w.url)?w.url:'https://classical.music.apple.com/jp';
 return '<article class="work" id="item-'+esc(w.id)+'"><div class="work-top"><div class="work-eyebrow">'+esc(w.era)+' / '+esc(w.genre)+'</div><h3>'+esc(w.title)+'</h3><div class="composer-name">'+esc(c?.name||w.composer)+'</div><p class="one-line">'+esc(w.note)+'</p></div>'+
 '<div class="performer"><strong>今回選んだ録音</strong><div>'+esc(w.performers)+'</div><div>'+esc(w.album)+'</div></div>'+
 '<div class="work-mid"><h4>耳を澄ませたいところ</h4><ul>'+focus+'</ul></div>'+
 '<div class="work-foot"><span class="time">聴き始め：'+esc(w.opening)+'<br>'+esc(w.minutes)+'</span><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" class="btn" aria-label="'+esc(w.title)+'をApple Music Classicalで聴く">Apple Music Classicalで聴く ↗</a></div>'+
 '<div class="work-trail">'+(lesson[w.theory]?'<a href="#theory/'+encodeURIComponent(w.theory)+'">この曲につながる理論：'+esc(lesson[w.theory].category)+' ↗</a>':'')+'</div></article>';
}
function matchingWorks(){
 return W.filter(w=>(filter==='すべて'||w.mood===filter)&&(!query||(w.title+' '+w.performers+' '+w.note+' '+w.genre+' '+people[w.composer]?.name).toLocaleLowerCase('ja').includes(query.toLocaleLowerCase('ja'))));
}
function updateWorks(){
 const el=dom('works-list');if(!el)return;
 const data=matchingWorks();
 el.innerHTML=data.length?data.map(trackMarkup).join(''):'<div class="empty">条件に合う作品がありません。絞り込みを変更してください。</div>';
 dom('work-count').textContent=data.length+' / '+W.length+'作品';
}
function worksUI(){
 return heading('今日は何を聴きますか？','曲を知るだけでなく、どこに耳を向けると面白いのかまで案内します。',W.length)+
 '<div class="filter" role="group" aria-label="聴き方を絞り込む">'+moodLabels.map(m=>'<button type="button" data-filter="'+esc(m)+'" aria-pressed="'+(filter===m)+'">'+esc(m)+'</button>').join('')+
 '<input class="search" id="music-search" type="search" placeholder="作品・作曲家・演奏者を検索" value="'+esc(query)+'" aria-label="作品や作曲家を検索"></div>'+
 '<p id="work-count" class="stats" aria-live="polite"></p><div class="grid" id="works-list"></div>'+
 '<p class="ear-warning">※ 表示されるリンクは特定の録音が含まれるApple Music Classicalのアルバムページです。曲ごとにトラックを選択してください。再生可能な範囲はApple側の契約・地域・環境によります。</p>';
}
function circle(){
 const keys=['C','G','D','A','E','B','F♯','D♭','A♭','E♭','B♭','F'];
 const cx=175,cy=175,r=131;
 const paths=keys.map((t,i)=>{
  const a=-Math.PI/2+i*Math.PI/6,x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);
  return '<g><circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="22" fill="'+(i===0?'#305e4b':'#e9efe9')+'" stroke="#c5d5c9"/><text x="'+x.toFixed(2)+'" y="'+(y+5).toFixed(2)+'" font-size="15" font-weight="700" text-anchor="middle" fill="'+(i===0?'white':'#2a523d')+'">'+esc(t)+'</text></g>';
 }).join('');
 return '<svg viewBox="0 0 350 350" role="img" aria-label="五度圏の模式図。CからG、D、Aと完全5度方向に時計回り" style="width:100%;max-width:270px;display:block;margin:auto"><circle cx="175" cy="175" r="132" stroke="#94b49c" stroke-width="2" fill="none" stroke-dasharray="4 8"/><text x="175" y="161" font-size="14" fill="#66816d" text-anchor="middle">五度圏</text><text x="175" y="186" font-size="11" fill="#66816d" text-anchor="middle">時計回りに完全5度</text>'+paths+'</svg>';
}
function earMarkup(){
 const letters=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B','C'];
 const black=new Set([1,3,6,8,10]);
 const keys=letters.map((name,i)=>'<span class="'+(black.has(i)?'black ':'')+((i===0||i===semis)?'active':'')+'" aria-hidden="true">'+name+'</span>').join('');
 return '<section class="interactive" aria-label="耳で試す音楽理論"><div class="interactive-head"><div class="eyebrow">耳で理解する / ORIGINAL AUDIO DEMO</div><h3>音程と和音を、実際に鳴らしてみる</h3><p>外部音源ではなく、ブラウザ内で合成した純音による教育用デモです。楽器の音色や実際の曲の演奏ではありません。</p></div>'+
 '<div class="ear-grid">'+
 '<div class="ear-box"><h4>音程を比べる</h4><label for="interval-slider">C4から何半音離す？ <strong id="interval-name">'+intervalNames[semis]+'</strong></label><input class="range" id="interval-slider" type="range" min="0" max="12" step="1" value="'+semis+'"><p class="meter" id="interval-detail">半音 '+semis+'個 ｜ 周波数比 '+Math.pow(2,semis/12).toFixed(4)+'</p>'+
 '<div class="ear-buttons"><button type="button" class="button-big" data-audio="interval">この音程を聴く ♪</button><button type="button" data-audio="melody">順番に聴く ♪</button></div></div>'+
 '<div class="ear-box"><h4>長調と短調の違い</h4><p class="meter">C-E-G と C-E♭-G。真ん中の音が半音変わります。</p><div class="ear-buttons"><button type="button" data-audio="major">Cメジャーを聴く</button><button type="button" data-audio="minor">Cマイナーを聴く</button></div><p class="ear-warning">同じ和音でも音色・配置・前後関係で感じ方は変わります。</p></div></div>'+
 '<div class="key-visual" id="key-visual">'+keys+'</div><p class="ear-warning">音量を下げてからお試しください。音が出ない場合はブラウザの音声許可や消音設定をご確認ください。</p></section>';
}
function theoryMarkup(t){
 const connected=t.work&&workById[t.work];
 return '<article class="theory-card" id="item-'+esc(t.id)+'"><div class="topic">'+esc(t.category)+' ／ '+esc(t.level)+'</div><h3>'+esc(t.title)+'</h3><p>'+esc(t.lead)+'</p><p class="detail">'+esc(t.concept)+'</p><div class="listen"><strong>耳で確かめる：</strong>'+esc(t.listen)+'</div>'+
 '<div class="theory-foot"><a class="btn alt" href="'+esc(t.source)+'" target="_blank" rel="noopener noreferrer">参考資料を読む ↗</a>'+
 (connected?'<a class="btn" href="#work/'+encodeURIComponent(connected.id)+'">関連作品を聴く ↗</a>':'')+
 (t.link?'<a href="./#article/'+encodeURIComponent(t.link)+'" class="btn alt">図書館の関連記事 ↗</a>':'')+'</div></article>';
}
function theoryUI(){
 return heading('音楽理論は、音で確かめて理解する。','専門用語だけを覚えるのではなく、聴く・見る・考えるをつなげます。',T.length)+
 earMarkup()+
 '<section class="interactive" style="background:#f0f4ec" aria-label="五度圏の見方"><div class="ear-grid"><div><h3>五度圏：調のつながりを視覚化する</h3><p>時計回りに完全5度ずつ進むと、調号のシャープが一つずつ増えます。反対方向に進むとフラットが増えます。</p><p class="ear-warning">図は長調の主音を示す模式図です。異名同音調や短調の関係、実際の転調経路の全てを説明するものではありません。</p><a href="./#article/temperament" class="btn alt">音律の記事へ ↗</a></div><div>'+circle()+'</div></div></section>'+
 '<div class="theory-grid">'+T.map(theoryMarkup).join('')+'</div>';
}
function composerMarkup(c){
 const w=workById[c.work];
 return '<article class="composer-card" id="item-'+esc(c.id)+'"><div class="topic" style="font-size:12px;color:#8c7046;font-weight:800">'+esc(c.era)+'</div><h3>'+esc(c.name)+'</h3><div class="years">'+esc(c.years)+' ／ '+esc(c.tag)+'</div><p>'+esc(c.intro)+'</p><div class="context">'+esc(c.context)+'</div><div class="theory-foot"><a class="btn" href="#work/'+encodeURIComponent(w?.id||'')+'">'+esc(w?.title||'作品')+'を聴く ↗</a></div></article>';
}
function composersUI(){
 return heading('作曲家を知ると、音楽の聞こえ方が変わる。','音楽史の流れと、作品に込められた技法から作曲家を知ります。',P.length)+
 '<div class="composer-grid">'+P.map(composerMarkup).join('')+'</div>'+
 '<section class="interactive" style="margin-top:24px"><h3>歴史を横断して聴いてみる</h3><p>バロックから現代まで、同じ「音楽」でも様式・演奏場所・作曲家の役割は変化します。</p><div class="theory-links">'+['バロック','古典派','ロマン派','20世紀','現代'].map(s=>'<span class="mini-flag">'+s+'</span>').join('')+'</div><p class="ear-warning">様式の境界は時代によって重なります。一つの作曲家を一つの時代へ厳密に分類できるわけではありません。</p></section>';
}
function render(){
 const body=tab==='theory'?theoryUI():tab==='composers'?composersUI():worksUI();
 dom('content').innerHTML=body;
 if(tab==='works')updateWorks();
}
function updateInterval(){
 const label=dom('interval-name'),detail=dom('interval-detail'),keys=dom('key-visual');
 if(label)label.textContent=intervalNames[semis];
 if(detail)detail.textContent='半音 '+semis+'個 ｜ 周波数比 '+Math.pow(2,semis/12).toFixed(4);
 if(keys){[...keys.children].forEach((el,i)=>el.classList.toggle('active',i===0||i===semis))}
}
function toast(message){
 const el=dom('toast');el.textContent=message;el.className='toast visible';
 clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.className='toast',4000);
}
async function playNotes(notes,duration=1.45,arpeggiate=false){
 const AudioContext=window.AudioContext||window.webkitAudioContext;
 if(!AudioContext){toast('このブラウザは音声の生成に対応していません。');return}
 try{
  if(!audioCtx)audioCtx=new AudioContext();
  if(audioCtx.state==='suspended')await audioCtx.resume();
  const start=audioCtx.currentTime+.06;
  const n=notes.length;
  notes.forEach((freq,i)=>{
   const t=start+(arpeggiate?i*.52:0),osc=audioCtx.createOscillator(),amp=audioCtx.createGain();
   osc.type='sine';osc.frequency.value=freq;
   const end=t+duration;
   const vol=.075/Math.sqrt(n);
   amp.gain.setValueAtTime(0,t);
   amp.gain.linearRampToValueAtTime(vol,t+.045);
   amp.gain.setValueAtTime(vol,Math.max(t+.05,end-.16));
   amp.gain.linearRampToValueAtTime(0,end);
   osc.connect(amp);amp.connect(audioCtx.destination);osc.start(t);osc.stop(end+.02);
  });
 }catch(e){toast('音を再生できませんでした。端末の音声設定をご確認ください。')}
}
function audioAction(kind){
 const c4=261.6255653;
 if(kind==='interval')playNotes([c4,c4*Math.pow(2,semis/12)]);
 if(kind==='melody')playNotes([c4,c4*Math.pow(2,semis/12)],.48,true);
 if(kind==='major')playNotes([c4,c4*Math.pow(2,4/12),c4*Math.pow(2,7/12)],2.2);
 if(kind==='minor')playNotes([c4,c4*Math.pow(2,3/12),c4*Math.pow(2,7/12)],2.2);
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-tab]');if(b){location.hash=b.dataset.tab;return}
 const f=e.target.closest('[data-filter]');if(f){filter=f.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===f)));updateWorks();return}
 const a=e.target.closest('[data-audio]');if(a){audioAction(a.dataset.audio)}
});
document.addEventListener('input',e=>{
 if(e.target.id==='music-search'){query=e.target.value;updateWorks()}
 if(e.target.id==='interval-slider'){semis=Math.max(0,Math.min(12,Number(e.target.value)||0));updateInterval()}
});
window.addEventListener('hashchange',route);
route();
window.MUSIC_LIBRARY_DEBUG={counts:{works:W.length,composers:P.length,theory:T.length},validRecordings:W.every(w=>validApple(w.url)&&!!people[w.composer]&&!!lesson[w.theory]),state:()=>({tab,filter,query})};
})();
