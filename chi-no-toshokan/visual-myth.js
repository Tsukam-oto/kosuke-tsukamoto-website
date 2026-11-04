/* Original illustration of the succession narrative in Hesiod. No claim of historicity. */
(()=>{'use strict';
 const old=window.KNOWLEDGE_VISUALS;
 if(!old||typeof old.render!=='function')return;
 const oldRender=old.render.bind(old);
 function renderMyth(){
  return `<section class="education-visual" aria-label="神統記の世代交代の模式図"><div class="kicker">MYTH · GENERATIONS</div><h2>神々の世代交代をたどる</h2><p>神話の登場人物と支配権の変化を整理した図です。<strong>実際の歴史年表や年代測定ではありません。</strong></p>
  <svg viewBox="0 0 710 350" class="edu-svg" role="img" aria-label="神話の世代交代。ウラノスからクロノス、ゼウスへと支配権が移る。ガイアとレアは世代のつながりに関与する。" style="width:100%;height:auto">
   <rect width="710" height="350" rx="16" fill="#f4f6ef"/>
   <text x="32" y="30" font-size="14" font-weight="700" fill="#455e53">ヘシオドス『神統記』における支配権の継承</text>
   <g stroke="#799e87" stroke-width="3" fill="none" stroke-linecap="round"><path d="M350 101v42"/><path d="M350 211v43"/></g>
   <g fill="#527c64"><path d="M342 134l8 11 8-11"/><path d="M342 246l8 11 8-11"/></g>
   <rect x="218" y="51" width="264" height="53" rx="12" fill="#dce7dc" stroke="#a2b9a3"/>
   <text x="350" y="77" fill="#254639" text-anchor="middle" font-size="20" font-weight="700">ウラノス（天空）</text><text x="350" y="94" fill="#425a4c" text-anchor="middle" font-size="11">ガイア（大地）との子がティタン神族</text>
   <rect x="218" y="151" width="264" height="60" rx="12" fill="#e9e0c9" stroke="#b8a47b"/>
   <text x="350" y="179" fill="#594729" text-anchor="middle" font-size="20" font-weight="700">クロノス</text><text x="350" y="198" fill="#594729" text-anchor="middle" font-size="12">父を退け、のちにレアとの子を飲み込む</text>
   <rect x="218" y="261" width="264" height="57" rx="12" fill="#245b49"/>
   <text x="350" y="287" fill="white" text-anchor="middle" font-size="21" font-weight="700">ゼウス</text><text x="350" y="306" fill="white" text-anchor="middle" font-size="12">神々の権能を分配する支配者へ</text>
   <text x="85" y="163" fill="#516d5c" font-size="12" text-anchor="middle">神話上の</text><text x="85" y="180" fill="#516d5c" font-size="12" text-anchor="middle">世代交代</text>
   <text x="610" y="175" fill="#516d5c" font-size="12" text-anchor="middle">実年代には</text><text x="610" y="192" fill="#516d5c" font-size="12" text-anchor="middle">換算できません</text>
   <text x="350" y="337" fill="#617667" text-anchor="middle" font-size="11">神統記の筋書きから作った教育用模式図／歴史的事実の証明ではありません</text>
  </svg><p class="visual-disclaimer">人物間の系譜の細部や別伝承は省略しています。物語の出典は下の『神統記』をご確認ください。</p></section>`;
 }
 window.KNOWLEDGE_VISUALS={...old,render:id=>id==='myth-succession'?renderMyth():oldRender(id)};
})();