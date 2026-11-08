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

const twoHop=stars.shortestRoute(edges,'master-2','master-3');
assert.deepEqual(Array.from(twoHop.ids),['master-2','master-1','master-3'],'two-hop path follows only registered comparison links');
assert.equal(twoHop.edges.length,2,'both hops contain evidence');
assert.equal(twoHop.edges[0].topic,'別の読み');
assert.equal(twoHop.edges[1].topic,'作品の共鳴');
assert.equal(stars.shortestRoute(edges,'master-2','master-8'),null,'unconnected targets must not get invented routes');
assert.deepEqual(Array.from(stars.shortestRoute(edges,'master-1','master-1').ids),['master-1'],'start equals end');
assert.equal(stars.shortestRoute(edges,'','master-2'),null,'requires two real endpoints');
console.log('shortest journey: verified link-only two-hop route, no hallucinated edge, graceful disconnected handling');


assert.equal(stars.reviewChoiceLabel('confirmed'),'この思いはつながる');
assert.equal(stars.reviewChoiceLabel('different'),'別の思いに見える');
assert.equal(stars.reviewChoiceLabel('rejected'),'この線は違う');
assert.equal(stars.reviewChoiceLabel('pending'),'記録なし','an absent author note is not an unfinished task');
assert.equal(stars.isJudgmentDecision('confirmed'),true);
assert.equal(stars.isJudgmentDecision('rejected'),true);
assert.equal(stars.isJudgmentDecision('invalid'),false);
console.log('author intention: all decisions are explicit, no automatic confirmation');


const demoWords=[
 {id:'master-1',sky:'rap',title:'架空の旧作',collection:'一集'},
 {id:'master-2',sky:'rap',title:'架空の新作',collection:'二集'},
 {id:'master-3',sky:'rap',title:'架空の同集',collection:'一集'}
];
const discoveries=[
 {link_key:'r',left_work_id:'1',right_work_id:'2',relation_type:'resonance',topic:'声が響く',evidence_left:'前の歌',evidence_right:'後の歌'},
 {link_key:'c',left_work_id:'1',right_work_id:'3',relation_type:'counterpoint',topic:'矛盾がある',evidence_left:'旧作の話',evidence_right:'同じ集の話'},
 {link_key:'bad',left_work_id:'2',right_work_id:'3',relation_type:'reframing',evidence_left:'',evidence_right:'要根拠'}
];
const unreviewed=stars.discoveryCandidates(discoveries,demoWords,new Map(),'all');
assert.equal(unreviewed.length,2,'only saved two-sided evidence appears as a candidate');
assert.equal(stars.discoveryCandidates(discoveries,demoWords,new Map(),'across').length,1,'collection boundaries derived from metadata');
assert.equal(stars.discoveryCandidates(discoveries,demoWords,new Map(),'contrast').length,1,'contrast only offers counterpoints/reframing');
assert.equal(stars.discoveryCandidates(discoveries,demoWords,new Map(),'resonance').length,1,'resonance filter is distinct');
assert.equal(unreviewed[0].key,'r','across-collection source-backed comparisons are introduced first');
const approved=new Map([['r',{decision:'confirmed'}]]);
assert.equal(stars.discoveryCandidates(discoveries,demoWords,approved,'all').length,1,'confirmed pairs leave the unreviewed queue');
const undecided=new Map([['r',{decision:'pending'}],['c',{decision:'different'}]]);
assert.equal(stars.discoveryCandidates(discoveries,demoWords,undecided,'all').length,1,'pending notes stay in queue; different-meaning judgments do not');
const denied=new Map([['r',{decision:'rejected'}],['c',{decision:'rejected'}]]);
assert.equal(stars.discoveryCandidates(discoveries,demoWords,denied,'all').length,0,'rejected ideas never re-enter the queue');
console.log('feeling discovery: evidence-only comparisons, cross-album and contrast filters, no duplicate confirmed reviews');


