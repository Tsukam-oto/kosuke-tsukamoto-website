/* 知の図書館 v1.8.0: 日本時間の曜日棚。出典・記事そのものは既存data.jsを参照。 */
window.KNOWLEDGE_WEEKLY = Object.freeze({
  timezone:'Asia/Tokyo',
  days:[
    {day:'日',label:'知識をつなぐ日',short:'知のつながり',description:'違う分野を組み合わせて、新しい問いを見つける',topicIds:['acoustics','language-sounds','memory','symbiosis','temperament','philosophy','zero','writing']},
    {day:'月',label:'人間を知る日',short:'心理・自己理解',description:'心理学・臨床・ケア・自己研鑽の入口',topicIds:['memory','sleep','circadian','language-sounds','philosophy','culture']},
    {day:'火',label:'音のしくみの日',short:'音楽理論・作曲',description:'音律・和声・音響・楽譜から音楽を考える',topicIds:['temperament','acoustics','notation']},
    {day:'水',label:'過去と物語の日',short:'歴史・神話',description:'神話・考古・文字・哲学をたどる',topicIds:['zeus-titans','homer-history','bronze-collapse','oral-epic','writing','indus','calendar']},
    {day:'木',label:'科学の不思議の日',short:'科学・数学',description:'宇宙・生命・地球・数学の「なぜ？」',topicIds:['astronomy','spectra','evolution','magnetism','geology','zero','infinity','symbiosis','extinction']},
    {day:'金',label:'一曲から広がる日',short:'作曲家・音楽史',description:'作曲家・演奏・記譜・音楽文化を聴いて知る',topicIds:['notation','temperament','acoustics','oral-epic']},
    {day:'土',label:'世界のしくみの日',short:'文化・社会',description:'建築・言語・食・都市・経済・地理へ広げる',topicIds:['culture','city','concrete','glass','calendar','timekeeping','navigation','fermentation','islands']}
  ],
  dateInJapan(d=new Date()){return d.toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'})},
  weekday(dateStr){const d=/^\d{4}-\d{2}-\d{2}$/.test(dateStr)?dateStr:this.dateInJapan();return new Date(d+'T12:00:00+09:00').getDay()}
});
