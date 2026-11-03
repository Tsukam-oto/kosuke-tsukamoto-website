/* 知の図書館 v1.3.0 — ライブラリ表示は公開コンテンツ。個人データは認証後、RLS付きSupabaseにのみ保存。 */
(() => {
'use strict';
const TOPICS = (window.KNOWLEDGE || []).filter(x=>x.id && x.title);
const BY_ID = Object.fromEntries(TOPICS.map(x => [x.id,x]));
const API_URL = 'https://nroyxwozdxwnrqyierjx.supabase.co';
// 公開用 publishable key。service_role や secret key を絶対に置かない。
const PUBLIC_KEY = 'sb_publishable_dxiidJt1gVcFwkVR2fg1HA_6gHAZNDz';
const CLOUD_IMPORT_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';
let client = null, currentUser = null, cloudStatus = 'loading', cloudError = '', fetching = false;
let lastCloudRefresh=0, syncDiagnostic={status:'idle',text:'',at:null};
const writeQueues=new Map();
let records = {book:{}, visit:{}, question:{}, note:{}, thread:{}};
let view = 'home', selectedId = null, currentEncounter = null, encounterMode = 'unfamiliar';
let threadTab='threads', librarySearch = '', threadSearch='', exportCandidates=[], exportSearch='', libraryFilter='all', mapFocus='oral-epic', mapScope='near', lastEncounterIds=[], sessionSeen=new Set();
let dialog = null, pendingScrollId = null, toastTimer = null, displayDate = new Date();
const app = document.getElementById('app');
const modalLayer = document.getElementById('modal-layer');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = (s) => String(s||'').normalize('NFKC').toLowerCase();
const today = () => new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'});
const formatted = (date) => {try{return new Date(date).toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'})}catch{return ''}};
const uid=()=> (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const deep=(v)=>JSON.parse(JSON.stringify(v));
const topicLink=(id,label)=>`<button class="mini-link" data-open="${esc(id)}">${esc(label||BY_ID[id]?.title||id)}　↗</button>`;
const book=(id)=>records.book['book:'+id]?.payload||null;
const visit=(id)=>records.visit['visit:'+id]?.payload||null;
const userVisits=()=>Object.values(records.visit).sort((a,b)=>(b.payload?.lastVisited||'').localeCompare(a.payload?.lastVisited||''));
const isSeen=(id)=>!!visit(id)||sessionSeen.has(id);
const knownDomains=()=>new Set(userVisits().map(x=>BY_ID[x.payload?.topicId]?.domain).filter(Boolean));
const allVisitedCount=()=>Object.keys(records.visit).length;
const savedCount=()=>Object.keys(records.book).length;
const likedCount=()=>Object.values(records.book).filter(x=>x.payload?.favorite).length;
const questionsCount=()=>Object.values(records.question).filter(x=>x.payload?.status!=='resolved').length;
const threadRecords=()=>Object.values(records.thread).sort((a,b)=>(b.payload?.updatedAt||b.payload?.createdAt||'').localeCompare(a.payload?.updatedAt||a.payload?.createdAt||''));
const linkedThreads=(topicId)=>threadRecords().filter(r=>r.payload?.topicId===topicId);
const journeyRecords=()=>Object.values(records.note).filter(r=>r.payload?.entryType==='journey').sort((a,b)=>(b.payload?.updatedAt||'').localeCompare(a.payload?.updatedAt||''));
const insightRecords=(journeyId)=>Object.values(records.note).filter(r=>r.payload?.entryType==='insight'&&r.payload?.journeyId===journeyId).sort((a,b)=>(b.payload?.createdAt||'').localeCompare(a.payload?.createdAt||''));
const linkedJourneyThreads=(journey)=>[...new Set(journey.payload?.threadIds||[])].map(id=>records.thread[id]).filter(Boolean);
const unexploredDomains=()=>[...new Set(TOPICS.map(t=>t.domain))].filter(d=>!knownDomains().has(d));
function renderJourneyTabs(){return `<div class="segment journey-tabs" role="group" aria-label="トーク横断の表示"><button class="chip ${threadTab==='threads'?'active':''}" data-thread-tab="threads">トークの本棚</button><button class="chip ${threadTab==='journeys'?'active':''}" data-thread-tab="journeys">探究プロジェクト <b>${journeyRecords().length}</b></button></div>`}

const recordId=(kind,id)=>kind+':'+id;
function queueWrite(key,work){const previous=writeQueues.get(key)||Promise.resolve();const job=previous.catch(()=>{}).then(work);writeQueues.set(key,job);job.finally(()=>{if(writeQueues.get(key)===job)writeQueues.delete(key)}).catch(()=>{});return job;}
function notice(message, error=false){const el=document.getElementById('toast');el.textContent=message;el.className='visible'+(error?' toast-error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.className='';el.textContent=''},4200)}
function buttonsVisible(){document.querySelectorAll('[data-nav]').forEach(el=>el.classList.toggle('active',el.dataset.nav===(view==='article'?'home':view)))}
function updateChrome(){
 const titles={home:'今日の発見',encounter:'未知との遭遇',map:'知識の地図',library:'私の蔵書',questions:'疑問帳',threads:'トーク横断',settings:'保存・設定',article:'探究する'};
 document.getElementById('breadcrumb').textContent = titles[view]||'知の図書館';
 document.getElementById('today-date').textContent = displayDate.toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'long',day:'numeric',weekday:'short'});
 const indicator=document.getElementById('auth-indicator');
 indicator.textContent=globalThis.__KNOWLEDGE_DEMO?'プレビュー：一時保存のみ':currentUser?(cloudStatus==='ready'?(writeQueues.size?'保存中…':'クラウド同期：接続済み'):(cloudStatus==='error'?'クラウド接続：エラー':'クラウド同期：確認中')):cloudStatus==='error'?'接続エラー・閲覧のみ':'未ログイン・閲覧のみ';
 document.getElementById('auth-header').textContent=currentUser?'アカウント':'ログイン';
 buttonsVisible();
}
function navigate(name,id,opts={}){
 const next=name==='article'?'#article/'+encodeURIComponent(id):'#'+name;
 if(opts.replace)history.replaceState(null,'',next);else if(location.hash!==next)history.pushState(null,'',next);
 view=name;selectedId=id||null;render();if(!opts.stay)window.scrollTo({top:0,behavior:'instant'});
}
function readRoute(){
 const val=decodeURIComponent(location.hash.slice(1)||'home');
 if(val.startsWith('article/')){const id=val.slice(8);if(BY_ID[id]){view='article';selectedId=id;return}}
 if(['home','encounter','map','library','questions','threads','settings'].includes(val)){view=val;selectedId=null}else{view='home';selectedId=null}
}
function sectionTitle(title,action='',text='すべて見る'){
 return `<div class="section-head"><h2>${esc(title)}</h2><span class="rule"></span>${action?`<button class="link-btn" data-nav="${action}">${esc(text)}　↗</button>`:''}</div>`;
}
function renderTopicCard(t,index=0){
 const saved=!!book(t.id),read=isSeen(t.id);
 return `<article class="topic-card"><div class="card-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</div>
 <span class="category">${esc(t.domain)}</span><h3>${esc(t.title)}</h3><p>${esc(t.hook)}</p>
 <div class="card-foot"><span>${saved?'<span class="badge gold">蔵書に登録</span>':read?'<span class="badge">閲覧済み</span>':'約3分の探究'}</span><button data-open="${esc(t.id)}">探究する　↗</button></div></article>`;
}
function makeDailyTopic(){
 const dateNum=Number(today().replaceAll('-',''));
 const never=TOPICS.filter(t=>!isSeen(t.id));
 const base=never.length?never:TOPICS.slice().sort((a,b)=>(visit(a.id)?.lastVisited||'').localeCompare(visit(b.id)?.lastVisited||''));
 // 同日のホーム再表示では内容が安定し、閲覧後は別の未読へ切り替わる。
 const pos=(dateNum*31+base.length*17)%base.length;
 return base[pos];
}
function chooseEncounter(mode,skip=[]){
 const exclusions=new Set([...lastEncounterIds.slice(-4),...skip]);
 let candidates=TOPICS.filter(t=>!exclusions.has(t.id));if(!candidates.length)candidates=TOPICS.slice();
 const visits=userVisits();const domainCounts={};visits.forEach(v=>{let d=BY_ID[v.payload?.topicId]?.domain;if(d)domainCounts[d]=(domainCounts[d]||0)+1});
 let scores=candidates.map(t=>{
 let score=1;
 if(mode==='unfamiliar')score=1/(1+(domainCounts[t.domain]||0)*4)*(isSeen(t.id)?0.04:1);
 if(mode==='related'){
   const last=visits[0]?.payload?.topicId || selectedId || 'oral-epic';
   score=(BY_ID[last]?.related||[]).includes(t.id)?8: (t.related||[]).includes(last)?5:1;
   if(isSeen(t.id))score*=.18;
 }
 if(mode==='random')score=1;
 if(!isSeen(t.id))score*=mode==='random'?1:1.8;
 return Math.max(.0001,score);
 });
 let sum=scores.reduce((a,b)=>a+b,0),pick=Math.random()*sum;
 const chosen=candidates[scores.findIndex(x=>(pick-=x)<=0)]||candidates[candidates.length-1];
 return chosen.id;
}
function getEncounter(){if(!currentEncounter || !BY_ID[currentEncounter])currentEncounter=chooseEncounter(encounterMode);return BY_ID[currentEncounter]}
function renderHome(){
 const t=makeDailyTopic();const seen=userVisits().slice(0,3);
 const surprising=TOPICS.filter(x=>!isSeen(x.id)&&x.id!==t.id).sort((a,b)=>a.domain.localeCompare(b.domain)).slice(0,6);
 const recs=[...surprising,...TOPICS.filter(x=>x.id!==t.id)].slice(0,6);
 return `<div class="kicker">WELCOME TO YOUR LIBRARY</div><h1 class="page-title">世界には、まだ知らないことがある。</h1><p class="page-description">新しい問いから始まり、思いがけない分野へつながっていく。今日も一つ、扉を開いてみませんか。</p>
 <section class="hero"><div class="hero-content"><div class="kicker">TODAY'S DISCOVERY — ${esc(today())}</div><div class="topic-name">${esc(t.domain)}</div><h2>${esc(t.title)}</h2><p>${esc(t.hook)}<br>${esc(t.summary)}</p><div class="hero-actions"><button class="btn btn-light" data-open="${esc(t.id)}">このテーマを探究する　↗</button><button class="btn btn-outline" style="color:#f2f4ec;border-color:#7f9c8f" data-nav="encounter">違う世界をのぞく</button></div></div></section>
 <section class="stats" aria-label="学びの記録"><div class="stat"><b>${TOPICS.length}</b><small>用意された探究の入口</small></div><div class="stat"><b>${allVisitedCount()}</b><small>学んだテーマ</small></div><div class="stat"><b>${savedCount()}</b><small>私の蔵書</small></div><div class="stat"><b>${questionsCount()}</b><small>未解決の疑問</small></div></section>
 <div class="two-col"><section class="panel"><div class="panel-title">読みかけの探究</div>${seen.length?seen.map((v,i)=>{const t=BY_ID[v.payload.topicId];if(!t)return '';return `<div class="resume-row"><div class="resume-index">${i+1}</div><div class="resume-text"><strong>${esc(t.title)}</strong><small>${esc(t.domain)} ・ ${esc(formatted(v.payload.lastVisited))} ・ ${Number(v.payload.readIndex||0)} / ${t.sections?.length||0} 節</small></div><button class="link-btn" data-open="${esc(t.id)}">再開 ↗</button></div>`}).join(''):'<div class="empty"><b>最初の一冊を開きましょう</b>以前のギリシャ神話の学びから再開することもできます。<br><button class="mini-link" data-open="zeus-titans">ゼウスとティタン神族の続きへ ↗</button><br>※ 過去のチャット内容は自動で蔵書に取り込まれていません。</div>'}</section>
 <section class="panel"><div class="panel-title">あなたへの招待状</div><p>これまでの興味から、あえて少し離れた場所へ。</p><div style="border-top:1px solid var(--line);padding-top:14px"><span class="badge gold">未知との遭遇</span><h3 style="font-size:19px;margin:12px 0">知っている世界の外側へ</h3><p>ジャンルを指定しなくても、知らなかった分野が現れます。</p><button class="btn btn-soft" data-nav="encounter">偶然の一冊をめくる　↗</button></div></section></div>
 ${journeyRecords().length?`<section class="panel" style="margin-top:22px"><div class="panel-title">続きから考える探究</div>${journeyRecords().slice(0,2).map(r=>`<div class="resume-row"><div class="resume-index">⌁</div><div class="resume-text"><strong>${esc(r.payload.title)}</strong><small>${esc(r.payload.nextStep||r.payload.guidingQuestion||'次の問いを探す')}</small></div><button class="link-btn" data-action="resume-journey" data-id="${esc(r.id)}">再開 ↗</button></div>`).join('')}<button class="mini-link" data-thread-tab="journeys">すべての探究を見る ↗</button></section>`:''}
 ${threadRecords().length?`<section class="panel" style="margin-top:22px"><div class="panel-title">会話から続く探究</div>${threadRecords().slice(0,2).map(r=>`<div class="resume-row"><div class="resume-index">↝</div><div class="resume-text"><strong>${esc(r.payload.title)}</strong><small>次の一歩：${esc(r.payload.nextStep||'学びを振り返る')}</small></div><button class="link-btn" data-thread="${esc(r.id)}">再開 ↗</button></div>`).join('')}<button class="mini-link" data-nav="threads">全トークの探究記録を見る ↗</button></section>`:`<section class="panel" style="margin-top:22px"><div class="panel-title">トークをまたいで学ぶ</div><p class="small">ChatGPTの学習内容を、知識の地図につなげて保存できます。学習の続きを他のトークから再開できます。</p><button class="btn btn-soft" data-nav="threads">トーク横断を始める ↗</button></section>`}
 ${sectionTitle('まだ開いていない扉','library','テーマを探す')}<div class="card-grid">${recs.map(renderTopicCard).join('')}</div>`;
}
function renderEncounter(){const t=getEncounter();const counts=knownDomains().size;return `<div class="kicker">SERENDIPITY</div><h1 class="page-title">未知との遭遇</h1><p class="page-description">普段は選ばない本棚にも、驚くほど面白い世界があります。分野を行き来して偶然を楽しみましょう。</p>
 <div class="segment" style="margin:25px 0">${[['unfamiliar','未踏の分野を優先'],['related','少し関連する世界'],['random','完全ランダム']].map(([v,l])=>`<button class="chip ${encounterMode===v?'active':''}" data-mode="${v}">${l}</button>`).join('')}</div>
 <section class="encounter-card"><div class="symbol">✳</div><div class="kicker">A BOOK FOUND BY CHANCE</div><div class="small muted">${esc(t.domain)} ${isSeen(t.id)?'・再訪':'・未読'}</div><h2>${esc(t.title)}</h2><p>${esc(t.hook)}</p><div class="actions encounter-actions"><button class="btn" data-open="${esc(t.id)}">この世界を探究する　↗</button><button class="btn btn-outline" data-action="reroll">別の一冊を見つける　⟳</button></div></section>
 <p class="explain-line" style="text-align:center;margin-top:20px">学習した分野：${counts} 系統 ／ 未読：${TOPICS.filter(t=>!isSeen(t.id)).length} テーマ。${encounterMode==='random'?'ランダムでは既読も出現します。':'既読を避け、連続して同じテーマが出にくい推薦です。'}</p>`}
function renderLibrary(){
 const saved=Object.values(records.book).map(r=>BY_ID[r.payload?.topicId]).filter(Boolean);
 const source=libraryFilter==='saved'?saved:libraryFilter==='unread'?TOPICS.filter(t=>!isSeen(t.id)):libraryFilter==='favorite'?saved.filter(t=>book(t.id)?.favorite):TOPICS;
 const q=norm(librarySearch);const topics=source.filter(t=>norm([t.title,t.domain,t.hook,t.summary,t.facts?.join(' ')].join(' ')).includes(q));
 return `<div class="kicker">YOUR COLLECTION</div><h1 class="page-title">私の蔵書</h1><p class="page-description">知識を見つけるだけでなく、そこに自分の問いを残していきます。保存した内容はクラウドで同期されます。</p>
 <div class="stats"><div class="stat"><b>${savedCount()}</b><small>登録した蔵書</small></div><div class="stat"><b>${likedCount()}</b><small>お気に入り</small></div><div class="stat"><b>${allVisitedCount()}</b><small>閲覧したテーマ</small></div><div class="stat"><b>${TOPICS.length-allVisitedCount()}</b><small>未読のテーマ</small></div></div>
 <div class="shelf-search"><input id="shelfSearch" class="input" aria-label="テーマを検索" placeholder="テーマ・分野・キーワードで探す" value="${esc(librarySearch)}" /><div class="segment">${[['all','すべて'],['saved','蔵書のみ'],['unread','未読'],['favorite','お気に入り']].map(([v,l])=>`<button class="chip ${libraryFilter===v?'active':''}" data-filter="${v}">${l}</button>`).join('')}</div></div>
 <p class="small muted">${topics.length} 件のテーマ</p><div class="card-grid" id="libraryGrid">${topics.map(renderTopicCard).join('')}</div>${!topics.length?'<div class="empty">条件に一致するテーマがありません。</div>':''}`
}
function renderArticle(){
 const t=BY_ID[selectedId]; if(!t)return renderHome(); const b=book(t.id)||{};const v=visit(t.id)||{};const questions=Object.values(records.question).filter(q=>q.payload?.topicId===t.id);
 return `<div class="article-layout"><div class="kicker"><button class="link-btn" data-nav="library">← 本棚に戻る</button></div>
 <div class="reader-layout"><article class="article"><header class="article-head"><div class="kicker">${esc(t.domain)}　／　EXPLORATION</div><h1>${esc(t.title)}</h1><p class="article-hook">${esc(t.hook)}</p><div class="actions"><button class="btn ${book(t.id)?'btn-soft':''}" data-action="bookmark" data-id="${esc(t.id)}">${book(t.id)?'✓ 蔵書に保存済み':'＋ 私の蔵書に保存'}</button><button class="btn btn-outline" data-action="favorite" data-id="${esc(t.id)}">${b.favorite?'★ お気に入り':'☆ お気に入り'}</button><button class="btn btn-outline" data-action="add-question" data-id="${esc(t.id)}">？ 疑問を残す</button></div></header>
 <p class="reader-lead">${esc(t.summary)}</p>
 ${(t.sections||[]).map(([title,body],i)=>`<section class="reading-section" id="section-${i}"><div class="kicker">CHAPTER ${String(i+1).padStart(2,'0')}</div><h2>${esc(title)}</h2><p>${esc(body)}</p><div style="margin-top:12px"><button class="link-btn" data-action="progress" data-id="${esc(t.id)}" data-index="${i+1}">${Number(v.readIndex||0)>i?'✓ 読了':'ここまで読んだ　✓'}</button></div></section>`).join('')}
 <aside class="fact-box"><h3>確かめておきたいこと</h3><ul>${(t.facts||[]).map(f=>`<li>${esc(f)}</li>`).join('')}</ul></aside>
 ${sectionTitle('次に生まれる疑問')}<div class="panel">${(t.questions||[]).map(q=>`<button class="mini-link" data-action="prefill-question" data-id="${esc(t.id)}" data-q="${esc(q)}">？ ${esc(q)}　＋</button>`).join('')}</div>
 ${sectionTitle('資料に当たる')}<div class="source-list">${(t.sources||[]).map(([type,name,url])=>`<a class="source-item" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span>${esc(type)}</span><strong style="font-size:12px">${esc(name)} ↗</strong></a>`).join('')}</div>
 <div class="editorial">この記事は学びの入口として編集した要約です。参考資料がすべての記述を逐語的に裏付けているわけではありません。学説が分かれる事項は、提示した資料や原典を確認してください。</div>
 ${sectionTitle('つながる知識')}<div class="related-grid">${(t.related||[]).filter(id=>BY_ID[id]).map(id=>`<button class="related-item" data-open="${esc(id)}"><small>${esc(BY_ID[id].domain)}</small>${esc(BY_ID[id].title)}　↗</button>`).join('')}</div>
 </article><aside class="reader-tools"><div class="panel"><div class="panel-title">探究のしおり</div><p class="small">${Number(v.readIndex||0)} / ${t.sections.length} 節まで読了</p><div class="progress-dots">${t.sections.map((_,i)=>`<div class="progress-dot ${i<Number(v.readIndex||0)?'active':''}"></div>`).join('')}</div>${Number(v.readIndex||0)>0&&Number(v.readIndex||0)<t.sections.length?`<button class="btn btn-soft" data-action="resume-section" data-index="${v.readIndex}">続きを読む ↘</button>`:''}<label for="understanding">理解度</label><select id="understanding" class="select" style="width:100%" data-action="understanding"><option value="0" ${!b.understanding?'selected':''}>これから学ぶ</option><option value="1" ${b.understanding===1?'selected':''}>入口がわかった</option><option value="2" ${b.understanding===2?'selected':''}>説明できそう</option><option value="3" ${b.understanding===3?'selected':''}>深く理解した</option></select></div>
 <div class="panel"><div class="panel-title">私の学習ノート</div><label for="ownSummary">自分の言葉でまとめる</label><textarea class="textarea" id="ownSummary" placeholder="ここで知ったことを、短く書いてみましょう">${esc(b.ownSummary||'')}</textarea><label for="ownNotes">メモ・反論・解決していない論点</label><textarea class="textarea" id="ownNotes" placeholder="気になったこと、もっと確かめたいこと">${esc(b.notes||'')}</textarea><button class="btn" style="width:100%;margin-top:12px" data-action="save-note" data-id="${esc(t.id)}">学習ノートを保存</button></div>
 <div class="panel"><div class="panel-title">司書と探究する</div><p class="small">会話の続きに使える問いを作成し、ChatGPTで調べられます。</p><button class="btn btn-soft" style="width:100%" data-action="chat" data-id="${esc(t.id)}">ChatGPTで続きを考える ↗</button><p style="font-size:10px;margin:9px 0 0">API料金は発生しません。文章をコピーして、開いたChatGPTへ貼り付ける方式です。会話内容は自動保存されません。</p></div>
 ${linkedThreads(t.id).length?`<div class="panel"><div class="panel-title">このテーマの関連トーク</div>${linkedThreads(t.id).slice(0,4).map(r=>`<button class="mini-link" data-thread="${esc(r.id)}">↝ ${esc(r.payload.title)}</button>`).join('')}</div>`:''}
 <div class="panel"><div class="panel-title">別のトークから引き継ぐ</div><button class="btn btn-soft" data-action="new-thread" data-id="${esc(t.id)}">学習内容を記録する ↗</button></div>
 ${questions.length?`<div class="panel"><div class="panel-title">このテーマの疑問</div>${questions.slice(0,4).map(q=>`<button class="mini-link" data-action="edit-question" data-id="${esc(q.id)}">${q.payload.status==='resolved'?'✓':'？'} ${esc(q.payload.text)}</button>`).join('')}</div>`:''}
 </aside></div></div>`;
}
function renderQuestions(){let qs=Object.values(records.question).sort((a,b)=>(b.payload?.createdAt||'').localeCompare(a.payload?.createdAt||''));return `<div class="kicker">THE QUESTION ARCHIVE</div><h1 class="page-title">疑問帳</h1><p class="page-description">答えが分からないままでも、問いには価値があります。思いついた瞬間に残し、後日その続きを始めましょう。</p>
 <section class="panel" style="margin-bottom:22px"><div class="panel-title">新しい疑問を残す</div><p class="small">解答を急がなくて構いません。問いを書いて保存してください。</p><textarea class="textarea" id="quickQuestion" placeholder="なぜ？ 本当にそうなの？ もっと前には？"></textarea><div class="actions"><button class="btn" data-action="quick-question">この疑問を保存　＋</button></div></section>
 <div class="section-head"><h2>問いの一覧</h2><span class="rule"></span><small>${qs.length} 件・未解決 ${questionsCount()} 件</small></div>
 ${qs.length?qs.map(q=>{const p=q.payload;const t=BY_ID[p.topicId];return `<article class="question-row"><div class="question-meta"><span class="badge ${p.status==='resolved'?'':'warn'}">${p.status==='resolved'?'解決済み':'未解決'}</span><span>${t?esc(t.domain):'自由な疑問'}</span><span>${esc(formatted(p.createdAt))}</span></div><h3>${esc(p.text)}</h3>${p.answer?`<div class="question-answer">${esc(p.answer)}</div>`:''}<div class="actions">${t?`<button class="btn btn-soft" data-open="${esc(t.id)}">関連テーマを読む</button>`:''}<button class="btn btn-outline" data-action="edit-question" data-id="${esc(q.id)}">編集する</button><button class="btn btn-outline" data-action="chat-question" data-id="${esc(q.id)}">ChatGPTで考える ↗</button></div></article>`}).join(''):'<div class="empty"><b>まだ疑問はありません。</b>どんな小さなことでも、ここから探究が始まります。</div>'}`}
function hashCode(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)}
function graphNodes(){
 if(mapScope==='all')return TOPICS;
 const main=BY_ID[mapFocus]||TOPICS[0]; const first=(main.related||[]).filter(id=>BY_ID[id]);
 const secondary=Array.from(new Set(first.flatMap(id=>(BY_ID[id].related||[])).filter(id=>BY_ID[id]&&id!==main.id&&!first.includes(id)))).slice(0,10);
 return [main,...first.map(id=>BY_ID[id]),...secondary.map(id=>BY_ID[id])];
}
function graphPositions(nodes){
 const pos={};let N=nodes.length;
 if(mapScope==='near'){
   pos[mapFocus]={x:560,y:350};
   const direct=nodes.filter(n=>n.id!==mapFocus&&(BY_ID[mapFocus]?.related||[]).includes(n.id));
   direct.forEach((n,i)=>{let a=i*2*Math.PI/Math.max(1,direct.length)-Math.PI/2;pos[n.id]={x:560+190*Math.cos(a),y:350+170*Math.sin(a)}});
   const indirect=nodes.filter(n=>!pos[n.id]);
   indirect.forEach((n,i)=>{let a=i*2*Math.PI/Math.max(indirect.length,1)-Math.PI/2+.25;pos[n.id]={x:560+365*Math.cos(a),y:350+260*Math.sin(a)}});
 }else{
   // 分野順に配置し、描画が毎回変わらないよう固定シードを利用する。
   const sorted=nodes.slice().sort((a,b)=>a.domain.localeCompare(b.domain)||a.id.localeCompare(b.id));
   sorted.forEach((n,i)=>{const a=i*2*Math.PI/N-Math.PI/2,r=220+80*(hashCode(n.id)%5)/4;pos[n.id]={x:560+r*Math.cos(a),y:350+r*Math.sin(a)}});
   pos[mapFocus] = pos[mapFocus]||{x:560,y:350};
 }
 return pos;
}
function graphMarkup(){const nodes=graphNodes();const pos=graphPositions(nodes);let ids=new Set(nodes.map(n=>n.id));let edges=[];let set=new Set();nodes.forEach(n=>n.related?.forEach(id=>{if(ids.has(id)){let k=[n.id,id].sort().join('~');if(!set.has(k)){set.add(k);edges.push([n.id,id])}}}));
 const d=(n)=>{let s=n.title;if(s.length>16)s=s.slice(0,15)+'…';return s};
 return `<svg id="graphSvg" class="graph-svg" viewBox="0 0 1120 700" role="img" aria-label="テーマのつながりを表す地図。ノードを選ぶと解説を開けます。"><g id="graphContents">${edges.map(([a,b])=>`<line class="graph-edge ${(a===mapFocus||b===mapFocus)?'hot':''}" x1="${pos[a].x}" y1="${pos[a].y}" x2="${pos[b].x}" y2="${pos[b].y}" />`).join('')}${nodes.map(n=>`<g class="graph-node ${n.id===mapFocus?'focus':''}" data-graph-id="${esc(n.id)}" role="button" tabindex="0" aria-label="${esc(n.title)}" transform="translate(${pos[n.id].x},${pos[n.id].y})"><circle r="${n.id===mapFocus?22:14}"/><text x="0" y="${n.id===mapFocus?39:31}" text-anchor="middle">${esc(d(n))}${linkedThreads(n.id).length?' · '+linkedThreads(n.id).length+'記録':''}</text></g>`).join('')}</g></svg>`;
}
function renderMap(){const topic=BY_ID[mapFocus]||TOPICS[0];return `<div class="kicker">ATLAS OF IDEAS</div><h1 class="page-title">知識の地図</h1><p class="page-description">一つの問いから、別の学問へ。線でつながる知識の間を、自由に旅してください。</p>
 <div class="graph-shell"><div class="graph-toolbar"><div class="segment"><button class="chip ${mapScope==='near'?'active':''}" data-map="near">この知識の周辺</button><button class="chip ${mapScope==='all'?'active':''}" data-map="all">全体地図</button></div><div style="display:flex;align-items:center;gap:12px"><span class="graph-tip">ノード選択・ドラッグ移動・ホイール拡大縮小</span><button class="link-btn" data-action="graph-reset">位置を戻す ↺</button></div></div>${graphMarkup()}<div class="graph-summary"><span class="category small">${esc(topic.domain)}</span><h3>${esc(topic.title)}</h3><p>${esc(topic.summary)}</p><div class="small muted" style="margin-bottom:10px">つながるテーマ：${(topic.related||[]).filter(id=>BY_ID[id]).slice(0,3).map(id=>esc(BY_ID[id].title)).join(" ／ ")}</div>${Object.values(records.question).filter(q=>q.payload?.topicId===topic.id).length?`<div style="padding:10px 0;border-top:1px solid var(--line)"><div class="label">保存した疑問</div>${Object.values(records.question).filter(q=>q.payload?.topicId===topic.id).slice(0,3).map(q=>`<button class="mini-link" data-action="edit-question" data-id="${esc(q.id)}">？ ${esc(q.payload.text)}</button>`).join("")}</div>`:""} ${linkedThreads(topic.id).length?`<div class="map-thread-box"><b>トークとの接続　${linkedThreads(topic.id).length}件</b>${linkedThreads(topic.id).slice(0,3).map(r=>`<button class="mini-link" data-thread="${esc(r.id)}">↝ ${esc(r.payload.title)}</button>`).join('')}</div>`:''}
 <div class="actions"><button class="btn" data-open="${esc(topic.id)}">この知識を開く ↗</button><button class="btn btn-soft" data-action="graph-focus-next">関連分野へ移動 →</button></div></div></div>`}
// トーク全文は保存しない。ここで確定した学習要点のみクラウドに送る。
const HANDOFF_SCHEMA='knowledge-library/thread-v1';
const clip=(value,n=3500)=>String(value??'').trim().slice(0,n);
const safeChatUrl=(value)=>{try{const u=new URL(String(value||''));return u.protocol==='https:'&&['chatgpt.com','chat.openai.com'].includes(u.hostname)?u.href:''}catch{return ''}};
function normalizeThread(value,base={}){
 const title=clip(value.title||base.title,140);
 if(!title)throw new Error('トーク名を入力してください。');
 const topicId=BY_ID[value.topicId]?value.topicId:'';
 return {
   title,topicId,learned:clip(value.learned,6000),openQuestions:clip(value.openQuestions,3500),
   nextStep:clip(value.nextStep,2000),sourceType:clip(value.sourceType||base.sourceType||'manual',40),
   sourceUrl:safeChatUrl(value.sourceUrl),sourceTitle:clip(value.sourceTitle||base.sourceTitle,160),
   messageCount:Number.isFinite(Number(value.messageCount))?Math.min(100000,Math.max(0,Math.floor(Number(value.messageCount)))):0,
   createdAt:base.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()
 };
}
function renderThreads(){
 if(threadTab==='journeys')return renderJourneys();
 const q=norm(threadSearch);
 const all=threadRecords().filter(r=>norm([r.payload.title,r.payload.learned,r.payload.openQuestions,r.payload.nextStep,r.payload.sourceTitle,BY_ID[r.payload.topicId]?.title].join(' ')).includes(q));
 const linked=threadRecords().filter(r=>BY_ID[r.payload.topicId]).length;
 const relatedTopics=q?TOPICS.filter(t=>norm([t.title,t.domain,t.summary,...(t.facts||[])].join(' ')).includes(q)).slice(0,5):[];
 const relatedQuestions=q?Object.values(records.question).filter(r=>norm([r.payload.text,r.payload.answer].join(' ')).includes(q)).slice(0,5):[];
 return `<div class="kicker">CROSS-CONVERSATION LEARNING</div><h1 class="page-title">トークをまたいで学ぶ</h1>
 <p class="page-description">別々の会話で見つけた知識を、一つの探究に編み直す場所。過去トークの全文は保存せず、選んだ学習要点だけがクラウドへ同期されます。</p>
 ${renderJourneyTabs()}
 <section class="panel" style="margin-top:18px"><div class="panel-title">会話を束ねて、一つの探究に</div><p class="small">複数トークを同じ問いに結び、以前と現在の考え方の違いも記録できます。</p><div class="actions"><button class="btn btn-soft" data-thread-tab="journeys">探究プロジェクトを見る ↗</button><button class="btn btn-outline" data-action="new-journey">＋ 新しい探究を作る</button></div></section>
 <section class="stats" aria-label="トーク横断の記録"><div class="stat"><b>${threadRecords().length}</b><small>登録した探究記録</small></div><div class="stat"><b>${linked}</b><small>知識の地図に結び付いた記録</small></div><div class="stat"><b>${threadRecords().filter(r=>r.payload?.openQuestions).length}</b><small>疑問の残る記録</small></div></section>
 <section class="panel"><div class="panel-title">トークを図書館へ取り込む</div><p class="small">ChatGPTの会話を自動監視するものではありません。共有したい学習内容を自分で選び、確認してから保存します。</p>
 <div class="actions"><button class="btn" data-action="new-thread">＋ 学習記録を作る</button><button class="btn btn-soft" data-action="import-handoff">ChatGPTの引き継ぎJSONを貼る</button><button class="btn btn-outline" data-action="export-chooser">会話エクスポートから選ぶ</button></div>
 <div class="actions"><button class="link-btn" data-action="copy-handoff">ChatGPTに引き継ぎ要約を頼む文章をコピー ↗</button></div>
 <input id="conversationExportFile" hidden type="file" accept=".json,application/json" />
 <p class="editorial">エクスポートはこの端末のブラウザ内で解析します。選択前の会話本文はSupabaseへ送信しません。要約の自動生成にはAI APIを使用していません。</p></section>
 <div class="section-head"><h2>私のトーク蔵書</h2><span class="rule"></span><small>${all.length} 件</small></div>
 <div class="shelf-search"><input class="input" id="threadSearch" aria-label="トークの学習記録を検索" placeholder="学んだこと・疑問・トーク名で検索" value="${esc(threadSearch)}" /></div>
 ${all.length?all.map(r=>{let x=r.payload;let t=BY_ID[x.topicId];return `<article class="thread-card"><div class="question-meta"><span class="badge gold">${esc(x.sourceType==='chatgpt-export'?'会話エクスポート':x.sourceType==='chatgpt-handoff'?'ChatGPTの要約':x.sourceType==='assistant-draft'?'要確認の引き継ぎ候補':'自分で記録')}</span><span>${esc(formatted(x.updatedAt||x.createdAt))}</span>${t?`<span>${esc(t.domain)}</span>`:''}</div><h3>${esc(x.title)}</h3><p class="thread-excerpt">${esc(x.learned||'要点はまだ記入されていません。')}</p>${x.openQuestions?`<p class="thread-small"><b>残った問い：</b>${esc(x.openQuestions)}</p>`:''}${x.nextStep?`<p class="thread-small"><b>次回：</b>${esc(x.nextStep)}</p>`:''}<div class="actions"><button class="btn btn-soft" data-thread="${esc(r.id)}">詳しく見る・再開する ↗</button>${t?`<button class="btn btn-outline" data-open="${esc(t.id)}">関連テーマ ↗</button>`:''}</div></article>`}).join(''):'<div class="empty"><b>まだトーク記録はありません。</b>以前の会話の要点を一件登録してみてください。<br>記録は追加・編集・削除できます。</div>'}
 ${q?(relatedTopics.length||relatedQuestions.length)?`<section class="panel" style="margin-top:20px"><div class="panel-title">他の蔵書・疑問にも見つかりました</div>${relatedTopics.map(t=>`<button class="mini-link" data-open="${esc(t.id)}">▤ ${esc(t.title)} — ${esc(t.domain)}</button>`).join('')}${relatedQuestions.map(r=>`<button class="mini-link" data-action="edit-question" data-id="${esc(r.id)}">？ ${esc(r.payload.text)}</button>`).join('')}</section>`:'':''}
 `;
}
function threadDialog(rid='',prefill={}){
 const existing=rid?records.thread[rid]?.payload:{};
 dialog={type:'thread',recId:rid,values:{...existing,...prefill}};
 renderDialog();
}
function prepareThreadForm(p){
 return `<div class="form-grid"><div class="form-group"><label for="threadTitle">トークの名前</label><input class="input" id="threadTitle" value="${esc(p.title||'')}" maxlength="140" placeholder="例：ギリシャ神話の続き" /></div>
 <div class="form-group"><label for="threadTopic">結び付ける知識（任意）</label><select class="select" id="threadTopic"><option value="">テーマを指定しない</option>${TOPICS.map(t=>`<option value="${esc(t.id)}" ${p.topicId===t.id?'selected':''}>${esc(t.title)}</option>`).join('')}</select></div>
 <div class="form-group"><label for="threadLearned">既習事項・理解したこと</label><textarea class="textarea" id="threadLearned" placeholder="何を学び、どこまで理解したか。事実と解釈を分けて記録します。">${esc(p.learned||'')}</textarea></div>
 <div class="form-group"><label for="threadQuestions">未解決の疑問・反論</label><textarea class="textarea" id="threadQuestions" placeholder="本当にそうなのか？ 何を調べる必要があるか？">${esc(p.openQuestions||'')}</textarea></div>
 <div class="form-group"><label for="threadNext">次回の開始点</label><textarea class="textarea" id="threadNext" placeholder="前回の復習をせず、どの問いから再開するか">${esc(p.nextStep||'')}</textarea></div>
 <div class="form-group"><label for="threadSourceUrl">会話のURL（任意・ChatGPTのURLのみ）</label><input class="input" id="threadSourceUrl" type="url" value="${esc(p.sourceUrl||'')}" placeholder="https://chatgpt.com/c/..." /></div>
 <div class="actions"><button class="btn" data-action="save-thread">${globalThis.__KNOWLEDGE_DEMO?(dialog.recId?'デモの変更を保存':'デモに保存'):(dialog.recId?'変更をクラウド保存':'確認してクラウド保存')}</button>${dialog.recId?'<button class="btn btn-danger" data-action="delete-thread">削除</button>':''}</div></div>`;
}
function renderThreadModal(){const rid=dialog.recId;const p=dialog.values||{};
 modalLayer.innerHTML=`<div class="dialog-backdrop" data-action="close-modal"><section class="dialog dialog-large" role="dialog" aria-modal="true" aria-label="トークの学習記録"><button class="dialog-close" data-action="close-modal" aria-label="閉じる">×</button><div class="kicker">YOUR LEARNING TRACE</div><h2>${rid?'トークの学習を再開する':'会話の学びを引き継ぐ'}</h2>${rid?`<div class="actions"><button class="btn btn-soft" data-action="resume-thread">この続きをChatGPTで考える ↗</button>${safeChatUrl(p.sourceUrl)?`<a href="${esc(safeChatUrl(p.sourceUrl))}" target="_blank" rel="noopener noreferrer" class="btn btn-outline">元のトークを見る ↗</a>`:''}</div>`:''}<p>ここで保存した内容だけが個人のクラウド蔵書に登録されます。会話の原文は取り込みません。</p>${prepareThreadForm(p)}</section></div>`;
}
function renderHandoffModal(){
 modalLayer.innerHTML=`<div class="dialog-backdrop" data-action="close-modal"><section class="dialog dialog-large" role="dialog" aria-modal="true" aria-label="引き継ぎ要約を貼る"><button class="dialog-close" data-action="close-modal" aria-label="閉じる">×</button><div class="kicker">IMPORT A HANDOFF</div><h2>ChatGPTから引き継ぐ</h2><p>このトークを要約したJSONをここに貼ってください。内容を確認する編集画面が先に開き、すぐにはクラウド保存されません。</p><textarea class="textarea" id="handoffJson" style="min-height:210px" placeholder='{"schema":"knowledge-library/thread-v1","title":"…","learned":"…","openQuestions":"…","nextStep":"…","topicId":""}'></textarea><p class="editorial">原文に含まれる個人情報や秘密は、貼る前に取り除いてください。形式が違う場合はエラーを表示します。</p><button class="btn" data-action="parse-handoff">内容を検査して編集する</button></section></div>`;
}
function parseConversationsFile(obj){
 if(!Array.isArray(obj))throw new Error('ChatGPTの conversations.json（配列）を選択してください。');
 const rows=[];
 for(const c of obj){if(!c||typeof c!=='object'||!c.title||!c.mapping)continue;
  let count=0,last='';
  for(const node of Object.values(c.mapping)){
    const msg=node?.message;if(!msg)continue;count++;
    if(msg.author?.role==='user'&&Array.isArray(msg.content?.parts)){
      const txt=msg.content.parts.filter(p=>typeof p==='string').join(' ');
      if(txt.trim())last=clip(txt,210);
    }
  }
  rows.push({title:clip(c.title,140),id:clip(c.id,120),messageCount:count,lastUser:last,createdAt:c.create_time?new Date(c.create_time*1000).toISOString():null});
 }
 return rows.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
}
function renderExportChooser(){
 const matches=exportCandidates.filter((v)=>norm(v.title+' '+v.lastUser).includes(norm(exportSearch))).slice(0,100);
 modalLayer.innerHTML=`<div class="dialog-backdrop" data-action="close-modal"><section class="dialog dialog-large" role="dialog" aria-modal="true" aria-label="エクスポートした会話を選ぶ"><button class="dialog-close" data-action="close-modal" aria-label="閉じる">×</button><div class="kicker">SELECT A CONVERSATION</div><h2>取り込む会話を選ぶ</h2><p>解析できた会話 ${exportCandidates.length} 件。検索結果は最大100件表示。選択後に編集画面で要約を入力してください。</p><input class="input" id="exportSearch" placeholder="会話のタイトルや最後の質問で絞り込む" value="${esc(exportSearch)}"/><div class="conversation-results">${matches.map(c=>`<div class="conversation-entry"><div><strong>${esc(c.title)}</strong><small>${c.messageCount} 件のメッセージ　${esc(c.createdAt?formatted(c.createdAt):'')}</small><p>${esc(c.lastUser||'')}</p></div><button class="btn btn-soft" data-select-export="${esc(c.id)}">選択 ↗</button></div>`).join('')||'<p class="empty">一致する会話がありません。</p>'}</div></section></div>`;
}
async function loadConversationsFile(file){
 if(!file)return;
 if(file.size>40*1024*1024){notice('ファイルが40MBを超えています。エクスポートを小分けにして読み込んでください。',true);return}
 try{const obj=JSON.parse(await file.text());exportCandidates=parseConversationsFile(obj);
  if(!exportCandidates.length)throw new Error('対応した会話が見つかりませんでした。');
  exportSearch='';dialog={type:'export-chooser'};renderDialog();
 }catch(e){notice('会話ファイルを解析できません: '+(e.message||e),true)}
}
function handoffPrompt(){return `今のChatGPTトークで私が学んだことを『知の図書館』へ引き継ぎたいです。以下のスキーマのJSONオブジェクト1個だけをコードブロック内に出してください。私の過去の質問・やり取りから確かめられる部分だけ要約し、推測や存在しない学びを補わないでください。事実・仮説・疑問を混同しないでください。個人情報や秘密は含めず、必要なら省略してください。\n\n{\n  "schema":"knowledge-library/thread-v1",\n  "title":"トークの内容が分かる名前",\n  "learned":"既習事項と理解できた内容。学術的に未確定な内容には明記",\n  "openQuestions":"未解決の疑問や反論",\n  "nextStep":"次に始めるべき問い・地点",\n  "topicId":"",\n  "sourceUrl":""\n}\n\nJSONをコピーして、知の図書館の「ChatGPTの引き継ぎJSONを貼る」に貼り付けます。`}
async function copyPromptOpen(prompt,open=true){
 if(open)window.open('https://chatgpt.com/','_blank','noopener,noreferrer');
 try{await navigator.clipboard.writeText(prompt);notice('引き継ぎ文をコピーしました。ChatGPTに貼り付けてください。')}
 catch(e){dialog={type:'plain-prompt',prompt};renderDialog();notice('クリップボードを利用できません。文章を選んでコピーしてください。',true)}
}
async function startChatFromThread(r){let x=r.payload,t=BY_ID[x.topicId];
 const prompt=`『知の図書館』で過去の学習を引き継ぎます。元トーク名: ${x.title}。\n関連テーマ: ${t?.title||'未分類'}\n既習事項：${x.learned||'未入力'}\n未解決の疑問：${x.openQuestions||'未入力'}\nここから再開：${x.nextStep||'次の疑問を提案してください'}\n既習事項を何度も繰り返さず、次の論点から進めてください。分からないことは推測で補わず、根拠と不確実性を示してください。`;
 await copyPromptOpen(prompt);
}
function suggestedConnections(){
 const groups=new Map();
 for(const r of threadRecords()){
   const key=r.payload?.topicId;
   if(!key||!BY_ID[key])continue;
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(r);
 }
 return [...groups.entries()].filter(([id,rs])=>rs.length>=2&&!journeyRecords().some(j=>rs.every(r=>(j.payload?.threadIds||[]).includes(r.id)))).slice(0,4);
}
function renderJourneys(){
 const journeys=journeyRecords(), connected=new Set(journeys.flatMap(j=>j.payload?.threadIds||[]));
 const unlinked=threadRecords().filter(t=>!connected.has(t.id));
 const suggestions=suggestedConnections();
 return `<div class="kicker">A PERSONAL ATLAS OF QUESTIONS</div><h1 class="page-title">探究プロジェクト</h1>
 <p class="page-description">答えを積み上げるだけでなく、「最初はどう思っていたか」「何がきっかけで考えが変わったか」を残します。複数トークの要点を一つの問いに束ねられます。</p>
 ${renderJourneyTabs()}
 <div class="stats" style="margin-top:22px"><div class="stat"><b>${journeys.length}</b><small>進行中の探究</small></div><div class="stat"><b>${unlinked.length}</b><small>未整理のトーク</small></div><div class="stat"><b>${Object.values(records.note).filter(r=>r.payload?.entryType==='insight').length}</b><small>思考の記録</small></div><div class="stat"><b>${unexploredDomains().length}</b><small>まだ訪れていない分野</small></div></div>
 <section class="panel"><div class="panel-title">次に何を探究しますか？</div><p class="small">トークをまとめて、最初の問い・現在の理解・次回の開始地点を保存します。</p><button class="btn" data-action="new-journey">＋ 探究プロジェクトを作る</button></section>
 ${journeys.length?`<div class="section-head"><h2>育てている問い</h2><span class="rule"></span><small>${journeys.length} 件</small></div>${journeys.map(renderJourneyCard).join('')}`:'<div class="empty" style="margin-top:20px"><b>まだ探究プロジェクトはありません。</b>最初の問いを作るか、下にあるトークから始めましょう。</div>'}
 ${suggestions.length?`<section class="panel"><div class="panel-title">つながりの候補</div><p class="small">同じ知識テーマに紐づいた会話を見つけました。実際につながるかどうかは、作成前にご自身で確認してください。</p>${suggestions.map(([id,rs])=>`<div class="journey-suggestion"><div><b>${esc(BY_ID[id].title)}</b><small>${rs.length} 件の会話</small></div><button class="btn btn-soft" data-action="suggest-journey" data-id="${esc(id)}">まとめる ↗</button></div>`).join('')}</section>`:''}
 ${unlinked.length?`<section class="panel"><div class="panel-title">まだ束ねていないトーク</div><p class="small">整理を急がず、一件だけから探究を始めても構いません。</p>${unlinked.slice(0,6).map(r=>`<div class="journey-suggestion"><div><b>${esc(r.payload?.title||'名前のないトーク')}</b><small>${esc(BY_ID[r.payload?.topicId]?.domain||'未分類')}</small></div><button class="btn btn-soft" data-action="journey-from-thread" data-id="${esc(r.id)}">この問いから ↗</button></div>`).join('')}</section>`:''}
 <section class="panel"><div class="panel-title">図書館の外側へ</div><p class="small">未訪問分野：${esc(unexploredDomains().slice(0,6).join('・')||'全分野を訪問しました')}。過去の趣味だけで推薦を決めず、未知の扉も残します。</p><button class="btn btn-outline" data-nav="encounter">まだ知らない世界を見る ↗</button></section>`;
}
function renderJourneyCard(r){
 const j=r.payload,threads=linkedJourneyThreads(r),insights=insightRecords(r.id),last=insights[0];
 return `<article class="journey-card"><div class="journey-top"><div><span class="badge gold">${esc(j.status==='paused'?'一時停止':'探究中')}</span><span class="muted small">　${esc(formatted(j.updatedAt||j.createdAt))}</span></div><small>${threads.length} トーク・${insights.length} 気づき</small></div>
 <h3>${esc(j.title)}</h3><p class="journey-question">${esc(j.guidingQuestion||'次に問いを育てましょう。')}</p>
 ${j.currentView?`<p class="journey-detail"><b>いまの考え：</b>${esc(j.currentView)}</p>`:''}
 ${last?`<div class="journey-latest"><span>直近の変化</span><p>${esc(last.payload?.after||last.payload?.finding||'')}</p></div>`:''}
 ${j.nextStep?`<p class="journey-detail"><b>次の一歩：</b>${esc(j.nextStep)}</p>`:''}
 <div class="journey-related">${threads.slice(0,4).map(t=>`<button class="mini-link" data-thread="${esc(t.id)}">↝ ${esc(t.payload.title)}</button>`).join('')}${!threads.length?'<small>トークはまだ紐づいていません。</small>':''}</div>
 <div class="actions"><button class="btn" data-action="resume-journey" data-id="${esc(r.id)}">続きから探究する ↗</button><button class="btn btn-soft" data-action="new-insight" data-id="${esc(r.id)}">＋ 考えの変化を記録</button><button class="btn btn-outline" data-action="edit-journey" data-id="${esc(r.id)}">編集・履歴</button></div></article>`;
}
function journeyDialog(recId='',init={}){const old=recId?records.note[recId]?.payload:{};dialog={type:'journey',recId,values:{...old,...init}};renderDialog()}
function renderJourneyModal(){
 const j=dialog.values||{},r=dialog.recId,entries=r?insightRecords(r):[];
 modalLayer.innerHTML=`<div class="dialog-backdrop" data-action="close-modal"><section class="dialog dialog-large" role="dialog" aria-modal="true" aria-label="探究プロジェクトを編集"><button class="dialog-close" data-action="close-modal" aria-label="閉じる">×</button><div class="kicker">YOUR ONGOING RESEARCH</div><h2>${r?'探究を編集する':'新しい探究を始める'}</h2><p>関連トークを複数選べます。保存するのは各トークの要約への参照と、ここに入力した内容だけです。</p>
 <div class="form-grid"><div class="form-group"><label for="journeyTitle">探究の名前</label><input class="input" id="journeyTitle" maxlength="140" value="${esc(j.title||'')}" placeholder="例：神話と歴史の境界" /></div>
 <div class="form-group"><label for="journeyQuestion">中心にある疑問</label><textarea class="textarea" id="journeyQuestion" placeholder="自分が本当に知りたいこと">${esc(j.guidingQuestion||'')}</textarea></div>
 <div class="form-group"><label for="journeyCurrent">現在の理解・仮説（事実と区別して）</label><textarea class="textarea" id="journeyCurrent" placeholder="いま、どこまで理解しているか">${esc(j.currentView||'')}</textarea></div>
 <div class="form-group"><label for="journeyNext">次回はどこから始めるか</label><textarea class="textarea" id="journeyNext" placeholder="次の問い・調べるべき史料">${esc(j.nextStep||'')}</textarea></div>
 <div class="form-group"><label for="journeyStatus">状態</label><select class="select" id="journeyStatus"><option value="active" ${j.status!=='paused'?'selected':''}>探究中</option><option value="paused" ${j.status==='paused'?'selected':''}>しばらく寝かせる</option></select></div>
 <fieldset class="thread-picker"><legend>束ねるトーク（複数選択）</legend>${threadRecords().length?threadRecords().map(t=>`<label><input type="checkbox" class="journey-thread" value="${esc(t.id)}" ${(j.threadIds||[]).includes(t.id)?'checked':''}/><span>${esc(t.payload.title)}<small>${esc(BY_ID[t.payload.topicId]?.domain||'未分類')}</small></span></label>`).join(''):'<p>トーク記録はまだありません。先にプロジェクトだけ作成できます。</p>'}</fieldset>
 <div class="actions"><button class="btn" data-action="save-journey">${r?'変更を保存':'探究を保存'}</button>${r?'<button class="btn btn-danger" data-action="delete-journey">探究を削除</button>':''}</div></div>
 ${r?`<section class="journey-history"><h3>考え方の変化・発見の履歴</h3>${entries.length?entries.map(x=>`<div class="history-entry"><small>${esc(formatted(x.payload.createdAt))} ・ ${esc(x.payload.verification==='verified'?'出典確認済み':x.payload.verification==='hypothesis'?'仮説':'未確認・個人的な気づき')}</small>${x.payload.before?`<p><b>以前：</b>${esc(x.payload.before)}</p>`:''}<p><b>現在：</b>${esc(x.payload.after)}</p>${x.payload.evidence?`<p><b>手がかり：</b>${esc(x.payload.evidence)}</p>`:''}<button class="link-btn" data-action="delete-insight" data-id="${esc(x.id)}">この記録を削除</button></div>`).join(''):'<p class="small">思考の変化はまだ記録されていません。</p>'}<button class="btn btn-soft" data-action="new-insight" data-id="${esc(r)}">＋ 変化を記録</button></section>`:''}</section></div>`;
}
function insightDialog(journeyId){const j=records.note[journeyId];if(!j)return;dialog={type:'insight',journeyId};renderDialog()}
function renderInsightModal(){
 const j=records.note[dialog.journeyId]?.payload;
 modalLayer.innerHTML=`<div class="dialog-backdrop" data-action="close-modal"><section class="dialog dialog-large" role="dialog" aria-modal="true" aria-label="考えの変化を記録"><button class="dialog-close" data-action="close-modal" aria-label="閉じる">×</button><div class="kicker">A CHANGE OF MIND</div><h2>気づきを残す</h2><p>探究：${esc(j?.title||'')}。AIによる事実判定ではなく、ご自身の学習過程の記録です。</p>
 <div class="form-grid"><div class="form-group"><label for="insightBefore">以前はどう考えていたか（空欄可）</label><textarea class="textarea" id="insightBefore"></textarea></div><div class="form-group"><label for="insightAfter">新しく分かったこと・考えが変わったこと</label><textarea class="textarea" id="insightAfter" placeholder="何がどう変わったか"></textarea></div>
 <div class="form-group"><label for="insightEvidence">きっかけ・出典・反論（空欄可）</label><textarea class="textarea" id="insightEvidence" placeholder="史料名や根拠／まだ調べる必要がある点"></textarea></div>
 <div class="form-group"><label for="insightVerification">確かさの扱い</label><select id="insightVerification" class="select"><option value="unverified">未確認・個人的な気づき</option><option value="hypothesis">仮説・検討中</option><option value="verified">自分で出典を確認した</option></select></div><button class="btn" data-action="save-insight">この変化を記録する</button></div></section></div>`;
}
async function resumeJourney(r){
 const j=r.payload;const threads=linkedJourneyThreads(r),insights=insightRecords(r.id).slice(0,4);
 const prompt=`『知の図書館』の探究プロジェクト「${j.title}」を続けます。\n中心の問い：${j.guidingQuestion||'未定'}\n現在の私の理解：${j.currentView||'まだ整理していない'}\n関連する過去トークの要点：\n${threads.slice(0,8).map((t,i)=>`${i+1}. ${t.payload.title}\n既習：${(t.payload.learned||'').slice(0,1200)}\n残った問い：${(t.payload.openQuestions||'').slice(0,600)}`).join('\n')||'記録なし'}\nその後の思考の変化：\n${insights.map(x=>`・${(x.payload.after||'').slice(0,350)}〔${x.payload.verification==='verified'?'本人が出典確認済み':x.payload.verification==='hypothesis'?'仮説':'未確認'}〕`).join('\n')||'記録なし'}\n今回の開始点：${j.nextStep||'中心の問いの次の論点から始めてください'}\nこれらは私の学習記録であり、学術的真実だと決めつけないでください。既習事項を冗長に反復せず、根拠・異説・不確実性を検討し、関連する別分野の問いを一つ提案してください。`;
 await copyPromptOpen(prompt);
}

function renderSettings(){return `<div class="kicker">YOUR SPACE</div><h1 class="page-title">保存・設定</h1><p class="page-description">${globalThis.__KNOWLEDGE_DEMO?'操作プレビューです。保存内容はこの画面だけに残り、クラウドへは送信しません。正式公開版では本人のクラウドへ同期されます。':'学習記録はクラウドに保存され、同じアカウントで別の端末から利用できます。公開される記事と個人の記録は分離しています。'}</p>
 <div class="settings-grid"><section class="panel"><div class="panel-title">クラウド同期</div><p class="small">${currentUser?`ログイン：${esc(currentUser.email||'認証済み')}<br>状態：${cloudStatus==='ready'?'同期可能':'接続確認中'}`:'未ログイン。閲覧のみ利用できます。保存・復元には認証が必要です。'}</p>${cloudError?`<p class="status-line warn">${esc(cloudError)}</p>`:''}<button class="btn" data-action="auth">${currentUser?'アカウントを表示':'ログインして同期する'}</button>${currentUser?'<button class="btn btn-outline" data-action="refresh">同期を再確認する</button><button class="btn btn-soft" data-action="diagnose-sync">保存・読み戻し・削除を診断</button>':''}${currentUser?`<p class="small" id="sync-diagnostic" role="status" aria-live="polite">${esc(syncDiagnostic.text||'クラウドの書き込み診断はまだ実施していません。')}</p>${lastCloudRefresh?`<p class="small">最終取得：${esc(new Date(lastCloudRefresh).toLocaleString('ja-JP'))}</p>`:''}`:''}</section>
 <section class="panel"><div class="panel-title">バックアップとエクスポート</div><p class="small">蔵書、しおり、疑問帳、トーク由来の学習記録、探究プロジェクト、気づきの履歴をJSON形式で一括書き出します。バックアップを別の端末で読み込むこともできます。</p><div class="actions"><button class="btn btn-soft" data-action="export">JSONを書き出す ↓</button><button class="btn btn-outline" data-action="import">バックアップから復元 ↑</button><input id="importFile" type="file" accept="application/json,.json" hidden /></div></section>
 <section class="panel"><div class="panel-title">探究の質</div><p class="small">記事は固定の編集コンテンツです。AIと話すときはプロンプトをコピーし、ChatGPTで開きます。ChatGPTの回答は自動同期されません。引き継ぎJSONを選択・確認してから取り込みます。</p><p class="small">データに利用者の操作履歴を保存します。広告・解析トラッカーは設置していません。</p></section>
 <section class="panel"><div class="panel-title">データと費用</div><p class="small">同期：既存のSupabase。クライアントには公開用キーのみを使用し、ユーザー単位のアクセス制御を有効化しています。</p><p class="small">AI API：未接続。追加の従量料金は発生させません。クラウド利用は既存プランの制限に従います。</p></section></div>`}
function render(){
 if(!TOPICS.length){app.innerHTML='<p>コンテンツを読み込めません。data.js を確認してください。</p>';return}
 const output={home:renderHome,encounter:renderEncounter,library:renderLibrary,article:renderArticle,map:renderMap,questions:renderQuestions,threads:renderThreads,settings:renderSettings};
 app.innerHTML=(output[view]||renderHome)();updateChrome();renderDialog();
}
function needAuth(){if(!currentUser){showAuth();notice('クラウド保存にはログインが必要です。',true);return false}if(cloudStatus!=='ready'){notice('同期の確認が済んでいません。接続を確認してください。',true);return false}return true}
async function diagnoseSync(){
 if(!needAuth())return false;
 if(syncDiagnostic.status==='running')return false;
 const owner=currentUser.id, token=uid(), key='note:diagnostic-'+token;
 syncDiagnostic={status:'running',text:'診断中：クラウドへの保存・読み戻し・削除を確認しています…',at:null};render();
 await Promise.all([...writeQueues.values()].map(job=>job.catch(()=>{})));
 let inserted=false, passed=false, cleanupError='';
 try{
  if(currentUser?.id!==owner)throw new Error('診断中にログインアカウントが変わりました');
  const row={id:key,kind:'note',user_id:owner,payload:{entryType:'diagnostic',nonce:token,temporary:true}};
  const created=await client.from('knowledge_records').insert(row);
  if(created.error)throw created.error;
  inserted=true;
  const read=await client.from('knowledge_records').select('id,payload').eq('user_id',owner).eq('id',key).single();
  if(read.error)throw read.error;
  if(read.data?.id!==key || read.data.payload?.nonce!==token)throw new Error('保存内容を読み戻して一致を確認できませんでした');
  passed=true;
 }catch(e){syncDiagnostic={status:'error',text:'診断失敗：'+(e.message||String(e)),at:new Date().toISOString()};}
 finally{
  if(inserted){const del=await client.from('knowledge_records').delete().eq('user_id',owner).eq('id',key).select('id');
   if(del.error)cleanupError=del.error.message||String(del.error);
   else if(!Array.isArray(del.data)||!del.data.some(row=>row.id===key))cleanupError='削除対象が確認できませんでした。';
  }
  if(passed&&!cleanupError)syncDiagnostic={status:'passed',text:globalThis.__KNOWLEDGE_DEMO?'模擬診断成功：プレビュー内で保存・読み戻し・削除できました。実クラウドは未検証です。':'診断成功：保存・読み戻し・削除を確認しました。別端末での同期は別途確認してください。',at:new Date().toISOString()};
  else if(cleanupError)syncDiagnostic={status:'error',text:'診断で作った一時データを削除できませんでした。'+cleanupError,at:new Date().toISOString()};
  render();notice(syncDiagnostic.text,syncDiagnostic.status!=='passed');
 }
 return syncDiagnostic.status==='passed';
}

async function save(kind,id,payload,opts={}){
 if(!needAuth())return false;
 const key=recordId(kind,id);const old=records[kind][key] ? deep(records[kind][key]) : null; const row={id:key,kind,user_id:currentUser.id,payload:deep(payload),created_at:old?.created_at||new Date().toISOString(),updated_at:new Date().toISOString()};
 records[kind][key]=row;if(!opts.silent)render();
 try{await queueWrite(key,async()=>{const {error}=await client.from('knowledge_records').upsert(row,{onConflict:'user_id,id'});if(error)throw error;});if(!opts.quiet)notice(globalThis.__KNOWLEDGE_DEMO?'デモ画面に保存しました（クラウドには送信しません）。':'クラウドに保存しました。');return true}
 catch(e){if(records[kind][key]===row){if(old)records[kind][key]=old;else delete records[kind][key];}if(!opts.silent)render();notice('保存に失敗しました: '+(e.message||e),true);return false}
}
async function remove(kind,key){if(!needAuth())return false;const old=deep(records[kind][key]||null);if(!old)return false;delete records[kind][key];render();try{await queueWrite(key,async()=>{const {error}=await client.from('knowledge_records').delete().eq('user_id',currentUser.id).eq('id',key);if(error)throw error});notice('削除しました');return true}catch(e){records[kind][key]=old;render();notice('削除できませんでした: '+e.message,true);return false}}
async function openArticle(id){if(!BY_ID[id])return;sessionSeen.add(id);const old=visit(id)||{};if(currentUser&&cloudStatus==='ready'){await save('visit',id,{topicId:id,lastVisited:new Date().toISOString(),readIndex:Number(old.readIndex||0)},{silent:true,quiet:true})}navigate('article',id)}
function showAuth(){dialog={type:'auth',message:''};renderDialog()}
function showQuestion(topicId='',text='',recId=''){dialog={type:'question',topicId,text,recId};renderDialog()}
function renderDialog(){if(!dialog){modalLayer.innerHTML='';return}
 if(dialog.type==='auth'){
 modalLayer.innerHTML=`<div class="dialog-backdrop" data-action="close-modal"><section class="dialog" role="dialog" aria-modal="true" aria-label="クラウドログイン"><button class="dialog-close" data-action="close-modal" aria-label="閉じる">×</button><div class="kicker">CLOUD LIBRARY</div><h2>図書館にログイン</h2><p>既存のアカウントのメールアドレスとパスワードでログインできます。図書館専用の新規登録は必要ありません。</p>${currentUser?`<div class="sign-in-box"><b>ログイン済み</b><p>${esc(currentUser.email||'')}</p><button class="btn btn-danger" data-action="logout">ログアウト</button></div>`:`<div class="form-grid"><div class="form-group"><label for="loginEmail">メールアドレス</label><input class="input" id="loginEmail" type="email" autocomplete="username" placeholder="登録済みのメールアドレス" /></div><div class="form-group"><label for="loginPassword">パスワード</label><input class="input" id="loginPassword" type="password" autocomplete="current-password" placeholder="既存アカウントのパスワード" /></div><div class="actions"><button class="btn" data-action="login-password">パスワードでログイン</button><button class="btn btn-soft" data-action="send-magic">メールに認証リンクを送る</button></div><div class="form-group"><label for="loginToken">確認コードが届く設定の場合</label><input class="input" id="loginToken" inputmode="numeric" placeholder="6桁のコード" /></div><button class="btn btn-outline" data-action="verify-code">確認コードでログイン</button></div>`}
 <p class="status-line ${dialog.message?.startsWith('エラー')?'warn':'good'}">${esc(dialog.message||'パスワードでのログインは認証メールのURL許可設定に依存しません。メールリンクは別途リダイレクトURLの登録が必要です。')}</p><div class="editorial">記事は未ログインでも読めます。個人の蔵書・学習記録はログイン済みの本人だけが閲覧できます。</div></section></div>`;
 } else if(dialog.type==='journey'){renderJourneyModal();
 } else if(dialog.type==='insight'){renderInsightModal();
 } else if(dialog.type==='thread'){renderThreadModal();
 } else if(dialog.type==='handoff'){renderHandoffModal();
 } else if(dialog.type==='export-chooser'){renderExportChooser();
 } else if(dialog.type==='plain-prompt'){modalLayer.innerHTML=`<div class="dialog-backdrop" data-action="close-modal"><section class="dialog"><button class="dialog-close" data-action="close-modal" aria-label="閉じる">×</button><h2>コピーする文章</h2><textarea class="textarea" readonly style="min-height:280px">${esc(dialog.prompt||'')}</textarea></section></div>`;
 } else if(dialog.type==='question'){
 const record=dialog.recId?records.question[dialog.recId]:null;const p=record?.payload||{};
 modalLayer.innerHTML=`<div class="dialog-backdrop" data-action="close-modal"><section class="dialog" role="dialog" aria-modal="true" aria-label="疑問を記録する"><button class="dialog-close" data-action="close-modal" aria-label="閉じる">×</button><div class="kicker">SAVE A QUESTION</div><h2>${record?'疑問を編集する':'問いを残す'}</h2><div class="form-grid"><div class="form-group"><label for="questionText">疑問</label><textarea class="textarea" id="questionText" placeholder="知りたいことを書いてください">${esc(dialog.text||p.text||'')}</textarea></div><div class="form-group"><label for="questionTopic">関連するテーマ</label><select class="select" id="questionTopic" style="width:100%"><option value="">関連テーマなし</option>${TOPICS.map(t=>`<option value="${esc(t.id)}" ${t.id===(dialog.topicId||p.topicId)?'selected':''}>${esc(t.title)}</option>`).join('')}</select></div><div class="form-group"><label for="questionAnswer">自分で見つけた答え・手がかり（空欄可）</label><textarea class="textarea" id="questionAnswer">${esc(p.answer||'')}</textarea></div><div class="form-group"><label for="questionStatus">状態</label><select class="select" id="questionStatus"><option value="open" ${p.status!=='resolved'?'selected':''}>まだ解決していない</option><option value="resolved" ${p.status==='resolved'?'selected':''}>理解した・解決した</option></select></div><div class="actions"><button class="btn" data-action="submit-question">${record?'変更を保存':'疑問を保存'}</button>${record?'<button class="btn btn-danger" data-action="delete-question">削除する</button>':''}</div></div></section></div>`;
 }
}
function closeModal(){dialog=null;renderDialog()}
async function initCloud(){
 cloudStatus='loading';updateChrome();
 try{
  const mod=await import(CLOUD_IMPORT_URL);
  client=mod.createClient(API_URL,PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){currentUser=null;syncDiagnostic={status:'idle',text:'',at:null};lastCloudRefresh=0;records={book:{},visit:{},question:{},note:{},thread:{}};cloudStatus='guest';render()}else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'){const prior=currentUser?.id;currentUser=session?.user||null;if(currentUser&&prior!==currentUser.id){setTimeout(()=>loadCloud(),0)}}});
  const {data,error}=await client.auth.getUser();if(error && !String(error.message||'').toLowerCase().includes('session'))throw error;
  if(data?.user){currentUser=data.user;await loadCloud()} else {cloudStatus='guest';render()}
 }catch(e){cloudStatus='error';cloudError=String(e.message||e);render()}
}
async function loadCloud(){if(!currentUser||!client||fetching)return;const loadingFor=currentUser.id;fetching=true;cloudStatus='loading';updateChrome();
 try{await Promise.all([...writeQueues.values()].map(job=>job.catch(()=>{})));let rows=[];let page=0;while(page<30){const {data,error}=await client.from('knowledge_records').select('id,kind,payload,created_at,updated_at').order('updated_at',{ascending:false}).range(page*1000,(page+1)*1000-1);if(error)throw error;rows.push(...(data||[]));if((data||[]).length<1000)break;page++}
 if(currentUser?.id!==loadingFor)return;const groups={book:{},visit:{},question:{},note:{},thread:{}};rows.forEach(r=>{if(groups[r.kind]&&r.id)groups[r.kind][r.id]=r});records=groups;cloudStatus='ready';cloudError='';lastCloudRefresh=Date.now();render();
 }catch(e){if(currentUser?.id===loadingFor){cloudStatus='error';cloudError=e.message||String(e);render();notice('同期できませんでした。保存は停止中です。',true)}}finally{fetching=false}
}
function promptText(t,question=''){const b=book(t.id)||{};const v=visit(t.id)||{};const summary=b.ownSummary?`\n私の学習メモ: ${b.ownSummary}`:'';
 return `『知の図書館』で学習を続けます。テーマ:「${t.title}」(${t.domain})。\n前回までの要点: ${t.summary}${summary}\n読了段階: ${v.readIndex||0}/${t.sections?.length||0}。\n${question?`私の疑問: ${question}\n`:''}小さな問いから段階的に深掘りしてください。事実・仮説・学説の対立を区別し、根拠と参考文献を示し、私が「なぜ」「それ以前は」「本当にそうなのか」と質問したら、答えを繰り返すのではなく根拠を検討してください。既習の内容を長々と復習せず、その先からお願いします。`}
async function startChat(t,q=''){const prompt=promptText(t,q);window.open('https://chatgpt.com/','_blank','noopener,noreferrer');try{await navigator.clipboard.writeText(prompt);notice('探究用の文章をコピーしました。開いたChatGPTに貼り付けてください。')}catch(e){dialog={type:'plain-prompt',prompt};renderDialog();notice('コピーできませんでした。表示した文章を手動でコピーしてください。',true)}}
async function exportData(){if(!needAuth())return;await Promise.all([...writeQueues.values()].map(job=>job.catch(()=>{})));if(cloudStatus!=='ready'){notice('同期状態を確認してから書き出してください。',true);return}const out={schema:'knowledge-library/v1',exportedAt:new Date().toISOString(),topics:TOPICS.filter(t=>book(t.id)).map(t=>deep(t)),records:Object.values(records).flatMap(o=>Object.values(o).map(({id,kind,payload,created_at,updated_at})=>({id,kind,payload,created_at,updated_at})))};
 const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`chi-no-toshokan-backup-${today()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notice(`${out.records.length} 件を書き出しました。`)}
async function importData(file){if(!needAuth())return;if(file.size>15*1024*1024){notice('ファイルが大きすぎます（上限15MB）。',true);return}
 try{const obj=JSON.parse(await file.text());if(obj.schema!=='knowledge-library/v1'||!Array.isArray(obj.records))throw new Error('知の図書館のバックアップ形式ではありません。');if(obj.records.length>10000)throw new Error('バックアップの記録件数が多すぎます。');if(!confirm(`${obj.records.length}件の記録を取り込みます。同じIDの既存記録は上書きされます。現在のバックアップを保存してから続行してください。実行しますか？`))return;let count=0;for(const row of obj.records){if(!['book','visit','question','note','thread'].includes(row.kind)||typeof row.id!=='string'||!row.id.startsWith(row.kind+':')||row.id.length>120||!row.payload||typeof row.payload!=='object'||Array.isArray(row.payload))continue;
  const stored={id:row.id,kind:row.kind,user_id:currentUser.id,payload:row.payload,created_at:row.created_at||new Date().toISOString(),updated_at:new Date().toISOString()};
  const {error}=await client.from('knowledge_records').upsert(stored,{onConflict:'user_id,id'});if(error)throw error;count++;
 }await loadCloud();notice(`${count} 件を復元しました。`)}catch(e){notice('復元失敗: '+(e.message||e),true)}}
async function handleClick(ev){
 const nav=ev.target.closest('[data-nav]');if(nav){ev.preventDefault();navigate(nav.dataset.nav);return}
 const opening=ev.target.closest('[data-open]');if(opening){ev.preventDefault();await openArticle(opening.dataset.open);return}
 const graph=ev.target.closest('[data-graph-id]');if(graph){if(graph.dataset.dragged)return;mapFocus=graph.dataset.graphId;render();return}
 const mode=ev.target.closest('[data-mode]');if(mode){encounterMode=mode.dataset.mode;currentEncounter=null;lastEncounterIds=[];render();return}
 const filter=ev.target.closest('[data-filter]');if(filter){libraryFilter=filter.dataset.filter;render();return}
 const map=ev.target.closest('[data-map]');if(map){mapScope=map.dataset.map;render();return}
 const tab=ev.target.closest('[data-thread-tab]');if(tab){threadTab=tab.dataset.threadTab==='journeys'?'journeys':'threads';navigate('threads');return}
 const tr=ev.target.closest('[data-thread]');if(tr){threadDialog(tr.dataset.thread);return}
 const sel=ev.target.closest('[data-select-export]');if(sel){const c=exportCandidates.find(v=>v.id===sel.dataset.selectExport);if(c){threadDialog('',{title:c.title,sourceTitle:c.title,sourceType:'chatgpt-export',messageCount:c.messageCount,learned:'',openQuestions:'',nextStep:''});}return}
 const btn=ev.target.closest('[data-action]');if(!btn)return;
 const action=btn.dataset.action;const id=btn.dataset.id;let t=id?BY_ID[id]:null;
 if(action==='close-modal'){if(btn.classList.contains('dialog-backdrop')&&ev.target.closest('.dialog'))return;closeModal();return}
 if(action==='auth'){showAuth();return}
 if(action==='new-journey'){if(!needAuth())return;journeyDialog();return}
 if(action==='journey-from-thread'){if(!needAuth())return;const r=records.thread[id];if(r)journeyDialog('',{title:r.payload.title,threadIds:[r.id],guidingQuestion:r.payload.openQuestions||'',currentView:r.payload.learned||'',nextStep:r.payload.nextStep||''});return}
 if(action==='suggest-journey'){if(!needAuth())return;const rs=threadRecords().filter(r=>r.payload.topicId===id);journeyDialog('',{title:BY_ID[id]?.title||'新しい探究',guidingQuestion:rs.map(r=>r.payload.openQuestions).filter(Boolean).join('\n').slice(0,1000),threadIds:rs.map(r=>r.id)});return}
 if(action==='edit-journey'){if(!needAuth())return;journeyDialog(id);return}
 if(action==='save-journey'){if(!needAuth())return;const original=dialog?.values||{},title=document.getElementById('journeyTitle')?.value.trim(),question=document.getElementById('journeyQuestion')?.value.trim();if(!title){notice('探究の名前を入力してください。',true);return}const chosen=[...document.querySelectorAll('.journey-thread:checked')].map(el=>el.value).filter(id=>!!records.thread[id]);const rid=dialog.recId||'note:journey:'+uid();const payload={entryType:'journey',title:title.slice(0,140),guidingQuestion:(question||'').slice(0,3500),currentView:(document.getElementById('journeyCurrent')?.value||'').trim().slice(0,5000),nextStep:(document.getElementById('journeyNext')?.value||'').trim().slice(0,3500),status:document.getElementById('journeyStatus')?.value==='paused'?'paused':'active',threadIds:chosen,createdAt:original.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};closeModal();if(await save('note',rid.slice(5),payload)){threadTab='journeys';navigate('threads')}return}
 if(action==='delete-journey'){if(!needAuth()||!dialog?.recId)return;if(!confirm('この探究プロジェクトを削除しますか？関連トークと気づきの履歴は残ります。'))return;const rid=dialog.recId;closeModal();await remove('note',rid);return}
 if(action==='new-insight'){if(!needAuth())return;insightDialog(id);return}
 if(action==='save-insight'){if(!needAuth()||!dialog?.journeyId)return;const after=document.getElementById('insightAfter')?.value.trim();if(!after){notice('気づきの内容を入力してください。',true);return}const rid=dialog.journeyId,now=new Date().toISOString();const payload={entryType:'insight',journeyId:rid,before:(document.getElementById('insightBefore')?.value||'').trim().slice(0,4000),after:after.slice(0,6000),evidence:(document.getElementById('insightEvidence')?.value||'').trim().slice(0,4000),verification:document.getElementById('insightVerification')?.value||'unverified',createdAt:now};closeModal();if(await save('note','insight:'+uid(),payload)){threadTab='journeys';navigate('threads')}return}
 if(action==='delete-insight'){if(!needAuth())return;if(!confirm('この気づきの記録を削除しますか？'))return;const rid=dialog?.recId;const ok=await remove('note',id);if(ok&&rid)journeyDialog(rid);return}
 if(action==='resume-journey'){const r=records.note[id];if(r?.payload?.entryType==='journey')await resumeJourney(r);return}
 if(action==='new-thread'){if(!needAuth())return;threadDialog('',id?{topicId:id}:{});return}
 if(action==='copy-handoff'){await copyPromptOpen(handoffPrompt());return}
 if(action==='import-handoff'){dialog={type:'handoff'};renderDialog();return}
 if(action==='parse-handoff'){
  try{const raw=document.getElementById('handoffJson')?.value.trim()||'';if(raw.length>16000)throw new Error('要約が長すぎます。必要な部分だけ残してください。');const str=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');const data=JSON.parse(str);if(data.schema!==HANDOFF_SCHEMA)throw new Error('引き継ぎJSONのschemaが異なります。');threadDialog('',normalizeThread({...data,sourceType:'chatgpt-handoff'}));}catch(e){notice('取り込み形式を確認してください: '+(e.message||e),true)}return
 }
 if(action==='export-chooser'){if(!needAuth())return;document.getElementById('conversationExportFile')?.click();return}
 if(action==='save-thread'){
  if(!needAuth())return;
  const p=dialog.values||{};
  try{const v=normalizeThread({title:document.getElementById('threadTitle').value,topicId:document.getElementById('threadTopic').value,learned:document.getElementById('threadLearned').value,openQuestions:document.getElementById('threadQuestions').value,nextStep:document.getElementById('threadNext').value,sourceUrl:document.getElementById('threadSourceUrl').value,sourceType:p.sourceType||'manual',sourceTitle:p.sourceTitle||'',messageCount:p.messageCount||0},p);
   const rid=dialog.recId||'thread:'+uid();closeModal();const ok=await save('thread',rid.slice(7),v);if(ok){navigate('threads');notice(globalThis.__KNOWLEDGE_DEMO?'デモ画面に記録しました（クラウドには送信しません）。':'トークの要点をクラウドに保存しました。')}
  }catch(e){notice('確認してください: '+(e.message||e),true)}return
 }
 if(action==='delete-thread'){if(!needAuth()||!dialog?.recId)return;if(!confirm('このトークの学習記録を削除しますか？'))return;const rid=dialog.recId;closeModal();await remove('thread',rid);return}
 if(action==='resume-thread'){if(!dialog?.recId)return;await startChatFromThread(records.thread[dialog.recId]);return}

 if(action==='reroll'){lastEncounterIds.push(currentEncounter);currentEncounter=chooseEncounter(encounterMode);render();return}
 if(action==='bookmark'&&t){if(!needAuth())return;if(book(id)){notice('このテーマはすでに蔵書に保存されています。');return}await save('book',id,{topicId:id,addedAt:new Date().toISOString(),favorite:false,understanding:0,ownSummary:'',notes:''});return}
 if(action==='favorite'&&t){if(!needAuth())return;const p=deep(book(id))||{topicId:id,addedAt:new Date().toISOString(),understanding:0,ownSummary:'',notes:''};p.favorite=!p.favorite;await save('book',id,p);return}
 if(action==='progress'&&t){if(!needAuth())return;const v=deep(visit(id))||{topicId:id,lastVisited:new Date().toISOString(),readIndex:0};v.readIndex=Math.max(Number(v.readIndex||0),Number(btn.dataset.index));v.lastVisited=new Date().toISOString();const at='section-'+(Number(btn.dataset.index)-1);pendingScrollId=at;await save('visit',id,v);if(pendingScrollId){document.getElementById(pendingScrollId)?.scrollIntoView({block:'start'});pendingScrollId=null}return}
 if(action==='resume-section'){document.getElementById('section-'+btn.dataset.index)?.scrollIntoView({behavior:'smooth'});return}
 if(action==='add-question'){if(!needAuth())return;showQuestion(id);return}
 if(action==='prefill-question'){if(!needAuth())return;showQuestion(id,btn.dataset.q);return}
 if(action==='quick-question'){if(!needAuth())return;const q=document.getElementById('quickQuestion')?.value.trim();if(!q){notice('疑問を入力してください。',true);return}showQuestion('',q);return}
 if(action==='edit-question'){if(!needAuth())return;dialog={type:'question',recId:id};renderDialog();return}
 if(action==='submit-question'){if(!needAuth())return;let q=document.getElementById('questionText')?.value.trim();if(!q){notice('疑問を入力してください。',true);return}const rid=dialog.recId||recordId('question',uid());const old=records.question[rid]?.payload;const p={text:q,topicId:document.getElementById('questionTopic').value,status:document.getElementById('questionStatus').value,answer:document.getElementById('questionAnswer').value.trim(),createdAt:old?.createdAt||new Date().toISOString()};closeModal();await save('question',rid.slice('question:'.length),p);return}
 if(action==='delete-question'){if(!needAuth())return;if(!dialog?.recId)return;if(!confirm('この疑問を削除しますか？'))return;const k=dialog.recId;closeModal();await remove('question',k);return}
 if(action==='save-note'&&t){if(!needAuth())return;const p=deep(book(id))||{topicId:id,addedAt:new Date().toISOString(),favorite:false,understanding:0};p.ownSummary=document.getElementById('ownSummary').value.trim();p.notes=document.getElementById('ownNotes').value.trim();await save('book',id,p);return}
 if(action==='chat'&&t){await startChat(t);return}
 if(action==='chat-question'){const r=records.question[id];if(!r)return;await startChat(BY_ID[r.payload.topicId]||TOPICS[0],r.payload.text);return}
 if(action==='graph-reset'){render();return}
 if(action==='graph-focus-next'){const rel=BY_ID[mapFocus]?.related?.filter(id=>BY_ID[id])||[];if(rel.length){mapFocus=rel[Math.floor(Math.random()*rel.length)];render()}return}
 if(action==='export'){await exportData();return}
 if(action==='import'){if(!needAuth())return;document.getElementById('importFile')?.click();return}
 if(action==='refresh'){await loadCloud();notice(cloudStatus==='ready'?'クラウド同期を確認しました。':'同期を確認できませんでした。',cloudStatus!=='ready');return}
 if(action==='diagnose-sync'){await diagnoseSync();return}
 if(action==='logout'){if(client){const {error}=await client.auth.signOut();if(error)notice(error.message,true);else{closeModal();notice('ログアウトしました。')}}return}
 if(action==='login-password'){await tryPassword();return}
 if(action==='send-magic'){await sendMagic();return}
 if(action==='verify-code'){await verifyCode();return}
}
async function tryPassword(){if(!client){notice('接続の準備ができていません。',true);return}const email=document.getElementById('loginEmail').value.trim(),password=document.getElementById('loginPassword').value;if(!email||!password){notice('メールアドレスとパスワードを入力してください。',true);return}const {error}=await client.auth.signInWithPassword({email,password});if(error){dialog.message='エラー: '+error.message;const msg=modalLayer.querySelector('.status-line');if(msg){msg.textContent=dialog.message;msg.classList.remove('good');msg.classList.add('warn');}return}closeModal();notice('ログインしました。');await loadCloud()}
async function sendMagic(){if(!client){notice('接続の準備ができていません。',true);return}const email=document.getElementById('loginEmail').value.trim();if(!email){notice('メールアドレスを入力してください。',true);return}const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:new URL('./',location.href).href}});dialog.message=error?'エラー: '+error.message:'既存アカウント宛に認証メールを送信しました。届いた案内をご確認ください。';renderDialog()}
async function verifyCode(){if(!client)return;const email=document.getElementById('loginEmail').value.trim(),token=document.getElementById('loginToken').value.trim();if(!email||!token){notice('メールアドレスと確認コードを入力してください。',true);return}const {error}=await client.auth.verifyOtp({email,token,type:'email'});if(error){dialog.message='エラー: '+error.message;const msg=modalLayer.querySelector('.status-line');if(msg){msg.textContent=dialog.message;msg.classList.remove('good');msg.classList.add('warn');}return}closeModal();notice('ログインしました。');await loadCloud()}
function attachGraphInteractions(){const svg=document.getElementById('graphSvg');if(!svg)return;let start=null,moved=false;const base=[0,0,1120,700];svg.addEventListener('wheel',(e)=>{e.preventDefault();const vb=svg.viewBox.baseVal;const fact=e.deltaY>0?1.14:1/1.14;const newW=Math.min(2500,Math.max(250,vb.width*fact)),newH=newW*700/1120;const rect=svg.getBoundingClientRect(),fx=(e.clientX-rect.left)/rect.width,fy=(e.clientY-rect.top)/rect.height;const x=vb.x+(vb.width-newW)*fx,y=vb.y+(vb.height-newH)*fy;svg.setAttribute('viewBox',`${x} ${y} ${newW} ${newH}`)},{passive:false});
 svg.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('[data-graph-id]'))return;start={x:e.clientX,y:e.clientY,v:[svg.viewBox.baseVal.x,svg.viewBox.baseVal.y,svg.viewBox.baseVal.width,svg.viewBox.baseVal.height]};moved=false;svg.setPointerCapture(e.pointerId)});
 svg.addEventListener('pointermove',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>6)moved=true;const rect=svg.getBoundingClientRect();svg.setAttribute('viewBox',`${start.v[0]-dx/rect.width*start.v[2]} ${start.v[1]-dy/rect.height*start.v[3]} ${start.v[2]} ${start.v[3]}`)});
 svg.addEventListener('pointerup',e=>{start=null});svg.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false}},true);
}
function handleChange(ev){if(ev.target.id==='shelfSearch'){const input=ev.target;librarySearch=input.value;const start=input.selectionStart;render();const newInput=document.getElementById('shelfSearch');newInput?.focus();newInput?.setSelectionRange(start,start)}
 if(ev.target.id==='understanding'){if(!needAuth())return;const t=BY_ID[selectedId];if(!t)return;const p=deep(book(t.id))||{topicId:t.id,addedAt:new Date().toISOString(),favorite:false,ownSummary:'',notes:''};p.understanding=Number(ev.target.value);save('book',t.id,p)}}
function bindEvents(){document.addEventListener('click',handleClick);document.addEventListener('input',e=>{if(e.target.id==='shelfSearch')handleChange(e);if(e.target.id==='threadSearch'){threadSearch=e.target.value;const pos=e.target.selectionStart;render();const el=document.getElementById('threadSearch');el?.focus();el?.setSelectionRange(pos,pos)}if(e.target.id==='exportSearch'){exportSearch=e.target.value;const pos=e.target.selectionStart;renderDialog();const el=document.getElementById('exportSearch');el?.focus();el?.setSelectionRange(pos,pos)}});document.addEventListener('change',e=>{if(e.target.id==='understanding')handleChange(e);if(e.target.id==='importFile'&&e.target.files[0])importData(e.target.files[0]);if(e.target.id==='conversationExportFile'&&e.target.files[0])loadConversationsFile(e.target.files[0])});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog)closeModal();if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-graph-id]')){e.preventDefault();mapFocus=e.target.closest('[data-graph-id]').dataset.graphId;render()}});window.addEventListener('popstate',()=>{readRoute();render()});window.addEventListener('hashchange',()=>{readRoute();render()});}
const oldRender=render;render=function(){oldRender();if(view==='map')attachGraphInteractions()};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&currentUser&&cloudStatus==='ready'&&Date.now()-lastCloudRefresh>30000&&writeQueues.size===0)loadCloud()});
 window.addEventListener('beforeunload',e=>{if(writeQueues.size){e.preventDefault();e.returnValue='';}});
 readRoute();displayDate=new Date();bindEvents();render();initCloud();
window.KNOWLEDGE_DEBUG={getState:()=>({view,threadTab,journeyCount:journeyRecords().length,insightCount:Object.values(records.note).filter(r=>r.payload?.entryType==='insight').length,topicCount:TOPICS.length,cloudStatus,syncDiagnostic:syncDiagnostic.status,user:!!currentUser,recordCounts:Object.fromEntries(Object.entries(records).map(([k,v])=>[k,Object.keys(v).length]))}),chooseEncounter};
})();
