/* Research regression with synthetic text only. NO real Mummy lyrics or essay in GitHub. */
'use strict';
const assert=require('node:assert/strict');
require('./mummy-research.js');
require('./mummy-research-view.js');
const R=globalThis.MummyResearch,V=globalThis.MummyResearchView;
const essay={id:'essay-1',title:'テスト用作者エッセイ',date_label:'2022-08',
 original_text:'音楽はここで終わる。\n楽譜はまだ開かれていない本だ。\nそれでも私は演奏する。'};
const works=[{id:'master-w1',title:'テスト曲1',sky:'rap',sourceSystem:'lyric_master',
 sourceStatus:'unverified_pdf_extract',lyrics:'昨日の生活\n音楽をまだ聴きたい\nその先を考える',collection:'テスト集'},
 {id:'master-w2',title:'テスト曲2',sky:'rap',sourceSystem:'lyric_master',
 sourceStatus:'unverified_pdf_extract',lyrics:'今日は友達と歌う\nそれでも明日へ進む',collection:'テスト集'},
 {id:'master-other',title:'公開作品',sky:'choir',sourceSystem:'lyric_master',
 lyrics:'音楽をまだ聴きたい',collection:'別名義'}];
const passage={section_key:'sound',heading:'演奏の終わり',
 evidence_a:'音楽はここで終わる。',evidence_b:'それでも私は演奏する。',
 interpretation:'暫定解釈',alternative:'別の読み',inquiry:'なぜでしょうか。'};
const connection={work_id:'w1',heading:'両原文の対話',
 essay_evidence:'音楽はここで終わる。',lyric_evidence:'音楽をまだ聴きたい',
 interpretation:'同じ語の異なる表れ',alternative:'共通の思想とは限らない'};
const report=R.analyze(works);
assert.equal(report.works,2,'keep separate sky out of corpus');
assert.equal(report.unverified,2);
assert.equal(R.searchWorks(works,'','all',100).count,2);
assert.equal(R.searchWorks(works,'生活','all',100).count,1);
assert.equal(R.searchWorks(works,'','music',100).count,2);
assert.equal(R.searchWorks(works,'','daily',100).count,1);
const checked=R.verify(essay,[passage],[connection],works);
assert.equal(checked.discarded,0);
assert.equal(checked.passages.length,1);
assert.equal(checked.connections.length,1);
assert.equal(checked.connections[0].verifiedLine,2);
assert.equal(R.verify(essay,[{...passage,evidence_a:'unknown'}],[{...connection,lyric_evidence:'impossible'}],works).discarded,2);
const songNotes=[{work_id:'w1',reading_key:'test-read',heading:'テスト曲1の精読',
 evidence_a:'昨日の生活',evidence_b:'音楽をまだ聴きたい',observation:'日常と音楽を並べる',
 interpretation:'一つの読み',alternative:'もう一つの読み',inquiry:'何が違うのでしょうか。',
 source_version_no:1}];
const songPairs=[{work_a_id:'w1',work_b_id:'w2',dialogue_key:'test-dialogue',heading:'歌詞同士の比較',
 evidence_a:'音楽をまだ聴きたい',evidence_b:'今日は友達と歌う',version_a:1,version_b:1,
 interpretation:'似た語の違い',alternative:'場面は異なる',inquiry:'同じ曲でしょうか。'}];
works[0].sourceVersionNo=1;works[1].sourceVersionNo=1;
const verifiedSongs=R.verifySongs(songNotes,songPairs,works);
assert.equal(verifiedSongs.readings.length,1);
assert.equal(verifiedSongs.dialogues.length,1);
assert.equal(verifiedSongs.studiedCount,1);
assert.equal(verifiedSongs.readings[0].verifiedLineA,1);
assert.equal(verifiedSongs.readings[0].verifiedLineB,2);
assert.equal(R.verifySongs([{...songNotes[0],source_version_no:2}],[{...songPairs[0],evidence_b:'別の原文'}],works).discarded,2);
const independent=V.build({status:'ready',source:null,works,songReadings:songNotes,songDialogues:songPairs});
assert.ok(independent.includes('テスト曲1の精読')===false,'selected work is empty until a song is chosen');
V.selectWork('master-w1');
assert.ok(V.selection().includes('テスト曲1の精読'),'song reading appears without essay');
assert.ok(independent.includes('歌詞同士の比較'));
assert.ok(!independent.includes('テスト用作者エッセイ'),'no essay required for song interpretations');
V.chooseMode('studied');assert.ok(V.list().includes('テスト曲1'));assert.ok(!V.list().includes('テスト曲2'));
V.chooseMode('awaiting');assert.ok(!V.list().includes('テスト曲1'));assert.ok(V.list().includes('テスト曲2'));
V.chooseMode('all');

const publicPage=V.build({status:'signed_out',source:essay,passages:[passage],connections:[connection],works});
assert.ok(publicPage.includes('本人専用の精読室'));
assert.ok(!publicPage.includes(essay.original_text));
assert.ok(!publicPage.includes(connection.lyric_evidence));
const privatePage=V.build({status:'ready',source:essay,passages:[passage],connections:[connection],works});
assert.ok(privatePage.includes('テスト用作者エッセイ'));
assert.ok(privatePage.includes('エッセイの原文全文を開く'));
assert.ok(privatePage.includes('両原文の対話'));
assert.ok(privatePage.includes('エッセイ《'));
assert.ok(privatePage.includes('作品の一つとして保存'));
assert.ok(privatePage.indexOf('168作品から選ぶ')<privatePage.indexOf('エッセイ《'),'song index must precede essay');
assert.ok(privatePage.includes('テスト曲1'));
assert.ok(!privatePage.includes('公開作品'));
assert.ok(privatePage.includes('テスト曲2'));
V.chooseTheme('daily');
assert.equal(V.getState().theme,'daily');
assert.ok(V.list().includes('テスト曲1'));
assert.ok(!V.list().includes('テスト曲2'));
V.search('テスト曲2');
assert.ok(V.list().includes('一致する文字列はありません'));
V.reset();
assert.equal(V.getState().works.length,0,'logout must clear private corpus from view state');
const escaped=V.build({status:'ready',source:{...essay,title:'<img src=x onerror=alert(1)>'},passages:[],connections:[],works});
assert.ok(!escaped.includes('<img src=x'));
V.reset();
console.log('mummy research v2: essay optional, individual lyric source versions, cross-song dialogue, topic filtering, privacy and logout passed');