/* Intersections are shared works, not automatically new direct-lyric comparisons. */
const atlasPaths=stars.normalizePaths([
 {thread_key:'rap-album-mock',title:'架空の作品集読解',anchors:[
  {kind:'work',source_id:'1'},{kind:'work',source_id:'2'}]},
 {thread_key:'hope',title:'希望の星座',anchors:[
  {kind:'work',source_id:'1'},{kind:'work',source_id:'4'},{kind:'work',source_id:'6'}]},
 {thread_key:'memory',title:'記憶の星座',anchors:[
  {kind:'work',source_id:'4'},{kind:'work',source_id:'6'}]}
],works);
assert.equal(atlasPaths.length,3,'all multi-work thematic views are represented');
const membership=stars.membershipIndex(atlasPaths);
assert.equal(membership.get('master-1').length,2,'one work may belong to two constellations');
assert.equal(membership.get('master-4').length,2,'another work overlaps two different themes');
assert.equal(membership.get('master-7'),undefined,'do not invent membership for an unrelated song');
const overlaps=stars.intersectingConstellations(atlasPaths,'hope');
assert.equal(overlaps.length,2);
assert.equal(overlaps[0].path.id,'memory','the strongest source-work overlap ranks first');
assert.deepEqual(Array.from(overlaps[0].shared),['master-4','master-6']);
assert.equal(stars.intersectingConstellations(atlasPaths,'invalid').length,0,'unknown theme cannot create an overlap');
assert.equal(stars.atlasFiltered(atlasPaths,'themes','master-1').length,2,'theme filter excludes album-only lenses');
assert.equal(stars.atlasFiltered(atlasPaths,'collections','master-1').length,1,'collection filter stays distinct');
assert.equal(stars.atlasFiltered(atlasPaths,'star','master-1').length,2,'selected-star view follows membership');
assert.equal(stars.atlasFiltered(atlasPaths,'star','master-7').length,0,'no related path is manufactured');
console.log('constellation atlas: shared-song overlaps, distinct thematic lenses and honest empty states');


const mapDemo=stars.normalizePaths([
 {thread_key:'rap-album-demo',title:'架空のアルバム読解',anchors:[
  {kind:'work',source_id:'1'},{kind:'work',source_id:'2'}]},
 {thread_key:'crossed',title:'重なる思い',guiding_question:'異なる歌でもつながる？',anchors:[
  {kind:'work',source_id:'1'},{kind:'work',source_id:'4'},{kind:'work',source_id:'6'}]},
 {thread_key:'remember',title:'記憶の思い',anchors:[
  {kind:'work',source_id:'4'},{kind:'work',source_id:'6'}]},
 {thread_key:'unique',title:'独立した思い',anchors:[
  {kind:'work',source_id:'7'},{kind:'work',source_id:'8'}]}
],works);
const meta=stars.constellationNetwork(mapDemo);
assert.equal(meta.nodes.length,4,'all distinct reading themes become map stars');
assert.equal(meta.edges.length,2,'only pairs with an actually shared song connect');
assert.equal(meta.edges[0].n,2);
assert.deepEqual(Array.from(meta.edges[0].shared),['master-4','master-6']);
assert.deepEqual(Array.from(meta.isolated),['unique'],'independent theme remains visibly isolated');
assert.ok(meta.nodes.every(n=>n.x>0&&n.x<meta.width&&n.y>0&&n.y<meta.height),'every theme has a finite reachable position');
assert.ok(meta.nodes.some(n=>n.kind==='collection')&&meta.nodes.some(n=>n.kind==='theme'),'theme and album lenses are distinct');
const metaAgain=stars.constellationNetwork(mapDemo);
assert.equal(meta.position.get('crossed').x,metaAgain.position.get('crossed').x,'constellation placement is stable');
assert.equal(stars.constellationNetwork([]).nodes.length,0,'empty private data renders no stars');
console.log('constellation meta-map: actual overlaps only, independent themes retained, accessible deterministic positions');


const titleHits=stars.titleMatches(works,'架空の歌 1');
assert.ok(titleHits.length>1,'a partial title can match multiple works');
assert.equal(titleHits[0].title,'架空の歌 1','exact match has priority over partial results');
assert.equal(stars.titleMatches(works,'存在しない曲').length,0,'unknown titles are not substituted with unrelated songs');
assert.equal(stars.titleMatches(works,'　').length,0,'blank search does not return all songs');
const widthMatches=stars.titleMatches([{id:'f',title:'ＡＢＣ',sky:'rap'}],'abc');
assert.equal(widthMatches[0].id,'f','width normalization supports actual titles without changing stored source names');
console.log('title search: multiple candidates, exact priority, Japanese width and empty results');
assert.equal(stars.adjacentCatalogId(works,'master-1',1),'master-2','reading continues in source order');
assert.equal(stars.adjacentCatalogId(works,'master-2',-1),'master-1','previous returns to the prior source');
assert.equal(stars.adjacentCatalogId(works,'master-168',1),'master-1','end wraps to start');
assert.equal(stars.adjacentCatalogId(works,'master-1',-1),'master-168','start wraps to end');
assert.equal(stars.adjacentCatalogId([],null,1),null,'empty corpus is safe');
console.log('reading navigation: deterministic original-book order and boundaries');
