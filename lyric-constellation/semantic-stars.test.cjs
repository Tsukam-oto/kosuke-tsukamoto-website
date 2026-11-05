/* Starfield unit smoke — synthetic song titles and synthetic comparisons only. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync(__dirname+'/semantic-stars.js','utf8');
const sandbox={window:{},console};
vm.createContext(sandbox);
vm.runInContext(code,sandbox,{timeout:5000});
const stars=sandbox.window.LyricStarfield;
assert.ok(stars&&typeof stars.makePositions==='function');
const works=Array.from({length:168},(_,i)=>({
 id:'master-'+String(i+1),sky:'rap',title:'架空の歌 '+i,
 originalBookIndex:i,collection:'架空作品集'+Math.floor(i/11)
}));
const loc=stars.makePositions(works);
assert.equal(loc.pos.size,168,'all 168 songs have positions');
assert.equal(loc.labels.length,16,'song groups are present');
assert.equal(loc.width,1730);
assert.ok(loc.height>=1050);
assert.equal(new Set([...loc.pos.values()].map(p=>p.x.toFixed(4)+','+p.y.toFixed(4))).size,168,'star positions must be distinct');
for(const p of loc.pos.values()){
 assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
 assert.ok(p.x>0&&p.x<loc.width&&p.y>0&&p.y<loc.height,'node inside the sky');
}
const rows=[
 {link_key:'a',left_work_id:'1',right_work_id:'2',topic:'別の読み',relation_type:'counterpoint',evidence_left:'架空の一文',evidence_right:'もう一つの文'},
 {link_key:'b',left_work_id:'1',right_work_id:'3',topic:'作品の共鳴',relation_type:'resonance'},
 {link_key:'bad',left_work_id:'1',right_work_id:'unknown',topic:'存在しない作品'},
 {link_key:'bad2',left_work_id:null,right_work_id:'2',topic:'個人メモは曲の星にしない'},
 {link_key:'a',left_work_id:'1',right_work_id:'2',topic:'重複'},
];
const edges=stars.normalize(rows,works);
assert.equal(edges.length,2,'only two unique fully linked song pairs');
assert.equal(edges[0].kind,'counterpoint');
assert.equal(edges[0].left,'架空の一文');
assert.equal(edges[0].right,'もう一つの文');
assert.equal(stars.buildGraphModel(works,rows,'master-1','all','meaning').nodes.length,168);
assert.equal(stars.buildGraphModel(works,rows,'master-1','all','meaning').links.length,2);
assert.equal(stars.safe('<img src=x onerror=alert(1)>'),'&lt;img src=x onerror=alert(1)&gt;');
assert.equal(stars.normalize(rows,[...works,{id:'master-X',sky:'choir'}]).length,2,'choir songs do not create rap connections');
console.log('semantic starfield: 168 positions, full coverage, author-only links, dedup, XSS escaped');

/* Integration smoke: the actual render function exposes every star and respects logout. */
const ownerWorks=works.map(w=>({...w,sourceSystem:'lyric_master',lyrics:'非公開のテスト本文'}));
const ctx={
 window:{},document:{querySelector(){return null;},addEventListener(){}},
 console,works:()=>ownerWorks,getWork:id=>ownerWorks.find(w=>w.id===id),
 connections:()=>[],renderGraph:()=>'<svg id="old"/>',
 selectedWorkCard:()=>'<p>old</p>',viewConstellation:()=>'<div class="constellation-scroll"></div><span>代表40 / 全168 stars</span><span>星図は代表40点。作品画面で全件を確認できます。</span><span>線＝主な共通語のつながり</span>',
 render(){},loadMasterReadingCorpus:async()=>{},
 cloudUser:{id:'owner'},cloudClient:null,cloudEpoch:1,
 selected:'master-1',sky:'rap',view:'constellation',db:{customWords:[]}
};
vm.createContext(ctx);
vm.runInContext(code,ctx,{timeout:10000});
let graph=ctx.renderGraph();
assert.equal((graph.match(/class="semantic-star(?: |")/g)||[]).length,168,'all song stars render');
assert.match(ctx.viewConstellation(),/168 stars/);
assert.match(ctx.selectedWorkCard(),/SELECTED STAR/);
ctx.cloudUser=null; // A stale private object may exist briefly while logging out.
graph=ctx.renderGraph();
assert.equal((graph.match(/class="semantic-star(?: |")/g)||[]).length,0,'logged-out user sees no private star');
assert.doesNotMatch(ctx.selectedWorkCard(),/架空の歌/,'private song title must be hidden at logout');
console.log('semantic starfield integration: rendering, controls and private-data isolation passed');


const paths=[
 {thread_key:'demo-theme',title:'架空の星座',guiding_question:'誰の言葉がつながるか？',
  anchors:[{kind:'work',source_id:'1'},{kind:'note',source_id:'secret'},{kind:'work',source_id:'4'},
  {kind:'work',source_id:'1'},{kind:'work',source_id:'missing'}]},
 {thread_key:'single',title:'一作だけ',anchors:[{kind:'work',source_id:'2'}]}
];
const selectedPaths=stars.normalizePaths(paths,works);
assert.equal(selectedPaths.length,1,'exclude incomplete themes and note-only anchors');
assert.equal(selectedPaths[0].ids.join(','),'master-1,master-4','theme uses distinct known song ids');
assert.equal(selectedPaths[0].question,'誰の言葉がつながるか？');
assert.equal(stars.normalizePaths([{thread_key:'bad',anchors:'not an array'}],works).length,0);
console.log('thematic path normalization: verified source work ids only');


const gravity=stars.semanticPositions(works,edges,selectedPaths);
assert.equal(gravity.pos.size,168,'semantic map preserves all songs, even without comparisons');
assert.equal(gravity.unlinked,164,'unlinked stars stay visible rather than acquiring invented relationships');
assert.equal(gravity.labels.length,0,'semantic map does not pretend positions are album groups');
for(const p of gravity.pos.values()){
 assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y),'finite position');
 assert.ok(p.x>0&&p.x<gravity.width&&p.y>0&&p.y<gravity.height,'inside semantic sky');
}
const again=stars.semanticPositions(works,edges,selectedPaths);
assert.equal(again.pos.get('master-1').x,gravity.pos.get('master-1').x,'semantic layout is deterministic and stable');
const detailed=stars.normalizePaths([{thread_key:'deep-quote',title:'声の変化',
 core_hypothesis:'他者との対話を問い直す',counterreading:'別の解釈も可能',inference_limit:'原文校正を継続',
 anchors:[{kind:'work',source_id:'1',quote:'架空の原文',observation:'架空の観察',technique:'反復'},
 {kind:'work',source_id:'4',quote:'架空の別の原文'}]}],works);
assert.equal(detailed[0].steps[0].quote,'架空の原文');
assert.equal(detailed[0].steps[0].observation,'架空の観察');
assert.equal(detailed[0].hypothesis,'他者との対話を問い直す');
console.log('semantic gravity: 168 finite nodes, no invented relations, stable positions and per-work source anchors');
