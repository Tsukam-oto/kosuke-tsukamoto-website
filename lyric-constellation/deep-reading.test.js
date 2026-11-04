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
console.log('close-reading: 11 published works, 14 anchored readings, 8 dialogue pairs, private isolation and line-number checks passed');
