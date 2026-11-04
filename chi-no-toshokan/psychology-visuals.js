/* 心理学の教育用図解。研究の測定値ではなく、概念を区別する模式図。 */
(()=>{
 const base=window.KNOWLEDGE_VISUALS;
 if(!base?.render)return;
 const header=(title,subtitle,svg)=>'<section class="education-visual"><div class="kicker">PSYCHOLOGY · VISUAL EXPLANATION</div><h2>'+title+'</h2><p>'+subtitle+'</p>'+svg+'<p class="visual-disclaimer">オリジナルの教育用模式図です。実測データ、治療成績、診断基準を示す図ではありません。</p></section>';
 const rect=(x,y,w,h,label,color='#e7f0e7',text='#274b3c')=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="13" fill="'+color+'" stroke="#b8cebb"/><text x="'+(x+w/2)+'" y="'+(y+h/2+5)+'" font-size="16" text-anchor="middle" font-weight="700" fill="'+text+'">'+label+'</text>';
 function habit(){
  const svg='<svg viewBox="0 0 650 236" class="edu-svg" role="img" aria-label="生活の場面が行動のきっかけとなり、反復によって自動性が育つという習慣形成の概念図。所要日数は固定ではない。">'+
  '<rect width="650" height="236" rx="14" fill="#f5f7f2"/>'+
  rect(20,65,163,65,'きっかけ')+rect(241,65,163,65,'小さな行動')+rect(462,65,163,65,'反復と自動性','#dbe9dd')+
  '<g fill="none" stroke="#6e947b" stroke-width="3"><path d="M184 98H231m-9 -8l10 8 -10 8M405 98H452m-9 -8l10 8 -10 8"/></g>'+
  '<text x="325" y="35" text-anchor="middle" font-size="13" fill="#5d725f">「いつ・どこで」が行動の手掛かりになる</text>'+
  '<path d="M535 140V173H107V141" stroke="#83a789" stroke-width="2.5" fill="none" stroke-dasharray="6 6"/>'+
  '<path d="M100 152l7 -11 7 11" stroke="#83a789" stroke-width="2" fill="none"/>'+
  '<text x="325" y="197" text-anchor="middle" font-size="13" fill="#526d57">日数は人や行動によって異なります</text></svg>';
  return header('習慣は、いつ自動的になる？','一定のきっかけと行動の反復を図にしたものです。「21日で完成」という期限はありません。',svg);
 }
 function alliance(){
  const svg='<svg viewBox="0 0 650 228" class="edu-svg" role="img" aria-label="治療同盟の要素を目標の合意、取り組みの合意、協働の関係として示し、治療結果との統計的な関連を注記した図。">'+
  '<rect width="650" height="228" rx="14" fill="#f5f7f2"/>'+rect(25,39,190,60,'目標への合意')+rect(230,39,190,60,'取り組みの合意')+rect(435,39,190,60,'協働の関係')+
  '<path d="M325 111v31" stroke="#70927b" stroke-width="3"/>'+
  '<rect x="121" y="146" width="408" height="57" rx="11" fill="#285944"/>'+
  '<text x="325" y="167" fill="white" font-size="16" font-weight="700" text-anchor="middle">治療結果と統計的な関連</text>'+
  '<text x="325" y="187" fill="#deebdc" font-size="12" text-anchor="middle">関連 ≠ この要因だけが原因</text></svg>';
  return header('「信頼関係」を三つに分けてみる','心理療法での協働関係と治療結果の関連を示します。因果関係の証明ではありません。',svg);
 }
 function therapies(){
  const svg='<svg viewBox="0 0 650 252" class="edu-svg" role="img" aria-label="認知行動療法、行動活性化、短期精神力動的心理療法がそれぞれ注目する側面を対比した概念図。">'+
  '<rect width="650" height="252" rx="14" fill="#f5f7f2"/>'+
  rect(20,42,196,57,'CBT')+rect(227,42,196,57,'行動活性化')+rect(434,42,196,57,'精神力動的')+
  '<g font-size="13" text-anchor="middle" fill="#3d5a47"><text x="118" y="131">認知・感情・行動</text><text x="325" y="131">活動と気分</text><text x="532" y="131">関係性や感情の型</text>'+
  '<text x="118" y="151">の関係を検討</text><text x="325" y="151">の関連を検討</text><text x="532" y="151">を理解する</text></g>'+
  '<rect x="68" y="186" width="514" height="43" rx="12" fill="#e7e9d9" stroke="#bdc9b6"/>'+
  '<text x="325" y="211" font-size="15" font-weight="700" fill="#4a5f47" text-anchor="middle">適切な選択は、状態・希望・専門的な評価を踏まえる</text></svg>';
  return header('心理療法は、何に注目する？','療法名の違いを入口として整理します。各療法のすべての技法を網羅したものではありません。',svg);
 }
 function activity(){
  const svg='<svg viewBox="0 0 650 228" class="edu-svg" role="img" aria-label="日常の活動と気分が互いに影響しうる関係を両向きの矢印で示す概念図。">'+
  '<rect width="650" height="228" rx="14" fill="#f5f7f2"/>'+
  rect(28,68,207,74,'日常の活動','#e7f0e7')+rect(417,68,207,74,'気分・感情','#e7f0e7')+
  '<path d="M245 91H404m-13 -9l13 9 -13 9M404 124H245m13 -9l-13 9 13 9" stroke="#648b70" stroke-width="3.5" fill="none"/>'+
  '<text x="325" y="36" font-size="14" text-anchor="middle" fill="#4e6856">双方向に影響しうる</text>'+
  '<text x="325" y="188" text-anchor="middle" font-size="13" fill="#5d725f">「行動すれば必ず改善する」とは示していません</text></svg>';
  return header('行動と気分の関係を考える','状況や状態によって関係は変わります。無条件で活動量を増やすことを勧める図ではありません。',svg);
 }
 const map={'habit-loop':habit,'alliance-relationship':alliance,'therapy-compare':therapies,'activity-mood':activity};
 window.KNOWLEDGE_VISUALS={...base,render(id){return map[id]?map[id]():base.render(id)}};
})();