
'use strict';
/* The published app shell contains NO private lyrics. All imports are explicitly initiated by the user. */
const CLOUD_URL="https://nroyxwozdxwnrqyierjx.supabase.co", CLOUD_PUBLIC_KEY="sb_publishable_dxiidJt1gVcFwkVR2fg1HA_6gHAZNDz";
const STORE='lyric_strata_local_v1', MAX_NOTE=250000;
let data=[], current=null, view='strata', cloud=null, user=null, syncing=false;
let masterCandidates=[],masterWorks=new Map(),matchLoadError='';
let readingReportCache=null, readingFocus=-1, readingShow=20;
let draftReadings=[],draftReadingLoadError='';
let crossReadings=[],crossLoadError='',crossTopic='all',crossTerm='',crossLimit=15;
let crossOpenSerial=0;
let readingPaths=[],readingPathsLoadError='',selectedReadingPath='morning-promise';
let readingChallenges=[],readingChallengesLoadError='';
let compareLeft='',compareRight='',compareSerial=0,songReadingRecords=[];
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const newId=()=>window.crypto?.randomUUID?.()||('local-'+Date.now()+'-'+Math.random().toString(36).slice(2));
const dateOK=v=>/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/.test(String(v||''));
const sourceKey=e=>e.source_app+'|'+e.source_id;
const skyNames={choir:'合唱・詩',rap:'木乃伊',personal:'個人作品',unassigned:'未分類'};
const classNames={unreviewed:'未判定',unused:'未使用',draft:'書きかけ',removed:'改稿で削除',reworked:'形を変えた',adopted:'採用',on_hold:'保留'};
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),5000);}
function save(){try{localStorage.setItem(STORE,JSON.stringify({schema:1,entries:data}));return true;}catch(e){toast('端末への保存に失敗しました。JSONバックアップを使ってください。');return false;}}
function read(){try{const obj=JSON.parse(localStorage.getItem(STORE)||'null');data=Array.isArray(obj?.entries)?obj.entries.filter(e=>e&&e.original_text&&e.source_id).slice(0,7000):[];}catch{data=[];}}
function safeEntry(x){
 const text=String(x.text??x.original_text??'').slice(0,MAX_NOTE);
 const born=String(x.created_local??x.source_created_local??'').slice(0,19);
 const changed=String(x.modified_local??x.source_modified_local??'').slice(0,19);
 const source_app=x.source_app==='manual_paste'?'manual_paste':'apple_notes';
 return {id:newId(),source_app,source_id:String(x.source_id||x.id||newId()).slice(0,320),
  source_folder:String(x.folder||x.source_folder||'').slice(0,150),
  title:String(x.title||'無題').slice(0,320),original_text:text,
  source_created_local:dateOK(born)?born:null,source_modified_local:dateOK(changed)?changed:null,
  source_timezone:String(x.timezone||x.source_timezone||'local-unspecified').slice(0,150),
  date_status:(dateOK(born)?(source_app==='apple_notes'?'app_metadata':'text_declared'):'unknown'),
  sky:['rap','choir','personal'].includes(x.sky)?x.sky:'unassigned',
  classification:classNames[x.classification]?x.classification:'unreviewed',
  reviewer_note:String(x.reviewer_note||'').slice(0,8000),
  imported_at:new Date().toISOString(),reviewed_at:null,dirty:false,synced:false};
}
function addBatch(records){
 const exists=new Set(data.map(sourceKey));let added=0,duplicates=0,invalid=0;
 for(const r of records){
  if(!r||!String(r.text??r.original_text??'').trim()){invalid++;continue;}
  const x=safeEntry(r);
  if(x.source_folder.includes('余白')){invalid++;continue;}
  if(exists.has(sourceKey(x))){duplicates++;continue;}
  data.push(x);exists.add(sourceKey(x));added++;
 }
 if(added){readingReportCache=null;save();}
 current=data[data.length-1]?.source_id||current;
 render();
 return {added,duplicates,invalid};
}
const displayDate=e=>e.source_created_local?e.source_created_local.replace('T',' '):'日付不明';
function formatDate(e){return e.source_created_local?e.source_created_local.slice(0,7):'日付不明';}
function activeList(){
 const q=$('search')?.value.trim().toLowerCase()||'', sky=$('skyFilter')?.value||'all';
 return data.filter(e=>(sky==='all'||e.sky===sky)&&(!q||(e.title+' '+e.original_text).toLowerCase().includes(q)))
  .sort((a,b)=>(b.source_created_local||'').localeCompare(a.source_created_local||'')||(b.imported_at||'').localeCompare(a.imported_at||''));
}
function renderList(){
 $('countAll').textContent=data.length;
 $('countReadings').textContent=user?new Set(draftReadings.map(r=>r.entry_id)).size:'—';
 $('countDated').textContent=data.filter(e=>e.date_status!=='unknown'&&e.source_created_local).length;
 $('countUnknown').textContent=data.filter(e=>!e.source_created_local).length;
 $('countMatches').textContent=user?uniqueCandidates().length:'—';
 const items=activeList();let last='';
 if(!items.length){$('noteList').innerHTML='<div class="empty-state">まだ言葉がありません。<br>「回収する」から日付付きで取り込めます。</div>';return;}
 $('noteList').innerHTML=items.map(e=>{
  const head=formatDate(e);let out='';
  if(head!==last){out='<div class="date-head">'+esc(head)+'</div>';last=head;}
  const teaser=e.original_text.replace(/\s+/g,' ').slice(0,68);
  return out+'<button class="note-item '+(current===e.source_id?'selected':'')+'" data-note="'+esc(e.source_id)+'"><strong>'+esc(e.title)+'</strong><small>'+esc(displayDate(e))+' · '+esc(skyNames[e.sky]||'未分類')+' · '+esc(classNames[e.classification]||'未判定')+(user&&draftReadings.some(r=>r.entry_id===e.id)?' · 仮精読あり':'')+'</small><div class="excerpt">'+esc(teaser)+'</div></button>';
 }).join('');
}
const draftNoteNames={lyric:'歌詞案',fragment:'短い断片',prose:'散文',mixed:'複数の案・断片',reference:'創作補助資料',unresolved:'種類未確認'};
function draftReadingView(e){
 if(!user)return '<div class="draft-readings"><h3>この言葉を読む</h3><p class="muted">精読は本人専用クラウドに保存されています。ログインすると原文に沿った読みを表示します。</p></div>';
 if(draftReadingLoadError)return '<div class="draft-readings"><h3>この言葉を読む</h3><p class="muted">精読を取得できませんでした：'+esc(draftReadingLoadError)+'</p></div>';
 const matches=draftReadings.filter(r=>r.entry_id===e.id && typeof e.original_text==='string' && e.original_text.includes(r.evidence_a) && (!r.evidence_b||e.original_text.includes(r.evidence_b)));
 if(!matches.length)return '<div class="draft-readings"><h3>この言葉を読む</h3><p class="muted">この原文に一致する精読記録はまだありません。原文は変更しません。</p></div>';
 return '<section class="draft-readings"><h3>この言葉を読む <small>仮説・作者未確認</small></h3><p class="muted">一つのメモが一曲とは限りません。採用・未使用・没の判定ではなく、書かれた言葉から考えられる読みです。</p>'+
 matches.map(r=>'<article class="draft-reading-card"><span class="draft-kind">'+esc(draftNoteNames[r.note_kind]||'種類未確認')+'</span><h4>'+esc(r.heading)+'</h4>'+
 '<div class="draft-quotes"><strong>原文の根拠</strong><p>'+esc(r.evidence_a)+'</p>'+(r.evidence_b?'<p>'+esc(r.evidence_b)+'</p>':'')+'</div>'+
 '<dl><dt>本文から確認できること</dt><dd>'+esc(r.observation)+'</dd><dt>読みの仮説</dt><dd>'+esc(r.interpretation)+'</dd>'+
 '<dt>別の読み・留保</dt><dd>'+esc(r.alternative)+'</dd><dt>さらに考える問い</dt><dd>'+esc(r.inquiry)+'</dd></dl></article>').join('')+'</section>';
}
async function loadDraftReadings(){
 if(!user){draftReadings=[];draftReadingLoadError='';return;}
 try{
  const {data:rows,error}=await client().from('lyric_strata_readings').select('entry_id,note_kind,heading,evidence_a,evidence_b,observation,interpretation,alternative,inquiry,assessment_status').eq('user_id',user.id).limit(1000);
  if(error)throw error;
  draftReadings=rows||[];draftReadingLoadError='';
 }catch(e){draftReadings=[];draftReadingLoadError=e.message||'取得エラー';}
}
function renderDetail(){
 const e=data.find(r=>r.source_id===current);
 if(!e){$('detail').innerHTML='<div class="empty">言葉を選ぶと、原文・作成日・出典を表示します。</div>';return;}
 $('detail').innerHTML='<h2>'+esc(e.title)+'</h2><div class="metadata">作成日：'+esc(displayDate(e))+
 '<br>更新日：'+esc(e.source_modified_local?e.source_modified_local.replace('T',' '):'不明')+
 '<br>出典：'+esc(e.source_app==='apple_notes'?'Appleメモ / '+(e.source_folder||'フォルダ未設定'):'手入力')+
 '<br>日時の根拠：'+esc(e.date_status==='app_metadata'?'Appleメモの記録':'手入力の記録日（未検証）')+'</div>'+
 '<pre>'+esc(e.original_text)+'</pre>'+draftReadingView(e)+'<div class="row"><label class="label">名義</label><select class="select-input" id="editSky">'+
 Object.entries(skyNames).map(([k,v])=>'<option value="'+k+'" '+(e.sky===k?'selected':'')+'>'+esc(v)+'</option>').join('')+
 '</select></div><div class="row"><label class="label">現在の扱い</label><select class="select-input" id="editClass">'+
 Object.entries(classNames).map(([k,v])=>'<option value="'+k+'" '+(e.classification===k?'selected':'')+'>'+esc(v)+'</option>').join('')+
 '</select></div><div class="row"><label class="label">本人の確認メモ</label><textarea id="editMemo" class="form-textarea" placeholder="どの作品に使ったか、なぜ削ったか等">'+esc(e.reviewer_note||'')+'</textarea></div>'+
 '<button class="btn dark" id="saveClass">分類を保存</button><p class="muted">原文とメモの日時は変更できません。日付の修正は新しい記録を追加して履歴として残します。</p>';
}
function render(){
 const views=['strata','import','discovery','cross'];
 for(const k of views)$('view-'+k).classList.toggle('hidden',view!==k);
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 $('syncStatus').textContent=user?(syncing?'クラウド処理中…':'本人ログイン済み'):'この端末内';
 $('authOpen').textContent=user?'ログアウト':'ログイン';
 if(user&&!$('cloudSave')){
  const b=document.createElement('button');b.id='cloudSave';b.className='btn purple';b.textContent='クラウドに保存';b.addEventListener('click',cloudSave);
  $('authOpen').before(b);
 }else if(!user&&$('cloudSave'))$('cloudSave').remove();
 if(!$('backupBtn')){
  const b=document.createElement('button');b.id='backupBtn';b.className='btn';b.textContent='JSONバックアップ';b.addEventListener('click',backup);$('authOpen').before(b);
 }
 renderList();renderDetail();
 if(view==='discovery')renderDiscovery();
 if(view==='cross')renderCross();
}
function go(to){view=to;render();window.scrollTo({top:0,behavior:'instant'});}

