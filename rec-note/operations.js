/* REC NOTE v4 — production overview and local editorial feedback. */
'use strict';
(function(){
 const $=id=>document.getElementById(id), wrapper=document.querySelector('main.wrap');
 if(!wrapper||typeof state==='undefined')return;
 const summary=document.createElement('div');summary.id='studioStages';summary.className='studioStage';summary.setAttribute('aria-label','作品の制作進行状況');
 const overview=document.querySelector('.modeOverview');if(overview)overview.insertAdjacentElement('afterend',summary);
 const lib=document.createElement('details');lib.className='studioLibrary';lib.id='assetLibrary';
 lib.innerHTML='<summary>素材リンク一覧（この曲に登録済みのもの）</summary><div class="libraryBody" id="assetLibraryBody"></div>';
 const foot=wrapper.querySelector('.footnote');if(foot)foot.insertAdjacentElement('beforebegin',lib);
 const safe=(u)=>{try{const p=new URL(u);return ['https:','http:'].includes(p.protocol)?p.href:null}catch(e){return null}};
 function renderProject(){
   summary.replaceChildren();
   for(const m of ['REC','MV','SHORT']){
     const items=state.records.filter(r=>r.song===song&&recordMode(r)===m);
     const done=items.filter(r=>r.status==='確認済み').length;
     const span=document.createElement('span');const strong=document.createElement('strong');strong.textContent=m+' '+items.length+'件';span.append(strong,document.createTextNode(' / 確認済 '+done));summary.append(span);
   }
   const root=$('assetLibraryBody');root.replaceChildren();
   const links=state.records.filter(r=>r.song===song&&r.asset&&safe(r.asset));
   if(!links.length){const empty=document.createElement('div');empty.className='v4FieldNote';empty.textContent='MV・SHORTで素材リンクを追加すると、ここに集まります。';root.append(empty);return}
   for(const r of links){
     const row=document.createElement('div');row.className='libraryItem';
     const text=document.createElement('span');text.textContent='['+recordMode(r)+'] '+fmt(r.start)+' '+(r.lyric||r.category||'素材')+'：';
     const a=document.createElement('a');a.textContent=r.asset;a.href=safe(r.asset);a.target='_blank';a.rel='noopener noreferrer';
     row.append(text,a);root.append(row);
   }
 }
 const originalRenderList=renderList;
 renderList=function(){
   originalRenderList();
   if(!selectedId)return;
   const r=state.records.find(x=>x.id===selectedId);if(!r)return;
   const detail=$('itemList').querySelector('.item.selected .detail');if(!detail)return;
   const panel=document.createElement('div');panel.className='studioDetail';
   panel.innerHTML='<div class="studioHeading">担当・返答の控え <span class="studioKicker">LOCAL NOTES</span></div><div class="v4FieldNote">相手から受け取った内容を自分で記録する欄です。相手が直接入力できる共有機能ではありません。</div>';
   const assignee=document.createElement('label');assignee.textContent='依頼先・担当';const input=document.createElement('input');input.placeholder='例：UCNUC / 映像編集担当';input.value=r.assignee||'';assignee.append(input);
   const due=document.createElement('label');due.textContent='対応希望日（任意）';const date=document.createElement('input');date.type='date';date.value=r.deadline||'';due.append(date);
   const replyLabel=document.createElement('label');replyLabel.textContent='返答・確認結果';const reply=document.createElement('textarea');reply.placeholder='受け取った返事、確認できたことを記録';reply.value=r.editorReply||'';replyLabel.append(reply);
   for(const node of [input,date,reply]){
     node.addEventListener('click',e=>e.stopPropagation());
     node.addEventListener('keydown',e=>e.stopPropagation());
   }
   input.addEventListener('input',()=>{r.assignee=input.value;persist()});
   date.addEventListener('change',()=>{r.deadline=date.value;persist()});
   reply.addEventListener('input',()=>{r.editorReply=reply.value;persist()});
   panel.append(assignee,due,replyLabel);detail.append(panel);
 };
 const originalUpdate=updateAll;updateAll=function(){originalUpdate();renderProject()};
 const originalSetSong=setSong;setSong=function(s){originalSetSong(s);renderProject()};
 const originalSetMode=setMode;setMode=function(s){originalSetMode(s);renderProject()};
 renderProject();renderList();
})();