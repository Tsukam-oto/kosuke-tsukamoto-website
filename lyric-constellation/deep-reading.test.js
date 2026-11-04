/* Node regression: only official public lyrics in the existing app seed are used. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
require('./deep-reading.js');
const E=globalThis.LyricCloseReading;
const page=fs.readFileSync(__dirname+'/index.html','utf8');
const match=page.match(/const OFFICIAL_SEED=(\[[^\n]+?\]);/);
assert.ok(match,'published lyric seed is available');
const works=JSON.parse(match[1]).map(x=>({...x,sky:'choir',origin:'official'}));
assert.equal(works.length,11,'all 11 published lyrics present');
const results=works.map(w=>E.analyze(w,works));
assert.ok(results.every(x=>x.readings.length>=1),'every official work has an evidence-backed interpretation');
for(const a of results){
 for(const r of a.readings)assert.ok(r.evidence.every(e=>e&&e.line>0&&e.text));
 for(const r of a.dialogues){
  assert.ok(r.here.every(e=>e&&e.line>0),'each dialogue must cite this work');
  assert.ok(r.there.every(e=>e&&e.line>0),'each dialogue must cite a different work');
 }
}
const pairs=new Set(results.flatMap(x=>x.dialogues.map(d=>[x.title,d.otherTitle].sort().join(' + '))));
assert.equal(pairs.size,8);
const privateTitle={id:'private',title:'春にあふれて',lyrics:'わたしの原文　これを勝手に分析で断定しない',origin:'private',sky:'choir'};
assert.equal(E.analyze(privateTitle,works).readings.length,0,'editorial notes do not attach to private titles');
assert.equal(E.analyze(privateTitle,works).dialogues.length,0,'editorial connections do not attach to private titles');
const closed=E.analyze({id:'x',title:'a',lyrics:'なんでもないような\nなんでもないような\n僕らが歌う',origin:'private',sky:'rap'},[]);
assert.equal(closed.questions.length,0,'なんでもない is not an interrogative');
assert.equal(closed.pronouns.find(x=>x.label==='一人称（複数）').count,1);
assert.equal(closed.pronouns.find(x=>x.label==='一人称（単数）').count,0,'僕ら is not double-counted as 僕');
assert.equal(closed.repeats[0].count,2);
const ex=E.evidenceFor(E.splitLines('一行\n\n次の行'), '次の行');
assert.equal(ex.line,3,'source line numbering includes original blank lines');

/* Narrative v2: all positions are verifiable source-line numbers, never draft chronology. */
const sample=E.splitStanzas('一行目\n二行目\n\nその後\n\n終わり');
assert.equal(sample.length,3);
assert.equal(sample[0].start,1);
assert.equal(sample[1].start,4);
assert.equal(sample[2].end,6);
const sampleText='僕を待っているから\n僕らを待っているから\n\nそれでも前を向く\nなんでもないような\nなんでもないようで';
const sampleLines=E.splitLines(sampleText),sampleStanzas=E.splitStanzas(sampleText);
const variants=E.variantRepetitions(sampleLines,sampleStanzas);
assert.ok(variants.some(x=>x.before.text==='僕を待っているから'&&x.after.text==='僕らを待っているから'));
assert.ok(variants.some(x=>x.before.text==='なんでもないような'&&x.after.text==='なんでもないようで'));
assert.ok(variants.every(x=>x.before.number<x.after.number));
const pivots=E.transitionClues(sampleStanzas);
assert.ok(pivots.some(x=>x.marker==='それでも'));
assert.ok(!pivots.some(x=>x.line.text.startsWith('なんでも')));
const bye=results.find(x=>x.title==='All around you');
assert.ok(bye.variants.some(x=>x.before.text.includes('見つかる')&&x.after.text.includes('見つからない')));
const morning=results.find(x=>x.title==='朝になったら');
assert.ok(morning.variants.some(x=>x.before.text==='僕を待っているから'&&x.after.text==='僕らを待っているから'));
const spring=results.find(x=>x.title==='春にあふれて');
assert.ok(spring.variants.some(x=>x.before.text==='いられるようになるまで'&&x.after.text==='いられるようになって'));
assert.ok(results.every(x=>x.stanzas.length>=1));
assert.ok(results.every(x=>x.readings.every(h=>h.coverage.stanzaCount>=1)));
assert.ok(results.every(x=>x.variants.every(p=>p.before.number>0&&p.after.number>p.before.number)));
const privateNarrative=E.analyze({title:'非公開',sky:'rap',origin:'private',lyrics:sampleText},[]);
assert.ok(privateNarrative.stanzas.length===2&&privateNarrative.readings.length===0);


/* v4: every reading has source-grounded re-examination material outside initial evidence. */
assert.equal(results.reduce((n,a)=>n+a.readings.length,0),14);
for(const analysis of results){
 for(const item of analysis.readings){
  assert.ok(item.reconsider,'missing reconsideration for '+analysis.title+': '+item.heading);
  const candidate=item.reconsider.passage;
  assert.ok(candidate.line>0);
  assert.ok(candidate.text);
  assert.ok(!item.evidence.some(p=>p.line===candidate.line),'reconsider must be a different source line');
  assert.ok(item.reconsider.question.includes('でしょうか'),'question must be an open prompt');
 }
}
assert.ok(results.find(x=>x.title==='All around you').readings.some(r=>r.reconsider.passage.text.includes('ひとりぼっち')));
const privateReconsider=E.analyze({id:'private-copy',title:'All around you',origin:'private',sky:'choir',lyrics:'せっかくひとりぼっちに'},works);
assert.equal(privateReconsider.readings.length,0,'do not apply public interpretations to a private copy');


/* A private source text is read for literal evidence only, not assigned public-song editorial intent. */
const syntheticRap={
 id:'master-fake',title:'朝になったら',sky:'rap',origin:'private',sourceSystem:'lyric_master',
 lyrics:'俺はまだ言葉を探している\n君は遠くの窓から空を眺めていた\n\n今日も何もわからない\nそれでも僕らは歩いている\n俺があなたに伝えたい言葉\nどうしてこの夜が長いのだろう\n\n明日になったら別の道かもしれない'
};
const privateA=E.analyze(syntheticRap,[syntheticRap]);
assert.ok(privateA.readings.length>=3,'private lyrics should have grounded reading questions');
assert.ok(privateA.readings.every(r=>r.kind==='source_question'));
assert.ok(privateA.readings.every(r=>r.evidence.every(e=>syntheticRap.lyrics.split('\n')[e.line-1].trim()===e.text)));
assert.ok(!privateA.readings.some(r=>r.heading==='「僕」と「僕ら」の間に何があるか'),'do not use choir editorial guesses for a rap title');
const single=privateA.pronouns.find(p=>p.label==='一人称（単数）');
const second=privateA.pronouns.find(p=>p.label==='二人称');
assert.ok(single.count>=2&&second.count>=2,'recognize 俺 and 君/あなた');
const otherRap={...syntheticRap,id:'master-other',title:'別の歌',lyrics:'俺は夜の空を見上げる\n君に届く言葉の歌\nまた夜が来た\nでも朝が来る'};
const otherChoir={...otherRap,id:'master-choir',sky:'choir'};
assert.equal(E.analyze(syntheticRap,[otherChoir]).cross.length,0,'never mix rap and choir private sources');
assert.equal(E.analyze({title:'非公開',origin:'private',sky:'rap',lyrics:syntheticRap.lyrics},[]).readings.length,0,'only master-linked private texts gain source-only prompts');

console.log('close-reading v6: 11 official works, 14 close readings, 8 dialogues, and private rap source-grounded questions passed');
