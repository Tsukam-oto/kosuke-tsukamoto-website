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
