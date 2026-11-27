'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../arrangement-core.js'),'utf8');
const ctx={window:{}};
vm.runInNewContext(src,ctx,{filename:'arrangement-core.js'});
const A=ctx.window.RECNOTE_ARRANGEMENT_CORE;
const song='これからも';
const entry=(key,start,end=null,other={})=>({
 id:A.recordId(song,key),song,kind:'song-arrangement',slotKey:key,
 textVersionId:A.VERSION,workId:'rec-note-arrangement:'+song,lineIndex:-480,
 start,end,...other
});
function get(list,key){return A.arrangement(list,song,308).find(x=>x.key===key);}
test('12 default parts appear without creating any data',()=>{
 assert.equal(A.PRESET.length,12);
 assert.deepEqual(Array.from(A.PRESET.map(x=>x.label)),['イントロ','Aメロ','Aメロ2','Bメロ','サビ','間奏','Cメロ1','Cメロ2','Bメロ','サビ','サビ2','後奏']);
 assert.equal(A.slots([],song).length,12);
 assert.equal(A.arrangement([],song,null).filter(x=>x.usable).length,0);
});
test('same public labels retain distinct stable internal IDs',()=>{
 assert.notEqual(A.recordId(song,'b1'),A.recordId(song,'b2'));
 assert.notEqual(A.recordId(song,'chorus1'),A.recordId(song,'chorus2'));
 assert.equal(get([],'b1').label,get([],'b2').label);
});
test('adjacent starts derive the previous end without changing records',()=>{
 const arr=[entry('intro',0),entry('a1',19.89),entry('a2',46.63)];
 const source=JSON.stringify(arr);
 assert.equal(get(arr,'intro').end,19.89);
 assert.equal(get(arr,'a1').end,46.63);
 assert.equal(get(arr,'a1').endSource,'次の区間の開始');
 assert.equal(JSON.stringify(arr),source);
});
test('unrecorded next part never gives a misleading end time',()=>{
 const x=get([entry('intro',0),entry('a2',40)],'intro');
 assert.equal(x.end,null);assert.equal(x.usable,false);
 assert.match(x.issue,/次の区間/);
});
test('unused part is skipped and later start supplies the boundary',()=>{
 const arr=[entry('intro',0),entry('a1',null,null,{disabled:true}),entry('a2',40)];
 const x=get(arr,'intro');assert.equal(x.end,40);assert.equal(x.usable,true);
});
test('manual end is accepted, impossible overlap is rejected',()=>{
 const arr=[entry('intro',0,18),entry('a1',19)];
 assert.equal(get(arr,'intro').end,18);
 const bad=[entry('intro',0,30),entry('a1',19)];
 assert.equal(get(bad,'intro').usable,false);
 assert.match(get(bad,'intro').issue,/範囲外/);
});
test('out-of-order starts and conflicts are not exportable',()=>{
 const a=[entry('intro',12),entry('a1',8)];
 assert.equal(get(a,'intro').usable,false);
 assert.match(get(a,'intro').issue,/順序/);
 const b=[entry('intro',0),entry('a1',20),{id:'conflict-copy',song,syncConflictOf:A.recordId(song,'intro')}];
 assert.match(get(b,'intro').issue,/競合/);
 const plan=A.exportPlan(b,song,308);
 const intro=plan.sections.find(s=>s.label==='イントロ');
 assert.equal(intro.start,null);assert.equal(intro.timingStatus,'incomplete');
});
test('custom sections and unused parts retain stable ordering',()=>{
 const extras=[entry('custom-x',70,null,{type:'bridge',order:45})];
 const list=A.slots(extras,song);
 assert.ok(list.some(x=>x.key==='custom-x'));
 assert.equal(list.find(x=>x.key==='custom-x').label,'Cメロ');
});
test('legacy song-section and lyric timing entries remain untouched',()=>{
 const legacy=[{id:'song-section:legacy',song,kind:'song-section',sectionType:'intro',start:0},
  {id:'lyric-line:1',song,lineIndex:0,start:27.4,end:31}];
 const before=JSON.stringify(legacy);
 assert.equal(A.slots(legacy,song).length,12);
 assert.equal(JSON.stringify(legacy),before);
 assert.doesNotMatch(src,/\bpersist\s*\(/);
 assert.doesNotMatch(src,/\blocalStorage\b/);
});
console.log('REC NOTE arrangement regression checks passed');
