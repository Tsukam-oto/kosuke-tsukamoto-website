/* Offline regression tests. Synthetic examples only; never commit user lyrics. */
'use strict';
const assert=require('node:assert/strict');
require('./reading-engine.js');
const E=globalThis.StrataReadingV2;
function note(id,title,text,sky='unassigned'){
 return {id,source_id:id,title,original_text:text,sky,source_created_local:'2026-01-01T00:00:00'};
}
assert.equal(E.titleKey('歌詞　「これからも」'),'これからも');
assert.equal(E.titleKey('「これからも」歌詞案'),'これからも');
assert.equal(E.normalize('「おはよう」　世界！'),'おはよう世界');
const batch=[];
for(let i=0;i<72;i++)batch.push(note('filler-'+i,'記録'+i,'短文'+i));
batch.push(note('a','「これからも」歌詞案','新しい世界と同じ道を歩いていきたい\nこれからあなたを守り続ける'));
batch.push(note('b','歌詞　「これからも」','新しい世界と同じ道をゆっくり歩いていきたい\nこれからもあなたを守り続ける'));
const r=E.scan(batch);
assert.equal(r.scanned,74);
assert.equal(r.capped.length,0);
const pair=r.candidates.find(p=>[p.a.source_id,p.b.source_id].sort().join('|')==='a|b');
assert.ok(pair,'last two of 74 must be compared, not cut off after 70');
assert.ok(pair.sameTitle);
assert.ok(pair.rephrased.length>=1,'edited phrases must be shown separately');
assert.equal(pair.shared.length,0,'rewritten lines should not be incorrectly labelled verbatim');
const differentSky=E.scan([
 note('choir','これからも','どうかおはようって言い合える世界でいて','choir'),
 note('rap','これからも','どうかおはようって言い合える世界でいて','rap')
]);
assert.equal(differentSky.candidates.length,0,'confirmed different skies must not mix');
const commonFive=E.scan([
 note('x','ささやき','春が来るから晴れやか'),
 note('y','夏の光','春が来るから先へ行く')
]);
assert.equal(commonFive.candidates.length,0,'short common phrase is not decisive');
assert.equal(E.scan([note('z','白紙','memo')]).scanned,1);
console.log('reading-engine: 6 regression scenarios passed');
