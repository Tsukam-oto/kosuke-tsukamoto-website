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
const MAG_BY_ID=Object.fromEntries(MAGAZINES.map(m=>[m.id,m]));
const autoMagazine=kind=>({workflow:'ai-work',education:'music-education',composition:'composing',research:'knowledge'}[kind]||'ai-work');
let magazineUserEdited=false;
function magazineAdvice(){
 const m=MAG_BY_ID[$('magazine').value];
 $('magazine-advice').textContent=m?'読者への約束：'+m.promise+'。注意：'+m.not+'。':'公開するマガジンを選択してください。';
}
function drawMagazines(){
 $('magazine-list').innerHTML=MAGAZINES.map((m,i)=>{
  const n=records.filter(r=>(r.payload?.magazine||autoMagazine(r.payload?.kind))===m.id).length;
  return '<article class="magazine-card"><strong>'+String(i+1).padStart(2,'0')+'｜'+esc(m.name)+'</strong><p>'+esc(m.promise)+'</p><small>週7本に移行した場合の配分：'+m.weeklyGoal+'本／週 ｜ 実践記録：'+n+'件</small></article>';
 }).join('');
 const all=window.EDITOR_MAGAZINES?.weeklyPlan||[];
 $('weekly-table').innerHTML=all.map(d=>'<div class="weekly-item"><strong>'+esc(d.day)+'曜</strong><span>'+esc(MAG_BY_ID[d.magazine]?.name||'')+'</span><small>'+esc(d.format)+' ／ '+esc(d.size)+'</small></div>').join('');
}
function renderCadence(){
 const drafts=Math.max(0,Math.min(28,Number($('drafts-per-week').value)||0));
 const percent=Math.max(0,Math.min(100,Number($('ready-percent').value)||0));
 const minutes=Math.max(0,Math.min(120,Number($('minutes-per-day').value)||0));
 $('draft-value').textContent=drafts;
 $('ready-value').textContent=percent;
 $('minutes-value').textContent=minutes;
 const qualified=Math.floor(drafts*percent/100);
 const timeCapacity=Math.floor(minutes*7/25);
 const estimated=Math.min(qualified,timeCapacity);
 const daily=(estimated/7).toFixed(2);
 $('cadence-output').innerHTML='<strong>条件を仮定した公開可能本数：'+estimated+'本／週（平均 '+daily+'本／日）</strong>'+
 '<span>'+(estimated>=7?'毎日1本の計画に届く見込みです。ただし実際の根拠確認・投稿・在庫確認が必要です。':
 estimated>=4?'開始目標の週4本に届く見込みです。毎日投稿には未達です。':
 '週4本の開始目標にも足りないため、初稿・根拠・確認時間を見直す必要があります。')+'</span>'+
 '<small>試算：確認を通る初稿 '+qualified+'本、確認時間による上限 '+timeCapacity+'本／週。現在の自動執筆実績や公開確定件数ではありません。</small>';
}
function initMagazineControls(){
 $('magazine').innerHTML=MAGAZINES.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.name)+'</option>').join('');
 $('magazine').value=autoMagazine($('kind').value);magazineAdvice();
 drawMagazines();renderCadence();
 for(const id of ['drafts-per-week','ready-percent','minutes-per-day'])$(id).addEventListener('input',renderCadence);
 $('kind').addEventListener('change',()=>{if(!magazineUserEdited)$('magazine').value=autoMagazine($('kind').value);magazineAdvice()});
 $('magazine').addEventListener('change',()=>{magazineUserEdited=true;magazineAdvice()});
}

