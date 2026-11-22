/* Shared progressive-enhancement handler for the four public Formspree forms.
   Native POST remains available when JavaScript is unavailable.
   No message content is stored in localStorage or exposed as a URL. */
(()=>{
 "use strict";
 const forms=document.querySelectorAll("form[data-ajax-feedback]");
 for(const form of forms){
   const button=form.querySelector('button[type="submit"]');
   const status=form.querySelector("[data-feedback-status]");
   if(!button||!status)continue;
   const original=button.textContent;
   let sending=false,sent=false;
   const announce=(message,state)=>{
     status.textContent=message;
     status.dataset.state=state;
   };
   form.addEventListener("submit",async event=>{
     event.preventDefault();
     if(sending||sent)return;
     if(!form.reportValidity())return;
     sending=true;
     button.disabled=true;
     button.textContent="送信しています…";
     announce("送信内容を受け付けています。","sending");
     try{
       const response=await fetch(form.action,{
         method:"POST",
         body:new FormData(form),
         headers:{"Accept":"application/json"},
         credentials:"omit"
       });
       if(!response.ok){
         announce(response.status===429
           ?"送信が集中しています。入力内容は残っています。しばらくしてからお試しください。"
           :response.status===422||response.status===400
             ?"入力内容を確認できませんでした。内容を見直して再度お送りください。"
             :"送信できませんでした。入力内容は残っています。時間をおいて再度お試しください。","error");
         return;
       }
       sent=true;
       form.dataset.feedbackSent="true";
       button.textContent="送信済み";
       announce("メッセージを受け付けました。ありがとうございます。送信内容が自動で公開されることはありません。","success");
       status.focus({preventScroll:true});
     }catch(error){
       // A network failure can happen after the remote server accepted a POST.
       // Do not silently retry and create duplicate submissions.
       announce("通信状況により送信完了を確認できませんでした。内容は残っています。重複を避けるため、再送前にお問い合わせください。","uncertain");
     }finally{
       sending=false;
       if(!sent){button.disabled=false;button.textContent=original;}
     }
   });
 }
})();
