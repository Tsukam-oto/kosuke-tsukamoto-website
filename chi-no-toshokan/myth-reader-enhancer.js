/* Decorative narrative art and editorial additions. No claims of historical reconstructions. */
window.MYTH_ENHANCER=(()=>{
 const extras=window.MYTH_EXTRAS||{};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 function sceneArt(){
  const stars=Array.from({length:70},(_,i)=>{const x=(i*173+27)%780,y=(i*59+21)%151;return '<circle cx="'+x+'" cy="'+y+'" r="'+(i%7===0?1.7:.85)+'"/>'}).join('');
  return '<figure class="scene-art" role="group" aria-label="古代の宇宙創成を想像した創作挿絵"><svg viewBox="0 0 780 290" role="img" aria-label="夜空の星、山と海が広がる創作風景。実際の古代ギリシャ美術ではありません。" style="width:100%;height:auto;display:block">'+
  '<defs><linearGradient id="gksky" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#10203d"/><stop offset=".62" stop-color="#4c5b78"/><stop offset="1" stop-color="#bba787"/></linearGradient><linearGradient id="gkearth" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#6f9380"/><stop offset="1" stop-color="#1b4638"/></linearGradient><radialGradient id="gklight"><stop stop-color="#edcc94" stop-opacity=".70"/><stop offset="1" stop-color="#edcc94" stop-opacity="0"/></radialGradient></defs>'+
  '<rect width="780" height="290" fill="url(#gksky)"/><g fill="#ffefca" opacity=".86">'+stars+'</g><ellipse cx="530" cy="119" rx="250" ry="120" fill="url(#gklight)"/>'+
  '<path d="M0 239 L100 174 L150 212 L267 132 L346 204 L467 139 L570 218 L666 161 L780 209 V290 H0Z" fill="#668576"/>'+
  '<path d="M0 257 L124 210 L210 245 L305 189 L390 244 L498 217 L630 239 L738 194 L780 216 V290 H0Z" fill="url(#gkearth)"/>'+
  '<path d="M0 269 Q142 255 252 275 Q383 254 502 274 Q641 256 780 271 V290 H0Z" fill="#254f5a"/>'+
  '<path d="M0 273 Q150 260 270 277 Q406 258 537 278 Q665 261 780 276" fill="none" stroke="#b6d1ca" stroke-width="2.5" opacity=".55"/></svg>'+
  '<figcaption>創作イラスト：大地と天空の情景を想像で描いたものです。古代の実物図版や科学的な宇宙像ではありません。</figcaption></figure>';
 }
 function accurateOrigins(){
 const items=[['カオス',20],['ガイア',195],['タルタロス',370],['エロス',545]];
 const nodes=items.map(([t,x],i)=>'<rect x="'+x+'" y="44" width="155" height="62" rx="12" fill="'+(i===1?'#315e49':'#e1e9de')+'" stroke="#b0c6b6"/><text x="'+(x+77)+'" y="82" text-anchor="middle" font-size="18" font-weight="700" fill="'+(i===1?'white':'#315247')+'">'+t+'</text>').join('');
 return '<div class="figure" aria-label="ヘシオドスの原初の存在の関係図"><h3>原初の存在を、混同せずに整理</h3>'+
 '<svg viewBox="0 0 720 242" role="img" aria-label="カオス、ガイア、タルタロス、エロスを並べ、ガイアからウラノスへの親子関係だけを矢印で示しています。" style="width:100%;height:auto;display:block"><rect x="3" y="7" width="714" height="225" rx="13" fill="#f1f4ed"/>'+
 '<text x="360" y="30" text-anchor="middle" fill="#64766d" font-size="12">ヘシオドス『神統記』116行以降の登場関係</text>'+nodes+
 '<path d="M272 108V141" stroke="#527e5b" stroke-width="3"/><path d="M265 133l7 9 7-9" fill="none" stroke="#527e5b" stroke-width="3"/>'+
 '<rect x="190" y="151" width="165" height="53" rx="11" fill="#d4e5e4" stroke="#a5c1be"/><text x="272" y="183" text-anchor="middle" font-size="16" font-weight="700" fill="#275346">ウラノス（天空）</text>'+
 '<text x="530" y="166" text-anchor="middle" fill="#587064" font-size="13">横並び＝登場順</text><text x="530" y="187" text-anchor="middle" fill="#587064" font-size="13">矢印＝生み出した関係</text></svg>'+
 '<small>カオスからガイアが生まれたと示している図ではありません。「先に現れた」と「親である」は別のことです。</small></div>';
 }
 function artifact(art){
  if(!art||!art.src.startsWith('https://')||!art.source.startsWith('https://'))return '';
  return '<figure class="museum-art"><div class="museum-image"><img src="'+esc(art.src)+'" alt="'+esc(art.title)+'が描かれた古代ギリシャの陶器" loading="lazy" decoding="async" width="780" height="560"></div>'+
  '<figcaption><b>実際の古代美術：'+esc(art.title)+'</b><span>'+esc(art.caption)+'</span><a href="'+esc(art.source)+'" target="_blank" rel="noopener noreferrer">所蔵館の解説とパブリックドメイン表示を確認 ↗</a></figcaption></figure>';
 }
 function glossary(words){
 if(!Array.isArray(words)||!words.length)return '';
 return '<details class="chapter-glossary"><summary>登場人物と用語を整理する <span aria-hidden="true">＋</span></summary><dl>'+words.map(([term,meaning])=>'<div><dt>'+esc(term)+'</dt><dd>'+esc(meaning)+'</dd></div>').join('')+'</dl></details>';
 }
 function afterRender(ch){
 const card=document.getElementById('chapter'),ex=extras[ch.id]||{};
 if(!card)return;
 const lead=card.querySelector('.chapter-lead');
 const image=(ch.id==='origins'?sceneArt():'')+artifact(ex.art);
 if(lead&&image)lead.insertAdjacentHTML('afterend',image);
 if(ex.scene&&lead)lead.insertAdjacentHTML('afterend','<div class="story-atmosphere"><span>物語の扉を開く</span><p>'+esc(ex.scene)+'</p></div>');
 if(ch.id==='origins'){const fig=card.querySelector('.figure');if(fig)fig.outerHTML=accurateOrigins();}
 const body=card.querySelector('.chapter-body');
 if(body&&ex.more?.length)body.insertAdjacentHTML('beforeend','<section class="deeper-reading"><h3>もう少し深く読む</h3>'+ex.more.map(p=>'<p>'+esc(p)+'</p>').join('')+'</section>');
 const insight=card.querySelector('.insight');if(insight){const terms=glossary(ex.words);if(terms)insight.insertAdjacentHTML('beforebegin',terms);}
 }
 return {afterRender};
})();