let client=null,user=null,records=[],activeId='',query='',filter='all',busy=false;
const status=(text,error=false)=>{$('auth-status').innerHTML=esc(text);$('auth-status').classList.toggle('error',error)};
function normalize(payload){
 const p=payload||{};
 return {entryType:'editor-work',version:1,
  kind:names[p.kind]?p.kind:'education',
  magazine:MAG_BY_ID[p.magazine]?p.magazine:autoMagazine(p.kind),
  title:String(p.title||'').slice(0,150),
  problem:String(p.problem||'').slice(0,5000),
  aiMethod:String(p.aiMethod||'').slice(0,7000),
  result:String(p.result||'').slice(0,6000),
  lesson:String(p.lesson||'').slice(0,5000),
  sources:String(p.sources||'').slice(0,5000),
  stage:stageNames[p.stage]?p.stage:'seed',
  publicUrl:String(p.publicUrl||'').slice(0,500),
  createdAt:p.createdAt||new Date().toISOString(),
  updatedAt:p.updatedAt||new Date().toISOString(),
 };
}
function formPayload(){
 return normalize({kind:$('kind').value,magazine:$('magazine').value,title:$('title').value.trim(),problem:$('problem').value.trim(),
  aiMethod:$('ai-method').value.trim(),result:$('result').value.trim(),lesson:$('lesson').value.trim(),
  sources:$('sources').value.trim(),stage:$('stage').value,publicUrl:$('public-url').value.trim()});
}
function cleanForm(){
 $('editor-form').reset();$('record-id').value='';activeId='';$('stage').value='seed';$('delete-entry').hidden=true;
 magazineUserEdited=false;$('magazine').value=autoMagazine($('kind').value);magazineAdvice();
 drawList();$('title').focus();
}
function loadForm(row){
 if(!row)return;
 const p=normalize(row.payload);activeId=row.id;$('record-id').value=row.id;
 $('kind').value=p.kind;$('magazine').value=p.magazine;magazineUserEdited=true;magazineAdvice();$('title').value=p.title;$('problem').value=p.problem;$('ai-method').value=p.aiMethod;
 $('result').value=p.result;$('lesson').value=p.lesson;$('sources').value=p.sources;
 $('stage').value=p.stage;$('public-url').value=p.publicUrl;
 $('delete-entry').hidden=false;drawList();
 if(window.matchMedia?.('(max-width:770px)').matches)$('editor-title').scrollIntoView({block:'start',behavior:'auto'});
}
function drawList(){
 $('total-count').textContent=records.length;
 $('candidate-count').textContent=records.filter(x=>['candidate','draft'].includes(x.payload?.stage)).length;
 $('published-count').textContent=records.filter(x=>x.payload?.stage==='published').length;
 drawMagazines();
 const matching=records.filter(x=>{
  const p=x.payload||{};
  return (filter==='all'||p.stage===filter)&&(!query||[p.title,p.problem,p.aiMethod,p.result,p.lesson].join(' ').toLocaleLowerCase('ja').includes(query));
 });
 $('entry-list').innerHTML=matching.length?matching.map(r=>{
  const p=r.payload||{},date=new Date(r.updated_at||'');
  const stamp=Number.isNaN(date.getTime())?'':date.toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo'});
  return '<button class="entry '+(activeId===r.id?'active':'')+'" data-record="'+esc(r.id)+'" type="button">'+
   '<strong>'+esc(p.title)+'</strong><small>'+esc(MAG_BY_ID[p.magazine]?.name||names[p.kind]||'')+' · '+esc(stageNames[p.stage]||'')+' · '+esc(stamp)+'</small>'+
   '<p>'+esc(String(p.problem||p.aiMethod||p.result||'').slice(0,90))+'</p></button>';
 }).join(''):'<p class="empty">記録がありません。仕事や創作で試したことを一件ずつ残してください。</p>';
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
  'あなたは「音楽科教員・作曲家」の本人名義noteを担当するリサーチャー兼編集者です。',
  '次の実践記録を基に、読み応えのあるnote記事の下書きを作成してください。',
  '対象マガジン：'+(magazine?.name||'未指定'),
  '読者像：'+(magazine?.readers||'音楽・教育・創作に関心がある人'),
  '記事が届ける価値：'+(magazine?.promise||'具体的で再現できる学び'),
  '記事で避けること：'+(magazine?.not||'根拠のない宣伝や捏造'),
  '掲載前の追加確認：'+(magazine?.checks||[]).join('／'),
  '【必須条件】本人の体験、検証済み事実、推測、一般論を混同しない。資料がない主張は断定しない。実際に行っていない実践・成果・発言は創作しない。',
  '学校の内部資料、生徒・保護者の個人情報、未許可の画像や音源などを含めない。該当する可能性がある箇所は削除候補として警告を出す。',
  '記事は2,000〜3,000字を目安に、課題→試行→結果→限界→再利用できる工夫の順で構成する。広告的・過剰な成功談にしない。',
  '参考文献がある場合は本文との対応を確認し、確認できない箇所には「要出典・要確認」と印を付ける。',
  '出力：①記事タイトル案3つ ②記事本文 ③出典・事実確認チェックリスト ④短いSNS紹介案 ⑤教材や制作物としての展開可能性。',
  '',
  '【実践記録】',
  '区分：'+(names[p.kind]||''),'テーマ：'+p.title,
  '出発点：'+(p.problem||'未記入'),'AIに任せたこと・使い方：'+(p.aiMethod||'未記入'),
  '結果・失敗・未確認事項：'+(p.result||'未記入'),'再現できる工夫：'+(p.lesson||'未記入'),
  '参考資料：'+(p.sources||'未記入'),
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
async function init(){
 try{
  const mod=await import(IMPORT);
  client=mod.createClient(URL_SUPABASE,PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  client.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_OUT'){user=null;records=[];activeId='';$('private-app').hidden=true;status('ログインしていません。知の図書館からログインしてください。')}
   if(event==='SIGNED_IN'&&session?.user&&user?.id!==session.user.id){user=session.user;$('private-app').hidden=false;setTimeout(refresh,0)}
  });
  const {data,error}=await client.auth.getUser();
  if(error&&!String(error.message||'').toLowerCase().includes('session'))throw error;
  if(!data?.user){status('未ログインです。画面上部の「知の図書館」からログインしてください。');return}
  user=data.user;$('private-app').hidden=false;await refresh();
 }catch(e){status('認証状態を確認できませんでした。元の知の図書館でログインを確認してください：'+(e.message||String(e)),true)}
}
initMagazineControls();
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