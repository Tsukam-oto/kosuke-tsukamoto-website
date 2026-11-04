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

console.log('close-reading v2: 11 works, 14 readings, 8 dialogues, stanza movement, variants, transitions and private isolation passed');
