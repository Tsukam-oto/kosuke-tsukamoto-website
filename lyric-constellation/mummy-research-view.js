/* 木乃伊｜歌詞ごとの精読が主役。エッセイは独立した一作品として末尾に配置。
   All source bodies and notes arrive only from owner-scoped Supabase; never bundle originals. */
(function(root){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={works:[],readings:[],dialogues:[],challenges:[],challengeDiscarded:0,theme:'all',query:'',limit:36,
 mode:'all',selectedId:null,source:null,passages:[],essayLinks:[]};
function reset(){
 state.works=[];state.readings=[];state.dialogues=[];state.challenges=[];state.challengeDiscarded=0;state.theme='all';state.query='';
 state.limit=36;state.mode='all';state.selectedId=null;state.source=null;
 state.passages=[];state.essayLinks=[];
}
function chooseTheme(id){state.theme=id;state.limit=36;}
function search(q){state.query=String(q||'');state.limit=36;}
function more(){state.limit+=36;}
function chooseMode(next){if(['all','studied','awaiting'].includes(next)){state.mode=next;state.limit=36;}}
function selectWork(id){if(state.works.some(w=>w.id===id))state.selectedId=id;}
const worksWithReadings=()=>new Set(state.readings.map(x=>x.work.id));
// Private-only research updates. Never accept a note unless its exact source
// version and quoted evidence are present in the owner's currently loaded corpus.
function verifyChallenges(items,works){
 const byId=new Map(works.map(w=>[w.id,w]));
 const verified=[];let discarded=0;
 for(const item of items||[]){
  const work=byId.get('master-'+String(item?.work_id||''));
  const evidence=String(item?.evidence||'');
  if(!work||!evidence||
     Number(item.quoted_source_version)!==Number(work.sourceVersionNo)||
     !String(work.lyrics||'').includes(evidence)){
   discarded++;continue;
  }
  verified.push({...item,workId:work.id});
 }
 return {verified,discarded};
}
function challengeCards(work){
 const entries=state.challenges.filter(item=>item.workId===work.id);
 if(!entries.length)return '';
 return '<section class="mummy-section mummy-reading-revisions">'+
  '<h4>読みの更新・反証</h4>'+
  '<p class="desc">以前の解釈を何によって見直したかを示す本人専用の研究記録です。AIの仮説であり、作者の意図を確定するものではありません。</p>'+
  '<div class="mummy-reading-grid">'+entries.map(item=>
   '<article class="mummy-reading-card"><div class="eyebrow">RE-READING / 暫定</div>'+
   '<blockquote>'+esc(item.evidence)+'</blockquote>'+
   '<div class="mummy-reading-sub"><b>従来の読みで再検討すること</b><p>'+esc(item.challenged_assumption)+'</p></div>'+
   '<div class="mummy-reading-sub"><b>原文からの観察</b><p>'+esc(item.observation)+'</p></div>'+
   '<div class="mummy-reading-sub"><b>今回の読み直し</b><p>'+esc(item.revised_reading)+'</p></div>'+
   (item.alternative?'<details><summary>別の読み方</summary><p>'+esc(item.alternative)+'</p></details>':'')+
   (item.limit_note?'<details><summary>まだ確定できないこと</summary><p>'+esc(item.limit_note)+'</p></details>':'')+
   '</article>').join('')+'</div></section>';
}

function list(){
 if(!root.MummyResearch)return '<p>検索エンジンを読み込めませんでした。</p>';
 const result=root.MummyResearch.searchWorks(state.works,state.query,state.theme,500);
 const annotated=worksWithReadings();
 const rows=result.rows.filter(row=>state.mode==='all'||(state.mode==='studied'?
  annotated.has(row.work.id):!annotated.has(row.work.id)));
 const shown=rows.slice(0,state.limit);
 const html=shown.map(r=>{
  const count=state.readings.filter(x=>x.work.id===r.work.id).length;
  return '<article class="mummy-work-row'+(state.selectedId===r.work.id?' mummy-current':'')+'">'+
   '<div class="mummy-corpus-head"><strong>《'+esc(r.work.title)+'》</strong>'+
   '<small>'+esc(count?count+'件の個別精読':'個別精読は未登録')+'</small></div>'+
   '<small>'+esc(r.work.collection||'出典名不明')+'</small>'+
   '<p class="mummy-source-status">'+(r.work.sourceStatus==='unverified_pdf_extract'?'PDF抽出・未校正':'本文の照合状況は個別に確認')+'</p>'+
   (r.observed?'<p class="mummy-keywords">文字列一致：'+esc(r.observed.terms.join('・'))+
    ' / '+r.observed.matchedLines+'行</p>'+
    '<div class="mummy-lyric-evidence">'+r.observed.evidence.slice(0,2).map(e=>
     '<p><small>L'+e.line+'</small> '+esc(e.text)+'</p>').join('')+'</div>':'')+
   '<div class="mummy-work-actions"><button class="btn sm" data-mummy-select="'+esc(r.work.id)+
     '">この作品を読む</button><button class="btn sm" data-open="'+esc(r.work.id)+'">歌詞全文</button></div></article>';
 }).join('');
 return '<p class="mummy-count">対象 '+rows.length+'作品'+(rows.length>shown.length?' ／ '+shown.length+'作品を表示':'')+'</p>'+
  '<div class="mummy-work-list">'+(html||'<p class="desc">この条件に一致する作品はありません。作者の思想や作品の価値を示す結果ではありません。</p>')+'</div>'+
  (rows.length>shown.length?'<button class="btn" data-mummy-more>さらに表示する</button>':'');
}
function readingCard(item){
 return '<article class="mummy-reading-card"><div class="eyebrow">WORK READING / 解釈の仮説</div>'+
 '<h3>'+esc(item.heading)+'</h3>'+
 '<div class="mummy-compare"><div><small>原文 L'+item.verifiedLineA+'</small><blockquote>'+
 esc(item.evidence_a)+'</blockquote></div><div><small>原文 L'+item.verifiedLineB+'</small><blockquote>'+
 esc(item.evidence_b)+'</blockquote></div></div>'+
 '<div class="mummy-reading-sub"><b>本文から観察できること</b><p>'+esc(item.observation)+'</p></div>'+
 '<div class="mummy-reading-sub"><b>読みの仮説</b><p>'+esc(item.interpretation)+'</p></div>'+
 '<div class="mummy-reading-sub"><b>別の読み方</b><p>'+esc(item.alternative)+'</p></div>'+
 '<p class="mummy-question">'+esc(item.inquiry)+'</p></article>';
}
function selection(){
 const w=state.works.find(w=>w.id===state.selectedId);
 if(!w)return '<p class="desc">上の一覧から作品を選ぶと、各曲の個別精読を表示します。エッセイに基づく解釈は前提にしません。</p>';
 const notes=state.readings.filter(r=>r.work.id===w.id);
 const issue='<p class="mummy-source-status">原文はPDF抽出・未校正です。引用・行番号を現在の本文で照合済みですが、原本との照合は残っています。</p>';
 return '<div class="mummy-selected-head"><div><small>'+esc(w.collection||'')+'</small><h3>《'+esc(w.title)+'》</h3></div>'+
 '<button class="btn sm" data-open="'+esc(w.id)+'">歌詞全文を開く</button></div>'+issue+
 (notes.length?'<div class="mummy-reading-grid">'+notes.map(readingCard).join('')+'</div>':
  '<div class="mummy-empty-reading">この作品の個別精読はまだ登録していません。原文全文と語句検索は利用できます。自動的に内容を決めつけません。</div>')+challengeCards(w);
}
function dialogueCards(){
 if(!state.dialogues.length)return '<p class="desc">原文の両方を確認できた作品間比較はまだありません。</p>';
 return state.dialogues.map(c=>'<article class="mummy-connection"><h3>'+esc(c.heading)+'</h3>'+
  '<div class="mummy-compare"><div><small>《'+esc(c.workA.title)+'》 L'+c.lineA+'</small><blockquote>'+
  esc(c.evidence_a)+'</blockquote></div><div><small>《'+esc(c.workB.title)+'》 L'+c.lineB+
  '</small><blockquote>'+esc(c.evidence_b)+'</blockquote></div></div>'+
  '<p><b>読みの仮説：</b>'+esc(c.interpretation)+'</p><p class="desc"><b>異なる読み：</b>'+esc(c.alternative)+'</p>'+
  '<p class="mummy-question">'+esc(c.inquiry)+'</p>'+
  '<div class="mummy-work-actions"><button class="btn sm" data-mummy-select="'+esc(c.workA.id)+'">《'+esc(c.workA.title)+'》を読む</button>'+
  '<button class="btn sm" data-mummy-select="'+esc(c.workB.id)+'">《'+esc(c.workB.title)+'》を読む</button></div></article>').join('');
}
function documentDetails(){
 const source=state.source;
 if(!source)return '';
 return '<section class="mummy-section"><div class="eyebrow">OTHER WORK / 独立した作品</div>'+
 '<details class="mummy-other-doc"><summary>エッセイ《'+esc(source.title)+'》を読む <small>作品の一つとして保存</small></summary>'+
 '<p class="desc">執筆年月 '+esc(source.date_label||'不明')+'（本人申告）。このエッセイを木乃伊のほかの歌詞の解釈基準とはしません。</p>'+
 '<details class="mummy-essay"><summary>エッセイの原文全文を開く</summary><pre>'+
 esc(source.original_text)+'</pre></details>'+
 '<h3>このエッセイ自体の精読</h3>'+
 '<div class="mummy-reading-grid">'+state.passages.map(p=>'<article class="mummy-reading-card"><h3>'+
 esc(p.heading)+'</h3><blockquote>'+esc(p.evidence_a)+'</blockquote><blockquote>'+esc(p.evidence_b)+'</blockquote>'+
 '<div class="mummy-reading-sub"><b>読みの仮説</b><p>'+esc(p.interpretation)+'</p></div>'+
 '<div class="mummy-reading-sub"><b>別の読み</b><p>'+esc(p.alternative)+'</p></div>'+
 '<p class="mummy-question">'+esc(p.inquiry)+'</p></article>').join('')+'</div>'+
 (state.essayLinks.length?'<details class="mummy-essay-dialogues"><summary>エッセイと歌詞を比較した候補 ('+
  state.essayLinks.length+'件)</summary>'+state.essayLinks.map(c=>
  '<article class="mummy-connection"><h3>'+esc(c.heading)+'</h3>'+
  '<p class="mummy-linked-title">《'+esc(c.work.title)+'》</p>'+
  '<div class="mummy-compare"><div><small>エッセイより</small><blockquote>'+esc(c.essay_evidence)+'</blockquote></div>'+
  '<div><small>歌詞より L'+(c.verifiedLine||'?')+'</small><blockquote>'+esc(c.lyric_evidence)+'</blockquote></div></div>'+
  '<p>'+esc(c.interpretation)+'</p><p class="desc">'+esc(c.alternative)+'</p>'+
  '<button class="btn sm" data-mummy-select="'+esc(c.work.id)+'">歌詞を読む</button></article>').join('')+
  '</details>':'')+'</details></section>';
}
function build({status,source=null,passages=[],connections=[],works=[],songReadings=[],songDialogues=[],readingChallenges=[]}){
 if(status==='signed_out')return '<div class="panel mummy-locked"><h2>本人専用の精読室</h2>'+
 '<p>木乃伊の歌詞・独立したエッセイ・精読メモは非公開です。本人アカウントでログインすると閲覧できます。公開コードに原文は含めていません。</p>'+
 '<button class="btn primary" id="cloudLogin">本人アカウントでログイン</button></div>';
 if(status==='loading')return '<div class="panel mummy-locked"><h2>歌詞を読み込んでいます</h2><p>本人の作品原文を照合しています。</p></div>';
 if(status==='error')return '<div class="panel mummy-locked"><h2>原文または精読データを取得できませんでした</h2><p>ログインと通信を確認し、管理画面の「クラウドを再確認」をお試しください。歌詞を補作しません。</p></div>';
 state.works=works.filter(w=>w.sky==='rap'&&w.sourceSystem==='lyric_master');
 const verified=root.MummyResearch?.verifySongs(songReadings,songDialogues,state.works)||
  {readings:[],dialogues:[],discarded:0,studiedCount:0};
 state.readings=verified.readings;state.dialogues=verified.dialogues;
 const challengeReport=verifyChallenges(readingChallenges,state.works);
 state.challenges=challengeReport.verified;state.challengeDiscarded=challengeReport.discarded;
 state.source=source;
 const essayChecked=source?root.MummyResearch?.verify(source,passages,connections,state.works):null;
 state.passages=essayChecked?.passages||[];state.essayLinks=essayChecked?.connections||[];
 const studied=worksWithReadings();
 const stats='<div class="mummy-stats">'+[
  ['収録歌詞',state.works.length],['個別精読済み作品',studied.size],['根拠付き精読',state.readings.length],
  ['作品間の比較',state.dialogues.length],['精読の再検討',state.challenges.length]
 ].map(([k,v])=>'<div><b>'+v+'</b><small>'+esc(k)+'</small></div>').join('')+'</div>';
 const statusWarning=(verified.discarded?'<p class="notice">現行版との引用や本文の版が一致しない精読 '+
  verified.discarded+'件は表示していません。</p>':'')+
  (state.challengeDiscarded?'<p class="notice">原文引用または版が一致しない再読記録 '+state.challengeDiscarded+'件は表示していません。</p>':'');
 const details='<section class="mummy-section" id="mummy-reading-entry"><div class="eyebrow">SONG BY SONG / 歌詞の個別精読</div>'+
 '<h2>一曲ずつ、原文から読む</h2><p class="desc">作品を思想の例に当てはめるのではなく、一曲ごとに語りの変化、具体的な言葉、矛盾や別の読み方を確かめます。'+
 (state.works.length-studied.size)+'作品は個別精読待ちです。これらを未完成や価値が低い作品とは扱いません。</p>'+
 '<div id="mummySelectedReading" class="mummy-selected">'+selection()+'</div></section>';
 const discussion='<section class="mummy-section"><div class="eyebrow">SONG × SONG / 歌詞同士を比べる</div>'+
 '<h2>作品のあいだで、何が違うのか</h2><p class="desc">歌詞に現れる出来事が似ていても、同じ人物や制作意図とは限りません。'+
 '制作順序・経験の同一性は推測せず、両方の原文にある箇所を根拠にした比較です。</p>'+
 '<div class="mummy-connections">'+dialogueCards()+'</div></section>';
 const analysis=root.MummyResearch?.analyze(state.works);
 const modes={all:'すべて',studied:'個別精読あり',awaiting:'個別精読待ち'};
 const index='<section class="mummy-section" id="mummy-index"><div class="eyebrow">FULL LYRICS INDEX</div>'+
 '<h2>168作品から選ぶ</h2>'+
 '<p class="desc">歌詞集の収録順に並べます。語句群の件数は原文中の文字列一致であり、曲の主題や作者の思想を確定するものではありません。全168作品の原文はPDF抽出・未校正です。</p>'+
 '<div class="mummy-theme-tabs">'+Object.entries(modes).map(([k,v])=>'<button class="mummy-theme '+
  (state.mode===k?'active':'')+'" data-mummy-mode="'+k+'">'+esc(v)+'</button>').join('')+'</div>'+
 '<div class="mummy-theme-tabs"><button class="mummy-theme '+(state.theme==='all'?'active':'')+
 '" data-mummy-theme="all">すべての語句群</button>'+
 (analysis?.groups||[]).map(g=>'<button class="mummy-theme '+(state.theme===g.id?'active':'')+
 '" data-mummy-theme="'+esc(g.id)+'">'+esc(g.name)+' '+g.matched+'</button>').join('')+'</div>'+
 '<label class="mummy-search-label" for="mummySearch">作品名・歌詞の原文を探す</label>'+
 '<input id="mummySearch" type="search" class="search" placeholder="作品名または歌詞の言葉" value="'+esc(state.query)+'">'+
 '<div id="mummyResearchList">'+list()+'</div></section>';
 return stats+statusWarning+index+details+discussion+documentDetails();
}
root.MummyResearchView={build,list,selection,dialogueCards,reset,chooseTheme,chooseMode,selectWork,search,more,getState:()=>({...state})};
})(typeof window!=='undefined'?window:globalThis);
