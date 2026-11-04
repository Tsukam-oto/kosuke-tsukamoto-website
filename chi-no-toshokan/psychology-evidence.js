/* 編集監査：各論点と出典の対応。研究の効果量や因果関係を推測で補わない。 */
(()=>{
const s=(id,kind,title,url,note)=>({id,kind,title,url,note});
const c=(kind,title,detail,sources,section)=>({kind,title,detail,sources,section});
const E={
'adler-community':{
 overview:'アドラーの思想を伝える資料と、心理学上の実証結果とを区別しています。',
 sources:[s('apa','専門辞典','APA Dictionary — Individual psychology','https://dictionary.apa.org/individual-psychology','アドラー個人心理学の基本的な思想・歴史的定義。'),s('ncbi','専門解説','NCBI Bookshelf — Adlerian Therapy','https://www.ncbi.nlm.nih.gov/books/NBK599518/','共同体感覚・目的論などの理論構成についての整理。')],
 claims:[
 c('source','共同体感覚はアドラー個人心理学の中心概念の一つ','概念の存在とその理論内での位置づけが確認できます。', ['apa','ncbi'],0),
 c('interpretation','共同体感覚を同調とは区別して考える','理論の読み方についての解説であり、これ自体が介入の有効性を実証した主張ではありません。',['ncbi'],1),
 c('debate','理論の紹介は、治療法の効果検証と同じではない','専門辞典に掲載されていることから、すべての理論的主張が検証済みとは推論できません。',['apa','ncbi'],3)]},
'therapeutic-alliance':{
 overview:'治療同盟と治療結果の統計的関連を確認し、因果の主張を分けています。',
 sources:[s('meta','メタ分析','Flückiger et al. (2018) — Alliance in psychotherapy','https://pubmed.ncbi.nlm.nih.gov/29792475/','295の独立研究、3万人以上の参加者を対象とした治療同盟と治療結果のメタ分析。'),s('nice','診療指針','NICE NG222 — Principles and treatment options','https://www.nice.org.uk/guidance/ng222/chapter/Recommendations','治療選択・共同意思決定と心理療法を提供する際の条件。')],
 claims:[
 c('source','治療同盟と治療結果には統計的関連がある','研究を統合したメタ分析で正の関連が示されています。',['meta'],1),
 c('debate','相関があることは単独の原因である証明ではない','観察された関連を因果の方向まで一意に決めることはできません。',['meta'],2),
 c('source','治療を選ぶには本人の希望・必要性を考慮する','診療指針では共同意思決定や臨床的な必要性の検討が推奨されています。',['nice'],0)]},
'habit-formation':{
 overview:'習慣の自動性の縦断研究と、一般化できる範囲を分けています。',
 sources:[s('lally','原著研究','Lally et al. (2010) — How are habits formed?','https://doi.org/10.1002/ejsp.674','日常生活で習慣行動と自動性を追跡した研究。'),s('keller','後続研究','Keller et al. (2021) — Habit formation and cues','https://doi.org/10.1111/bjhp.12504','日常の行動きっかけの計画に関する試験。')],
 claims:[
 c('source','行動の反復と自動性の変化が追跡された','同じ状況での反復と自動性の増加を扱っています。',['lally'],0),
 c('source','習慣化にかかる時間には広いばらつきがあった','モデル推定の18〜254日という値を、万人共通の期間としてはいけません。',['lally','keller'],1),
 c('debate','「21日で完成」など一律の期限は裏付けられない','行動や個人によって違いがあり、研究の推定値を必須日数にしてはなりません。',['lally'],2)]},
'procrastination-mood':{
 overview:'先延ばしを感情調整と見る研究上の枠組みであり、臨床診断には使いません。',
 sources:[s('mood','研究レビュー','Sirois & Pychyl (2013) — Procrastination and mood regulation','https://doi.org/10.1111/spc3.12011','短期的な気分修復と先延ばしの関係を論じる理論的整理。')],
 claims:[
 c('interpretation','先延ばしを短期的な気分修復で説明する考え方','論文は感情調整という解釈枠組みを論じています。',['mood'],1),
 c('debate','すべての先延ばしを単一原因に還元できない','理論的な整理は個別の原因の確定や診断を意味しません。',['mood'],2),
 c('interpretation','未来の自分が負担を引き受けるという見方','先延ばしと時間的自己の結びつきについての議論です。',['mood'],1)]},
'psychotherapy-map':{
 overview:'成人うつ病に関する診療指針を基に複数の心理的治療を比較しています。',
 sources:[s('nice','診療指針','NICE NG222 — Depression in adults','https://www.nice.org.uk/guidance/ng222/chapter/Recommendations','対象と重症度、治療の選択、心理療法の特徴についての推奨。'),s('nhs','公的医療解説','NHS — Treatment for depression','https://www.nhs.uk/mental-health/conditions/depression-in-adults/treatment/','CBTや行動活性化、精神力動的心理療法などの一般向け解説。')],
 claims:[
 c('source','CBTは思考・感情・行動の関係を扱う','単純なポジティブ思考だけを指すわけではありません。',['nice','nhs'],0),
 c('source','成人うつ病には複数の心理的治療選択肢がある','CBT・行動活性化などの方法と適応条件が示されています。',['nice'],1),
 c('debate','集団における推奨は個人への効果保証ではない','治療選択には本人の希望・必要性・専門職の評価も必要です。',['nice'],2)]},
'activation':{
 overview:'行動活性化を医療上の心理療法として説明し、一般的な努力論と区別します。',
 sources:[s('nice','診療指針','NICE NG222 — Behavioural activation','https://www.nice.org.uk/guidance/ng222/chapter/Recommendations','成人うつ病に対する心理的治療の一選択肢。'),s('nhs','公的医療解説','NHS — Depression treatment','https://www.nhs.uk/mental-health/conditions/depression-in-adults/treatment/','行動・活動と気分の関係に着目する療法の解説。')],
 claims:[
 c('source','行動活性化は成人うつ病治療の選択肢として示される','NICEの診療指針に記載されています。',['nice'],2),
 c('source','活動と気分の関係に注目する心理療法である','日常活動の変化と気分のつながりを扱います。',['nhs'],0),
 c('debate','「無理に動けば必ず改善する」は不正確','専門的な治療と、頑張ることの一般論を混同しないよう注意が必要です。',['nice','nhs'],1)]}
};
for(const [id,e] of Object.entries(E)){e.reviewedAt='2026-11-04';e.visual=id==='habit-formation'?'habit-loop':id==='therapeutic-alliance'?'alliance-relationship':id==='psychotherapy-map'?'therapy-compare':id==='activation'?'activity-mood':'';}
window.KNOWLEDGE_EVIDENCE=Object.assign(window.KNOWLEDGE_EVIDENCE||{},E);
})();