async function downloadMacExporterZip(){
  const button=$('downloadMacZip');
  if(!button)return;
  const label=button.textContent;button.disabled=true;button.textContent='ZIPを作成中…';
  try{
    if(!window.JSZip)throw Error('ZIP生成ライブラリを読み込めません。通信状況をご確認ください。');
    const u=new URL('./Appleメモ_日付付き書き出し.command',location.href);
    const response=await fetch(u,{cache:'no-store'});
    if(!response.ok)throw Error('書き出し用ファイルを読み込めません（'+response.status+'）');
    let command=await response.text();
    if(!command.startsWith('#!/bin/zsh')||!command.includes('osascript'))throw Error('書き出し用ファイルの内容を確認できませんでした。');
    const zip=new JSZip();
    zip.file('01_これだけダブルクリック.command',command,{unixPermissions:0o755,createFolders:false});
    const help='言葉の地層｜Mac メモ回収（修正版）\n\n1. ZIPを解凍します。\n2. 01_これだけダブルクリック.command を右クリック→開く。\n3. Appleメモの指定フォルダから、作成日・更新日・原文を読み取ります。\n4. ダウンロードフォルダのJSONを言葉の地層アプリの「日付付きで回収」に読み込んでください。\n\n原本は変更せず、「余白」は対象外です。ファイルはご本人のMacに保存されます。\n';
    zip.file('README.txt',help,{unixPermissions:0o644,createFolders:false});
    const blob=await zip.generateAsync({type:'blob',platform:'UNIX',compression:'DEFLATE',compressionOptions:{level:6}});
    const href=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=href;a.download='lyric-strata-mac-exporter.zip';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(href),1500);
    toast('実行権限付きのZIPを作成しました。解凍したファイルを右クリックして開いてください。');
  }catch(err){toast('書き出しZIPの作成に失敗：'+(err.message||err));}
  finally{button.disabled=false;button.textContent=label;}
}
function backup(){
 const payload={format:'lyric_strata_backup_v1',exported_at:new Date().toISOString(),entries:data};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='言葉の地層_バックアップ_'+new Date().toISOString().slice(0,10)+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(u),1000);
}
function parseMarkdown(md,name){
 const meta={};let body=md;
 if(md.startsWith('---\n')){const close=md.indexOf('\n---\n',4);if(close>=0){for(const line of md.slice(4,close).split(/\r?\n/)){const m=line.match(/^([a-z_]+):\s*(.*)$/i);if(m)meta[m[1]]=m[2].replace(/^["']|["']$/g,'');}body=md.slice(close+5)}}
 const id=meta.id||name+'|'+meta.created;
 return [{title:meta.title||name.replace(/\.(md|txt)$/i,''),text:body,source_id:id,
  created_local:(meta.created||'').replace(/ /g,'T'),modified_local:(meta.modified||'').replace(/ /g,'T'),
  folder:'Markdown読み込み',timezone:'元のメモの日時（時差未確認）'}];
}
function parseFile(content,filename){
 if(filename.toLowerCase().endsWith('.json')){
  const obj=JSON.parse(content);
  if(obj.format==='lyric_strata_apple_notes_v1'&&Array.isArray(obj.notes))return obj.notes;
  if(obj.format==='lyric_strata_backup_v1'&&Array.isArray(obj.entries))return obj.entries;
  if(Array.isArray(obj))return obj;
  throw Error('対応するJSONではありません。専用Mac書き出し、または地層バックアップを使ってください。');
 }
 return parseMarkdown(content,filename);
}
async function importFile(){
 const f=$('noteFile').files?.[0];if(!f){toast('ファイルを選択してください。');return;}
 if(f.size>12*1024*1024){toast('ファイルが大きすぎます。小分けにして取り込んでください。');return;}
 try{const rows=parseFile(await f.text(),f.name);
  if(rows.length>1000)throw Error('一度に読み込めるメモは1000件までです。');
  const result=addBatch(rows);
  $('importReport').textContent='新規 '+result.added+'件／重複 '+result.duplicates+'件／空欄・対象外 '+result.invalid+'件';
  toast('新規 '+result.added+'件をこの端末に保存しました。');
  if(result.added)go('strata');
 }catch(e){$('importReport').textContent=e.message;toast('取り込みエラー：'+e.message);}
}

function readingReport(){
 if(!window.StrataReadingV2)return null;
 // The original text and created date are immutable after import; local classification can change.
 const signature=data.map(e=>(e.source_id||e.id)+'/'+e.sky+'/'+e.original_text.length+'/'+String(e.original_text).slice(-16)).join('|');
 if(!readingReportCache||readingReportCache.signature!==signature)
   readingReportCache={signature,result:window.StrataReadingV2.scan(data)};
 return readingReportCache.result;
}
function dateDetail(e){
 const created=e.source_created_local?e.source_created_local.replace('T',' ').slice(0,16):'不明';
 const modified=e.source_modified_local?e.source_modified_local.replace('T',' ').slice(0,16):'不明';
 return 'メモ作成：'+created+' ／ 更新：'+modified;
}
function readingPairKey(e){return e.source_id||e.id;}
function viewReadingDetail(pair){
 const row=(label,val,empty)=>'<div class="reading-compare-column"><h4>'+label+'</h4>'+
  (val.length?'<div class="reading-compare-lines">'+val.map(t=>'<p>'+esc(t)+'</p>').join('')+'</div>':
   '<p class="muted">'+empty+'</p>')+'</div>';
 const shared=pair.shared.length?
  '<div class="reading-evidence"><h4>両方に残る表現 '+pair.sharedCount+'行</h4>'+
  pair.shared.map(x=>'<div class="reading-unchanged">'+esc(x.a)+'</div>').join('')+'</div>':
  '<p class="muted">同じ行が見つからなくても、同題稿の可能性は残ります。</p>';
 const altered=pair.rephrased.length?
  '<div class="reading-evidence"><h4>言い換え・修正の可能性がある行（自動候補）</h4>'+
  pair.rephrased.map(x=>'<div class="reading-change">'+row('メモA', [x.a],'')+row('メモB',[x.b],'')+'</div>').join('')+'</div>':'';
 return '<div class="reading-expanded"><h3>二つの記録を読み比べる</h3>'+
  '<p class="muted">※ Appleメモの日時は記録上の日時です。ここではどちらが完成稿か、何が採用・削除されたかを断定しません。行の順番や文脈も原文で確認してください。</p>'+
  '<div class="reading-meta-pair"><div><b>メモA</b><strong>'+esc(pair.a.title)+'</strong><small>'+esc(dateDetail(pair.a))+'</small></div>'+
  '<div><b>メモB</b><strong>'+esc(pair.b.title)+'</strong><small>'+esc(dateDetail(pair.b))+'</small></div></div>'+
  shared+altered+
  '<div class="reading-evidence"><h4>片方にだけある行の例</h4><div class="reading-change">'+
  row('メモAのみ（削除の意味ではありません）',pair.onlyA,'候補なし')+
  row('メモBのみ（追加の意味ではありません）',pair.onlyB,'候補なし')+'</div></div>'+
  '<div class="reading-source-actions"><button class="btn" data-note="'+esc(readingPairKey(pair.a))+'">メモAの原文を開く</button>'+
  '<button class="btn" data-note="'+esc(readingPairKey(pair.b))+'">メモBの原文を開く</button></div>'+
  '<details class="reading-raw"><summary>メモAの原文全文（改変なし）</summary><pre>'+esc(pair.a.original_text)+'</pre></details>'+
  '<details class="reading-raw"><summary>メモBの原文全文（改変なし）</summary><pre>'+esc(pair.b.original_text)+'</pre></details>'+
  '</div>';
}
function readingPairsView(){
 const r=readingReport();
 if(!r)return '<div class="candidate-notice">照合エンジンの読み込みに失敗しました。再読み込みしてください。</div>';
 const found=r.candidates;
 const metrics='<div class="reading-metrics"><span><strong>'+r.scanned+'</strong><small>比較したメモ</small></span>'+
  '<span><strong>'+found.length+'</strong><small>原文の関連候補</small></span>'+
  '<span><strong>'+r.notesWithCandidates+'</strong><small>候補のあるメモ</small></span>'+
  '<span><strong>'+r.totalLines+'</strong><small>比較した有効行</small></span></div>';
 const note='<p class="muted">74件などの登録メモを先頭70件で打ち切らず、全文から行・部分表現・同題の候補を比較します。共通語が短いだけでは関連づけず、似た表現は自動判定として区別します。意味や転用意図は判定しません。「候補なし」は「未使用」の意味ではありません。</p>'+
  (r.capped.length?'<p class="candidate-notice">非常に長い記録については照合中の検索文字数が25,000字を超えたため、確認対象：'+esc(r.capped.join('／'))+'</p>':'');
 if(!found.length)return metrics+'<p class="muted">一定以上の共通表現があるメモは見つかっていません。</p>'+note;
 const cards=found.slice(0,readingShow).map((p,i)=>{
  const active=i===readingFocus;
  return '<article class="reading-pair-card"><div class="reading-pair-top"><span class="match-source '+(p.sameTitle?'':'weak')+'">'+esc(p.confidence)+'</span>'+
   '<span class="muted">同じ行：'+p.sharedCount+' / 近い行：'+p.changedCount+'</span></div>'+
   '<div class="match-titles"><strong>'+esc(p.a.title)+'</strong><span>と</span><strong>'+esc(p.b.title)+'</strong></div>'+
   '<p class="muted">'+esc(displayDate(p.a))+' ／ '+esc(displayDate(p.b))+'</p>'+
   (p.shared.length?'<div class="match-fragments">'+p.shared.slice(0,2).map(z=>'<span>'+esc(z.a)+'</span>').join('')+'</div>':'')+
   '<button class="btn '+(active?'purple':'')+'" data-reading-open="'+i+'">'+(active?'比較を閉じる':'原文の違いを比較する')+'</button>'+
   (active?viewReadingDetail(p):'')+'</article>';
 }).join('');
 return metrics+cards+(found.length>readingShow?'<button class="btn" id="readingMore">ほかの '+(found.length-readingShow)+'組も表示</button>':'')+note;
}

const candidateMethodNames={
 master_lyrics:'歌詞原文の一致',
 book_pdf_unverified:'歌詞集PDF（校正前）の一致',
 title_only:'作品名が一致（本文未照合）'
};
const decisionNames={unreviewed:'経緯未確認',confirmed:'本人が関連を確認',uncertain:'確認保留',unrelated:'関連なし'};
function uniqueCandidates(){
 const byPair=new Map();
 const priority=c=>c.review_status!=='unreviewed'?10000:0;
 for(const c of masterCandidates){
  const key=c.entry_id+'|'+c.work_id;
  const old=byPair.get(key);
  if(!old||priority(c)+c.score>priority(old)+old.score)byPair.set(key,c);
 }
 return [...byPair.values()].sort((a,b)=>b.score-a.score||String(a.id).localeCompare(String(b.id)));
}
function workCandidateView(){
 if(!user)return '<div class="candidate-notice">既存作品との照合結果は本人専用です。右上からログインすると、クラウドに保存された発掘候補を確認できます。</div>';
 if(matchLoadError)return '<div class="candidate-notice">照合結果を読み込めませんでした：'+esc(matchLoadError)+'</div>';
 const pairs=uniqueCandidates(), visible=pairs.filter(c=>c.review_status!=='unrelated');
 const noteByID=new Map(data.map(e=>[e.id,e]));
 const notesSeen=new Set(pairs.map(c=>c.entry_id));
 const body=visible.map(c=>{
  const n=noteByID.get(c.entry_id),w=masterWorks.get(c.work_id);
  if(!n||!w)return '';
  const labels=Array.isArray(c.evidence)?c.evidence.slice(0,5):[];
  const bookInfo=c.method==='book_pdf_unverified'?' · 『日と間と目』PDF '+(w.source_page_start||'不明')+'ページ':'';
  return '<article class="match-card"><div class="match-card-top"><span class="match-source '+(c.method==='title_only'?'weak':'')+'">'+esc(candidateMethodNames[c.method]||'一致候補')+'</span><span class="match-review">'+esc(decisionNames[c.review_status]||'経緯未確認')+'</span></div>'+
   '<div class="match-titles"><strong>'+esc(n.title)+'</strong><span>と</span><strong>《'+esc(w.title)+'》</strong></div>'+
   '<p class="muted">メモ作成日：'+esc(displayDate(n))+' · 作品分類：'+esc(skyNames[w.sky]||w.sky)+esc(bookInfo)+'</p>'+
   (labels.length?'<div class="match-fragments">'+labels.map(p=>'<span>'+esc(p)+'</span>').join('')+'</div>':'<p class="muted">タイトルの一致のみです。歌詞本文が同じとは限りません。</p>')+
   '<div class="match-actions"><button class="btn" data-note="'+esc(n.source_id)+'">メモ原文を見る</button>'+
   '<button class="btn '+(c.review_status==='confirmed'?'purple':'')+'" data-candidate="'+esc(c.id)+'" data-decision="confirmed">関連を確認</button>'+
   '<button class="btn" data-candidate="'+esc(c.id)+'" data-decision="uncertain">保留</button>'+
   '<button class="btn" data-candidate="'+esc(c.id)+'" data-decision="unrelated">関連なし</button></div></article>';
 }).join('');
 return '<div class="candidate-summary"><div><strong>'+pairs.length+'</strong><small>作品との照合候補</small></div><div><strong>'+notesSeen.size+' / '+data.length+'</strong><small>候補のあるメモ</small></div><div><strong>'+pairs.filter(c=>c.method==='master_lyrics').length+'</strong><small>本文一致の作品ペア</small></div></div>'+
  (body||'<div class="candidate-notice">現在表示できる作品の照合候補はありません。原文の採用関係は未確認のままです。</div>')+
  '<p class="muted">照合対象：正本DBの作品181件（歌詞全文は12件、木乃伊168件は歌詞集PDFから文字列を照合）。一致しないことは「未使用」の証明ではありません。完成曲の歌詞と同じ行があっても、制作時の転用関係を自動確定しません。</p>';
}
async function loadMasterCandidates(){
 if(!user){masterCandidates=[];masterWorks=new Map();matchLoadError='';return;}
 try{
  const [a,b]=await Promise.all([
   client().from('lyric_strata_match_candidates').select('id,entry_id,work_id,method,evidence,evidence_count,score,review_status,algorithm_version').eq('user_id',user.id).limit(2000),
   client().from('lyric_master_works').select('id,title,sky,source_name,source_page_start,verification_status,original_book_index,credited_author,authorship_status').eq('user_id',user.id).limit(500)
  ]);
  if(a.error)throw a.error;if(b.error)throw b.error;
  masterCandidates=a.data||[];
  masterWorks=new Map((b.data||[]).map(w=>[w.id,w]));
  matchLoadError='';
 }catch(e){matchLoadError=e.message||'不明なエラー';masterCandidates=[];masterWorks=new Map();}
}
async function reviewCandidate(id,decision){
 if(!user){toast('ログインが必要です。');return;}
 if(!['confirmed','uncertain','unrelated'].includes(decision))return;
 const item=masterCandidates.find(c=>c.id===id);if(!item)return;
 const {data:changed,error}=await client().from('lyric_strata_match_candidates')
  .update({review_status:decision,updated_at:new Date().toISOString()})
  .eq('user_id',user.id).eq('id',id).select('id,review_status');
 if(error){toast('判定の保存に失敗：'+error.message);return;}
 if(!changed?.length){toast('判定を更新できませんでした。再ログインして確認してください。');return;}
 item.review_status=decision;renderDiscovery();toast('ご本人の判定を保存しました。メモの原文・作品DBは変更していません。');
}

const crossRelationNames={text_overlap:'本文に共通表現',counterpoint:'異なる答え・緊張',resonance:'問いの共鳴',reframing:'言い直し',possible_revision:'改稿の可能性'};
function crossDoc(link,side){
 const prefix=side==='left'?'left':'right';
 const workId=link[prefix+'_work_id'],noteId=link[prefix+'_entry_id'];
 const quote=link['evidence_'+prefix];
 if(noteId){
  const n=data.find(e=>e.id===noteId);
  if(!n||!n.original_text.includes(quote))return null;
  return {type:'note',id:noteId,title:n.title||'無題',kind:'創作メモ',date:n.source_created_local?.slice(0,10)||'記録日未確認',
    label:'メモの原文へ',sourceId:n.source_id,quote};
 }
 if(workId){
  const w=masterWorks.get(workId);
  if(!w)return null;
  const kind=w.sky==='rap'?'木乃伊':w.sky==='choir'?'合唱・詩':'個人作品';
  return {type:'work',id:workId,title:w.title,kind,date:'',label:'作品の原文へ',quote};
 }
 return null;
}
async function loadCrossReadings(){
 if(!user){crossReadings=[];crossLoadError='';return;}
 try{
  const {data:rows,error}=await client().from('lyric_cross_readings').select(
   'link_key,topic,relation_type,left_work_id,left_entry_id,right_work_id,right_entry_id,evidence_left,evidence_right,'+
   'left_source_version,right_source_version,observation,interpretation,alternative,inquiry,assessment_status'
  ).eq('user_id',user.id).limit(1000);
  if(error)throw error;
  crossReadings=rows||[];crossLoadError='';
 }catch(e){crossReadings=[];crossLoadError=e.message||'取得エラー';}
}
function crossVisible(){
 return crossReadings.map(r=>({record:r,left:crossDoc(r,'left'),right:crossDoc(r,'right')}))
  .filter(x=>x.left&&x.right)
  .filter(x=>crossTopic==='all'||x.record.topic===crossTopic)
  .filter(x=>{
    const q=crossTerm.trim().normalize('NFKC').toLowerCase();
    if(!q)return true;
    return [x.left.title,x.right.title,x.record.topic,x.record.interpretation,x.record.inquiry,
            x.record.evidence_left,x.record.evidence_right].some(v=>String(v||'').normalize('NFKC').toLowerCase().includes(q));
  }).sort((a,b)=>a.record.topic.localeCompare(b.record.topic,'ja')||a.record.link_key.localeCompare(b.record.link_key));
}
function crossAction(d){
 return '<button class="btn cross-link" data-'+(d.type==='note'?'cross-note':'cross-work')+'="'+esc(d.type==='note'?d.sourceId:d.id)+'">'+esc(d.label)+'</button>';
}
function crossCard(model){
 const r=model.record,a=model.left,b=model.right;
 return '<article class="cross-card"><div class="cross-card-top"><span>'+esc(r.topic)+'</span><small>'+esc(crossRelationNames[r.relation_type]||'対照')+'</small></div>'+
 '<div class="cross-grid">'+
 [a,b].map(d=>'<div class="cross-source"><p class="cross-kind">'+esc(d.kind)+(d.date?' · メモ作成 '+esc(d.date):'')+'</p>'+
 '<h3>《'+esc(d.title)+'》</h3><blockquote>'+esc(d.quote)+'</blockquote>'+crossAction(d)+'</div>').join('')+
 '</div><dl class="cross-reading"><dt>横断して考える</dt><dd>'+esc(r.interpretation)+'</dd>'+
 '<dt>別の読み方・確認が必要なこと</dt><dd>'+esc(r.alternative)+'</dd>'+
 '<dt>次に考える問い</dt><dd>'+esc(r.inquiry)+'</dd></dl>'+
 '<p class="cross-foot">出典本文の引用を照合済み。内容は仮説であり、作者の意図・没／採用・制作順を断定しません。</p></article>';
}

const PATH_ORDER=['morning-promise','who-may-cheer','limits-of-music','ordinary-beyond-song','memory-double-bind','who-is-you','rap-mask','music-rules-freedom'];
async function loadReadingPaths(){
 if(!user){readingPaths=[];readingPathsLoadError='';return;}
 try{
  const {data:rows,error}=await client().from('lyric_close_reading_paths')
   .select('thread_key,title,guiding_question,core_hypothesis,formal_mechanism,central_tension,counterreading,inference_limit,next_inquiry,anchors,assessment_status,refined_hypothesis,refinement_note')
   .eq('user_id',user.id).limit(100);
  if(error)throw error;
  readingPaths=Array.isArray(rows)?rows:[];readingPathsLoadError='';
 }catch(e){readingPaths=[];readingPathsLoadError=e.message||'取得エラー';}
}
function readingPathSource(a){
 if(!a||typeof a!=='object'||!['work','note'].includes(a.kind)||!a.source_id||!a.quote)return null;
 const source=crossDoc({left_work_id:a.kind==='work'?a.source_id:null,
 left_entry_id:a.kind==='note'?a.source_id:null,evidence_left:a.quote},'left');
 if(!source)return null;
 return {...source,technique:a.technique||'',observation:a.observation||'',sourceVersion:a.source_version??null};
}

const CHALLENGE_KIND_NAMES={
 contradicts:'従来の読みへの反論',
 narrows:'適用範囲を狭める',
 reframes:'問いの立て方を変える',
 unresolved:'まだ判断できない'
};
async function loadReadingChallenges(){
 if(!user){readingChallenges=[];readingChallengesLoadError='';return;}
 try{
  const {data:rows,error}=await client().from('lyric_reading_challenges')
   .select('challenge_key,thread_key,challenge_kind,work_id,entry_id,evidence,challenged_assumption,observation,revised_reading,alternative,limit_note,quoted_source_version,assessment_status')
   .eq('user_id',user.id).limit(300);
  if(error)throw error;
  readingChallenges=Array.isArray(rows)?rows:[];readingChallengesLoadError='';
 }catch(e){readingChallenges=[];readingChallengesLoadError=e.message||'取得エラー';}
}
function challengeSource(c){
 if(!c||!c.evidence||!!c.work_id===!!c.entry_id)return null;
 return crossDoc({left_work_id:c.work_id||null,left_entry_id:c.entry_id||null,evidence_left:c.evidence},'left');
}
function challengeCard(c){
 const source=challengeSource(c);
 if(!source)return '<article class="reading-challenge reading-challenge-unavailable"><p>資料の原文または引用に不一致があります。再照合が必要です。</p></article>';
 return '<article class="reading-challenge">'+
 '<header><div><span class="reading-challenge-source">'+esc(source.kind)+'</span><h5>《'+esc(source.title)+'》</h5></div>'+
 '<small>'+esc(CHALLENGE_KIND_NAMES[c.challenge_kind]||'再検討')+'</small></header>'+
 '<blockquote>'+esc(source.quote)+'</blockquote>'+
 '<dl><dt>問い直す従来の前提</dt><dd>'+esc(c.challenged_assumption)+'</dd>'+'<dt>原文に見えること</dt><dd>'+esc(c.observation)+'</dd>'+
 '<dt>この反例で修正すること</dt><dd>'+esc(c.revised_reading)+'</dd>'+
 '<dt>反論・留保</dt><dd>'+esc(c.alternative)+'</dd>'+
 '<dt>決めつけないこと</dt><dd>'+esc(c.limit_note)+'</dd></dl>'+
 '<div class="reading-challenge-footer">'+crossAction(source)+'</div></article>';
}
function challengePanel(path){
 if(readingChallengesLoadError)return '<p class="muted">反例を取得できませんでした：'+esc(readingChallengesLoadError)+'</p>';
 const tests=readingChallenges.filter(c=>c.thread_key===path.thread_key);
 const shown=tests.filter(c=>challengeSource(c));
 return '<section class="reading-refutation">'+
 '<div class="reading-refutation-intro"><h4>反例を通して、読み直す。</h4><p>反例は既存の読みを否定するためだけではありません。どの部分を守り、どの前提を変えるかを原文とともに確かめます。</p></div>'+
 (path.refined_hypothesis?'<div class="reading-refined"><strong>反例後の仮説</strong><p>'+esc(path.refined_hypothesis)+'</p>'+
 (path.refinement_note?'<small>'+esc(path.refinement_note)+'</small>':'')+'</div>':'')+
 '<details class="reading-initial"><summary>初回の仮説と照らし合わせる</summary><p>'+esc(path.core_hypothesis)+'</p></details>'+
 '<p class="reading-challenge-count">この問いの反例 '+shown.length+'件'+(tests.length!==shown.length?'（うち'+(tests.length-shown.length)+'件は出典の再照合が必要）':'')+'</p>'+
 '<div class="reading-challenge-grid">'+(tests.map(challengeCard).join('')||'<p class="muted">まだ反例の精読がありません。</p>')+'</div>'+
 '</section>';
}

function readPathEvidence(a){
 const d=readingPathSource(a);
 if(!d)return '<article class="reading-path-evidence unavailable"><p>出典の原文または引用を確認できません。この箇所は表示対象外です。</p></article>';
 return '<article class="reading-path-evidence"><div class="reading-path-source-head"><span>'+esc(d.kind)+'</span><strong>《'+esc(d.title)+'》</strong></div>'+
 '<blockquote>'+esc(d.quote)+'</blockquote>'+
 '<p><b>'+esc(d.technique)+'</b> — '+esc(d.observation)+'</p>'+
 crossAction(d)+'</article>';
}
function readingPathsPanel(){
 if(!user)return '<div class="notice">深い横断精読は本人専用です。ログインすると作品間の解釈を原文付きで確認できます。</div>';
 if(readingPathsLoadError)return '<div class="notice">深い横断精読を取得できませんでした：'+esc(readingPathsLoadError)+'</div>';
 if(!readingPaths.length)return '<p class="muted">深い横断精読はまだ登録されていません。</p>';
 const sorted=[...readingPaths].sort((a,b)=>PATH_ORDER.indexOf(a.thread_key)-PATH_ORDER.indexOf(b.thread_key));
 if(!sorted.some(p=>p.thread_key===selectedReadingPath))selectedReadingPath=sorted[0].thread_key;
 const active=sorted.find(p=>p.thread_key===selectedReadingPath);
 const evidence=Array.isArray(active.anchors)?active.anchors:[];
 const valid=evidence.filter(a=>readingPathSource(a));
 const sections=[
  ['歌詞の書き方・構造',active.formal_mechanism],
  ['初回から残る矛盾',active.central_tension],['初回に挙げた別解',active.counterreading],
  ['決めつけてはいけないこと',active.inference_limit]
 ];
 return '<section class="reading-paths">'+
 '<div class="reading-paths-heading"><h2>問いを、作品のあいだで考える。</h2><p>8つの問いを、複数の原文に戻りながら検討します。反例と未確定事項も残しています。作品理解の仮説であり、作者の意図・制作順・採用／没を確定するものではありません。</p></div>'+
 '<nav class="reading-path-tabs" aria-label="精読する問い">'+sorted.map((p,i)=>
 '<button type="button" class="'+(p.thread_key===selectedReadingPath?'active':'')+'" data-read-path="'+esc(p.thread_key)+'" aria-pressed="'+(p.thread_key===selectedReadingPath)+'">'+
 '<span>0'+(i+1)+'</span>'+esc(p.title)+'</button>').join('')+'</nav>'+
 '<div class="reading-path-active"><p class="reading-path-brow">問いの精読 ／ '+valid.length+'件の根拠</p>'+
 '<h3>'+esc(active.title)+'</h3><p class="reading-path-question">'+esc(active.guiding_question)+'</p>'+challengePanel(active)+
 '<div class="reading-path-body">'+sections.map(([label,text],i)=>
 '<section class="'+(i===3?'reading-path-counter':'')+'"><h4>'+esc(label)+'</h4><p>'+esc(text)+'</p></section>').join('')+'</div>'+
 '<h4 class="reading-path-evidence-title">根拠となる作品・原文</h4>'+
 '<div class="reading-path-sources">'+(valid.map(readPathEvidence).join('')||'<p>出典の照合が必要です。</p>')+'</div>'+
 '<div class="reading-path-next"><strong>次に考える問い</strong><p>'+esc(active.next_inquiry)+'</p></div>'+
 '<p class="reading-path-note">原文引用は保存時点で照合済みです。後から歌詞本文を変更した場合は、原文を開いて再確認が必要です。木乃伊のPDF抽出本文は原本との校正前です。歌詞の語り手と実在の作者は同一視しません。</p>'+
 '</div></section>';
}
function renderReadingPaths(){
 const el=$('readingPathsOutput');if(el)el.innerHTML=readingPathsPanel();
}

function renderCrossRows(){
 const box=$('crossResults');if(!box)return;
 if(!user){box.innerHTML='<div class="notice">この横断読解は本人専用です。ログインすると、創作メモ・木乃伊の作品・合唱曲を原文付きで比較できます。</div>';return;}
 if(crossLoadError){box.innerHTML='<div class="notice">横断読解を取得できませんでした：'+esc(crossLoadError)+'</div>';return;}
 const models=crossVisible(),shown=models.slice(0,crossLimit);
 box.innerHTML='<p class="muted">該当 '+models.length+'組 ／ '+shown.length+'組を表示。類似は同じ制作意図・人物・時系列を意味しません。</p>'+
 (shown.map(crossCard).join('')||'<div class="empty-state">一致する比較がありません。検索語や問いを変えてください。</div>')+
 (models.length>shown.length?'<button class="btn" id="crossMore">さらに比較を表示</button>':'');
}

async function loadSongReadingRecords(){
 if(!user){songReadingRecords=[];return;}
 try{
  const {data:rows,error}=await client().from('lyric_song_readings').select(
   'work_id,heading,evidence_a,evidence_b,observation,interpretation,alternative,inquiry,source_version_no'
  ).eq('user_id',user.id).limit(2000);
  if(error)throw error;
  songReadingRecords=rows||[];
 }catch(e){songReadingRecords=[];console.warn('Song reading summaries unavailable',e);}
}
function compareCatalogOptions(){
 if(!user)return '';
 const excluded=new Set(draftReadings.filter(r=>r.note_kind==='reference').map(r=>r.entry_id));
 const works=[...masterWorks.values()];
 const groups=[
  ['木乃伊｜歌詞集',works.filter(w=>w.sky==='rap').sort((a,b)=>(a.original_book_index??999)-(b.original_book_index??999)).map(w=>['w:'+w.id,(w.original_book_index??'?')+' ｜ '+w.title])],
  ['合唱曲・詩',works.filter(w=>w.sky==='choir').sort((a,b)=>a.title.localeCompare(b.title,'ja')).map(w=>['w:'+w.id,w.title])],
  ['個人作品',works.filter(w=>w.sky==='personal').map(w=>['w:'+w.id,w.title])],
  ['言葉の地層｜Appleメモ',data.filter(n=>n.id&&!excluded.has(n.id)).sort((a,b)=>(a.source_created_local||'').localeCompare(b.source_created_local||''))
    .map(n=>['n:'+n.id,n.title||'無題'])]
 ];
 return groups.map(([name,items])=>'<optgroup label="'+esc(name)+'">'+items.map(([val,name])=>
  '<option value="'+esc(val)+'">'+esc(name)+'</option>').join('')+'</optgroup>').join('');
}
function renderCompareLab(){
 const root=$('compareLab');
 if(!root)return;
 if(!user){root.innerHTML='<p class="muted">任意の二作品の比較には本人ログインが必要です。</p>';return;}
 const list=compareCatalogOptions();
 root.innerHTML='<p class="muted">木乃伊168作品、合唱・個人作品13件、地層の創作メモから二つを選びます。歌詞全文は選んだ時だけ取得し、原文の同一行を機械的に照合します。解釈の一致や改稿を自動判定しません。</p>'+
 '<div class="compare-pickers">'+
 [1,2].map((n,i)=>'<label class="field"><span>'+n+'つ目の資料</span><select id="compareSelect'+n+'"><option value="">作品・草稿を選ぶ</option>'+
 list.replaceAll('value="'+esc(i===0?compareLeft:compareRight)+'"','value="'+esc(i===0?compareLeft:compareRight)+'" selected')+
 '</select></label>').join('')+
 '</div><button class="btn dark" id="runCompare">この二作品を並べて読む</button>'+
 '<div id="compareOutput" aria-live="polite"></div>';
}
function compareReadingSummary(d){
 const rows=d.type==='note'?draftReadings.filter(r=>r.entry_id===d.id):
  songReadingRecords.filter(r=>r.work_id===d.id&&Number(r.source_version_no)===Number(d.version));
 const valid=rows.filter(r=>d.text.includes(r.evidence_a)&&(!r.evidence_b||d.text.includes(r.evidence_b)));
 if(!valid.length)return '<p class="muted">この資料に付けた個別の精読メモは表示対象外です（本文版が未照合、または精読未登録）。</p>';
 return valid.slice(0,3).map(r=>'<div class="compare-reading"><strong>'+esc(r.heading)+'</strong>'+
 '<p>'+esc(r.interpretation)+'</p><p class="muted">別の読み：'+esc(r.alternative)+'</p></div>').join('');
}
async function getCompareDoc(key){
 if(key.startsWith('n:')){
  const e=data.find(e=>e.id===key.slice(2));
  if(!e)return null;
  return {type:'note',id:e.id,title:e.title||'無題',text:e.original_text,version:null,source:'Appleメモの保存原文（元の記録日 '+(e.source_created_local?.slice(0,10)||'未確認')+'）'};
 }
 if(!key.startsWith('w:'))return null;
 const id=key.slice(2),w=masterWorks.get(id);
 if(!user||!w)return null;
 const {data:body,error}=await client().from('lyric_master_text_versions')
  .select('literal_text,version_no,text_status').eq('user_id',user.id).eq('work_id',id).order('version_no',{ascending:false}).limit(1).maybeSingle();
 if(error)throw error;
 if(!body)return null;
 return {type:'work',id,title:w.title,text:body.literal_text,version:body.version_no,
  source:(w.sky==='rap'?'木乃伊・PDF抽出原文／校正前':w.sky==='choir'?'合唱・詩':'個人作品')+
   ' ／ 保存本文 v'+body.version_no+(w.authorship_status&&w.authorship_status!=='sole'?' ／ 著作者・共作者について要確認':'')};
}
function compareSourceCard(d,side){
 const info=window.CrossSourceCompare.inspect(d.text);
 return '<article class="compare-text-card"><span class="cross-kind">'+esc(d.source)+'</span>'+
 '<h3>《'+esc(d.title)+'》</h3><p class="muted">'+info.lineCount+'行 ／ 冒頭から末尾までの保存原文</p>'+
 '<pre>'+esc(d.text)+'</pre><details><summary>この資料の個別精読を読む</summary>'+compareReadingSummary(d)+'</details></article>';
}
async function runCompare(){
 if(!user||!window.CrossSourceCompare)return;
 if(!compareLeft||!compareRight){toast('二つの資料を選択してください。');return;}
 if(compareLeft===compareRight){toast('異なる二つの資料を選んでください。');return;}
 const output=$('compareOutput');
 if(!output)return;
 output.innerHTML='<p class="muted">選択した二つの保存原文を確認しています…</p>';
 const serial=++compareSerial;
 try{
  const [a,b]=await Promise.all([getCompareDoc(compareLeft),getCompareDoc(compareRight)]);
  if(serial!==compareSerial||!user)return;
  if(!a||!b){output.innerHTML='<p class="muted">どちらかの資料を取得できませんでした。</p>';return;}
  const comparison=window.CrossSourceCompare.compare(a.text,b.text);
  const lines=comparison.shared.map(r=>'<p><small>左 L'+r.leftLine+' ／ 右 L'+r.rightLine+'</small> '+esc(r.text)+'</p>').join('');
  output.innerHTML='<div class="compare-match"><strong>同じ行が見つかった件数：'+comparison.sharedCount+'</strong>'+
   '<p class="muted">12文字以上の比較可能な行を照合しました。一致しなくても意味的な関連がないとは限りません。</p>'+
   (lines?'<div class="compare-match-lines">'+lines+'</div>':'<p class="muted">一定以上の長さの一致行はありません。両方の本文を読んで比較できます。</p>')+
   (comparison.moreShared?'<p class="muted">他 '+comparison.moreShared+'行が一致しています。</p>':'')+
   '</div><div class="compare-source-grid">'+compareSourceCard(a,'left')+compareSourceCard(b,'right')+'</div>';
 }catch(e){if(serial===compareSerial){output.innerHTML='<p class="notice">本文を取得できませんでした：'+esc(e.message||e)+'</p>';}}
}

function renderCross(){
 const root=$('crossOutput');if(!root)return;
 const topicSet=[...new Set(crossReadings.map(x=>x.topic))].sort((a,b)=>a.localeCompare(b,'ja'));
 root.innerHTML='<div class="cross-intro"><strong>原文から、作品の外へ。</strong><p>個別の歌詞・未発表メモ・完成作品の読みを比較します。同じ言葉が残る場合、違う答えになる場合、互いに問いを投げかける場合を分けています。エッセイや年表を唯一の基準にはしません。</p></div>'+
 '<div id="readingPathsOutput"></div>'+ '<div class="cross-toolbar"><label class="field"><span>問いから探す</span><select id="crossTopic"><option value="all">すべての問い（'+crossReadings.length+'組）</option>'+
 topicSet.map(t=>'<option value="'+esc(t)+'" '+(crossTopic===t?'selected':'')+'>'+esc(t)+'（'+crossReadings.filter(x=>x.topic===t).length+'）</option>').join('')+
 '</select></label><label class="field"><span>言葉・作品名・問い</span><input id="crossQuery" type="search" placeholder="例：朝、頑張れ、日常" value="'+esc(crossTerm)+'"></label></div>'+
 '<details class="cross-compare-lab"><summary>好きな二作品を原文ごと並べる（全資料から選択）</summary><div id="compareLab"></div></details>'+
 '<div id="crossResults" aria-live="polite"></div>';
 renderCompareLab();
 renderReadingPaths();
 renderCrossRows();
}
async function openCrossWork(id){
 const w=masterWorks.get(id);if(!user||!w){toast('本人ログイン後に閲覧できます。');return;}
 const modal=$('crossSourceModal'),head=$('crossSourceTitle'),meta=$('crossSourceMeta'),body=$('crossSourceText');
 modal.classList.remove('hidden');head.textContent='《'+w.title+'》';meta.textContent='原文を読み込み中…';body.textContent='';
 const serial=++crossOpenSerial;
 try{
  const {data:record,error}=await client().from('lyric_master_text_versions')
   .select('literal_text,version_no,text_status').eq('user_id',user.id).eq('work_id',id)
   .order('version_no',{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;
  if(serial!==crossOpenSerial||modal.classList.contains('hidden')||!user)return;
  if(!record){meta.textContent='原文がありません。';return;}
  const relevant=[...crossReadings.flatMap(r=>r.left_work_id===id?[r.evidence_left]:r.right_work_id===id?[r.evidence_right]:[]),...readingPaths.flatMap(p=>(p.anchors||[]).filter(a=>a&&a.kind==='work'&&a.source_id===id).map(a=>a.quote)),...readingChallenges.filter(c=>c.work_id===id).map(c=>c.evidence)];
  const n=relevant.filter(q=>record.literal_text.includes(q)).length;
  meta.textContent=(w.sky==='rap'?'木乃伊・PDF抽出原文（未校正）':w.sky==='choir'?'合唱・詩':'個人作品')+
   ' ／ 保存本文 v'+record.version_no+' ／ 関連する引用 '+n+'/'+relevant.length+'件を現在の本文で再照合';
  body.textContent=record.literal_text;
 }catch(e){if(serial===crossOpenSerial){meta.textContent='原文の取得に失敗しました：'+(e.message||e);body.textContent='';}}
}
function closeCrossSource(){
 ++crossOpenSerial;$('crossSourceModal').classList.add('hidden');$('crossSourceText').textContent='';
}

function renderDiscovery(){
 $('discoveryOutput').innerHTML='<h2>メモ同士を読み解く</h2>'+readingPairsView()+
 '<h2 class="match-subhead">完成作品の原文と照合</h2>'+workCandidateView();
}

function manualSubmit(e){
 e.preventDefault();const title=$('manualTitle').value.trim(),text=$('manualBody').value;
 if(!title||!text.trim()){toast('タイトルと本文を入力してください。');return;}
 const date=$('manualDate').value;
 const entry=safeEntry({title,text,source_id:newId(),source_app:'manual_paste',created_local:date||'',sky:$('manualSky').value});
 const exists=new Set(data.map(sourceKey));if(!exists.has(sourceKey(entry))){data.push(entry);current=entry.source_id;save();}
 $('manualForm').reset();toast('原文を記録しました。日時が不明な場合はそのままです。');go('strata');
}
async function saveClassification(){
 const e=data.find(x=>x.source_id===current);if(!e)return;
 e.sky=$('editSky').value;e.classification=$('editClass').value;e.reviewer_note=$('editMemo').value.slice(0,8000);
 e.reviewed_at=new Date().toISOString();e.dirty=true;readingReportCache=null;save();render();toast('分類を端末に保存しました。クラウドには「クラウドに保存」で反映します。');
}
function client(){
 if(cloud)return cloud;
 if(!window.supabase?.createClient)throw Error('ログインライブラリを読み込めません。オンライン接続を確認してください。');
 cloud=window.supabase.createClient(CLOUD_URL,CLOUD_PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 return cloud;
}
function authModal(show){$('authModal').classList.toggle('hidden',!show);$('authMessage').textContent='';}
async function cloudLoad(){
 if(!user)return;syncing=true;render();
 try{const {data:remote,error}=await client().from('lyric_strata_entries').select('*').eq('user_id',user.id).order('imported_at',{ascending:false}).limit(3000);
  if(error)throw error;
  const byKey=new Map(data.map(e=>[sourceKey(e),e]));let extra=0;
  for(const row of remote||[]){
   const key=sourceKey(row),old=byKey.get(key);
   if(!old){data.push({...row,synced:true,dirty:false});extra++;}
   else if(!old.dirty){Object.assign(old,row,{synced:true,dirty:false});}
  }
  if(extra||remote?.length){readingReportCache=null;save();}
  await Promise.all([loadMasterCandidates(),loadDraftReadings(),loadCrossReadings(),loadSongReadingRecords(),loadReadingPaths(),loadReadingChallenges()]);
  toast('クラウドから '+(remote?.length||0)+'件を確認、新規 '+extra+'件を追加しました。');
 }catch(e){toast('クラウド読み込み失敗：'+(e.message||e));}finally{syncing=false;render();}
}
function toRow(e){
 return {user_id:user.id,source_app:e.source_app,source_id:e.source_id,source_folder:e.source_folder||'',
 title:e.title,original_text:e.original_text,source_created_local:e.source_created_local||null,
 source_modified_local:e.source_modified_local||null,source_timezone:e.source_timezone||'local-unspecified',
 date_status:e.date_status,sky:e.sky,classification:e.classification,reviewer_note:e.reviewer_note||'',
 imported_at:e.imported_at||new Date().toISOString(),reviewed_at:e.reviewed_at||null};
}
async function cloudSave(){
 if(!user||syncing)return;syncing=true;render();
 try{const c=client();let saved=0;
  const rows=data.map(toRow);
  for(let i=0;i<rows.length;i+=75){
   const chunk=rows.slice(i,i+75);
   const {error}=await c.from('lyric_strata_entries').upsert(chunk,{onConflict:'user_id,source_app,source_id',ignoreDuplicates:true});
   if(error)throw error;saved+=chunk.length;
  }
  const changes=data.filter(e=>e.dirty);
  for(const e of changes){
   const {error}=await c.from('lyric_strata_entries').update({sky:e.sky,classification:e.classification,reviewer_note:e.reviewer_note||'',reviewed_at:e.reviewed_at}).eq('user_id',user.id).eq('source_app',e.source_app).eq('source_id',e.source_id);
   if(error)throw error;
  }
  await cloudLoad();
  data.forEach(e=>{e.dirty=false;e.synced=true;});save();
  toast('クラウド保存を確認しました。処理対象 '+saved+'件。');
 }catch(e){toast('クラウド保存失敗：'+(e.message||e));}finally{syncing=false;render();}
}
async function authSubmit(e){
 e.preventDefault();$('authMessage').textContent='認証中…';
 try{const {data:r,error}=await client().auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});
  if(error)throw error;user=r.user;authModal(false);render();await cloudLoad();
 }catch(e){$('authMessage').textContent='ログインできません：'+(e.message||e);}
}
async function authClick(){
 if(!user){authModal(true);return;}
 if(!confirm('ログアウトしますか？ この端末に残した原文は削除されません。'))return;
 try{const {error}=await client().auth.signOut();if(error)throw error;user=null;masterCandidates=[];masterWorks=new Map();matchLoadError='';draftReadings=[];draftReadingLoadError='';crossReadings=[];crossLoadError='';readingPaths=[];readingPathsLoadError='';readingChallenges=[];readingChallengesLoadError='';songReadingRecords=[];compareLeft='';compareRight='';++compareSerial;closeCrossSource();if($('compareOutput'))$('compareOutput').replaceChildren();if($('crossOutput'))$('crossOutput').replaceChildren();render();toast('ログアウトしました。端末に残る原文は必要に応じJSONバックアップし、共有端末では削除してください。');}catch(e){toast(e.message);}
}
async function initSession(){
 try{const {data:r,error}=await client().auth.getSession();if(error)throw error;if(r.session?.user){user=r.session.user;await cloudLoad();}else render();}catch(e){render();console.warn('Auth unavailable',e);}
}
document.addEventListener('click',e=>{
 const pathSwitch=e.target.closest('button[data-read-path]');if(pathSwitch){selectedReadingPath=pathSwitch.dataset.readPath;renderReadingPaths();return;}
 const crossNote=e.target.closest('[data-cross-note]');if(crossNote){current=crossNote.dataset.crossNote;go('strata');return;}
 const crossWork=e.target.closest('[data-cross-work]');if(crossWork){openCrossWork(crossWork.dataset.crossWork);return;}
 if(e.target.id==='runCompare'){runCompare();return;}
 if(e.target.id==='crossMore'){crossLimit+=15;renderCrossRows();return;}
 if(e.target.id==='crossSourceClose'||e.target.id==='crossSourceModal'){closeCrossSource();return;}
 const note=e.target.closest('[data-note]');
 if(note){current=note.dataset.note;go('strata');return;}
 const reading=e.target.closest('button[data-reading-open]');if(reading){const i=Number(reading.dataset.readingOpen);readingFocus=readingFocus===i?-1:i;renderDiscovery();return;}
 if(e.target.id==='readingMore'){readingShow+=20;renderDiscovery();return;}
 const review=e.target.closest('button[data-candidate][data-decision]');if(review){reviewCandidate(review.dataset.candidate,review.dataset.decision);return;}
 const btn=e.target.closest('button[data-view]');
 if(btn){go(btn.dataset.view);return;}
 if(e.target.id==='saveClass'){saveClassification();return;}
});
document.addEventListener('input',e=>{if(e.target.id==='crossQuery'){crossTerm=e.target.value;crossLimit=15;renderCrossRows();}});
document.addEventListener('change',e=>{
 if(e.target.id==='crossTopic'){crossTopic=e.target.value;crossLimit=15;renderCrossRows();}
 if(e.target.id==='compareSelect1')compareLeft=e.target.value;
 if(e.target.id==='compareSelect2')compareRight=e.target.value;
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('crossSourceModal').classList.contains('hidden'))closeCrossSource();});
document.addEventListener('DOMContentLoaded',()=>{
 read();readingReportCache=null;current=data[0]?.source_id||null;
 if(location.hash==='#cross')view='cross';
 $('search').addEventListener('input',renderList);
 $('skyFilter').addEventListener('change',renderList);
 $('manualForm').addEventListener('submit',manualSubmit);
 $('importFile').addEventListener('click',importFile);
 $('downloadMacZip').addEventListener('click',downloadMacExporterZip);
 $('authOpen').addEventListener('click',authClick);
 $('authCancel').addEventListener('click',()=>authModal(false));
 $('authForm').addEventListener('submit',authSubmit);
 $('authModal').addEventListener('click',e=>{if(e.target===$('authModal'))authModal(false)});
 render();initSession();
 if(location.protocol==='https:'&&'serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
});
