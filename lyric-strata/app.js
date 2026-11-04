
'use strict';
/* The published app shell contains NO private lyrics. All imports are explicitly initiated by the user. */
const CLOUD_URL="https://nroyxwozdxwnrqyierjx.supabase.co", CLOUD_PUBLIC_KEY="sb_publishable_dxiidJt1gVcFwkVR2fg1HA_6gHAZNDz";
const STORE='lyric_strata_local_v1', MAX_NOTE=250000;
let data=[], current=null, view='strata', cloud=null, user=null, syncing=false;
let masterCandidates=[],masterWorks=new Map(),matchLoadError='';
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
 if(added)save();
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
 $('countDated').textContent=data.filter(e=>e.date_status!=='unknown'&&e.source_created_local).length;
 $('countUnknown').textContent=data.filter(e=>!e.source_created_local).length;
 $('countMatches').textContent=user?uniqueCandidates().length:'—';
 const items=activeList();let last='';
 if(!items.length){$('noteList').innerHTML='<div class="empty-state">まだ言葉がありません。<br>「回収する」から日付付きで取り込めます。</div>';return;}
 $('noteList').innerHTML=items.map(e=>{
  const head=formatDate(e);let out='';
  if(head!==last){out='<div class="date-head">'+esc(head)+'</div>';last=head;}
  const teaser=e.original_text.replace(/\s+/g,' ').slice(0,68);
  return out+'<button class="note-item '+(current===e.source_id?'selected':'')+'" data-note="'+esc(e.source_id)+'"><strong>'+esc(e.title)+'</strong><small>'+esc(displayDate(e))+' · '+esc(skyNames[e.sky]||'未分類')+' · '+esc(classNames[e.classification]||'未判定')+'</small><div class="excerpt">'+esc(teaser)+'</div></button>';
 }).join('');
}
function renderDetail(){
 const e=data.find(r=>r.source_id===current);
 if(!e){$('detail').innerHTML='<div class="empty">言葉を選ぶと、原文・作成日・出典を表示します。</div>';return;}
 $('detail').innerHTML='<h2>'+esc(e.title)+'</h2><div class="metadata">作成日：'+esc(displayDate(e))+
 '<br>更新日：'+esc(e.source_modified_local?e.source_modified_local.replace('T',' '):'不明')+
 '<br>出典：'+esc(e.source_app==='apple_notes'?'Appleメモ / '+(e.source_folder||'フォルダ未設定'):'手入力')+
 '<br>日時の根拠：'+esc(e.date_status==='app_metadata'?'Appleメモの記録':'手入力の記録日（未検証）')+'</div>'+
 '<pre>'+esc(e.original_text)+'</pre><div class="row"><label class="label">名義</label><select class="select-input" id="editSky">'+
 Object.entries(skyNames).map(([k,v])=>'<option value="'+k+'" '+(e.sky===k?'selected':'')+'>'+esc(v)+'</option>').join('')+
 '</select></div><div class="row"><label class="label">現在の扱い</label><select class="select-input" id="editClass">'+
 Object.entries(classNames).map(([k,v])=>'<option value="'+k+'" '+(e.classification===k?'selected':'')+'>'+esc(v)+'</option>').join('')+
 '</select></div><div class="row"><label class="label">本人の確認メモ</label><textarea id="editMemo" class="form-textarea" placeholder="どの作品に使ったか、なぜ削ったか等">'+esc(e.reviewer_note||'')+'</textarea></div>'+
 '<button class="btn dark" id="saveClass">分類を保存</button><p class="muted">原文とメモの日時は変更できません。日付の修正は新しい記録を追加して履歴として残します。</p>';
}
function render(){
 const views=['strata','import','discovery'];
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
function wordCandidates(a,b){
 const seen=new Set(),match=[];
 const txt=a.original_text.replace(/\s+/g,'').slice(0,7000);
 const other=b.original_text.replace(/\s+/g,'').slice(0,7000);
 for(let n=10;n>=5;n--){
  for(let i=0;i+n<=txt.length&&match.length<3;i++){
   const phrase=txt.slice(i,i+n);
   if(!/^[\p{L}\p{N}]+$/u.test(phrase)||seen.has(phrase)||other.indexOf(phrase)<0)continue;
   if(match.some(x=>x.includes(phrase)))continue;
   seen.add(phrase);match.push(phrase);
  }
  if(match.length>=3)break;
 }
 return match;
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
   client().from('lyric_master_works').select('id,title,sky,source_name,source_page_start,verification_status').eq('user_id',user.id).limit(500)
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
function renderDiscovery(){
 const items=data.filter(e=>e.original_text.length>=6).slice(0,70), found=[];
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  if(items[i].sky!==items[j].sky)continue;
  const phrases=wordCandidates(items[i],items[j]);
  if(phrases.length)found.push({a:items[i],b:items[j],phrases});
 }
 found.sort((a,b)=>b.phrases[0].length-a.phrases[0].length);
 const info='<p class="muted">暫定的に最初の70件から5文字以上の連続一致を探します。名義が異なる原稿は結びません。AIが新しい歌詞を書き足すことはありません。</p>';
 if(!found.length){$('discoveryOutput').innerHTML='<h2>完成作品との照合</h2>'+workCandidateView()+'<h2 class="match-subhead">メモ同士の一致</h2><p class="muted">今の登録内容からは明確な一致が見つかっていません。</p>'+info;return;}
 $('discoveryOutput').innerHTML='<h2>完成作品との照合</h2>'+workCandidateView()+'<h2 class="match-subhead">メモ同士の一致</h2>'+
 found.slice(0,30).map(x=>'<div style="padding:12px 0;border-bottom:1px solid #ece5ec"><div><strong>'+esc(x.a.title)+'</strong> × <strong>'+esc(x.b.title)+'</strong></div><div class="links">'+x.phrases.map(p=>'<span>'+esc(p)+'</span>').join('')+'</div><div class="mini">'+esc(displayDate(x.a))+' ／ '+esc(displayDate(x.b))+'</div></div>').join('')+info;
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
 e.reviewed_at=new Date().toISOString();e.dirty=true;save();render();toast('分類を端末に保存しました。クラウドには「クラウドに保存」で反映します。');
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
  if(extra||remote?.length)save();
  await loadMasterCandidates();
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
 try{const {error}=await client().auth.signOut();if(error)throw error;user=null;masterCandidates=[];masterWorks=new Map();matchLoadError='';render();toast('ログアウトしました。端末に残る原文は必要に応じJSONバックアップし、共有端末では削除してください。');}catch(e){toast(e.message);}
}
async function initSession(){
 try{const {data:r,error}=await client().auth.getSession();if(error)throw error;if(r.session?.user){user=r.session.user;await cloudLoad();}else render();}catch(e){render();console.warn('Auth unavailable',e);}
}
document.addEventListener('click',e=>{
 const note=e.target.closest('[data-note]');
 if(note){current=note.dataset.note;go('strata');return;}
 const review=e.target.closest('button[data-candidate][data-decision]');if(review){reviewCandidate(review.dataset.candidate,review.dataset.decision);return;}
 const btn=e.target.closest('button[data-view]');
 if(btn){go(btn.dataset.view);return;}
 if(e.target.id==='saveClass'){saveClassification();return;}
});
document.addEventListener('DOMContentLoaded',()=>{
 read();current=data[0]?.source_id||null;
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
