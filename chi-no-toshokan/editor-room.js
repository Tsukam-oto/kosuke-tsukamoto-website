/* 非公開編集室 v0.1: auth-required, account-scoped Supabase storage. */
(()=>{'use strict';
const URL_SUPABASE='https://nroyxwozdxwnrqyierjx.supabase.co';
const PUBLIC_KEY='sb_publishable_dxiidJt1gVcFwkVR2fg1HA_6gHAZNDz';
const IMPORT='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';
const TABLE='knowledge_records',PREFIX='note:editor:';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const fields=['kind','title','problem','ai-method','result','lesson','sources','stage','public-url'];
const names={education:'音楽教育',workflow:'AI活用・ICT',composition:'作曲・創作',research:'知識探究'};
const stageNames={seed:'記録・素材',candidate:'記事化候補',draft:'原稿確認中',published:'公開後の記録'};
const MAGAZINES=window.EDITOR_MAGAZINES?.magazines||[];
const FORMATS=window.EDITOR_MAGAZINES?.formats||[];
const FORMAT_BY_ID=Object.fromEntries(FORMATS.map(f=>[f.id,f]));
const MAG_BY_ID=Object.fromEntries(MAGAZINES.map(m=>[m.id,m]));
const autoMagazine=kind=>({workflow:'ai-work',education:'music-education',composition:'composing',research:'knowledge'}[kind]||'ai-work');
let magazineUserEdited=false,formatUserEdited=false;
const preferredFormat=magazine=>magazine==='knowledge'?'deep':magazine==='tools'?'short':'standard';
const countChars=txt=>Array.from(String(txt||'').replace(/\s/g,'')).length;
function readingStatus(){
 const input=$('article-body').value.trim(),num=countChars(input),f=FORMAT_BY_ID[$('format').value]||FORMATS[1];
 $('article-count').textContent=num.toLocaleString('ja-JP')+'字';
 $('reading-time').textContent=num?'想定読書時間：約'+Math.max(1,Math.ceil(num/(f?.readRate||500)))+'分（仮定値）':'推定読書時間：未計測';
 $('article-range').textContent=f?(f.min+'〜'+f.max+'字が目安'):'';
 $('format-advice').textContent=f?(f.description+'。字数の強制はしません。'):'';
 const messages=[];
 if(!input){$('editor-lint').innerHTML='<span class="lint-neutral">原稿を貼り付けると、段落と表現について確認候補を表示します。</span>';return}
 if(f&&num<f.min)messages.push('短めの原稿です。必要な背景や具体例が欠けていないか確認してください。短いこと自体は問題ではありません。');
 if(f&&num>f.max)messages.push('長めの原稿です。一つの記事に複数の主題が混在していないか確認してください。');
 const paras=input.split(/\n\s*\n|\n/).map(x=>x.trim()).filter(Boolean);
 const huge=paras.filter(p=>countChars(p)>350);
 if(huge.length)messages.push('350字を超える長い段落が'+huge.length+'箇所あります。スマホで読んだときの区切りを確認してください。');
 const canned=['いかがでしたでしょうか','この記事では、.*について解説します','結論から言うと'];
 const found=canned.filter(pattern=>new RegExp(pattern).test(input));
 if(found.length)messages.push('定型的に聞こえる表現が見つかりました。本人の語り口として自然か見直してください。');
 if(num>1800&&!/^#{1,4}\s|^【.+】/m.test(input))messages.push('長い記事のため、小見出しがあると読みやすくなる可能性があります。');
 messages.push('自動判定では、事実の正確性・転載の権利・本人の経験の真偽は確認できません。');
 $('editor-lint').innerHTML=messages.map(m=>'<p>'+esc(m)+'</p>').join('');
}
const packageTool=window.EDITOR_NOTE_PACKAGE||null;
function coverRender(){
 if(!packageTool)return;
 const canvas=$('note-cover');
 if(!canvas||typeof canvas.getContext!=='function')return;
 try{
  packageTool.cover(canvas,$('title').value.trim()||'ここに記事タイトル','束元康介',$('magazine').value);
 }catch(e){$('note-toc').textContent='見出し画像の表示ができませんでした：'+String(e.message||e)}
}
function updateNotePackage(){
 if(!packageTool)return;
 const content=$('article-body').value||'',hs=packageTool.headings(content);
 const visuals=packageTool.visualPlan(content,$('magazine').value,$('format').value);
 $('note-toc').innerHTML=hs.length?'<ol>'+hs.map(h=>'<li class="'+(h.level===3?'subheading':'')+'">'+esc(h.text)+'</li>').join('')+'</ol>':
 '<p>原稿に「## 大見出し」「### 小見出し」を入れると、ここに構成案が表示されます。短編には目次がなくても構いません。</p>';
 $('note-visuals').innerHTML=visuals.length?visuals.map(v=>
  '<p><strong>'+esc(v.type)+'</strong>｜「'+esc(v.after)+'」の後<br>'+esc(v.description)+'<br><small>'+esc(v.status)+'</small></p>').join(''):
  '<p>現状では本文中の画像は不要、または見出し・本文が不足しています。飾るための画像は無理に挿入しません。</p>';
 const preview=content.split(/\r?\n/).slice(0,125).map(line=>{
  const trimmed=line.trim();if(!trimmed)return '<div class="preview-gap"></div>';
  const heading=trimmed.match(/^#{2,3}\s+(.+)$/);
  if(heading)return heading[0].startsWith('###')?'<h4>'+esc(heading[1])+'</h4>':'<h3>'+esc(heading[1])+'</h3>';
  return '<p>'+esc(trimmed)+'</p>';
 }).join('');
 $('note-preview').innerHTML='<h2>'+esc($('title').value.trim()||'記事のタイトル')+'</h2>'+
  (content?preview+'<p class="preview-notice">'+(content.split(/\r?\n/).length>125?'※続きは省略されています。':'※投稿時に実際のnote画面で最終確認してください。')+'</p>':
   '<p class="preview-notice">原稿を書くと、ここに読みやすさのプレビューが表示されます。</p>');
 coverRender();
}
async function downloadNoteCover(){
 if(!packageTool)return;
 coverRender();
 const canvas=$('note-cover');
 if(!canvas||typeof canvas.toBlob!=='function'){status('この環境では画像を書き出せません。',true);return}
 try{
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG出力に失敗しました')),'image/png'));
  if(!blob.type.includes('png'))throw new Error('PNG形式ではありません');
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;
  a.download='note-cover-'+new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'})+'.png';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3500);
  status('1280×670pxの見出し画像PNGを書き出しました。noteへのアップロードは手動で行ってください。');
 }catch(e){status('画像を保存できませんでした：'+(e.message||String(e)),true)}
}
async function copyNotePlan(){
 if(!packageTool)return;
 const p=formPayload();
 const hs=packageTool.headings(p.articleBody),visuals=packageTool.visualPlan(p.articleBody,p.magazine,p.format);
 const text=[
  '【note 投稿準備｜公開前の確認用】','マガジン：'+(MAG_BY_ID[p.magazine]?.name||''),'タイトル：'+p.title,
  '',
  '【投稿の順序】','1. 本文をコピーしてnoteのエディタへ貼り付ける。',
  '2. 下記の見出しをnoteの「大見出し」「小見出し」に設定する。',
  '3. 目次が必要な記事では、noteの「＋」→「目次」を挿入する。',
  '4. 保存した1280×670pxのPNGを記事の見出し画像へ設定する。',
  '5. 必要な本文図解だけを、権利と内容の正確性を確認して挿入する。',
  '6. プレビューで表示・リンク・本文・出典を確認してから公開する。',
  '',
  '【見出し構成】',...(hs.length?hs.map(h=>(h.level===3?'  小見出し：':'大見出し：')+h.text):['見出しなし（短編ならそのまま可）']),
  '',
  '【本文図解候補】',...(visuals.length?visuals.map(v=>v.after+' の後に '+v.type+'：'+v.description):['図解は無理に追加しない']),
  '',
  '【公開前の確認】','本人が経験した事実と推測の区別／学校の個人情報／原文・図版・譜例の権利／出典／noteでの最終表示',
  '※ここで生成した目次と画像案は、noteの投稿画面に自動で挿入されません。'
 ].join('\n');
 try{await navigator.clipboard.writeText(text);status('note投稿手順と画像案をコピーしました。')}
 catch(_e){window.prompt('投稿手順をコピーしてください。',text)}
}
function initNotePackage(){
 if(!packageTool)return;
 $('title').addEventListener('input',updateNotePackage);
 $('magazine').addEventListener('change',updateNotePackage);
 $('format').addEventListener('change',updateNotePackage);
 $('article-body').addEventListener('input',updateNotePackage);
 $('refresh-cover').addEventListener('click',coverRender);
 $('download-cover').addEventListener('click',downloadNoteCover);
 $('copy-note-plan').addEventListener('click',copyNotePlan);
 if(document.fonts?.ready)document.fonts.ready.then(coverRender).catch(()=>{});
 updateNotePackage();
}

function initFormats(){
 $('format').innerHTML=FORMATS.map(f=>'<option value="'+esc(f.id)+'">'+esc(f.name)+'</option>').join('');
 $('format').value=preferredFormat($('magazine').value);
 $('format').addEventListener('change',()=>{formatUserEdited=true;readingStatus()});
 $('article-body').addEventListener('input',readingStatus);
 $('copy-article').addEventListener('click',async()=>{
  const text=$('article-body').value.trim();
  if(!text){status('コピーする本文がありません。',true);return}
  try{await navigator.clipboard.writeText(text);status('原稿本文をコピーしました。公開前に出典・権利・本人の経験を確認してください。')}
  catch(_e){window.prompt('原稿本文をコピーしてください。',text)}
 });
 readingStatus();
}

function magazineAdvice(){
 const m=MAG_BY_ID[$('magazine').value];
 $('magazine-advice').textContent=m?'読者への約束：'+m.promise+'。注意：'+m.not+'。':'公開するマガジンを選択してください。';
 if(!formatUserEdited&&$('format')?.options?.length){$('format').value=preferredFormat($('magazine').value);readingStatus()}
}
function drawMagazines(){
 $('magazine-list').innerHTML=MAGAZINES.map((m,i)=>{
  const n=records.filter(r=>(r.payload?.magazine||autoMagazine(r.payload?.kind))===m.id).length;
  return '<article class="magazine-card"><strong>'+String(i+1).padStart(2,'0')+'｜'+esc(m.name)+'</strong><p>'+esc(m.promise)+'</p><small>旧分類で保存された実践記録：'+n+'件</small></article>';
 }).join('');
}
function initMagazineControls(){
 $('magazine').innerHTML=MAGAZINES.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.name)+'</option>').join('');
 $('magazine').value=autoMagazine($('kind').value);magazineAdvice();
 drawMagazines();
 $('kind').addEventListener('change',()=>{if(!magazineUserEdited)$('magazine').value=autoMagazine($('kind').value);magazineAdvice()});
 $('magazine').addEventListener('change',()=>{magazineUserEdited=true;magazineAdvice()});
}

let client=null,user=null,records=[],activeId='',query='',filter='all',busy=false,researchIdeas=[];
const status=(text,error=false)=>{$('auth-status').innerHTML=esc(text);$('auth-status').classList.toggle('error',error)};
const metricValue=v=>(v===null||v===undefined||v==='')?null:(Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<=100000000?Number(v):null);
function formatOutcomes(){
 const entries=records.filter(r=>r.payload?.stage==='published'&&Number.isInteger(r.payload?.pv7)&&r.payload.pv7>=0);
 const median=vals=>{const a=vals.slice().sort((x,y)=>x-y),n=a.length;return n%2?a[Math.floor(n/2)]:(a[n/2-1]+a[n/2])/2};
 $('format-outcomes').innerHTML=FORMATS.map(f=>{
  const values=entries.filter(r=>(r.payload?.format||'standard')===f.id).map(r=>r.payload.pv7);
  return '<div class="outcome-card"><strong>'+esc(f.name)+'</strong>'+
   '<span>7日間PVを記録済み：'+values.length+'本</span>'+
   '<b>'+(values.length>=3?'PV中央値 '+median(values).toLocaleString('ja-JP'):'比較には不足')+'</b>'+
   '<small>'+(values.length>=3?'小規模な記録の記述統計です。形式の効果を証明しません。':'最低3本の記録で参考値を表示します。安定した傾向の判断にはさらに多くの記録が必要です。')+'</small></div>';
 }).join('');
}
function normalize(payload){
 const p=payload||{};
 return {entryType:'editor-work',version:1,
  kind:names[p.kind]?p.kind:'education',
  magazine:MAG_BY_ID[p.magazine]?p.magazine:autoMagazine(p.kind),
  format:FORMAT_BY_ID[p.format]?p.format:preferredFormat(p.magazine||autoMagazine(p.kind)),
  articleBody:String(p.articleBody||'').slice(0,40000),
  publishedChars:Number.isInteger(p.publishedChars)&&p.publishedChars>=0?p.publishedChars:null,
  impressions7:metricValue(p.impressions7),
  pv7:metricValue(p.pv7),
  likes7:metricValue(p.likes7),
  title:String(p.title||'').slice(0,150),
  problem:String(p.problem||'').slice(0,5000),
  aiMethod:String(p.aiMethod||'').slice(0,7000),
  result:String(p.result||'').slice(0,6000),
  lesson:String(p.lesson||'').slice(0,5000),
  sources:String(p.sources||'').slice(0,5000),
  verificationNotes:String(p.verificationNotes||'').slice(0,5000),
  stage:stageNames[p.stage]?p.stage:'seed',
  publicUrl:String(p.publicUrl||'').slice(0,500),
  createdAt:p.createdAt||new Date().toISOString(),
  updatedAt:p.updatedAt||new Date().toISOString(),
 };
}
function formPayload(){
 return normalize({kind:$('kind').value,magazine:$('magazine').value,
  format:$('format').value,articleBody:$('article-body').value,title:$('title').value.trim(),problem:$('problem').value.trim(),
  aiMethod:$('ai-method').value.trim(),result:$('result').value.trim(),lesson:$('lesson').value.trim(),
  sources:$('sources').value.trim(),verificationNotes:$('verification-notes').value.trim(),stage:$('stage').value,publicUrl:$('public-url').value.trim(),
  impressions7:$('impressions7').value,pv7:$('pv7').value,likes7:$('likes7').value});
}
function updateGuide(){
 const stage=$('stage').value||'seed',title=$('title').value.trim();
 const hasInput=Boolean(title||$('problem').value.trim()||$('article-body').value.trim());
 const chosen=Boolean(activeId||hasInput);
 let instruction='';
 if(!chosen){
  const pending=records.some(r=>['candidate','draft'].includes(r.payload?.stage));
  instruction=pending?'素材箱から気になる記事候補を選び、根拠の確認や原稿づくりを進めてください。':'まずは気づいたことを一言メモに残してください。記事にするかどうかは後から選べます。';
 }else if(stage==='seed'){
  instruction=title?'面白いと思った理由や困った点を短く残し、記事にする価値がある場合だけ「記事化候補」に変更して保存してください。':'まずテーマを記録して保存してください。記事にする必要はありません。';
 }else if(stage==='candidate'){
  instruction=!$('sources').value.trim()&&!$('verification-notes').value.trim()?
   '記事にする前に、実物の画面・変更履歴・出典などを確認してください。分からない点は「未確認」と記録できます。':
   '根拠を確認したら記事化ブリーフを作り、読んで面白い原稿に育ててください。完成を急ぐ必要はありません。';
 }else if(stage==='draft'){
  instruction=!$('article-body').value.trim()?'原稿本文を記録してください。文章だけでなく、実物の画面や根拠を使う箇所も考えましょう。':
   !$('verification-notes').value.trim()?
   '原稿があります。公開前に、本人の実際の経験・出典・未確認事項を根拠メモで整理してください。':
   '原稿と根拠メモがあります。画像・引用の権利、公開範囲、スマートフォンでの表示を本人が最終確認してください。自動公開はされません。';
 }else if(stage==='published'){
  instruction='公開済みURLと内容を確認し、必要なら公開後の反応や修正点を記録してください。新しい記事を量産する必要はありません。';
 }else instruction='素材の内容を確認してください。';
 $('update-state').textContent=chosen?(activeId?'選択中':'入力中・未保存')+' · '+(stageNames[stage]||'確認中'):'未選択 · 非公開の素材箱';
 $('update-guide').textContent=instruction;
}
function cleanForm(){
 $('editor-form').reset();$('record-id').value='';activeId='';$('stage').value='seed';$('delete-entry').hidden=true;
 magazineUserEdited=false;formatUserEdited=false;$('magazine').value=autoMagazine($('kind').value);
 $('format').value=preferredFormat($('magazine').value);magazineAdvice();readingStatus();updateNotePackage();
 drawList();$('title').focus();
}
function loadForm(row){
 if(!row)return;
 const p=normalize(row.payload);activeId=row.id;$('record-id').value=row.id;
 $('kind').value=p.kind;$('magazine').value=p.magazine;magazineUserEdited=true;
 $('format').value=p.format;formatUserEdited=true;$('article-body').value=p.articleBody;
 magazineAdvice();readingStatus();$('title').value=p.title;$('problem').value=p.problem;$('ai-method').value=p.aiMethod;
 $('result').value=p.result;$('lesson').value=p.lesson;$('sources').value=p.sources;$('verification-notes').value=p.verificationNotes;
 $('stage').value=p.stage;$('public-url').value=p.publicUrl;
 for(const id of ['impressions7','pv7','likes7'])$(id).value=p[id]??'';
 $('delete-entry').hidden=false;updateNotePackage();drawList();
 if(window.matchMedia?.('(max-width:770px)').matches)$('editor-title').scrollIntoView({block:'start',behavior:'auto'});
}
function drawList(){
 $('total-count').textContent=records.length;
 $('candidate-count').textContent=records.filter(x=>['candidate','draft'].includes(x.payload?.stage)).length;
 $('published-count').textContent=records.filter(x=>x.payload?.stage==='published').length;
 drawMagazines();formatOutcomes();
 const matching=records.filter(x=>{
  const p=x.payload||{};
  return (filter==='all'||p.stage===filter)&&(!query||[p.title,p.problem,p.aiMethod,p.result,p.lesson,p.verificationNotes].join(' ').toLocaleLowerCase('ja').includes(query));
 });
 $('entry-list').innerHTML=matching.length?matching.map(r=>{
  const p=r.payload||{},date=new Date(r.updated_at||'');
  const stamp=Number.isNaN(date.getTime())?'':date.toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo'});
  return '<button class="entry '+(activeId===r.id?'active':'')+'" data-record="'+esc(r.id)+'" type="button">'+
   '<strong>'+esc(p.title)+'</strong><small>'+esc(MAG_BY_ID[p.magazine]?.name||names[p.kind]||'')+' · '+esc(stageNames[p.stage]||'')+' · '+esc(stamp)+'</small>'+
   '<p>'+esc(String(p.problem||p.aiMethod||p.result||'').slice(0,90))+'</p></button>';
 }).join(''):'<p class="empty">記録がありません。仕事や創作で試したことを一件ずつ残してください。</p>';
 updateGuide();
}
function setDisabled(value){
 busy=value;
 for(const id of ['save-entry','delete-entry','reload'])$(id).disabled=value;
}
async function refresh(){
 if(!client||!user)return;
 status('本人専用の記録を読み込んでいます。');
 const owner=user.id;
 try{
  const {data,error}=await client.from(TABLE).select('id,user_id,kind,payload,created_at,updated_at')
    .eq('user_id',owner).eq('kind','note').like('id',PREFIX+'%')
    .order('updated_at',{ascending:false}).limit(500);
  if(error)throw error;
  if(!user||user.id!==owner)return;
  records=(data||[]).filter(x=>x.payload?.entryType==='editor-work'&&x.user_id===owner);
  const opened=records.find(x=>x.id===activeId);if(activeId&&opened)loadForm(opened);
  else if(activeId){$('record-id').value='';activeId='';$('delete-entry').hidden=true}
  drawList();status('ログイン確認済み · 本人専用クラウドに接続中（記録 '+records.length+'件）');
 }catch(e){status('記録を取得できませんでした。クラウド接続・権限をご確認ください：'+(e.message||String(e)),true)}
}
async function save(e){
 e.preventDefault();if(busy||!user||!client)return;
 const form=formPayload();if(!form.title){status('テーマを入力してください。',true);return}
 if(form.stage==='published'&&!/^https:\/\//.test(form.publicUrl)){status('公開後として記録する場合、実際に公開した記事のURLが必要です。',true);return}
 const old=records.find(r=>r.id===activeId)||null;
 const owner=user.id,id=old?.id||PREFIX+(window.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));
 const now=new Date(Math.max(Date.now(),old?.updated_at?Date.parse(old.updated_at)+1:0)).toISOString();
 form.createdAt=old?.payload?.createdAt||now;form.updatedAt=now;
 form.publishedChars=old?.payload?.publishedChars??(form.stage==='published'?countChars(form.articleBody):null);
 setDisabled(true);status('クラウドに保存しています。');
 try{
  if(old){
   const {data,error}=await client.from(TABLE)
    .update({payload:form,updated_at:now})
    .eq('user_id',owner).eq('id',id).eq('updated_at',old.updated_at).select('id');
   if(error)throw error;
   if(!data?.some(x=>x.id===id))throw new Error('別端末で更新されたため上書きを中止しました。入力内容をコピーし、再読込してください。');
  }else{
   const row={id,user_id:owner,kind:'note',payload:form,created_at:now,updated_at:now};
   const {error}=await client.from(TABLE).insert(row);if(error)throw error;
  }
  activeId=id;$('record-id').value=id;$('delete-entry').hidden=false;
  await refresh();status('クラウドへの保存が完了しました。noteへの公開は行っていません。');
 }catch(error){
  status('保存できませんでした：'+(error.message||String(error))+'。入力は画面に残しています。必要ならブリーフをコピーしてください。',true);
 }finally{setDisabled(false)}
}
async function remove(){
 if(busy||!client||!user||!activeId)return;
 const r=records.find(x=>x.id===activeId);if(!r)return;
 if(!window.confirm('この非公開の実践記録を削除しますか？元に戻せません。'))return;
 setDisabled(true);
 try{
  const {data,error}=await client.from(TABLE).delete()
   .eq('id',r.id).eq('user_id',user.id).eq('updated_at',r.updated_at).select('id');
  if(error)throw error;if(!data?.some(x=>x.id===r.id))throw new Error('別端末で変更されているため削除を中止しました。');
  activeId='';$('editor-form').reset();$('record-id').value='';$('delete-entry').hidden=true;
  await refresh();status('記録を削除しました。');
 }catch(e){status('削除できませんでした：'+(e.message||String(e)),true)}
 finally{setDisabled(false)}
}
function editorialPrompt(p){
 const magazine=MAG_BY_ID[p.magazine||autoMagazine(p.kind)];
 return [
  'あなたは束元康介本人名義の発信を支援する調査担当・編集者です。音楽・作曲・作詞・創作・AI活用・日々の好奇心を、実際の体験と資料に基づいて編集してください。',
  '次の記録から、本人が面白がって試したこと、使いにくさや改善の過程、完成物の価値が伝わる読みものを作成してください。AIの宣伝や時短ノウハウを毎回の結論にしないでください。',
  '保存用の旧分類（新しいメディア名ではない）：'+(magazine?.name||'未指定'),
  '読者像：'+(magazine?.readers||'音楽・教育・創作に関心がある人'),
  '記事が届ける価値：'+(magazine?.promise||'具体的で再現できる学び'),
  '記事で避けること：'+(magazine?.not||'根拠のない宣伝や捏造'),
  '掲載前の追加確認：'+(magazine?.checks||[]).join('／'),
  '【必須条件】本人の体験、検証済み事実、推測、一般論を混同しない。資料がない主張は断定しない。実際に行っていない実践・成果・発言は創作しない。',
  '学校の内部資料、生徒・保護者の個人情報、未許可の画像や音源などを含めない。該当する可能性がある箇所は削除候補として警告を出す。',
  '記事は '+(FORMAT_BY_ID[p.format||preferredFormat(p.magazine||autoMagazine(p.kind))]?.min||1500)+'〜'+(FORMAT_BY_ID[p.format||preferredFormat(p.magazine||autoMagazine(p.kind))]?.max||2500)+'字を初稿の目安とする。字数を満たすために水増しはしない。',
  '【読みやすさ】最初に読者が続きを読みたくなる具体的な問いや情景を置く。展開は自然な文章を中心にし、適切な段落と見出しで読みやすくする。',
  '【AIらしい文章の回避】毎回同じ結論先出し構成、3つのポイントへの機械的整理、過剰な見出し、空疎な抽象語、不自然な称賛や均一な箇条書きを避ける。',
  '【本人の思考】AIとの会話から生まれた本人の疑問、使いにくかった点、工夫と判断を根拠に基づいて編集する。本人が言っていない感情・台詞・効果を捏造せず、語り口を均質化しない。',
  '【編集】独立した読者に前提を説明する。主題を一つに絞り、実際の「変更前→困りごと→直した理由→変更後」を証拠で示す。実装済み・未検証・今後の構想を分け、成功を捏造しない。映画・歴史等の読みものを無理にAI活用記事にしない。',
  '参考文献がある場合は本文との対応を確認し、確認できない箇所には「要出典・要確認」と印を付ける。',
  '出力：①記事タイトル案3つ ②記事本文 ③確認済み事実と未確認事項の区別 ④実物の画面・作品・図解の使用案と権利確認 ⑤動画化に独立した価値があるか。販売案内は許可取得まで作らない。公開は本人の承認が必要。',
  '【検証ゲート】根拠メモに記載がない変更や検証結果は未確認として扱い、公開前に照合できるリンクと具体的な検証方法を提示する。',
  '',
  '【実践記録】',
  '区分：'+(names[p.kind]||''),'テーマ：'+p.title,
  '出発点：'+(p.problem||'未記入'),'AIに任せたこと・使い方：'+(p.aiMethod||'未記入'),
  '結果・失敗・未確認事項：'+(p.result||'未記入'),'再現できる工夫：'+(p.lesson||'未記入'),
  '参考資料：'+(p.sources||'未記入'),
  '確認済み・未検証・本人の判断（未記入の場合は想像で補完しない）：'+(p.verificationNotes||'未記入'),
  '既存の未承認下書き（ある場合は素材として扱い、事実確認する）：'+(p.articleBody||'なし'),
 ].join('\n');
}
async function copyBrief(){
 const p=formPayload();if(!p.title){status('まずテーマを入力してください。',true);return}
 if(!window.confirm('この記録に学校の内部情報や個人情報が含まれていないことを確認しましたか？\nコピー後に外部AIへ送る場合の最終確認は利用者が行ってください。'))return;
 const prompt=editorialPrompt(p);
 try{await navigator.clipboard.writeText(prompt);status('記事化ブリーフをコピーしました。ChatGPTに貼り付けて原稿の作成を依頼できます。');}
 catch(_e){window.prompt('コピーできませんでした。次の文章を選択してコピーしてください。',prompt);status('記事化ブリーフを用意しました。');}
}
async function saveQuick(){
 if(!client||!user||busy){status('ログイン後に記録できます。',true);return}
 const text=$('quick-text').value.trim();
 if(text.length<4){status('まず気づきを一言入力してください。',true);return}
 const head=(text.split(/[。！？!?\n]/)[0]||text).slice(0,75);
 const now=new Date().toISOString();
 const row={id:PREFIX+(window.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)),
  user_id:user.id,kind:'note',
  payload:normalize({kind:'workflow',title:head,problem:text,stage:'seed',createdAt:now,updatedAt:now}),
  created_at:now,updated_at:now};
 setDisabled(true);$('quick-save').disabled=true;status('一言メモをクラウドに保存しています。');
 try{
  const {error}=await client.from(TABLE).insert(row);if(error)throw error;
  $('quick-text').value='';await refresh();status('一言メモを保存しました。あとから編集して記事化候補へ進められます。');
 }catch(e){status('一言メモを保存できませんでした：'+(e.message||String(e))+'。入力は消さずに残しています。',true)}
 finally{setDisabled(false);$('quick-save').disabled=false}
}
async function loadResearchIdeas(){
 if(!user)return;
 const container=$('research-ideas');container.textContent='公開用の研究準備票を確認しています。';
 try{
  const response=await fetch('./research-dossiers.json',{cache:'no-store'});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const data=await response.json();
  if(!Array.isArray(data.dossiers))throw new Error('調査票データが見つかりません。');
  researchIdeas=data.dossiers.filter(x=>x&&typeof x.id==='string'&&typeof x.question==='string')
   .filter(x=>Number(x.sourceCount||0)>0).slice(0,10);
  if(!researchIdeas.length){container.textContent='現在、文献候補のある題材がありません。';return}
  container.innerHTML=researchIdeas.map(item=>'<div class="research-idea"><strong>'+esc(item.question)+'</strong>'+
   '<small>'+esc(item.area||'')+' ／ 書誌候補 '+Number(item.sourceCount||0)+'件・本文未照合</small>'+
   '<button type="button" data-idea="'+esc(item.id)+'">記事素材にする</button></div>').join('');
 }catch(e){container.textContent='研究準備票を読み込めませんでした。後で再読込してください。 '+(e.message||e)}
}
function selectResearchIdea(id){
 const item=researchIdeas.find(x=>x.id===id);if(!item)return;
 if(($('title').value||$('article-body').value)&&!window.confirm('現在編集中の未保存入力が消える可能性があります。研究テーマに切り替えますか？'))return;
 cleanForm();
 $('kind').value='research';$('magazine').value='knowledge';magazineUserEdited=true;
 $('format').value='deep';formatUserEdited=true;magazineAdvice();readingStatus();
 $('title').value=item.question.slice(0,150);
 $('problem').value='研究の問い：'+item.question+'。文献候補はあるが、論文・原典本文と主張は未照合。';
 $('sources').value='知の図書館の研究準備票（文献候補、未照合）：./research-dossiers.html　テーマID：'+item.id;
 $('stage').value='candidate';
 status('研究準備票から記事候補を作りました。資料の原文照合を行うまでは公開に進めないでください。');
}
async function init(){
 try{
  const mod=await import(IMPORT);
  client=mod.createClient(URL_SUPABASE,PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  client.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_OUT'){user=null;records=[];activeId='';$('private-app').hidden=true;status('ログインしていません。画面上部の「ログイン・管理トップ」からログインしてください。')}
   if(event==='SIGNED_IN'&&session?.user&&user?.id!==session.user.id){user=session.user;$('private-app').hidden=false;setTimeout(()=>{refresh();loadResearchIdeas()},0)}
  });
  const {data,error}=await client.auth.getUser();
  if(error&&!String(error.message||'').toLowerCase().includes('session'))throw error;
  if(!data?.user){status('未ログインです。画面上部の「ログイン・管理トップ」からログインしてください。');return}
  user=data.user;$('private-app').hidden=false;await refresh();await loadResearchIdeas();
 }catch(e){status('認証状態を確認できませんでした。「ログイン・管理トップ」でログインを確認してください：'+(e.message||String(e)),true)}
}
initMagazineControls();initFormats();initNotePackage();updateGuide();
$('editor-form').addEventListener('input',updateGuide);
$('editor-form').addEventListener('change',updateGuide);
$('research-ideas').addEventListener('click',e=>{const el=e.target.closest('[data-idea]');if(el)selectResearchIdea(el.dataset.idea)});
$('quick-save').addEventListener('click',saveQuick);
$('editor-form').addEventListener('submit',save);
$('new-entry').addEventListener('click',cleanForm);
$('copy-brief').addEventListener('click',copyBrief);
$('delete-entry').addEventListener('click',remove);
$('reload').addEventListener('click',()=>{if(window.confirm('クラウドから読み直します。未保存の入力がある場合は失われます。よろしいですか？'))refresh()});
$('filter').addEventListener('input',e=>{query=e.target.value.trim().toLocaleLowerCase('ja');drawList()});
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
 filter=button.dataset.filter;
 document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
 drawList();
}));
$('entry-list').addEventListener('click',e=>{
 const button=e.target.closest('[data-record]');if(button){const row=records.find(x=>x.id===button.dataset.record);if(row)loadForm(row)}
});
init();
window.EDITOR_DEBUG={getState:()=>({authenticated:!!user,records:records.length,activeId}),makePrompt:editorialPrompt};
})();