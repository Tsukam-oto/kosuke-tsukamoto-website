/* Original educational diagrams only; never represent simulations as actual observations. */
window.KNOWLEDGE_VISUALS = (()=>{
 const stageData=[
  {label:'譜線のないネウマ',desc:'旋律を既に知る人への手掛かり。正確な音高までは読み取れないことがあります。',lines:0},
  {label:'音高の基準となる線',desc:'音の高さの基準を置き、旋律の高低をさらに分かりやすくします。',lines:2},
  {label:'複数の譜線',desc:'音の高さの関係を視覚的に扱いやすくなりました。これは現在の記譜法へ続く流れの模式図です。',lines:4}
 ];
 function neumeGraphic(stage){
  const item=stageData[stage]||stageData[0];
  const lines=Array.from({length:item.lines},(_,i)=>`<line x1="75" y1="${83+i*20}" x2="645" y2="${83+i*20}" stroke="#b99466" stroke-width="2"/>`).join('');
  const notes=stage===0?
   `<g fill="none" stroke="#314b41" stroke-width="5" stroke-linecap="round"><path d="M105 112l20 -24 20 12 25 -40"/><path d="M230 90l32 23 18 -30"/><path d="M352 105l22 -18 18 10 24 -29"/><path d="M485 88l20 -20 25 25"/></g>`:
   Array.from({length:7},(_,i)=>{const y=105+(Math.round(Math.sin(i*1.5)*1.5))*10;const x=112+i*72;return `<g><ellipse cx="${x}" cy="${y}" rx="10" ry="8" fill="#294e41" transform="rotate(-20 ${x} ${y})"/><line x1="${x+8}" y1="${y}" x2="${x+8}" y2="${y-39}" stroke="#294e41" stroke-width="3"/></g>`}).join('');
  return `<svg viewBox="0 0 720 210" role="img" aria-label="${item.label}の模式図。実在する写本の忠実な再現ではありません。" class="edu-svg"><rect x="0" y="0" width="720" height="210" rx="12" fill="#fbf8ec"/><text x="28" y="30" fill="#6c775f" font-size="13">${stage+1} / 3　${item.label}（模式図）</text>${lines}${notes}<text x="360" y="193" text-anchor="middle" fill="#68786d" font-size="12">実際の中世写本では時代・地域ごとに多様な記譜法が使われました。</text></svg>`;
 }
 function curvePath(percent){
  const depth=Math.pow(percent/100,2)*920;
  return `M 25 74 L 115 74 C 130 74 138 ${74+depth} 153 ${74+depth} L 318 ${74+depth} C 339 ${74+depth} 345 74 365 74 L 454 74`;
 }
 function transitSvg(percent){
  const r=(64*percent/100).toFixed(2);
  return `<svg viewBox="0 0 720 300" role="img" aria-label="恒星の前を横切る惑星と、半径比から計算した光度曲線の模式図。実測データではありません。" class="edu-svg">
    <rect width="720" height="300" rx="14" fill="#f4f6f1"/>
    <g transform="translate(130 105)"><circle r="64" fill="#ecc779"/><circle r="${r}" cx="17" cy="0" fill="#29433f" stroke="#f3faf7" stroke-width="1.5"/><text y="89" text-anchor="middle" font-size="12" fill="#50695c">星の前を横切る惑星</text></g>
    <g transform="translate(220 35)"><text x="5" y="18" font-size="13" fill="#4b5d50">受け取る光の量</text><line x1="15" y1="40" x2="15" y2="165" stroke="#a5b4a8"/><line x1="15" y1="165" x2="460" y2="165" stroke="#a5b4a8"/><path d="${curvePath(percent)}" stroke="#315b50" stroke-width="5" fill="none" stroke-linecap="round"/><line x1="250" y1="43" x2="250" y2="173" stroke="#c59c62" stroke-dasharray="5 5" opacity=".7"/><text x="250" y="187" font-size="12" text-anchor="middle" fill="#54685d">通過中</text><text x="430" y="187" font-size="12" text-anchor="middle" fill="#54685d">時間 →</text></g>
    <text x="360" y="282" text-anchor="middle" font-size="12" fill="#65726a">単純化した幾何モデル：実際の観測データではありません。</text></svg>`;
 }
 function memorySvg(){
  return `<svg viewBox="0 0 720 300" role="img" aria-label="記憶想起後の再固定化に関する条件付きの概念図。すべての記憶が必ず変化するわけではありません。" class="edu-svg">
    <rect x="0" y="0" width="720" height="300" fill="#f5f6f1" rx="14"/>
    <g font-size="15" text-anchor="middle" font-weight="600"><rect x="26" y="103" width="145" height="72" rx="12" fill="#e4eee4" stroke="#8aab96"/><text x="98" y="133" fill="#21443a">記憶を</text><text x="98" y="154" fill="#21443a">思い出す</text>
    <rect x="248" y="36" width="175" height="79" rx="12" fill="#f1e9d5" stroke="#b99f6e"/><text x="335" y="66" fill="#644f2b">条件によって</text><text x="335" y="88" fill="#644f2b">不安定化が起こる</text>
    <rect x="248" y="193" width="175" height="75" rx="12" fill="#edf0e9" stroke="#aeb9ab"/><text x="335" y="225" fill="#4e6356">不安定化しない</text><text x="335" y="247" fill="#4e6356">場合もある</text>
    <rect x="510" y="36" width="180" height="79" rx="12" fill="#e4eee4" stroke="#8aaa98"/><text x="600" y="65" fill="#275044">再び安定化</text><text x="600" y="87" fill="#275044">更新の可能性</text>
    <rect x="510" y="193" width="180" height="75" rx="12" fill="#edf0e9" stroke="#aeb9ab"/><text x="600" y="223" fill="#4e6356">記憶が必ず</text><text x="600" y="245" fill="#4e6356">変わるわけではない</text></g>
    <g fill="none" stroke="#8f9e8e" stroke-width="2.5"><path d="M171 122 L248 75"/><path d="M171 156 L248 231"/><path d="M423 76 L510 76"/><path d="M423 230 L510 230"/></g>
    <text x="360" y="22" text-anchor="middle" fill="#697a6e" font-size="12">再固定化研究から整理した概念図・すべてのケースに適用できません</text>
  </svg>`;
 }
 function render(topic){
  if(topic==='notation')return `<section class="education-visual"><div class="kicker">VISUAL EXPLANATION</div><h2>楽譜の変化を比べる</h2><p>表示を切り替えて、音高の手掛かりがどのように加わるか確認できます。</p><div class="visual-actions" role="group" aria-label="記譜法の模式図を切り替え">${stageData.map((x,i)=>`<button class="visual-step ${i===0?'active':''}" data-notation-stage="${i}" aria-pressed="${i===0}">${i+1}. ${x.label}</button>`).join('')}</div><div id="notation-figure">${neumeGraphic(0)}</div><p id="notation-caption" class="visual-caption">${stageData[0].desc}</p><p class="visual-disclaimer">模式図であり、特定の写本の画像や年代を正確に再現したものではありません。</p></section>`;
  if(topic==='transit')return `<section class="education-visual"><div class="kicker">TRY THE SCIENCE</div><h2>惑星の大きさで、光の減り方はどう変わる？</h2><p>星と惑星の半径比を変更すると、単純なモデルの光度曲線が変わります。</p><label class="visual-slider-label" for="planetSize">惑星の半径 ÷ 恒星の半径：<strong id="transit-percent">10%</strong></label><input type="range" min="5" max="25" step="1" value="10" id="planetSize" aria-label="惑星の半径比"/><p id="transit-depth" class="visual-metric">理想化した減光率：1.00%</p><div id="transit-figure">${transitSvg(10)}</div><p class="visual-disclaimer">半径比の二乗で計算した教育用モデルです。恒星の周縁減光、観測誤差、実在の惑星データは含んでいません。</p></section>`;
  if(topic==='memory')return `<section class="education-visual"><div class="kicker">HOW TO READ THE EVIDENCE</div><h2>記憶を思い出した後、何が起こる？</h2><p>「思い出す＝必ず書き換わる」とは言えません。条件の分岐を含む概念図です。</p>${memorySvg()}<p class="visual-disclaimer">研究から整理した模式図で、臨床上の診断・治療効果を示す図ではありません。</p></section>`;
  return '';
 }
 function bindAction(target){
   const btn=target.closest('[data-notation-stage]');
   if(btn){const i=Number(btn.dataset.notationStage);if(!stageData[i])return false;const fig=document.getElementById('notation-figure');if(fig)fig.innerHTML=neumeGraphic(i);const cap=document.getElementById('notation-caption');if(cap)cap.textContent=stageData[i].desc;document.querySelectorAll('[data-notation-stage]').forEach(b=>{const active=Number(b.dataset.notationStage)===i;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});return true}
   return false;
 }
 function bindInput(target){
   if(target?.id!=='planetSize')return false;
   const value=Math.min(25,Math.max(5,Number(target.value)||10));
   const fig=document.getElementById('transit-figure');if(fig)fig.innerHTML=transitSvg(value);
   const percent=document.getElementById('transit-percent');if(percent)percent.textContent=`${value}%`;
   const depth=document.getElementById('transit-depth');if(depth)depth.textContent=`理想化した減光率：${(value*value/100).toFixed(2)}%`;
   return true;
 }
 return {render,bindAction,bindInput};
})();