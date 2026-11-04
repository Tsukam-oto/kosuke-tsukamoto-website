/* Private Mummy research UI.
   All essay/lyric bodies arrive only from a logged-in user's RLS-protected database. */
(function(root){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={works:[],theme:'all',query:'',limit:36};
function reset(){state.works=[];state.theme='all';state.query='';state.limit=36;}
function chooseTheme(id){state.theme=id;state.limit=36;}
function search(q){state.query=String(q||'');state.limit=36;}
function more(){state.limit+=36;}
function list(){
 if(!root.MummyResearch)return '<p>検索エンジンを読み込めませんでした。</p>';
 const result=root.MummyResearch.searchWorks(state.works,state.query,state.theme,state.limit);
 const items=result.rows.map(r=>'<article class="mummy-work-row"><strong>《'+esc(r.work.title)+'》</strong>'+
 '<small>'+esc(r.work.collection||'出典名不明')+'</small>'+
 '<p class="mummy-source-status">'+esc(r.work.sourceStatus==='unverified_pdf_extract'?'PDF抽出・未校正':'本文の照合状況を確認')+'</p>'+
 (r.observed?'<p class="mummy-keywords">文字列一致：'+esc(r.observed.terms.join('・'))+' / '+r.observed.matchedLines+'行</p>'+
 '<div class="mummy-lyric-evidence">'+r.observed.evidence.slice(0,2).map(e=>
 '<p><small>L'+e.line+'</small> '+esc(e.text)+'</p>').join('')+'</div>':'')+
 '<button class="btn sm" data-open="'+esc(r.work.id)+'">歌詞原文を読む</button></article>').join('');
 return '<p class="mummy-count">該当作品：<strong>'+result.count+'</strong>件'+
 (result.count>result.rows.length?'（'+result.rows.length+'件表示中）':'')+'</p>'+
 '<div class="mummy-work-list">'+(items||'<p class="desc">一致する文字列はありません。「未使用」「無関係」という意味ではありません。</p>')+'</div>'+
 (result.count>result.rows.length?'<button class="btn" data-mummy-more>さらに表示する</button>':'');
}
function build({status,source,passages=[],connections=[],works=[]}){
 if(status==='signed_out')return '<div class="panel mummy-locked"><h2>本人専用の研究室</h2>'+
 '<p>木乃伊の歌詞と作者エッセイは非公開です。本人アカウントでログインして読むことができます。公開ページのソースに私的な原文は含めていません。</p>'+
 '<button class="btn primary" id="cloudLogin">本人アカウントでログイン</button></div>';
 if(status==='loading')return '<div class="panel mummy-locked"><h2>原文を読み込んでいます</h2><p>認証された原文と研究資料を確認しています。</p></div>';
 if(status==='error')return '<div class="panel mummy-locked"><h2>研究資料の取得に失敗しました</h2><p>ログイン状態を確認し、管理画面で「クラウドを再確認」を使用してください。原文を推測で補いません。</p></div>';
 if(!source)return '<div class="notice">研究資料がまだ登録されていません。</div>';
 state.works=works.filter(w=>w.sky==='rap'&&w.sourceSystem==='lyric_master');
 const analysis=root.MummyResearch?.analyze(state.works);
 const checked=root.MummyResearch?.verify(source,passages,connections,state.works)||
 {passages:[],connections:[],discarded:0};
 const metrics='<div class="mummy-stats">'+[
 ['作品本文',state.works.length],['エッセイ精読',checked.passages.length],
 ['作品比較候補',checked.connections.length],['校正前の本文',analysis?.unverified||0]
 ].map(([k,v])=>'<div><b>'+v+'</b><small>'+esc(k)+'</small></div>').join('')+'</div>';
 const essay='<section class="mummy-section"><div class="eyebrow">AUTHOR DOCUMENT / 作者資料</div>'+
 '<h2>《'+esc(source.title)+'》</h2><p class="desc">'+esc(source.date_label||'執筆年月不明')+
 '（本人申告）。歌詞作品とは別に保管しています。作成日をファイルの記録で検証したものではありません。</p>'+
 '<details class="mummy-essay"><summary>エッセイの原文全文を開く</summary><pre>'+
 esc(source.original_text)+'</pre></details></section>';
 const interpretation='<section class="mummy-section"><div class="eyebrow">CLOSE READING</div><h2>エッセイから読み取れる問い</h2>'+
 '<p class="desc">原文にある二つの箇所を並べています。読みは解釈上の仮説であり、作者自身が確認した意図ではありません。</p>'+
 '<div class="mummy-reading-grid">'+checked.passages.map(p=>'<article class="mummy-reading-card"><h3>'+
 esc(p.heading)+'</h3><blockquote>'+esc(p.evidence_a)+'</blockquote><blockquote>'+esc(p.evidence_b)+'</blockquote>'+
 '<div class="mummy-reading-sub"><b>読みの仮説</b><p>'+esc(p.interpretation)+'</p></div>'+
 '<div class="mummy-reading-sub"><b>異なる解釈</b><p>'+esc(p.alternative)+'</p></div>'+
 '<p class="mummy-question">'+esc(p.inquiry)+'</p></article>').join('')+'</div></section>';
 const linked='<section class="mummy-section"><div class="eyebrow">LYRICS × ESSAY</div><h2>ほかの木乃伊作品と読み比べる</h2>'+
 '<p class="desc">エッセイと歌詞の両方に引用の存在を確認できた比較です。PDF抽出本文は未校正のため、解釈も暫定です。制作順序や影響関係は断定しません。</p>'+
 checked.connections.map(c=>'<article class="mummy-connection"><h3>'+esc(c.heading)+'</h3><p class="mummy-linked-title">《'+
 esc(c.work.title)+'》 <small>'+esc(c.work.collection||'')+'</small></p>'+
 '<div class="mummy-compare"><div><small>エッセイの原文</small><blockquote>'+esc(c.essay_evidence)+'</blockquote></div>'+
 '<div><small>歌詞の原文 L'+(c.verifiedLine||'?')+'</small><blockquote>'+esc(c.lyric_evidence)+'</blockquote></div></div>'+
 '<p><b>読みの仮説：</b>'+esc(c.interpretation)+'</p><p class="desc"><b>別の解釈：</b>'+esc(c.alternative)+'</p>'+
 '<button class="btn sm" data-open="'+esc(c.work.id)+'">作品の原文全文を読む</button></article>').join('')+'</section>';
 const themeTabs='<section class="mummy-section"><div class="eyebrow">CORPUS INDEX</div><h2>168作品の原文をたどる</h2>'+
 '<p class="desc">これは原文から一致する言葉を拾う索引です。作品の主題・作者の思想をAIが自動確定したものではありません。合唱作品や余白の原稿は混ぜません。</p>'+
 '<div class="mummy-theme-tabs"><button class="mummy-theme '+(state.theme==='all'?'active':'')+'" data-mummy-theme="all">全作品 '+state.works.length+'</button>'+
 (analysis?.groups||[]).map(g=>'<button class="mummy-theme '+(state.theme===g.id?'active':'')+
 '" data-mummy-theme="'+esc(g.id)+'">'+esc(g.name)+' '+g.matched+'</button>').join('')+'</div>'+
 '<label for="mummySearch" class="mummy-search-label">作品名・歌詞の言葉を探す</label>'+
 '<input id="mummySearch" type="search" class="search" placeholder="言葉を入力" value="'+esc(state.query)+'">'+
 '<div id="mummyResearchList">'+list()+'</div>'+
 '<p class="desc">検索結果に出ないことは、関係がないという証拠にはなりません。作詞年代の順序も推定していません。</p></section>';
 const warning=checked.discarded?'<p class="notice">現行原文で引用を確認できなかった分析 '+checked.discarded+'件は表示していません。</p>':'';
 return metrics+warning+essay+interpretation+linked+themeTabs;
}
root.MummyResearchView={build,list,reset,chooseTheme,search,more,getState:()=>({...state})};
})(typeof window!=='undefined'?window:globalThis);
