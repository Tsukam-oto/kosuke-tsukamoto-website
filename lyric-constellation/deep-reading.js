/* Close Reading v1 – browser-only evidence, no AI text generation or network calls.
   Observations are mechanically verifiable. Editorial hypotheses are explicitly tentative.
   No unpublished user lyrics or notes are shipped with this script. */
(function(root){
'use strict';
const WORDS=[
 {label:'一人称（単数）',keys:['僕','私','わたし','ぼく']},
 {label:'一人称（複数）',keys:['僕ら','僕たち','私たち','わたしたち','ぼくら']},
 {label:'二人称',keys:['あなた','君','きみ']}
];
const MOTIFS=[
 {id:'time',label:'時間・季節',keys:['朝','夜','明日','今日','昨日','春','夏','秋','冬','季節']},
 {id:'landscape',label:'風景・場所',keys:['風景','空','帰り道','夕焼け','風','光','世界','海']},
 {id:'music',label:'音楽と言葉',keys:['音楽','言葉','歌','音符','楽譜','声','伝え']},
 {id:'relation',label:'他者との関係',keys:['あなた','君','出会','そば','一緒','僕ら','支え']},
 {id:'hope',label:'希望とためらい',keys:['きっと','大丈夫','不安','願','怖','嘘','救','迷']}
];
const EDITORIAL={
 '朝になったら':[
  {heading:'「僕」と「僕ら」の間に何があるか',thesis:'希望の言葉だけでなく、誰かと帰った経験が人称の広がりに関係している、とも読めます。',anchors:['僕を待っているから','僕らを待っているから','あなたと帰った帰り道'],other:'「僕ら」は個人の経験の変化ではなく、合唱として歌うための開かれた主語とも読めます。'},
  {heading:'反復する「帰り道」の意味',thesis:'同じ場所を表す言葉が、つらい経験と支えられた経験の両方に置かれています。',anchors:['ため息の混じった帰り道','あなたと帰った帰り道'],other:'場所が変わったのではなく、帰る相手によって見え方が変わった可能性もあります。'}
 ],
 '春にあふれて':[
  {heading:'励ましの言葉を受け取れないとき',thesis:'前向きな言葉が届かない状況を描き、単純な励ましの有効性を問い直している、と読むことができます。',anchors:['「きっと大丈夫」','嘘に聞こえる','「怖がらなくてもいいよ」って'],other:'励ます行為そのものの否定ではなく、相手の状況を理解しない励ましへの疑問かもしれません。'},
  {heading:'相互に保たれる「あなた」と「わたし」',thesis:'一方だけが救うのではなく、互いが自分らしくいられる条件を探しているように読めます。',anchors:['あなたがあなたで','わたしがわたしで','不安をもったまま、'],other:'これは対等な関係の宣言であると同時に、まだ実現していない願いとも読めます。'}
 ],
 'All around you':[
  {heading:'矛盾した願いを消さない',thesis:'「見つかる」と「見つからない」を並置し、どちらか一方に決着させずに終わっています。',anchors:['どうか見つかるように','どうか見つからないように','秋は　何も　答えず'],other:'秋は季節の移り変わりだけでなく、自分でも名づけられない状態の比喩とも読めます。'},
  {heading:'日常が救いにも負担にもなる',thesis:'学校へ戻る平日を、単一の感情ではなく二つの方向から描いています。',anchors:['苦しいような','救われるような','先生も少し眠そうで'],other:'この日常の具体性を、特定の一人の体験と断定する必要はありません。'}
 ],
 '出会い':[
  {heading:'音楽は楽譜の中だけに存在しない',thesis:'音符や楽譜の外側に、人と人の関係や時間が広がっていると読むことができます。',anchors:['あなたのために書いた音符は','楽譜の中に収まりきらない','人と人との間で'],other:'音楽の力を賛美する歌である一方、音楽に別れや痛みも含まれることを認めています。'}
 ],
 '願い':[
  {heading:'音楽の力を言い切らない',thesis:'目に見えず言葉にもならないものとして音楽を描き、その効力を「なったら良い」という願いに留めています。',anchors:['目には見えないものばかり','言葉にならないものばかり','音楽になったら良い'],other:'慎重な願いにも、歌を聴く人へ託す強い期待にも読めます。'}
 ],
 '晴れ渡る空':[
  {heading:'何かを増やすより、何を持っているか',thesis:'不足を埋めるのではなく、すでにある大切なものに目を向ける構成と考えられます。',anchors:['求めたりしない','大切なものは','きっともう持っている'],other:'この肯定が届きにくい人もいるはずで、その距離も読解の対象になります。'}
 ],
 'ただなか':[
  {heading:'「なんでもない日」が変わる',thesis:'ありふれた毎日を、否定するのでなく特別なものとして読み直す動きが見られます。',anchors:['なんでもないような','特別な毎日','幸せのただなかで'],other:'幸福の宣言であると同時に、失われがちな日々を抱きしめる切実さも感じられます。'}
 ],
 'あなたと':[
  {heading:'「僕」と「私」を両方残す',thesis:'一人の語りに閉じず、異なる声が同じ記憶を引き受けられる表現になっています。',anchors:['だから僕は','だから私は','ここで良かった'],other:'人物の交代とは限らず、合唱で共有される経験を示す仕組みとも読めます。'}
 ],
 'これから':[
  {heading:'「ありふれた言葉」が特別になる',thesis:'言葉自体の珍しさではなく、誰に、どのように伝えるかが中心にあるように読めます。',anchors:['ありふれた言葉','特別なあなたへ','ありがとう'],other:'伝えきれない気持ちを「抱きしめて」と置くことで、言葉の限界も示しているかもしれません。'}
 ],
 '夏を吸い込んで':[
  {heading:'自分の言い訳を見つめる視点',thesis:'変わりたい気持ちを描く前に、うまくいかない理由を外側に求めていたことを認めています。',anchors:['うまくいかない理由を、','外側に探す。','それでも前を向けたのは、'],other:'自力の努力だけでなく、他者との関係を通じた変化とも読めます。'}
 ],
 '無題（2026年3月18日）':[
  {heading:'励ましの危うさを知ったうえで伝える',thesis:'無条件の慰めを無責任と感じながらも、相手への願いとして「頑張れ」を選ぶ構造です。',anchors:['頑張らなくていい','耳触りがいい言葉は','愛をもって言う','「頑張れ」'],other:'「頑張れ」の受け取り方は相手によって変わるため、これは読み手にも問いを残します。'}
 ]
};
function splitLines(source){
 return String(source||'').split(/\r?\n/).map((raw,i)=>({number:i+1,text:raw.trim()})).filter(x=>x.text);
}
function evidenceFor(lines,fragment){
 const found=lines.find(x=>x.text.includes(fragment));
 return found?{line:found.number,text:found.text}:null;
}
function countOccurrences(text,needle){
 let i=0,n=0;while((i=text.indexOf(needle,i))!==-1){i+=needle.length;n++}return n;
}
function pronounReading(lines){
 const re=/(僕たち|私たち|わたしたち|僕ら|ぼくら|あなた|わたし|ぼく|僕|私|君|きみ)/g;
 const classified=new Map(WORDS.map(w=>[w.label,{label:w.label,count:0,examples:[]}]));
 for(const line of lines){
  re.lastIndex=0;let m;
  while((m=re.exec(line.text))!==null){
   const group=WORDS.find(x=>x.keys.includes(m[0]));
   if(!group)continue;
   const o=classified.get(group.label);o.count++;if(o.examples.length<3&&!o.examples.some(e=>e.line===line.number))o.examples.push(line);
  }
 }
 return [...classified.values()];
}
function repeats(lines){
 const found=new Map();
 for(const line of lines){
  const key=line.text.normalize('NFKC').replace(/\s+/g,'').replace(/[、。．.!！?？]/g,'');
  if(key.length<3)continue;
  if(!found.has(key))found.set(key,[]);
  found.get(key).push(line);
 }
 return [...found.values()].filter(a=>a.length>=2).sort((a,b)=>b.length-a.length||b[0].text.length-a[0].text.length).slice(0,7)
 .map(a=>({text:a[0].text,count:a.length,lines:a.map(x=>x.number)}));
}
function questionLines(lines){
 const re=/[？?]|どうして|なぜ|なんで(?!も)|どこに|誰なの|だろうか|でしょうか|のかな/;
 return lines.filter(x=>re.test(x.text)).slice(0,8);
}
function motifs(lines){
 return MOTIFS.map(m=>{
  const examples=lines.filter(x=>m.keys.some(k=>x.text.includes(k)));
  return {id:m.id,label:m.label,count:examples.length,examples:examples.slice(0,3)};
 }).filter(x=>x.count>0);
}
function curated(work,lines){
 if(work.origin!=='official')return [];
 return (EDITORIAL[work.title]||[]).map(item=>{
  const evidence=item.anchors.map(f=>evidenceFor(lines,f));
  return evidence.every(Boolean)?{heading:item.heading,hypothesis:item.thesis,alternative:item.other,evidence}:null;
 }).filter(Boolean);
}
function crossRead(work,others){
 if(work.origin!=='official')return [];
 const lines=splitLines(work.lyrics);
 const keys=new Set(lines.flatMap(x=>MOTIFS.flatMap(m=>m.keys.filter(k=>x.text.includes(k)))));
 const out=[];
 for(const other of (others||[])){
  if(!other||other.id===work.id||other.origin!=='official'||other.sky!==work.sky)continue;
  const otherLines=splitLines(other.lyrics);
  const rich=MOTIFS.filter(m=>m.id!=='relation').map(m=>{
   const hits=m.keys.filter(k=>keys.has(k)&&otherLines.some(x=>x.text.includes(k)));
   // A single commonplace word is a weak link; label as vocabulary, not shared intent.
   return hits.length?{label:m.label,words:hits,here:lines.find(x=>hits.some(k=>x.text.includes(k))),there:otherLines.find(x=>hits.some(k=>x.text.includes(k)))}:null;
  }).filter(Boolean);
  if(rich.length>=2||rich.some(x=>x.words.length>=2))out.push({title:other.title,id:other.id,topics:rich.slice(0,3)});
 }
 return out.sort((a,b)=>b.topics.length-a.topics.length).slice(0,5);
}
function analyze(work,others=[]){
 if(!work||typeof work.lyrics!=='string')throw Error('歌詞原文がありません');
 const lines=splitLines(work.lyrics);
 return {title:work.title,origin:work.origin,lines:lines.length,
  opening:lines.slice(0,3),ending:lines.slice(-3),
  pronouns:pronounReading(lines),questions:questionLines(lines),
  repeats:repeats(lines),motifs:motifs(lines),
  readings:curated(work,lines),cross:crossRead(work,others),
  caution:'人称やモチーフは表記に基づく観察です。意味、語り手、制作意図、創作年代を自動確定しません。'};
}
root.LyricCloseReading={version:'close-reading-1.0',analyze,splitLines,evidenceFor,pronounReading,repeats,questionLines};
})(typeof window!=='undefined'?window:globalThis);
