/* Close Reading v1 – browser-only evidence, no AI text generation or network calls.
   Observations are mechanically verifiable. Editorial hypotheses are explicitly tentative.
   No unpublished user lyrics or notes are shipped with this script. */
(function(root){
'use strict';
const WORDS=[
 {label:'一人称（単数）',keys:['僕','私','わたし','ぼく','俺','おれ']},
 {label:'一人称（複数）',keys:['僕ら','僕たち','私たち','わたしたち','ぼくら','俺ら','俺たち']},
 {label:'二人称',keys:['あなた','君','きみ','お前','あんた']}
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
 const re=/(僕たち|私たち|わたしたち|俺たち|俺ら|僕ら|ぼくら|あなた|わたし|あんた|お前|ぼく|おれ|僕|私|君|きみ|俺)/g;
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

/* v2: stanza movement and near-repetition grounded in the song's own positions.
   "Later in the text" is never called "later composition"; text order is not draft order. */
function splitStanzas(source){
 const raw=String(source||'').split(/\r?\n/);const out=[];let part=[];
 const flush=()=>{if(!part.length)return;out.push({index:out.length+1,start:part[0].number,end:part[part.length-1].number,lines:part});part=[];};
 raw.forEach((text,i)=>{if(text.trim())part.push({number:i+1,text:text.trim()});else flush();});flush();
 return out;
}
const plain=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s　「」『』（）()【】、。．!！?？:：;；・,…“”"'‘’\-―〜～]/g,'');
function overviewStanzas(stanzas){
 return stanzas.map(s=>{
  const matched=MOTIFS.map(m=>({label:m.label,count:s.lines.filter(x=>m.keys.some(k=>x.text.includes(k))).length}))
    .filter(x=>x.count).sort((a,b)=>b.count-a.count).slice(0,3);
  return {index:s.index,start:s.start,end:s.end,count:s.lines.length,opening:s.lines.slice(0,2),
    ending:s.lines.slice(-2),motifs:matched.map(x=>x.label)};
 });
}
function locateStanza(stanzas,line){
 const s=stanzas.find(x=>x.start<=line&&x.end>=line);return s?s.index:null;
}
function motifJourney(stanzas){
 const out=[];
 for(const m of MOTIFS){
  const appearances=stanzas.map(s=>{
   const matches=s.lines.filter(x=>m.keys.some(k=>x.text.includes(k)));
   return matches.length?{stanza:s.index,lines:matches}:null;
  }).filter(Boolean);
  if(appearances.length<2)continue;
  const first=appearances[0],last=appearances[appearances.length-1];
  out.push({label:m.label,stanzas:appearances.map(x=>x.stanza),first:first.lines[0],last:last.lines[last.lines.length-1]});
 }
 return out.sort((a,b)=>b.stanzas.length-a.stanzas.length).slice(0,5);
}
function transitionClues(stanzas){
 const patterns=[
  {re:/^それでも/,word:'それでも'}, {re:/^だから/,word:'だから'},
  {re:/^だけど/,word:'だけど'}, {re:/^しかし/,word:'しかし'},
  {re:/^でも(?!の)/,word:'でも'}, {re:/^なのに/,word:'なのに'},
  {re:/^一方で/,word:'一方で'}, {re:/けれど[、。．.!！?？\s]*$/,word:'けれど'},
  {re:/^それなのに/,word:'それなのに'}
 ];
 const out=[];
 for(const s of stanzas)for(let i=0;i<s.lines.length;i++){
  const line=s.lines[i],m=patterns.find(p=>p.re.test(line.text));
  if(!m)continue;
  out.push({stanza:s.index,marker:m.word,line,prev:i?s.lines[i-1]:null,next:s.lines[i+1]||null});
 }
 return out.slice(0,10);
}
function grams(s){
 const out=new Set();for(let i=0;i+2<=s.length;i++)out.add(s.slice(i,i+2));return out;
}
function commonStart(a,b){let i=0;while(i<Math.min(a.length,b.length)&&a[i]===b[i])i++;return i;}
function commonEnd(a,b){let i=0;while(i<Math.min(a.length,b.length)&&a[a.length-1-i]===b[b.length-1-i])i++;return i;}
function variantRepetitions(lines,stanzas){
 const all=lines.map(l=>({...l,key:plain(l.text)}))
  .filter(x=>x.key.length>=8&&x.key.length<=95).slice(0,250);
 const valid=all.map(x=>({...x,bigrams:grams(x.key),stanza:locateStanza(stanzas,x.number)}));
 const pool=[],seen=new Set();
 for(let i=0;i<valid.length;i++)for(let j=i+1;j<valid.length;j++){
  const a=valid[i],b=valid[j];if(a.key===b.key)continue;
  const max=Math.max(a.key.length,b.key.length),min=Math.min(a.key.length,b.key.length);
  if(max-min>Math.max(5,max*.35))continue;
  let common=0;for(const item of a.bigrams)if(b.bigrams.has(item))common++;
  const dice=2*common/(a.bigrams.size+b.bigrams.size||1);
  const start=commonStart(a.key,b.key),end=commonEnd(a.key,b.key);
  const bridge=Math.max(start,end);
  if(!((dice>=.7&&bridge>=3)||(dice>=.58&&bridge>=6)))continue;
  const key=[a.key,b.key].sort().join('↔');if(seen.has(key))continue;seen.add(key);
  const score=dice+Math.min(bridge,12)*.012+(a.stanza!==b.stanza?.06:0);
  pool.push({before:{number:a.number,text:a.text},after:{number:b.number,text:b.text},
    firstStanza:a.stanza,lastStanza:b.stanza,matchedPrefix:start,matchedSuffix:end,score});
 }
 pool.sort((a,b)=>b.score-a.score||a.before.number-b.before.number);
 return pool.slice(0,8);
}
function evidenceSpan(lines,stanzas){
 const used=[...new Set(lines.map(x=>locateStanza(stanzas,x.line)).filter(Boolean))];
 return {stanzas:used,stanzaCount:used.length,note:used.length>1?'複数の段落に根拠があります':'同じ段落内の根拠です'};
}


/* Reconsideration evidence: independent passage within each public work. It complicates
   an interpretation; it is not necessarily its logical negation or an author's intention. */
const RECONSIDER={
 'All around you':{
  '矛盾した願いを消さない':{frag:'せっかくひとりぼっちに',question:'相反する願いは、孤独への望みとどのように関係しているでしょうか。'},
  '日常が救いにも負担にもなる':{frag:'早く帰りたかったのに',question:'「救われる」感覚と「帰りたい」感覚はどのように同居しているでしょうか。'}
 },
 '春にあふれて':{
  '励ましの言葉を受け取れないとき':{frag:'そばで',question:'言葉を信用できない状況でも、「そばにいる」ことには別の意味があるでしょうか。'},
  '相互に保たれる「あなた」と「わたし」':{frag:'うまく笑えないまま',question:'自分らしくなった先だけでなく、まだ難しい状態そのものをどう扱っているでしょうか。'}
 },
 '無題（2026年3月18日）':{
  '励ましの危うさを知ったうえで伝える':{frag:'逃げ出してしまったり',question:'「頑張れ」を選ぶことと、頑張れない日を認めることは両立するでしょうか。'}
 },
 '夏を吸い込んで':{
  '自分の言い訳を見つめる視点':{frag:'一人きりじゃ見られなかった',question:'「前を向く」のは自分の決意だけでなく、他者の存在による変化ではないでしょうか。'}
 },
 'これから':{
  '「ありふれた言葉」が特別になる':{frag:'言葉になるまでの気持ちを',question:'言葉にならない過程自体が、感謝の意味を支えているのでしょうか。'}
 },
 'ただなか':{
  '「なんでもない日」が変わる':{frag:'無くしたものばかり',question:'日常を特別だと感じることには、失ったものへのまなざしも含まれているでしょうか。'}
 },
 '晴れ渡る空':{
  '何かを増やすより、何を持っているか':{frag:'簡単なようで',question:'すでにある価値を知ることは、誰にとっても簡単なのでしょうか。'}
 },
 'あなたと':{
  '「僕」と「私」を両方残す':{frag:'周りの人に救われていた',question:'共有される声でありながら、誰かに支えられた実感をどこまで個別の声として読めるでしょうか。'}
 },
 '朝になったら':{
  '「僕」と「僕ら」の間に何があるか':{frag:'もっと頑張る僕だったら',question:'「僕ら」へ視野が広がる前の、自分ひとりへの要求をどう読めるでしょうか。'},
  '反復する「帰り道」の意味':{frag:'不安が積もってる帰り道',question:'安心につながる帰り道は、不安だった帰り道の記憶を消しているでしょうか。'}
 },
 '出会い':{
  '音楽は楽譜の中だけに存在しない':{frag:'別れをもっている',question:'音楽が人とのつながりを生むだけでなく、別れを含む点はどう影響するでしょうか。'}
 },
 '願い':{
  '音楽の力を言い切らない':{frag:'そんな音楽に救われて',question:'音楽の力を断定しない一方、語り手自身の経験はどこまで確かなものでしょうか。'}
 }
};
function reconsider(work,heading,lines,evidence){
 const row=RECONSIDER[work.title]?.[heading];
 if(!row)return null;
 const passage=evidenceFor(lines,row.frag);
 if(!passage)return null;
 // Prefer additional material outside the three original supporting passages.
 if(evidence.some(e=>e.line===passage.line))return null;
 return {passage,question:row.question,kind:'解釈を再検討するための箇所'};
}

function curated(work,lines){
 if(work.origin!=='official')return [];
 return (EDITORIAL[work.title]||[]).map(item=>{
  const evidence=item.anchors.map(f=>evidenceFor(lines,f));
  return evidence.every(Boolean)?{heading:item.heading,hypothesis:item.thesis,alternative:item.other,evidence,reconsider:reconsider(work,item.heading,lines,evidence)}:null;
 }).filter(Boolean);
}

/* Literary dialogues: interpretations are tentative and each citation must be in both public originals. */
const DIALOGUES=[
 {a:'朝になったら',b:'春にあふれて',title:'励ましは、いつ届くのか',
  aWords:['きっとうまくいくから','僕ら笑えているから'],bWords:['「きっと大丈夫」','嘘に聞こえる'],
  reading:'希望を言い切る場面と、前向きな言葉を受け取れない場面が対照的です。',
  alternative:'語り手や状況が違うため、作者の考えが変わった証拠とは限りません。'},
 {a:'春にあふれて',b:'無題（2026年3月18日）',title:'安易な慰めへの警戒と、それでも選ぶ言葉',
  aWords:['「怖がらなくてもいいよ」って','あなたは誰なの'],bWords:['耳触りがいい言葉は','「頑張れ」'],
  reading:'安易な慰めを問い直す態度は重なりますが、言葉を拒む場面と、責任を引き受けて選ぶ場面があります。',
  alternative:'双方とも相手への距離の取り方を描いており、相反する思想とは限りません。'},
 {a:'願い',b:'出会い',title:'音楽に収まりきらないもの',
  aWords:['言葉にならないものばかり','音楽になったら良い'],bWords:['楽譜の中に収まりきらない','人と人との間で'],
  reading:'言葉や楽譜という器に収まりきらないものを、音楽の側に見ています。',
  alternative:'「願い」は将来への祈り、「出会い」は今ある関係の描写であり、同じ意味とは限りません。'},
 {a:'あなたと',b:'これから',title:'ありふれた言葉が、特別になるとき',
  aWords:['ここで良かった','ありがとう'],bWords:['ありふれた言葉','言葉になる前の'],
  reading:'別れの場面で言葉の難しさに向き合いながら、相手との関係を通して意味を持たせています。',
  alternative:'卒業という共通の状況に由来する表現かもしれず、直接の改稿関係は示しません。'},
 {a:'ただなか',b:'All around you',title:'日常は安らぎなのか、息苦しさなのか',
  aWords:['ありふれた毎日','幸せのただなかで'],bWords:['苦しいような','救われるような'],
  reading:'日常を抱きしめる表現と、日常に救いと苦しさが同居する表現を比較できます。',
  alternative:'語り手の人生段階や、その日の心境の違いを描いただけとも読めます。'},
 {a:'夏を吸い込んで',b:'朝になったら',title:'一人では見られない未来',
  aWords:['あなたがいたから。','明日の僕らが、'],bWords:['1人じゃないと気づいたのは','僕らを待っているから'],
  reading:'未来への期待を、自分だけの努力でなく、誰かとの関係から描く点が響き合います。',
  alternative:'共同体の歌として主語を広げる構造であり、個人の経験をそのまま語ったとは限りません。'},
 {a:'晴れ渡る空',b:'春にあふれて',title:'自分らしくいられる世界を願う',
  aWords:['優しいあなたが','優しくいられる'],bWords:['あなたがあなたで','わたしがわたしで'],
  reading:'努力や成功を求めるよりも、相手が自分として存在できる条件に関心が向いています。',
  alternative:'その条件を実現する責任まで歌詞が描ききっているかは、別に考える必要があります。'},
 {a:'これから',b:'出会い',title:'言葉や譜面の外側にある関係',
  aWords:['言葉になる前の','今の気持ちを'],bWords:['楽譜の中に収まりきらない','音楽は色を'],
  reading:'書かれた言葉や記譜だけでは言い表しきれない感情を、作品の中に置いています。',
  alternative:'一方は送別の言葉、もう一方は音楽そのものについての表現で、対象は異なります。'}
];
function dialogueRead(work,others){
 if(work.origin!=='official')return [];
 const byTitle=new Map((others||[]).filter(w=>w&&w.origin==='official'&&w.sky===work.sky).map(w=>[w.title,w]));
 const out=[],current=splitLines(work.lyrics);
 for(const d of DIALOGUES){
  if(d.a!==work.title&&d.b!==work.title)continue;
  const otherName=d.a===work.title?d.b:d.a,other=byTitle.get(otherName);
  if(!other||other.id===work.id)continue;
  const myWords=d.a===work.title?d.aWords:d.bWords,otherWords=d.a===work.title?d.bWords:d.aWords;
  const their=splitLines(other.lyrics),here=myWords.map(x=>evidenceFor(current,x)),there=otherWords.map(x=>evidenceFor(their,x));
  if(!here.every(Boolean)||!there.every(Boolean))continue;
  out.push({title:d.title,otherTitle:other.title,otherId:other.id,reading:d.reading,alternative:d.alternative,here,there});
 }
 return out;
}
function crossRead(work,others){
 if(work.origin!=='official'&&work.sourceSystem!=='lyric_master')return [];
 const lines=splitLines(work.lyrics);
 const keys=new Set(lines.flatMap(x=>MOTIFS.flatMap(m=>m.keys.filter(k=>x.text.includes(k)))));
 const out=[];
 for(const other of (others||[])){
  if(!other||other.id===work.id||other.sky!==work.sky||(work.origin==='official'?other.origin!=='official':other.sourceSystem!=='lyric_master'))continue;
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
 const stanzas=splitStanzas(work.lyrics);
 return {title:work.title,origin:work.origin,lines:lines.length,
  opening:lines.slice(0,3),ending:lines.slice(-3),
  stanzas:overviewStanzas(stanzas),motifJourney:motifJourney(stanzas),transitions:transitionClues(stanzas),variants:variantRepetitions(lines,stanzas),
  pronouns:pronounReading(lines),questions:questionLines(lines),
  repeats:repeats(lines),motifs:motifs(lines),
  readings:curated(work,lines).map(r=>({...r,coverage:evidenceSpan(r.evidence,stanzas)})),dialogues:dialogueRead(work,others),cross:crossRead(work,others),
  caution:'人称やモチーフは表記に基づく観察です。意味、語り手、制作意図、創作年代を自動確定しません。'};
}
root.LyricCloseReading={version:'close-reading-2.1',analyze,splitLines,evidenceFor,pronounReading,repeats,questionLines,splitStanzas,variantRepetitions,transitionClues,motifJourney};
})(typeof window!=='undefined'?window:globalThis);
